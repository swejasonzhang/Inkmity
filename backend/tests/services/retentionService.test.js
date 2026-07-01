import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockBooking = { findOneAndUpdate: jest.fn() };
const mockClient = { findOne: jest.fn() };
const mockMessage = { create: jest.fn() };
const mockEmitMessageCreated = jest.fn();
const mockSendReminder = jest.fn();
const mockSendAftercare = jest.fn();
const mockSendRebooking = jest.fn();

jest.unstable_mockModule("../../models/Booking.js", () => ({ default: mockBooking }));
jest.unstable_mockModule("../../models/Client.js", () => ({ default: mockClient }));
jest.unstable_mockModule("../../models/Message.js", () => ({ default: mockMessage }));
jest.unstable_mockModule("../../services/socketService.js", () => ({
  emitMessageCreated: mockEmitMessageCreated,
}));
jest.unstable_mockModule("../../services/emailService.js", () => ({
  sendReminderEmail: mockSendReminder,
  sendAftercareEmail: mockSendAftercare,
  sendRebookingEmail: mockSendRebooking,
}));
jest.unstable_mockModule("../../lib/logger.js", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { runBookingReminders, runAftercareSequence, runRebookingNudges, runRetentionTick } =
  await import("../../services/retentionService.js");

const NOW = Date.UTC(2026, 5, 30, 12, 0, 0);
const HOUR = 3600_000;
const DAY = 24 * HOUR;

const booking = (over = {}) => ({
  _id: "b1",
  clientId: "cid1",
  artistId: "aid1",
  appointmentType: "tattoo_session",
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockClient.findOne.mockResolvedValue({ email: "cass@example.com", username: "Cass" });
  mockMessage.create.mockResolvedValue({ _id: "m1" });
  mockBooking.findOneAndUpdate.mockResolvedValue(null);
});

describe("runBookingReminders", () => {
  test("sends a 24h and a 1h reminder, emails + in-app, and drains each band", async () => {
    const b24 = booking({ _id: "b24" });
    const b1h = booking({ _id: "b1h" });
    mockBooking.findOneAndUpdate
      .mockResolvedValueOnce(b24)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(b1h)
      .mockResolvedValueOnce(null);

    const n = await runBookingReminders(NOW);

    expect(n).toBe(2);
    expect(mockSendReminder).toHaveBeenCalledWith(b24, "cass@example.com", "Cass", "24h");
    expect(mockSendReminder).toHaveBeenCalledWith(b1h, "cass@example.com", "Cass", "1h");
    expect(mockMessage.create).toHaveBeenCalledTimes(2);
    expect(mockEmitMessageCreated).toHaveBeenCalledTimes(2);
  });

  test("the 24h claim is atomic and idempotent (guards + stamps the flag in one op)", async () => {
    mockBooking.findOneAndUpdate.mockResolvedValueOnce(booking()).mockResolvedValue(null);

    await runBookingReminders(NOW);

    const [filter, update, opts] = mockBooking.findOneAndUpdate.mock.calls[0];
    expect(filter.status).toEqual({ $in: ["accepted", "booked", "confirmed"] });
    expect(filter.reminderSent24h).toEqual({ $ne: true });
    expect(filter.startAt.$gt).toEqual(new Date(NOW + HOUR));
    expect(filter.startAt.$lte).toEqual(new Date(NOW + 24 * HOUR));
    expect(update.$set.reminderSent24h).toBe(true);
    expect(opts).toMatchObject({ new: true });
  });

  test("still posts the in-app reminder when the client has no email on file", async () => {
    mockClient.findOne.mockResolvedValue(null);
    mockBooking.findOneAndUpdate
      .mockResolvedValueOnce(booking())
      .mockResolvedValue(null);

    const n = await runBookingReminders(NOW);

    expect(n).toBe(1);
    expect(mockSendReminder).not.toHaveBeenCalled();
    expect(mockMessage.create).toHaveBeenCalledTimes(1);
  });
});

describe("runAftercareSequence", () => {
  test("targets tattoo sessions completed ≥3 days ago and sends aftercare", async () => {
    const done = booking({ _id: "done" });
    mockBooking.findOneAndUpdate.mockResolvedValueOnce(done).mockResolvedValue(null);

    const n = await runAftercareSequence(NOW);

    expect(n).toBe(1);
    expect(mockSendAftercare).toHaveBeenCalledWith(done, "cass@example.com", "Cass");
    const [filter, update] = mockBooking.findOneAndUpdate.mock.calls[0];
    expect(filter.status).toBe("completed");
    expect(filter.appointmentType).toBe("tattoo_session");
    expect(filter.aftercareSent3d).toEqual({ $ne: true });
    expect(filter.completedAt.$lte).toEqual(new Date(NOW - 3 * DAY));
    expect(filter.completedAt.$gt).toEqual(new Date(NOW - 14 * DAY));
    expect(update.$set.aftercareSent3d).toBe(true);
  });
});

describe("runRebookingNudges", () => {
  test("nudges any completed booking ≥7 days out, regardless of type", async () => {
    const done = booking({ _id: "old", appointmentType: "consultation" });
    mockBooking.findOneAndUpdate.mockResolvedValueOnce(done).mockResolvedValue(null);

    const n = await runRebookingNudges(NOW);

    expect(n).toBe(1);
    expect(mockSendRebooking).toHaveBeenCalledWith(done, "cass@example.com", "Cass");
    const [filter, update] = mockBooking.findOneAndUpdate.mock.calls[0];
    expect(filter.status).toBe("completed");
    expect(filter.appointmentType).toBeUndefined();
    expect(filter.rebookNudgeSent7d).toEqual({ $ne: true });
    expect(filter.completedAt.$lte).toEqual(new Date(NOW - 7 * DAY));
    expect(update.$set.rebookNudgeSent7d).toBe(true);
  });
});

describe("runRetentionTick", () => {
  test("returns per-stage counts when nothing is due", async () => {
    const result = await runRetentionTick(NOW);
    expect(result).toEqual({ reminders: 0, aftercare: 0, rebook: 0 });
  });

  test("a failure in one stage does not abort the others", async () => {
    mockBooking.findOneAndUpdate
      .mockRejectedValueOnce(new Error("db blip"))
      .mockResolvedValue(null);

    const result = await runRetentionTick(NOW);

    expect(result).toEqual({ reminders: 0, aftercare: 0, rebook: 0 });
    expect(mockBooking.findOneAndUpdate.mock.calls.length).toBeGreaterThan(1);
  });
});
