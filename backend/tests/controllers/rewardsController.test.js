import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

const ADMIN_ID = "admin-1";
process.env.ADMIN_CLERK_IDS = ADMIN_ID;

const mockGetRewardsSummary = jest.fn();
const mockGetAvailableCreditCents = jest.fn();
const mockGrantCredit = jest.fn();
const mockMaybeGrantBirthdayCredit = jest.fn();

jest.unstable_mockModule("../../services/rewardsService.js", () => ({
  getRewardsSummary: mockGetRewardsSummary,
}));
jest.unstable_mockModule("../../services/creditsService.js", () => ({
  getAvailableCreditCents: mockGetAvailableCreditCents,
  grantCredit: mockGrantCredit,
  maybeGrantBirthdayCredit: mockMaybeGrantBirthdayCredit,
}));
jest.unstable_mockModule("../../lib/httpError.js", () => ({
  sendError: jest.fn((res) => res.status(500).json({ error: "server_error" })),
}));

const { getMyCredits, grantCreditToClient, getMyRewards } = await import(
  "../../controllers/rewardsController.js"
);

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.get("/rewards/credits", mockAuth, getMyCredits);
app.post("/rewards/grant", mockAuth, grantCreditToClient);
app.get("/rewards", mockAuth, getMyRewards);

beforeEach(() => {
  jest.clearAllMocks();
  mockMaybeGrantBirthdayCredit.mockResolvedValue(undefined);
  mockGetAvailableCreditCents.mockResolvedValue(2500);
  mockGetRewardsSummary.mockResolvedValue({ tier: "bronze", availableCents: 2500 });
  mockGrantCredit.mockResolvedValue({ _id: "credit1", amountCents: 1000 });
});

describe("getMyCredits", () => {
  test("401 when unauthenticated", async () => {
    const res = await request(app).get("/rewards/credits");
    expect(res.status).toBe(401);
  });

  test("checks for a birthday credit then returns the available balance", async () => {
    const res = await request(app).get("/rewards/credits").set("x-test-user-id", "c1");
    expect(mockMaybeGrantBirthdayCredit).toHaveBeenCalledWith("c1");
    expect(res.body).toEqual({ availableCents: 2500 });
  });

  test("500 when the credit lookup throws", async () => {
    mockGetAvailableCreditCents.mockRejectedValue(new Error("db"));
    const res = await request(app).get("/rewards/credits").set("x-test-user-id", "c1");
    expect(res.status).toBe(500);
  });
});

describe("grantCreditToClient", () => {
  test("401 when unauthenticated", async () => {
    const res = await request(app).post("/rewards/grant").send({});
    expect(res.status).toBe(401);
  });

  test("403 for a non-admin", async () => {
    const res = await request(app).post("/rewards/grant").set("x-test-user-id", "c1").send({});
    expect(res.status).toBe(403);
  });

  test("400 when clientId is missing", async () => {
    const res = await request(app).post("/rewards/grant").set("x-test-user-id", ADMIN_ID).send({});
    expect(res.status).toBe(400);
  });

  test("grants a credit as an admin", async () => {
    const res = await request(app)
      .post("/rewards/grant")
      .set("x-test-user-id", ADMIN_ID)
      .send({ clientId: "c1", amountCents: 1000, reason: "goodwill" });
    expect(res.status).toBe(201);
    expect(mockGrantCredit).toHaveBeenCalledWith(
      "c1",
      1000,
      "goodwill",
      expect.objectContaining({ grantedBy: ADMIN_ID })
    );
  });

  test("delegates to sendError when the grant fails", async () => {
    mockGrantCredit.mockRejectedValue(new Error("boom"));
    const res = await request(app)
      .post("/rewards/grant")
      .set("x-test-user-id", ADMIN_ID)
      .send({ clientId: "c1", amountCents: 1000 });
    expect(res.status).toBe(500);
  });
});

describe("getMyRewards", () => {
  test("401 when unauthenticated", async () => {
    const res = await request(app).get("/rewards");
    expect(res.status).toBe(401);
  });

  test("returns the rewards summary", async () => {
    const res = await request(app).get("/rewards").set("x-test-user-id", "c1");
    expect(res.body).toMatchObject({ tier: "bronze" });
  });

  test("500 when the summary throws", async () => {
    mockGetRewardsSummary.mockRejectedValue(new Error("db"));
    const res = await request(app).get("/rewards").set("x-test-user-id", "c1");
    expect(res.status).toBe(500);
  });
});
