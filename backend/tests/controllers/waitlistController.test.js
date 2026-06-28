import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockJoinWaitlist = jest.fn();
const mockLeaveWaitlist = jest.fn();
const mockGetMyWaitlist = jest.fn();
const mockGetArtistWaitlist = jest.fn();

jest.unstable_mockModule("../../services/waitlistService.js", () => ({
  joinWaitlist: mockJoinWaitlist,
  leaveWaitlist: mockLeaveWaitlist,
  getMyWaitlist: mockGetMyWaitlist,
  getArtistWaitlist: mockGetArtistWaitlist,
}));
jest.unstable_mockModule("../../lib/httpError.js", () => ({
  sendError: jest.fn((res) => res.status(500).json({ error: "server_error" })),
}));

const { join, leave, mine, forArtist } = await import("../../controllers/waitlistController.js");

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.post("/waitlist", mockAuth, join);
app.delete("/waitlist/:id", mockAuth, leave);
app.get("/waitlist/mine", mockAuth, mine);
app.get("/waitlist/artist", mockAuth, forArtist);

beforeEach(() => {
  jest.clearAllMocks();
  mockJoinWaitlist.mockResolvedValue({ _id: "w1" });
  mockLeaveWaitlist.mockResolvedValue({ _id: "w1" });
  mockGetMyWaitlist.mockResolvedValue([{ _id: "w1" }]);
  mockGetArtistWaitlist.mockResolvedValue([{ _id: "w2" }]);
});

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

describe("join", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).post("/waitlist").send({})).status).toBe(401);
  });
  test("creates a waitlist entry", async () => {
    const res = await request(server).post("/waitlist").set("x-test-user-id", "c1").send({ artistId: "a1" });
    expect(res.status).toBe(201);
    expect(mockJoinWaitlist).toHaveBeenCalledWith("c1", { artistId: "a1" });
  });
  test("delegates to sendError on failure", async () => {
    mockJoinWaitlist.mockRejectedValue(new Error("boom"));
    expect((await request(server).post("/waitlist").set("x-test-user-id", "c1").send({})).status).toBe(500);
  });
});

describe("leave", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).delete("/waitlist/w1")).status).toBe(401);
  });
  test("404 when the entry isn't found", async () => {
    mockLeaveWaitlist.mockResolvedValue(null);
    expect((await request(server).delete("/waitlist/w1").set("x-test-user-id", "c1")).status).toBe(404);
  });
  test("leaves the waitlist", async () => {
    const res = await request(server).delete("/waitlist/w1").set("x-test-user-id", "c1");
    expect(res.body).toEqual({ ok: true });
    expect(mockLeaveWaitlist).toHaveBeenCalledWith("c1", "w1");
  });
  test("delegates to sendError on failure", async () => {
    mockLeaveWaitlist.mockRejectedValue(new Error("boom"));
    expect((await request(server).delete("/waitlist/w1").set("x-test-user-id", "c1")).status).toBe(500);
  });
});

describe("mine", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).get("/waitlist/mine")).status).toBe(401);
  });
  test("returns the client's waitlist", async () => {
    const res = await request(server).get("/waitlist/mine").set("x-test-user-id", "c1");
    expect(res.body).toHaveLength(1);
  });
  test("delegates to sendError on failure", async () => {
    mockGetMyWaitlist.mockRejectedValue(new Error("boom"));
    expect((await request(server).get("/waitlist/mine").set("x-test-user-id", "c1")).status).toBe(500);
  });
});

describe("forArtist", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).get("/waitlist/artist")).status).toBe(401);
  });
  test("returns the artist's waitlist", async () => {
    const res = await request(server).get("/waitlist/artist").set("x-test-user-id", "a1");
    expect(res.body).toHaveLength(1);
    expect(mockGetArtistWaitlist).toHaveBeenCalledWith("a1");
  });
  test("delegates to sendError on failure", async () => {
    mockGetArtistWaitlist.mockRejectedValue(new Error("boom"));
    expect((await request(server).get("/waitlist/artist").set("x-test-user-id", "a1")).status).toBe(500);
  });
});
