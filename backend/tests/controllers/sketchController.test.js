import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockSketch = { create: jest.fn(), find: jest.fn(), findById: jest.fn() };
const mockBooking = { findById: jest.fn() };
const mockMessage = { create: jest.fn() };

jest.unstable_mockModule("../../models/Sketch.js", () => ({ default: mockSketch }));
jest.unstable_mockModule("../../models/Booking.js", () => ({ default: mockBooking }));
jest.unstable_mockModule("../../models/Message.js", () => ({ default: mockMessage }));

const { createSketch, listSketches, respondToSketch } = await import(
  "../../controllers/sketchController.js"
);

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.post("/sketches", mockAuth, createSketch);
app.get("/sketches", mockAuth, listSketches);
app.post("/sketches/:id/respond", mockAuth, respondToSketch);

beforeEach(() => {
  jest.clearAllMocks();
  mockBooking.findById.mockResolvedValue({ _id: "bk1", artistId: "a1", clientId: "c1" });
  mockSketch.create.mockResolvedValue({ _id: "sk1", status: "pending" });
  mockSketch.find.mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([{ _id: "sk1" }]) }) });
  mockSketch.findById.mockResolvedValue({
    _id: "sk1",
    clientId: "c1",
    artistId: "a1",
    bookingId: "bk1",
    save: jest.fn().mockResolvedValue(undefined),
  });
  mockMessage.create.mockResolvedValue({});
});

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

describe("createSketch", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).post("/sketches").send({})).status).toBe(401);
  });
  test("400 without a bookingId", async () => {
    const res = await request(server).post("/sketches").set("x-test-user-id", "a1").send({ imageUrls: ["u"] });
    expect(res.status).toBe(400);
  });
  test("400 with no images", async () => {
    const res = await request(server)
      .post("/sketches")
      .set("x-test-user-id", "a1")
      .send({ bookingId: "bk1", imageUrls: [] });
    expect(res.status).toBe(400);
  });
  test("404 when the booking doesn't exist", async () => {
    mockBooking.findById.mockResolvedValue(null);
    const res = await request(server)
      .post("/sketches")
      .set("x-test-user-id", "a1")
      .send({ bookingId: "bk1", imageUrls: ["u"] });
    expect(res.status).toBe(404);
  });
  test("403 when a non-artist tries to share", async () => {
    const res = await request(server)
      .post("/sketches")
      .set("x-test-user-id", "c1")
      .send({ bookingId: "bk1", imageUrls: ["u"] });
    expect(res.status).toBe(403);
  });
  test("creates the sketch and notifies the client", async () => {
    const res = await request(server)
      .post("/sketches")
      .set("x-test-user-id", "a1")
      .send({ bookingId: "bk1", imageUrls: [" u1 ", ""], note: "wip" });
    expect(res.status).toBe(201);
    expect(mockSketch.create).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "bk1", imageUrls: ["u1"], note: "wip" })
    );
    expect(mockMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ meta: expect.objectContaining({ kind: "sketch_shared" }) })
    );
  });
  test("500 on a write failure", async () => {
    mockSketch.create.mockRejectedValue(new Error("db"));
    const res = await request(server)
      .post("/sketches")
      .set("x-test-user-id", "a1")
      .send({ bookingId: "bk1", imageUrls: ["u"] });
    expect(res.status).toBe(500);
  });
});

describe("listSketches", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).get("/sketches")).status).toBe(401);
  });
  test("400 without a bookingId", async () => {
    expect((await request(server).get("/sketches").set("x-test-user-id", "c1")).status).toBe(400);
  });
  test("404 when the booking is missing", async () => {
    mockBooking.findById.mockResolvedValue(null);
    expect((await request(server).get("/sketches?bookingId=bk1").set("x-test-user-id", "c1")).status).toBe(404);
  });
  test("403 for a non-party", async () => {
    const res = await request(server).get("/sketches?bookingId=bk1").set("x-test-user-id", "stranger");
    expect(res.status).toBe(403);
  });
  test("returns the booking's sketches for a party", async () => {
    const res = await request(server).get("/sketches?bookingId=bk1").set("x-test-user-id", "c1");
    expect(res.body).toHaveLength(1);
  });
  test("500 on failure", async () => {
    mockBooking.findById.mockRejectedValue(new Error("db"));
    expect((await request(server).get("/sketches?bookingId=bk1").set("x-test-user-id", "c1")).status).toBe(500);
  });
});

describe("respondToSketch", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).post("/sketches/sk1/respond").send({ action: "approve" })).status).toBe(401);
  });
  test("400 for an invalid action", async () => {
    const res = await request(server).post("/sketches/sk1/respond").set("x-test-user-id", "c1").send({ action: "nope" });
    expect(res.status).toBe(400);
  });
  test("404 when the sketch is missing", async () => {
    mockSketch.findById.mockResolvedValue(null);
    const res = await request(server).post("/sketches/sk1/respond").set("x-test-user-id", "c1").send({ action: "approve" });
    expect(res.status).toBe(404);
  });
  test("403 when a non-client responds", async () => {
    const res = await request(server).post("/sketches/sk1/respond").set("x-test-user-id", "a1").send({ action: "approve" });
    expect(res.status).toBe(403);
  });
  test("approves the sketch and notifies the artist", async () => {
    const saved = { _id: "sk1", clientId: "c1", artistId: "a1", bookingId: "bk1", save: jest.fn().mockResolvedValue(undefined) };
    mockSketch.findById.mockResolvedValue(saved);
    const res = await request(server).post("/sketches/sk1/respond").set("x-test-user-id", "c1").send({ action: "approve" });
    expect(res.status).toBe(200);
    expect(saved.status).toBe("approved");
    expect(mockMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ meta: expect.objectContaining({ status: "approved" }) })
    );
  });
  test("records a change request", async () => {
    const saved = { _id: "sk1", clientId: "c1", artistId: "a1", bookingId: "bk1", save: jest.fn().mockResolvedValue(undefined) };
    mockSketch.findById.mockResolvedValue(saved);
    await request(server)
      .post("/sketches/sk1/respond")
      .set("x-test-user-id", "c1")
      .send({ action: "request_changes", note: "smaller" });
    expect(saved.status).toBe("changes_requested");
  });
  test("500 on failure", async () => {
    mockSketch.findById.mockRejectedValue(new Error("db"));
    const res = await request(server).post("/sketches/sk1/respond").set("x-test-user-id", "c1").send({ action: "approve" });
    expect(res.status).toBe(500);
  });
});
