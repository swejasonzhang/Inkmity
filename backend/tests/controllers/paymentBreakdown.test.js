import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import "../../models/Client.js";
import "../../models/Artist.js";
import Booking from "../../models/Booking.js";
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
app.post("/billing/breakdown", mockAuth, getPaymentBreakdown);

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

conditionalDescribe("Payment Breakdown", () => {
  test("client view: sees only what they pay, never the artist/studio split", async () => {
    const booking = await Booking.create({
      clientId: "client_1",
      artistId: "solo_artist",
      appointmentType: "tattoo_session",
      status: "completed",
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
      priceCents: 20000,
    });

    const res = await request(server)
      .post("/billing/breakdown")
      .set("x-test-user-id", "client_1")
      .send({ bookingId: String(booking._id) });

    expect(res.status).toBe(200);
    const b = res.body;
    expect(b.priceCents).toBe(20000);
    expect(b.platformFeeCents).toBeGreaterThan(0);
    expect(b.clientTotalCents).toBe(b.priceCents + b.platformFeeCents);
    expect(b.status).toBe("completed");
    expect(b.artistGrossCents).toBeUndefined();
    expect(b.artistNetCents).toBeUndefined();
    expect(b.studioCents).toBeUndefined();
    expect(b.commissionPct).toBeUndefined();
    expect(b.stripeFeeCents).toBeUndefined();
    expect(b.isStudio).toBeUndefined();
  });

  test("artist view: sees their own net, gross and the studio split", async () => {
    const booking = await Booking.create({
      clientId: "client_1",
      artistId: "solo_artist",
      appointmentType: "tattoo_session",
      status: "completed",
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
      priceCents: 20000,
    });

    const res = await request(server)
      .post("/billing/breakdown")
      .set("x-test-user-id", "solo_artist")
      .send({ bookingId: String(booking._id) });

    expect(res.status).toBe(200);
    const b = res.body;
    expect(b.priceCents).toBe(20000);
    expect(b.clientTotalCents).toBe(b.priceCents + b.platformFeeCents);
    expect(b.isStudio).toBe(false);
    expect(b.artistGrossCents).toBe(20000);
    expect(b.stripeFeeCents).toBeGreaterThan(0);
    expect(b.artistNetCents).toBe(b.artistGrossCents - b.stripeFeeCents);
    expect(b.status).toBe("completed");
  });

  test("estimate mode (artistClerkId + priceCents, no booking)", async () => {
    const res = await request(server)
      .post("/billing/breakdown")
      .set("x-test-user-id", "client_2")
      .send({ artistClerkId: "solo_artist", priceCents: 10000 });

    expect(res.status).toBe(200);
    expect(res.body.priceCents).toBe(10000);
    expect(res.body.clientTotalCents).toBe(10000 + res.body.platformFeeCents);
    expect(res.body.status).toBeNull();
  });

  test("requires auth and a target", async () => {
    const noAuth = await request(server).post("/billing/breakdown").send({ artistClerkId: "a", priceCents: 1 });
    expect(noAuth.status).toBe(401);

    const noTarget = await request(server).post("/billing/breakdown").set("x-test-user-id", "client_1").send({});
    expect(noTarget.status).toBe(400);
  });

  test("forbids a non-participant from viewing a booking breakdown", async () => {
    const booking = await Booking.create({
      clientId: "client_owner",
      artistId: "artist_owner",
      appointmentType: "tattoo_session",
      status: "completed",
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
      priceCents: 15000,
    });
    const res = await request(server)
      .post("/billing/breakdown")
      .set("x-test-user-id", "stranger")
      .send({ bookingId: String(booking._id) });
    expect(res.status).toBe(403);
  });
});
