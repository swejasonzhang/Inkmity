import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockArtistPolicy = { findOne: jest.fn(), create: jest.fn(), findOneAndUpdate: jest.fn() };
const mockPermission = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };
const mockArtist = { findOne: jest.fn() };
const mockGetIO = jest.fn();

jest.unstable_mockModule("../../models/ArtistPolicy.js", () => ({ default: mockArtistPolicy }));
jest.unstable_mockModule("../../models/ClientBookingPermission.js", () => ({ default: mockPermission }));
jest.unstable_mockModule("../../models/Artist.js", () => ({ default: mockArtist }));
jest.unstable_mockModule("../../services/socketService.js", () => ({
  getIO: mockGetIO,
  userRoom: (id) => `user:${id}`,
}));

const { getArtistPolicy, upsertArtistPolicy, getBookingGate, enableClientBookings } = await import(
  "../../controllers/artistPolicyController.js"
);

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.get("/policy/:artistId", getArtistPolicy);
app.put("/policy/:artistId", mockAuth, upsertArtistPolicy);
app.get("/gate/:artistId", mockAuth, getBookingGate);
app.post("/enable", mockAuth, enableClientBookings);

const CONFIGURED_DEPOSIT = { mode: "percent", percent: 0.2, minCents: 5000 };

beforeEach(() => {
  jest.clearAllMocks();
  mockArtistPolicy.findOne.mockResolvedValue({ artistId: "a1", deposit: CONFIGURED_DEPOSIT });
  mockArtistPolicy.create.mockResolvedValue({ artistId: "a1" });
  mockArtistPolicy.findOneAndUpdate.mockResolvedValue({ artistId: "a1", bookingEnabled: true });
  mockPermission.findOne.mockResolvedValue({ enabled: true, maxSessions: 3, pieceSize: "medium" });
  mockPermission.findOneAndUpdate.mockResolvedValue({ enabled: true });
  mockArtist.findOne.mockResolvedValue({ stripeConnectAccountId: "acct_1", chargesEnabled: true });
  mockGetIO.mockReturnValue(null);
});

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

describe("getArtistPolicy", () => {
  test("returns the existing policy", async () => {
    const res = await request(server).get("/policy/a1");
    expect(res.status).toBe(200);
    expect(res.body.artistId).toBe("a1");
  });

  test("creates a default policy when none exists", async () => {
    mockArtistPolicy.findOne.mockResolvedValue(null);
    await request(server).get("/policy/a1");
    expect(mockArtistPolicy.create).toHaveBeenCalledWith({ artistId: "a1" });
  });

  test("500 when the lookup throws", async () => {
    mockArtistPolicy.findOne.mockRejectedValue(new Error("db"));
    const res = await request(server).get("/policy/a1");
    expect(res.status).toBe(500);
  });
});

