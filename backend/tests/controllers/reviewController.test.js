import request from "supertest";
import express from "express";
import "../../models/UserBase.js";
import Artist from "../../models/Artist.js";
import Client from "../../models/Client.js";
import Booking from "../../models/Booking.js";
import { addReview } from "../../controllers/reviewController.js";

const conditionalDescribe = process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.post("/reviews", mockAuth, addReview);

const makeBooking = (status) =>
  Booking.create({
    clientId: "client_r",
    artistId: "artist_r",
    appointmentType: "tattoo_session",
    status,
    startAt: new Date(),
    endAt: new Date(Date.now() + 3600000),
    priceCents: 20000,
  });

conditionalDescribe("addReview (verified)", () => {
  beforeEach(async () => {
    await Artist.create({
      clerkId: "artist_r",
      email: "artist_r@example.com",
      username: "Art",
      handle: "@artist_r",
      role: "artist",
    });
    await Client.create({
      clerkId: "client_r",
      email: "client_r@example.com",
      username: "Cli",
      handle: "@client_r",
      role: "client",
    });
  });

  test("requires a bookingId", async () => {
    const res = await request(app)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", rating: 5, text: "great" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("booking_required");
  });

  test("rejects a review on a booking that isn't completed", async () => {
    const b = await makeBooking("pending");
    const res = await request(app)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "great" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("not_completed");
  });

  test("rejects when the reviewer isn't the booking's client", async () => {
    const b = await makeBooking("completed");
    const res = await request(app)
      .post("/reviews")
      .set("x-test-user-id", "stranger")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("not_your_booking");
  });

  test("creates a verified review and updates the artist rating + count", async () => {
    const b = await makeBooking("completed");
    const res = await request(app)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 4, text: "solid", recommend: true });
    expect(res.status).toBe(201);

    const artist = await Artist.findOne({ clerkId: "artist_r" });
    expect(artist.rating).toBe(4);
    expect(artist.reviewsCount).toBe(1);
  });

  test("rejects a duplicate review for the same booking", async () => {
    const b = await makeBooking("completed");
    await request(app)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "a" });
    const dup = await request(app)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 1, text: "b" });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("already_reviewed");
  });
});
