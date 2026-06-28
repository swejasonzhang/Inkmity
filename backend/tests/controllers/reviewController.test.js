import { jest, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";
import "../../models/UserBase.js";
import Artist from "../../models/Artist.js";
import Client from "../../models/Client.js";
import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import Review from "../../models/Review.js";
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

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

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

  test("returns 401 when there is no authenticated reviewer", async () => {
    const b = await makeBooking("completed");
    const res = await request(server)
      .post("/reviews")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "x" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  test("rejects an out-of-range / non-numeric rating", async () => {
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: "anything", rating: 9, text: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_rating");

    const res2 = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: "anything", rating: "abc", text: "x" });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toBe("invalid_rating");
  });

  test("returns 404 when the booking does not exist", async () => {
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(new mongoose.Types.ObjectId()), rating: 5, text: "x" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("booking_not_found");
  });

  test("rejects when the supplied artistClerkId does not match the booking", async () => {
    const b = await makeBooking("completed");
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "someone_else", bookingId: String(b._id), rating: 5, text: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("artist_mismatch");
  });

  test("returns 404 when the artist user does not exist", async () => {
    await Artist.deleteOne({ clerkId: "artist_r" });
    const b = await makeBooking("completed");
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "x" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Artist not found");
  });

  test("returns 404 when the reviewer user does not exist", async () => {
    await Client.deleteOne({ clerkId: "client_r" });
    const b = await makeBooking("completed");
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "x" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("reviewer_not_found");
  });

  test("translates a duplicate-key (11000) error into a 409 already_reviewed", async () => {
    const b = await makeBooking("completed");
    const dupErr = Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
    const spy = jest.spyOn(Review, "create").mockRejectedValueOnce(dupErr);
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "x" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("already_reviewed");
    spy.mockRestore();
  });

  test("returns 500 when an unexpected error is thrown", async () => {
    const b = await makeBooking("completed");
    const spy = jest.spyOn(Review, "create").mockRejectedValueOnce(new Error("boom"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "x" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to add review");
    spy.mockRestore();
    errSpy.mockRestore();
  });

  test("recomputes the average rating across multiple reviews and runs the dedupe callback", async () => {
    const artist = await Artist.findOne({ clerkId: "artist_r" });
    const priorReviewer = new mongoose.Types.ObjectId();
    const priorBooking = await makeBooking("completed");
    const prior = await Review.create({
      reviewer: priorReviewer,
      artist: artist._id,
      bookingId: priorBooking._id,
      rating: 2,
    });
    artist.reviews = [prior._id];
    await artist.save();

    const b = await makeBooking("completed");
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 4, text: "ok" });
    expect(res.status).toBe(201);

    const updated = await Artist.findOne({ clerkId: "artist_r" });
    expect(updated.rating).toBe(3);
    expect(updated.reviewsCount).toBe(2);
    expect(updated.reviews.map(String)).toContain(String(res.body._id));
    expect(updated.reviews.map(String).filter((r) => r === String(prior._id))).toHaveLength(1);
  });

  test("persists the review document and links it onto the artist", async () => {
    const b = await makeBooking("completed");
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, comment: "amazing", recommend: true });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe("amazing");
    expect(res.body.recommend).toBe(true);

    const stored = await Review.findOne({ bookingId: b._id });
    expect(stored).not.toBeNull();
    expect(String(stored._id)).toBe(String(res.body._id));

    const artist = await Artist.findOne({ clerkId: "artist_r" });
    expect(artist.reviews.map(String)).toContain(String(stored._id));
  });

  test("requires a bookingId", async () => {
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", rating: 5, text: "great" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("booking_required");
  });

  test("rejects a review on a booking that isn't completed", async () => {
    const b = await makeBooking("pending");
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "great" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("not_completed");
  });

  test("rejects when the reviewer isn't the booking's client", async () => {
    const b = await makeBooking("completed");
    const res = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "stranger")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("not_your_booking");
  });

  test("creates a verified review and updates the artist rating + count", async () => {
    const b = await makeBooking("completed");
    const res = await request(server)
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
    await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 5, text: "a" });
    const dup = await request(server)
      .post("/reviews")
      .set("x-test-user-id", "client_r")
      .send({ artistClerkId: "artist_r", bookingId: String(b._id), rating: 1, text: "b" });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("already_reviewed");
  });

  test("enforces a DB-level unique index on bookingId (race-safe)", async () => {
    await Review.init();
    const b = await makeBooking("completed");
    const reviewerId = new mongoose.Types.ObjectId();
    const artistId = new mongoose.Types.ObjectId();
    await Review.create({ reviewer: reviewerId, artist: artistId, bookingId: b._id, rating: 5 });
    await expect(
      Review.create({ reviewer: reviewerId, artist: artistId, bookingId: b._id, rating: 1 })
    ).rejects.toMatchObject({ code: 11000 });
  });
});
