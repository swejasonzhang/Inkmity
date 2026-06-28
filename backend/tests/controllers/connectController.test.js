import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockArtist = { findOne: jest.fn() };
const mockStripe = {
  accounts: { create: jest.fn(), retrieve: jest.fn(), createLoginLink: jest.fn() },
  accountLinks: { create: jest.fn() },
};
const mockHasSigned = jest.fn();

jest.unstable_mockModule("../../models/Artist.js", () => ({ default: mockArtist }));
jest.unstable_mockModule("../../lib/stripe.js", () => ({ stripe: mockStripe }));
jest.unstable_mockModule("../../services/signatureGateService.js", () => ({
  hasSignedCurrentDocument: mockHasSigned,
}));
jest.unstable_mockModule("../../lib/httpError.js", () => ({
  sendError: jest.fn((res) => res.status(500).json({ error: "server_error" })),
}));

const {
  createConnectAccount,
  createAccountLink,
  getConnectStatus,
  createLoginLink,
} = await import("../../controllers/connectController.js");

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.post("/connect/account", mockAuth, createConnectAccount);
app.post("/connect/account-link", mockAuth, createAccountLink);
app.get("/connect/status", mockAuth, getConnectStatus);
app.post("/connect/login-link", mockAuth, createLoginLink);

