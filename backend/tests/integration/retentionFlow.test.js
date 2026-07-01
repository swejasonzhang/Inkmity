import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockSendReminder = jest.fn().mockResolvedValue(true);
const mockSendAftercare = jest.fn().mockResolvedValue(true);
const mockSendRebooking = jest.fn().mockResolvedValue(true);
const mockEmit = jest.fn();

jest.unstable_mockModule("../../services/emailService.js", () => ({
  sendReminderEmail: mockSendReminder,
  sendAftercareEmail: mockSendAftercare,
  sendRebookingEmail: mockSendRebooking,
}));
jest.unstable_mockModule("../../services/socketService.js", () => ({
  emitMessageCreated: mockEmit,
}));

const Booking = (await import("../../models/Booking.js")).default;
const Client = (await import("../../models/Client.js")).default;
const Message = (await import("../../models/Message.js")).default;
const { runBookingReminders, runAftercareSequence, runRebookingNudges, runRetentionTick } =
  await import("../../services/retentionService.js");

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const CLIENT_CLERK = "clerk-client-1";
const ARTIST_CLERK = "clerk-artist-1";

let now;

async function makeBooking(over = {}) {
  const startAt = over.startAt || new Date(now + 12 * HOUR);
  return Booking.create({
    artistId: ARTIST_CLERK,
    clientId: CLIENT_CLERK,
    startAt,
    endAt: new Date(startAt.getTime() + HOUR),
    status: "booked",
    appointmentType: "tattoo_session",
    ...over,
  });
}

conditionalDescribe("retention loop (integration)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    now = Date.now();
    await Promise.all([Booking.deleteMany({}), Client.deleteMany({}), Message.deleteMany({})]);
    await Client.create({
      clerkId: CLIENT_CLERK,
      email: "cass@example.com",
      username: "Cass",
      handle: "@cass",
      role: "client",
      dob: new Date("1995-01-01"),
    });
  });

  test("resolves the client by clerkId and emails a 24h reminder for a due booking only", async () => {
    const due = await makeBooking({ startAt: new Date(now + 12 * HOUR) });
    const tooFar = await makeBooking({ startAt: new Date(now + 48 * HOUR) });

    const sent = await runBookingReminders(now);

    expect(sent).toBe(1);
    expect(mockSendReminder).toHaveBeenCalledTimes(1);
    expect(mockSendReminder.mock.calls[0][1]).toBe("cass@example.com");
    expect(mockSendReminder.mock.calls[0][3]).toBe("24h");

    const dueAfter = await Booking.findById(due._id);
    const farAfter = await Booking.findById(tooFar._id);
    expect(dueAfter.reminderSent24h).toBe(true);
    expect(dueAfter.reminderSentAt).toBeInstanceOf(Date);
    expect(farAfter.reminderSent24h).toBe(false);

    const notes = await Message.find({ receiverId: CLIENT_CLERK, "meta.kind": "appointment_reminder" });
    expect(notes).toHaveLength(1);
    expect(String(notes[0].meta.bookingId)).toBe(String(due._id));
  });

  test("is idempotent — a second pass sends nothing more", async () => {
    await makeBooking({ startAt: new Date(now + 12 * HOUR) });

    expect(await runBookingReminders(now)).toBe(1);
    expect(await runBookingReminders(now)).toBe(0);
    expect(mockSendReminder).toHaveBeenCalledTimes(1);
  });

  test("aftercare goes only to tattoo sessions completed 3–14 days ago", async () => {
    const dueSession = await makeBooking({
      status: "completed",
      appointmentType: "tattoo_session",
      completedAt: new Date(now - 5 * DAY),
    });
    await makeBooking({
      status: "completed",
      appointmentType: "consultation",
      startAt: new Date(now - 6 * DAY),
      completedAt: new Date(now - 5 * DAY),
    });
    await makeBooking({
      status: "completed",
      appointmentType: "tattoo_session",
      startAt: new Date(now - 2 * DAY),
      completedAt: new Date(now - 1 * DAY),
    });

    const sent = await runAftercareSequence(now);

    expect(sent).toBe(1);
    expect(mockSendAftercare).toHaveBeenCalledTimes(1);
    const after = await Booking.findById(dueSession._id);
    expect(after.aftercareSent3d).toBe(true);
  });

  test("rebooking nudge goes to any booking completed 7–30 days ago", async () => {
    const dueRebook = await makeBooking({
      status: "completed",
      appointmentType: "consultation",
      startAt: new Date(now - 11 * DAY),
      completedAt: new Date(now - 10 * DAY),
    });
    await makeBooking({
      status: "completed",
      startAt: new Date(now - 3 * DAY),
      completedAt: new Date(now - 2 * DAY),
    });

    const sent = await runRebookingNudges(now);

    expect(sent).toBe(1);
    expect(mockSendRebooking).toHaveBeenCalledTimes(1);
    const after = await Booking.findById(dueRebook._id);
    expect(after.rebookNudgeSent7d).toBe(true);
  });

  test("a full tick handles reminders + aftercare + rebooking in one pass", async () => {
    await makeBooking({ startAt: new Date(now + 12 * HOUR) });
    await makeBooking({
      status: "completed",
      appointmentType: "tattoo_session",
      startAt: new Date(now - 6 * DAY),
      completedAt: new Date(now - 5 * DAY),
    });
    await makeBooking({
      status: "completed",
      appointmentType: "consultation",
      startAt: new Date(now - 11 * DAY),
      completedAt: new Date(now - 10 * DAY),
    });

    const result = await runRetentionTick(now);

    expect(result).toEqual({ reminders: 1, aftercare: 1, rebook: 1 });
  });
});
