import request from "supertest";
import express from "express";
import "../../models/Client.js";
import "../../models/Artist.js";
import Booking from "../../models/Booking.js";
import { createTipCheckout } from "../../controllers/billingController.js";

const conditionalDescribe = process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) {
    req.user = { clerkId: id };
    req.auth = { userId: id };
  }
  next();
};

const app = express();
app.use(express.json());
app.post("/billing/tip", mockAuth, createTipCheckout);

const makeBooking = (status) =>
  Booking.create({
    clientId: "client_1",
    artistId: "artist_1",
    appointmentType: "tattoo_session",
    status,
    startAt: new Date(),
    endAt: new Date(Date.now() + 3600000),
    priceCents: 20000,
  });

conditionalDescribe("Tip intent gates", () => {
  test("rejects a tip on a booking that isn't completed", async () => {
    const booking = await makeBooking("pending");
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", "client_1")
      .send({ bookingId: String(booking._id), tipCents: 2000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("not_completed");
  });

  test("forbids a non-client from tipping", async () => {
    const booking = await makeBooking("completed");
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", "stranger")
      .send({ bookingId: String(booking._id), tipCents: 2000 });
    expect(res.status).toBe(403);
  });

  test("rejects an invalid tip amount", async () => {
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", "client_1")
      .send({ bookingId: "507f1f77bcf86cd799439011", tipCents: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_amount");
  });

  test("requires a bookingId", async () => {
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", "client_1")
      .send({ tipCents: 2000 });
    expect(res.status).toBe(400);
  });
});