const makeArtist = (over = {}) => ({
  _id: "art_id",
  clerkId: "artist1",
  email: "a@x.com",
  stripeConnectAccountId: null,
  chargesEnabled: false,
  payoutsEnabled: false,
  connectRequirementsDue: [],
  onboardingCompletedAt: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

const ENABLED_ACCOUNT = {
  id: "acct_1",
  charges_enabled: true,
  payouts_enabled: true,
  requirements: { currently_due: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockArtist.findOne.mockResolvedValue(makeArtist());
  mockHasSigned.mockResolvedValue(true);
  mockStripe.accounts.create.mockResolvedValue(ENABLED_ACCOUNT);
  mockStripe.accounts.retrieve.mockResolvedValue(ENABLED_ACCOUNT);
  mockStripe.accounts.createLoginLink.mockResolvedValue({ url: "https://login" });
  mockStripe.accountLinks.create.mockResolvedValue({ url: "https://onboard" });
});

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

describe("requireArtist guard (shared)", () => {
  test("401 when unauthenticated", async () => {
    const res = await request(server).post("/connect/account");
    expect(res.status).toBe(401);
  });

  test("403 when the user is not an artist", async () => {
    mockArtist.findOne.mockResolvedValue(null);
    const res = await request(server).post("/connect/account").set("x-test-user-id", "artist1");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Only artists can set up payouts");
  });
});

describe("createConnectAccount", () => {
  test("403 when the artist agreement isn't signed", async () => {
    mockHasSigned.mockResolvedValue(false);
    const res = await request(server).post("/connect/account").set("x-test-user-id", "artist1");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("agreement_required");
    expect(mockStripe.accounts.create).not.toHaveBeenCalled();
  });

  test("returns the existing account without creating a new one", async () => {
    mockArtist.findOne.mockResolvedValue(makeArtist({ stripeConnectAccountId: "acct_existing" }));
    const res = await request(server).post("/connect/account").set("x-test-user-id", "artist1");
    expect(res.body).toEqual({ accountId: "acct_existing", existing: true });
    expect(mockStripe.accounts.create).not.toHaveBeenCalled();
  });

  test("creates an Express account and syncs the onboarding flags", async () => {
    const artist = makeArtist();
    mockArtist.findOne.mockResolvedValue(artist);
    const res = await request(server).post("/connect/account").set("x-test-user-id", "artist1");

    expect(mockStripe.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "express", email: "a@x.com" })
    );
    expect(artist.stripeConnectAccountId).toBe("acct_1");
    expect(artist.chargesEnabled).toBe(true);
    expect(artist.payoutsEnabled).toBe(true);
    expect(artist.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(artist.save).toHaveBeenCalled();
    expect(res.body).toEqual({ accountId: "acct_1", existing: false });
  });

  test("delegates to sendError on a Stripe failure", async () => {
    mockStripe.accounts.create.mockRejectedValue(new Error("stripe_down"));
    const res = await request(server).post("/connect/account").set("x-test-user-id", "artist1");
    expect(res.status).toBe(500);
  });
});

describe("createAccountLink", () => {
  test("creates an onboarding link for an existing account", async () => {
    mockArtist.findOne.mockResolvedValue(makeArtist({ stripeConnectAccountId: "acct_x" }));
    const res = await request(server).post("/connect/account-link").set("x-test-user-id", "artist1");
    expect(mockStripe.accounts.create).not.toHaveBeenCalled();
    expect(mockStripe.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({ account: "acct_x", type: "account_onboarding" })
    );
    expect(res.body).toEqual({ url: "https://onboard" });
  });

  test("creates the account first when the artist has none, then the link", async () => {
    const res = await request(server).post("/connect/account-link").set("x-test-user-id", "artist1");
    expect(mockStripe.accounts.create).toHaveBeenCalled();
    expect(mockStripe.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({ account: "acct_1" })
    );
    expect(res.body).toEqual({ url: "https://onboard" });
  });

  test("delegates to sendError when the link call fails", async () => {
    mockArtist.findOne.mockResolvedValue(makeArtist({ stripeConnectAccountId: "acct_x" }));
    mockStripe.accountLinks.create.mockRejectedValue(new Error("boom"));
    const res = await request(server).post("/connect/account-link").set("x-test-user-id", "artist1");
    expect(res.status).toBe(500);
  });
});

describe("getConnectStatus", () => {
  test("reports not-connected when there is no Connect account", async () => {
    const res = await request(server).get("/connect/status").set("x-test-user-id", "artist1");
    expect(res.body).toEqual({
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
    });
    expect(mockStripe.accounts.retrieve).not.toHaveBeenCalled();
  });

  test("refreshes flags from Stripe when connected", async () => {
    mockArtist.findOne.mockResolvedValue(makeArtist({ stripeConnectAccountId: "acct_x" }));
    const res = await request(server).get("/connect/status").set("x-test-user-id", "artist1");
    expect(mockStripe.accounts.retrieve).toHaveBeenCalledWith("acct_x");
    expect(res.body).toMatchObject({ connected: true, chargesEnabled: true, payoutsEnabled: true });
  });

  test("falls back to cached flags when the Stripe refresh fails", async () => {
    mockArtist.findOne.mockResolvedValue(
      makeArtist({ stripeConnectAccountId: "acct_x", chargesEnabled: true })
    );
    mockStripe.accounts.retrieve.mockRejectedValue(new Error("rate_limited"));
    const res = await request(server).get("/connect/status").set("x-test-user-id", "artist1");
    expect(res.body).toMatchObject({ connected: true, chargesEnabled: true });
  });

  test("delegates to sendError when the artist lookup throws", async () => {
    mockArtist.findOne.mockRejectedValue(new Error("db_down"));
    const res = await request(server).get("/connect/status").set("x-test-user-id", "artist1");
    expect(res.status).toBe(500);
  });
});

describe("createLoginLink", () => {
  test("400 when the artist has no Connect account", async () => {
    const res = await request(server).post("/connect/login-link").set("x-test-user-id", "artist1");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("no_connect_account");
  });

  test("returns a Stripe Express dashboard login link", async () => {
    mockArtist.findOne.mockResolvedValue(makeArtist({ stripeConnectAccountId: "acct_x" }));
    const res = await request(server).post("/connect/login-link").set("x-test-user-id", "artist1");
    expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith("acct_x");
    expect(res.body).toEqual({ url: "https://login" });
  });

  test("delegates to sendError when the login-link call fails", async () => {
    mockArtist.findOne.mockResolvedValue(makeArtist({ stripeConnectAccountId: "acct_x" }));
    mockStripe.accounts.createLoginLink.mockRejectedValue(new Error("boom"));
    const res = await request(server).post("/connect/login-link").set("x-test-user-id", "artist1");
    expect(res.status).toBe(500);
  });
});