describe("upsertArtistPolicy", () => {
  test("401 when unauthenticated", async () => {
    const res = await request(server).put("/policy/a1").send({});
    expect(res.status).toBe(401);
  });

  test("403 when a different user tries to edit the policy", async () => {
    const res = await request(server).put("/policy/a1").set("x-test-user-id", "other").send({});
    expect(res.status).toBe(403);
  });

  test("saves the deposit policy for the owning artist", async () => {
    const res = await request(server)
      .put("/policy/a1")
      .set("x-test-user-id", "a1")
      .send({ deposit: { mode: "flat", amountCents: 6000 } });
    expect(res.status).toBe(200);
    expect(mockArtistPolicy.findOneAndUpdate).toHaveBeenCalledWith(
      { artistId: "a1" },
      expect.objectContaining({ $set: expect.objectContaining({ deposit: expect.objectContaining({ amountCents: 6000 }) }) }),
      expect.objectContaining({ upsert: true })
    );
  });

  test("rejects enabling bookings without a configured deposit", async () => {
    const res = await request(server)
      .put("/policy/a1")
      .set("x-test-user-id", "a1")
      .send({ bookingEnabled: true, deposit: { mode: "percent", percent: 0, minCents: 0 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("deposit_required");
  });

  test("enables bookings when a valid deposit is configured", async () => {
    await request(server)
      .put("/policy/a1")
      .set("x-test-user-id", "a1")
      .send({ bookingEnabled: true, deposit: { mode: "flat", amountCents: 6000 } });
    expect(mockArtistPolicy.findOneAndUpdate).toHaveBeenCalledWith(
      { artistId: "a1" },
      expect.objectContaining({ $set: expect.objectContaining({ bookingEnabled: true }) }),
      expect.anything()
    );
  });

  test("can explicitly disable bookings", async () => {
    await request(server)
      .put("/policy/a1")
      .set("x-test-user-id", "a1")
      .send({ bookingEnabled: false, deposit: { mode: "flat", amountCents: 6000 } });
    expect(mockArtistPolicy.findOneAndUpdate).toHaveBeenCalledWith(
      { artistId: "a1" },
      expect.objectContaining({ $set: expect.objectContaining({ bookingEnabled: false }) }),
      expect.anything()
    );
  });

  test("500 when the update throws", async () => {
    mockArtistPolicy.findOneAndUpdate.mockRejectedValue(new Error("db"));
    const res = await request(server)
      .put("/policy/a1")
      .set("x-test-user-id", "a1")
      .send({ deposit: { mode: "flat", amountCents: 6000 } });
    expect(res.status).toBe(500);
  });
});

describe("getBookingGate", () => {
  test("reports not-found when the artist has no policy", async () => {
    mockArtistPolicy.findOne.mockResolvedValue(null);
    const res = await request(server).get("/gate/a1").set("x-test-user-id", "c1");
    expect(res.body).toMatchObject({ enabled: false, depositConfigured: false });
  });

  test("enabled when the client is permitted and payouts are ready", async () => {
    const res = await request(server).get("/gate/a1?clientId=c1").set("x-test-user-id", "c1");
    expect(res.body).toMatchObject({
      enabled: true,
      depositConfigured: true,
      payoutsReady: true,
      maxSessions: 3,
    });
  });

  test("not enabled when the artist's payouts aren't ready", async () => {
    mockArtist.findOne.mockResolvedValue({ stripeConnectAccountId: null, chargesEnabled: false });
    const res = await request(server).get("/gate/a1?clientId=c1").set("x-test-user-id", "c1");
    expect(res.body.enabled).toBe(false);
    expect(res.body.payoutsReady).toBe(false);
    expect(res.body.message).toMatch(/payment setup/);
  });

  test("500 when the lookup throws", async () => {
    mockArtistPolicy.findOne.mockRejectedValue(new Error("db"));
    const res = await request(server).get("/gate/a1").set("x-test-user-id", "c1");
    expect(res.status).toBe(500);
  });
});

describe("enableClientBookings", () => {
  test("400 when artistId or clientId is missing", async () => {
    const res = await request(server).post("/enable").set("x-test-user-id", "a1").send({ artistId: "a1" });
    expect(res.status).toBe(400);
  });

  test("403 when the actor isn't the artist", async () => {
    const res = await request(server)
      .post("/enable")
      .set("x-test-user-id", "other")
      .send({ artistId: "a1", clientId: "c1" });
    expect(res.status).toBe(403);
  });

  test("400 when the artist has no policy", async () => {
    mockArtistPolicy.findOne.mockResolvedValue(null);
    const res = await request(server)
      .post("/enable")
      .set("x-test-user-id", "a1")
      .send({ artistId: "a1", clientId: "c1" });
    expect(res.status).toBe(400);
  });

  test("400 when the deposit isn't configured", async () => {
    mockArtistPolicy.findOne.mockResolvedValue({ deposit: { mode: "percent", percent: 0, minCents: 0 } });
    const res = await request(server)
      .post("/enable")
      .set("x-test-user-id", "a1")
      .send({ artistId: "a1", clientId: "c1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("deposit_required");
  });

  test("enables bookings, derives sessions from piece size, and notifies the client", async () => {
    const io = { to: jest.fn(() => ({ emit: jest.fn() })) };
    mockGetIO.mockReturnValue(io);
    const res = await request(server)
      .post("/enable")
      .set("x-test-user-id", "a1")
      .send({ artistId: "a1", clientId: "c1", pieceSize: "large" });
    expect(res.body.ok).toBe(true);
    expect(mockPermission.findOneAndUpdate).toHaveBeenCalledWith(
      { artistId: "a1", clientId: "c1" },
      expect.objectContaining({ enabled: true, pieceSize: "large", maxSessions: 3 }),
      expect.objectContaining({ upsert: true })
    );
    expect(io.to).toHaveBeenCalledWith("user:c1");
  });

  test("500 when the permission write throws", async () => {
    mockPermission.findOneAndUpdate.mockRejectedValue(new Error("db"));
    const res = await request(server)
      .post("/enable")
      .set("x-test-user-id", "a1")
      .send({ artistId: "a1", clientId: "c1" });
    expect(res.status).toBe(500);
  });
});
