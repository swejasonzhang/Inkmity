// Verifies the local dev-bypass workflow: a client can book an artist who has
// NOT onboarded with Stripe Connect and has NOT granted booking permission, the
// deposit is waived (no Stripe), and completing bookings advances the rewards
// tier. config.dev.bypassGates is a live getter, so the flag is toggled around
// this suite only (and cleaned up) to avoid leaking into other test files.
import request from "supertest";
import express from "express";

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const {
  createTattooSession,
  acceptAppointment,
  completeBooking,
} = await import("../../controllers/bookingController.js");
const Booking = (await import("../../models/Booking.js")).default;
const Artist = (await import("../../models/Artist.js")).default;
const Client = (await import("../../models/Client.js")).default;
const { getRewardsSummary } = await import("../../services/rewardsService.js");

const app = express();
app.use(express.json());
const auth = (req, _res, next) => {
  const id = req.headers["x-test-user-id"];
  req.user = { clerkId: id };
  req.auth = { userId: id };
  next();
};
app.post("/bookings/session", auth, createTattooSession);
app.post("/bookings/:id/accept", auth, acceptAppointment);
app.post("/bookings/:id/complete", auth, completeBooking);

conditionalDescribe("Dev Bypass - full booking → rewards workflow", () => {
  const artistId = "artist-bypass";
  const clientId = "client-bypass";

  beforeAll(() => {
    process.env.DEV_BYPASS_GATES = "true";
  });

  afterAll(() => {
    delete process.env.DEV_BYPASS_GATES;
  });

  beforeEach(async () => {
    // Artist is NOT Connect-onboarded; client has NO booking permission.
    await Artist.create({
      clerkId: artistId,
      email: "a@example.com",
      username: "Artist",
      handle: "@artist-bypass",
      role: "artist",
    });
    await Client.create({
      clerkId: clientId,
      email: "c@example.com",
      username: "Client",
      handle: "@client-bypass",
      role: "client",
    });
  });

  async function bookAcceptComplete(dayOffset) {
    const startISO = new Date(
      Date.now() + dayOffset * 24 * 60 * 60 * 1000
    ).toISOString();

    const create = await request(app)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO, durationMinutes: 120, priceCents: 20000 });
    expect(create.status).toBe(201);
    // Deposit waived in dev bypass — no Stripe needed.
    expect(create.body.depositRequiredCents).toBe(0);
    const id = create.body._id;

    const accept = await request(app)
      .post(`/bookings/${id}/accept`)
      .set("x-test-user-id", artistId);
    expect(accept.status).toBe(200);
    expect(accept.body.status).toBe("accepted");

    const complete = await request(app)
      .post(`/bookings/${id}/complete`)
      .set("x-test-user-id", artistId);
    expect(complete.status).toBe(200);
    expect(complete.body.status).toBe("completed");
  }

  test("books an un-onboarded artist without permission and waives the deposit", async () => {
    await bookAcceptComplete(2);
    const summary = await getRewardsSummary(clientId);
    expect(summary.completedBookings).toBe(1);
    expect(summary.tier.key).toBe("bronze");
  });

  test("completing 3 bookings advances the client from Bronze to Silver", async () => {
    await bookAcceptComplete(2);
    await bookAcceptComplete(4);
    await bookAcceptComplete(6);

    const summary = await getRewardsSummary(clientId);
    expect(summary.completedBookings).toBe(3);
    expect(summary.tier.key).toBe("silver");
    expect(summary.currentFeePct).toBe(0.08);

    const client = await Client.findOne({ clerkId: clientId });
    expect(client.rewardsTier).toBe("silver");
    expect(client.completedBookingsCount).toBe(3);
  });
});
