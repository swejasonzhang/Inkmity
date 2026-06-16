process.env.DEV_BYPASS_GATES = "true";

import request from "supertest";
import express from "express";
import "../../models/Client.js";
import "../../models/Artist.js";
import Booking from "../../models/Booking.js";
import { setFinalPrice, verifyBookingCode } from "../../controllers/bookingController.js";
import { getPaymentBreakdown } from "../../controllers/billingController.js";

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
app.post("/bookings/:id/final-price", mockAuth, setFinalPrice);
app.post("/bookings/:id/verify", mockAuth, verifyBookingCode);
app.post("/billing/breakdown", mockAuth, getPaymentBreakdown);

conditionalDescribe("Appointment lifecycle: set price → both confirm → completed → breakdown", () => {
  const ARTIST = "lifecycle_artist";
  const CLIENT = "lifecycle_client";

  test("solo artist: full money path resolves to a charged breakdown", async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId: ARTIST,
      clientId: CLIENT,
      appointmentType: "tattoo_session",
      status: "confirmed",
      startAt: start,
      endAt: new Date(start.getTime() + 2 * 60 * 60 * 1000),
      priceCents: 0,
      clientCode: "AAAAAA",
      artistCode: "BBBBBB",
      codeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const id = String(booking._id);

    const priced = await request(app)
      .post(`/bookings/${id}/final-price`)
      .set("x-test-user-id", ARTIST)
      .send({ finalPriceCents: 25000 });
    expect(priced.status).toBe(200);
    expect(priced.body.priceCents).toBe(25000);

    const clientVerify = await request(app)
      .post(`/bookings/${id}/verify`)
      .set("x-test-user-id", CLIENT)
      .send({ role: "client", code: "AAAAAA" });
    expect(clientVerify.status).toBe(200);
    expect(clientVerify.body.status).not.toBe("completed");

    const artistVerify = await request(app)
      .post(`/bookings/${id}/verify`)
      .set("x-test-user-id", ARTIST)
      .send({ role: "artist", code: "BBBBBB" });
    expect(artistVerify.status).toBe(200);
    expect(artistVerify.body.status).toBe("completed");

    const breakdown = await request(app)
      .post("/billing/breakdown")
      .set("x-test-user-id", ARTIST)
      .send({ bookingId: id });
    expect(breakdown.status).toBe(200);

    const b = breakdown.body;
    expect(b.status).toBe("completed");
    expect(b.priceCents).toBe(25000);
    expect(b.platformFeeCents).toBeGreaterThan(0);
    expect(b.clientTotalCents).toBe(b.priceCents + b.platformFeeCents);
    expect(b.isStudio).toBe(false);
    expect(b.artistGrossCents).toBe(25000);
    expect(b.stripeFeeCents).toBeGreaterThan(0);
    expect(b.artistNetCents).toBe(b.artistGrossCents - b.stripeFeeCents);
  });

  test("a bad confirmation code is rejected and does not complete the booking", async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId: ARTIST,
      clientId: CLIENT,
      appointmentType: "tattoo_session",
      status: "confirmed",
      startAt: start,
      endAt: new Date(start.getTime() + 60 * 60 * 1000),
      priceCents: 12000,
      clientCode: "AAAAAA",
      artistCode: "BBBBBB",
      codeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const id = String(booking._id);

    const bad = await request(app)
      .post(`/bookings/${id}/verify`)
      .set("x-test-user-id", CLIENT)
      .send({ role: "client", code: "ZZZZZZ" });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe("bad_code");

    const fresh = await Booking.findById(id);
    expect(fresh.status).not.toBe("completed");
  });
});
