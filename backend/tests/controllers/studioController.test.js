import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

const ADMIN_ID = "admin-1";
process.env.ADMIN_CLERK_IDS = ADMIN_ID;

const mockStudio = { findOne: jest.fn(), findById: jest.fn(), find: jest.fn(), create: jest.fn() };
const mockMembership = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
};
const mockArtist = { findOne: jest.fn() };
const mockUser = { findOne: jest.fn(), find: jest.fn() };
const mockStripe = {
  accounts: { create: jest.fn(), retrieve: jest.fn() },
  accountLinks: { create: jest.fn() },
};
const mockEffectiveCommissionPct = jest.fn();
const mockHasSigned = jest.fn();

jest.unstable_mockModule("../../models/Studio.js", () => ({ default: mockStudio }));
jest.unstable_mockModule("../../models/StudioMembership.js", () => ({ default: mockMembership }));
jest.unstable_mockModule("../../models/Artist.js", () => ({ default: mockArtist }));
jest.unstable_mockModule("../../models/UserBase.js", () => ({ default: mockUser }));
jest.unstable_mockModule("../../lib/stripe.js", () => ({ stripe: mockStripe }));
jest.unstable_mockModule("../../services/studioService.js", () => ({
  effectiveCommissionPct: mockEffectiveCommissionPct,
}));
jest.unstable_mockModule("../../services/signatureGateService.js", () => ({
  hasSignedCurrentDocument: mockHasSigned,
}));
jest.unstable_mockModule("../../lib/httpError.js", () => ({
  sendError: jest.fn((res) => res.status(500).json({ error: "server_error" })),
}));

const C = await import("../../controllers/studioController.js");

function q(value) {
  return {
    select: () => q(value),
    lean: () => Promise.resolve(value),
    sort: () => q(value),
    then: (res, rej) => Promise.resolve(value).then(res, rej),
    catch: (rej) => Promise.resolve(value).catch(rej),
  };
}
function qReject(err) {
  return {
    select: () => qReject(err),
    lean: () => Promise.reject(err),
    sort: () => qReject(err),
    then: (res, rej) => Promise.reject(err).then(res, rej),
    catch: (rej) => Promise.reject(err).catch(rej),
  };
}
const makeStudio = (over = {}) => ({
  _id: "s1",
  ownerClerkId: "owner1",
  email: "s@x.com",
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});
const makeMembership = (over = {}) => ({
  _id: "m1",
  artistClerkId: "art1",
  status: "invited",
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.post("/studios", mockAuth, C.createStudio);
app.get("/studios/:studioId", C.getStudio);
app.get("/me/studios", mockAuth, C.getMyStudios);
app.patch("/studios/:studioId", mockAuth, C.updateStudio);
app.get("/studios/:studioId/members", mockAuth, C.listMembers);
app.post("/studios/:studioId/invite", mockAuth, C.inviteArtist);
app.get("/me/memberships", mockAuth, C.getMyMemberships);
app.post("/memberships/:membershipId/respond", mockAuth, C.respondToInvite);
app.patch("/studios/:studioId/members/:artistClerkId", mockAuth, C.updateMember);
app.delete("/studios/:studioId/members/:artistClerkId", mockAuth, C.removeMember);
app.post("/studios/:studioId/connect", mockAuth, C.createStudioConnect);
app.post("/studios/:studioId/connect/link", mockAuth, C.createStudioAccountLink);
app.post("/studios/:studioId/verify", mockAuth, C.setStudioVerification);
app.get("/studios/:studioId/connect/status", mockAuth, C.getStudioConnectStatus);

beforeEach(() => {
  jest.clearAllMocks();
  mockStudio.findOne.mockReturnValue(q(null));
  mockStudio.findById.mockReturnValue(q(makeStudio()));
  mockStudio.find.mockReturnValue(q([]));
  mockStudio.create.mockResolvedValue(makeStudio());
  mockMembership.findOne.mockReturnValue(q(null));
  mockMembership.findById.mockReturnValue(q(makeMembership()));
  mockMembership.find.mockReturnValue(q([]));
  mockMembership.findOneAndUpdate.mockResolvedValue(makeMembership());
  mockArtist.findOne.mockReturnValue(q({ _id: "art_id" }));
  mockUser.findOne.mockReturnValue(q({ clerkId: "art1" }));
  mockUser.find.mockReturnValue(q([]));
  mockStripe.accounts.create.mockResolvedValue({ id: "acct_1", charges_enabled: true, payouts_enabled: true, requirements: { currently_due: [] } });
  mockStripe.accounts.retrieve.mockResolvedValue({ id: "acct_1", charges_enabled: true, payouts_enabled: true, requirements: { currently_due: [] } });
  mockStripe.accountLinks.create.mockResolvedValue({ url: "https://onboard" });
  mockEffectiveCommissionPct.mockReturnValue(0.5);
  mockHasSigned.mockResolvedValue(true);
});

describe("createStudio", () => {
  test("401 unauthenticated", async () => {
    expect((await request(app).post("/studios").send({ name: "Ink" })).status).toBe(401);
  });
  test("400 without a name", async () => {
    expect((await request(app).post("/studios").set("x-test-user-id", "u1").send({})).status).toBe(400);
  });
  test("creates a studio owned by the actor with a clamped commission", async () => {
    const res = await request(app).post("/studios").set("x-test-user-id", "u1").send({ name: "Ink Co", defaultCommissionPct: 5 });
    expect(res.status).toBe(201);
    expect(mockStudio.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ink Co", ownerClerkId: "u1", defaultCommissionPct: 1 })
    );
  });
  test("500 on failure", async () => {
    mockStudio.create.mockRejectedValue(new Error("db"));
    expect((await request(app).post("/studios").set("x-test-user-id", "u1").send({ name: "X" })).status).toBe(500);
  });
  test("retries the slug when the first candidate is taken", async () => {
    mockStudio.findOne
      .mockReturnValueOnce(q({ _id: "taken" }))
      .mockReturnValueOnce(q(null));
    const res = await request(app).post("/studios").set("x-test-user-id", "u1").send({ name: "Ink" });
    expect(res.status).toBe(201);
    expect(mockStudio.findOne).toHaveBeenCalledTimes(2);
  });
});

describe("getStudio", () => {
  test("404 when missing", async () => {
    mockStudio.findById.mockReturnValue(q(null));
    expect((await request(app).get("/studios/s1")).status).toBe(404);
  });
  test("strips private payout fields", async () => {
    mockStudio.findById.mockReturnValue(q({ _id: "s1", name: "Ink", stripeConnectAccountId: "acct_secret", chargesEnabled: true }));
    const res = await request(app).get("/studios/s1");
    expect(res.body.stripeConnectAccountId).toBeUndefined();
    expect(res.body.chargesEnabled).toBeUndefined();
    expect(res.body.name).toBe("Ink");
  });
  test("400 on a bad id (CastError)", async () => {
    mockStudio.findById.mockReturnValue({ lean: () => Promise.reject(Object.assign(new Error("cast"), { name: "CastError" })) });
    expect((await request(app).get("/studios/bad")).status).toBe(400);
  });
});

describe("getMyStudios", () => {
  test("401 unauthenticated", async () => {
    expect((await request(app).get("/me/studios")).status).toBe(401);
  });
  test("merges owned and member studios without duplicates", async () => {
    mockStudio.find
      .mockReturnValueOnce(q([{ _id: "s1" }]))
      .mockReturnValueOnce(q([{ _id: "s2" }]));
    mockMembership.find.mockReturnValue(q([{ studioId: "s2" }]));
    const res = await request(app).get("/me/studios").set("x-test-user-id", "u1");
    expect(res.body.map((s) => s._id).sort()).toEqual(["s1", "s2"]);
  });
});

describe("updateStudio", () => {
  test("403 for a non-admin", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "someoneelse" })));
    expect((await request(app).patch("/studios/s1").set("x-test-user-id", "u1").send({ name: "X" })).status).toBe(403);
  });
  test("owner can update editable fields + clamp commission", async () => {
    const studio = makeStudio({ ownerClerkId: "u1" });
    mockStudio.findById.mockReturnValue(q(studio));
    const res = await request(app).patch("/studios/s1").set("x-test-user-id", "u1").send({ city: "NYC", defaultCommissionPct: -1 });
    expect(res.status).toBe(200);
    expect(studio.city).toBe("NYC");
    expect(studio.defaultCommissionPct).toBe(0);
    expect(studio.save).toHaveBeenCalled();
  });
});

describe("listMembers", () => {
  test("403 for a non-admin", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "x" })));
    expect((await request(app).get("/studios/s1/members").set("x-test-user-id", "u1")).status).toBe(403);
  });
  test("returns members with effective commission and artist profile", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    mockMembership.find.mockReturnValue(q([{ artistClerkId: "art1" }]));
    mockUser.find.mockReturnValue(q([{ clerkId: "art1", username: "Art" }]));
    const res = await request(app).get("/studios/s1/members").set("x-test-user-id", "u1");
    expect(res.body[0].effectiveCommissionPct).toBe(0.5);
    expect(res.body[0].artist.username).toBe("Art");
  });
});

describe("inviteArtist", () => {
  test("resolves a handle to a clerkId then upserts an invite", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    const res = await request(app).post("/studios/s1/invite").set("x-test-user-id", "u1").send({ handle: "@art", commissionPct: 0.4 });
    expect(res.status).toBe(201);
    expect(mockMembership.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ artistClerkId: "art1" }),
      expect.objectContaining({ status: "invited", commissionPct: 0.4 }),
      expect.objectContaining({ upsert: true })
    );
  });
  test("404 when the handle has no user", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    mockUser.findOne.mockReturnValue(q(null));
    expect((await request(app).post("/studios/s1/invite").set("x-test-user-id", "u1").send({ handle: "ghost" })).status).toBe(404);
  });
  test("404 when the target isn't an artist", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    mockArtist.findOne.mockReturnValue(q(null));
    expect((await request(app).post("/studios/s1/invite").set("x-test-user-id", "u1").send({ artistClerkId: "x" })).status).toBe(404);
  });
  test("400 without artistClerkId or handle", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    expect((await request(app).post("/studios/s1/invite").set("x-test-user-id", "u1").send({})).status).toBe(400);
  });
});

describe("getMyMemberships", () => {
  test("401 unauthenticated", async () => {
    expect((await request(app).get("/me/memberships")).status).toBe(401);
  });
  test("maps each membership to its studio with effective commission", async () => {
    mockMembership.find.mockReturnValue(q([{ studioId: "s1", artistClerkId: "art1" }]));
    mockStudio.find.mockReturnValue(q([{ _id: "s1", name: "Ink", city: "NYC" }]));
    const res = await request(app).get("/me/memberships").set("x-test-user-id", "art1");
    expect(res.body[0].studio.name).toBe("Ink");
    expect(res.body[0].effectiveCommissionPct).toBe(0.5);
  });
  test("returns a null studio when the studio is gone", async () => {
    mockMembership.find.mockReturnValue(q([{ studioId: "missing", artistClerkId: "art1" }]));
    mockStudio.find.mockReturnValue(q([]));
    const res = await request(app).get("/me/memberships").set("x-test-user-id", "art1");
    expect(res.body[0].studio).toBeNull();
  });
});

describe("error handling (catch -> 500)", () => {
  test("getStudio 500 on a non-cast error", async () => {
    mockStudio.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).get("/studios/s1")).status).toBe(500);
  });
  test("getMyStudios 500", async () => {
    mockStudio.find.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).get("/me/studios").set("x-test-user-id", "u1")).status).toBe(500);
  });
  test("updateStudio 500", async () => {
    mockStudio.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).patch("/studios/s1").set("x-test-user-id", "u1").send({})).status).toBe(500);
  });
  test("listMembers 500", async () => {
    mockStudio.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).get("/studios/s1/members").set("x-test-user-id", "u1")).status).toBe(500);
  });
  test("inviteArtist 500", async () => {
    mockStudio.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).post("/studios/s1/invite").set("x-test-user-id", "u1").send({ artistClerkId: "x" })).status).toBe(500);
  });
  test("getMyMemberships 500", async () => {
    mockMembership.find.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).get("/me/memberships").set("x-test-user-id", "art1")).status).toBe(500);
  });
  test("respondToInvite 500", async () => {
    mockMembership.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).post("/memberships/m1/respond").set("x-test-user-id", "art1").send({ action: "accept" })).status).toBe(500);
  });
  test("removeMember 500", async () => {
    mockStudio.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).delete("/studios/s1/members/art1").set("x-test-user-id", "art1")).status).toBe(500);
  });
  test("setStudioVerification 500", async () => {
    mockStudio.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).post("/studios/s1/verify").set("x-test-user-id", ADMIN_ID).send({ status: "verified" })).status).toBe(500);
  });
  test("createStudioConnect delegates to sendError", async () => {
    mockStudio.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).post("/studios/s1/connect").set("x-test-user-id", "u1")).status).toBe(500);
  });
  test("getStudioConnectStatus delegates to sendError", async () => {
    mockStudio.findById.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).get("/studios/s1/connect/status").set("x-test-user-id", "u1")).status).toBe(500);
  });
});

describe("admin/owner guards (403)", () => {
  test("inviteArtist 403 for a non-admin", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "x" })));
    expect((await request(app).post("/studios/s1/invite").set("x-test-user-id", "u1").send({ artistClerkId: "a" })).status).toBe(403);
  });
  test("updateMember 403 for a non-admin", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "x" })));
    expect((await request(app).patch("/studios/s1/members/art1").set("x-test-user-id", "u1").send({})).status).toBe(403);
  });
  test("createStudioAccountLink 403 for a non-owner", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "x" })));
    expect((await request(app).post("/studios/s1/connect/link").set("x-test-user-id", "u1")).status).toBe(403);
  });
  test("getStudioConnectStatus 403 for a non-admin", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "x" })));
    expect((await request(app).get("/studios/s1/connect/status").set("x-test-user-id", "u1")).status).toBe(403);
  });
  test("updateMember 500 when the write fails", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    mockMembership.findOne.mockReturnValue(qReject(new Error("db")));
    expect((await request(app).patch("/studios/s1/members/art1").set("x-test-user-id", "u1").send({ role: "manager" })).status).toBe(500);
  });
  test("createStudioAccountLink delegates to sendError on failure", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    mockStripe.accountLinks.create.mockRejectedValue(new Error("boom"));
    expect((await request(app).post("/studios/s1/connect/link").set("x-test-user-id", "u1")).status).toBe(500);
  });
});

describe("createStudioConnect existing", () => {
  test("returns the existing Connect account without creating one", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1", stripeConnectAccountId: "acct_old" })));
    const res = await request(app).post("/studios/s1/connect").set("x-test-user-id", "u1");
    expect(res.body).toEqual({ accountId: "acct_old", existing: true });
    expect(mockStripe.accounts.create).not.toHaveBeenCalled();
  });
});

describe("respondToInvite", () => {
  test("400 for an invalid action", async () => {
    expect((await request(app).post("/memberships/m1/respond").set("x-test-user-id", "art1").send({ action: "x" })).status).toBe(400);
  });
  test("403 when not the invited artist", async () => {
    mockMembership.findById.mockReturnValue(q(makeMembership({ artistClerkId: "other" })));
    expect((await request(app).post("/memberships/m1/respond").set("x-test-user-id", "art1").send({ action: "accept" })).status).toBe(403);
  });
  test("400 when the invite isn't pending", async () => {
    mockMembership.findById.mockReturnValue(q(makeMembership({ artistClerkId: "art1", status: "active" })));
    expect((await request(app).post("/memberships/m1/respond").set("x-test-user-id", "art1").send({ action: "accept" })).status).toBe(400);
  });
  test("accepting activates the membership", async () => {
    const m = makeMembership({ artistClerkId: "art1", status: "invited" });
    mockMembership.findById.mockReturnValue(q(m));
    await request(app).post("/memberships/m1/respond").set("x-test-user-id", "art1").send({ action: "accept" });
    expect(m.status).toBe("active");
  });
  test("declining marks it declined", async () => {
    const m = makeMembership({ artistClerkId: "art1", status: "invited" });
    mockMembership.findById.mockReturnValue(q(m));
    await request(app).post("/memberships/m1/respond").set("x-test-user-id", "art1").send({ action: "decline" });
    expect(m.status).toBe("declined");
  });
});

describe("updateMember + removeMember", () => {
  test("admin updates a member's commission and role", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    const m = makeMembership({ artistClerkId: "art1" });
    mockMembership.findOne.mockReturnValue(q(m));
    await request(app).patch("/studios/s1/members/art1").set("x-test-user-id", "u1").send({ commissionPct: 0.3, role: "manager" });
    expect(m.commissionPct).toBe(0.3);
    expect(m.role).toBe("manager");
  });
  test("an artist can remove themselves", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "x" })));
    const m = makeMembership({ artistClerkId: "art1" });
    mockMembership.findOne.mockReturnValue(q(m));
    const res = await request(app).delete("/studios/s1/members/art1").set("x-test-user-id", "art1");
    expect(res.body.ok).toBe(true);
    expect(m.status).toBe("removed");
  });
  test("a non-admin non-self cannot remove a member", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "x" })));
    expect((await request(app).delete("/studios/s1/members/art1").set("x-test-user-id", "stranger")).status).toBe(403);
  });
});

describe("studio Connect", () => {
  test("403 when not the owner", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "x" })));
    expect((await request(app).post("/studios/s1/connect").set("x-test-user-id", "u1")).status).toBe(403);
  });
  test("403 when the studio agreement isn't signed", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    mockHasSigned.mockResolvedValue(false);
    const res = await request(app).post("/studios/s1/connect").set("x-test-user-id", "u1");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("agreement_required");
  });
  test("creates an Express company account", async () => {
    const studio = makeStudio({ ownerClerkId: "u1" });
    mockStudio.findById.mockReturnValue(q(studio));
    const res = await request(app).post("/studios/s1/connect").set("x-test-user-id", "u1");
    expect(mockStripe.accounts.create).toHaveBeenCalledWith(expect.objectContaining({ business_type: "company" }));
    expect(studio.stripeConnectAccountId).toBe("acct_1");
    expect(res.body).toEqual({ accountId: "acct_1", existing: false });
  });
  test("account link creates the account first when missing", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1" })));
    const res = await request(app).post("/studios/s1/connect/link").set("x-test-user-id", "u1");
    expect(mockStripe.accountLinks.create).toHaveBeenCalled();
    expect(res.body).toEqual({ url: "https://onboard" });
  });
});

describe("setStudioVerification (admin)", () => {
  test("403 for non-admins", async () => {
    expect((await request(app).post("/studios/s1/verify").set("x-test-user-id", "u1").send({ status: "verified" })).status).toBe(403);
  });
  test("400 for an invalid status", async () => {
    expect((await request(app).post("/studios/s1/verify").set("x-test-user-id", ADMIN_ID).send({ status: "weird" })).status).toBe(400);
  });
  test("an admin verifies a studio", async () => {
    const studio = makeStudio();
    mockStudio.findById.mockReturnValue(q(studio));
    const res = await request(app).post("/studios/s1/verify").set("x-test-user-id", ADMIN_ID).send({ status: "verified" });
    expect(res.status).toBe(200);
    expect(studio.verificationStatus).toBe("verified");
    expect(studio.verifiedAt).toBeInstanceOf(Date);
  });
});

describe("getStudioConnectStatus", () => {
  test("not connected when there is no account", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1", stripeConnectAccountId: null })));
    const res = await request(app).get("/studios/s1/connect/status").set("x-test-user-id", "u1");
    expect(res.body.connected).toBe(false);
  });
  test("refreshes from Stripe when connected", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1", stripeConnectAccountId: "acct_1" })));
    const res = await request(app).get("/studios/s1/connect/status").set("x-test-user-id", "u1");
    expect(mockStripe.accounts.retrieve).toHaveBeenCalledWith("acct_1");
    expect(res.body).toMatchObject({ connected: true, chargesEnabled: true });
  });
  test("uses cached flags when the refresh fails", async () => {
    mockStudio.findById.mockReturnValue(q(makeStudio({ ownerClerkId: "u1", stripeConnectAccountId: "acct_1", chargesEnabled: true })));
    mockStripe.accounts.retrieve.mockRejectedValue(new Error("rate"));
    const res = await request(app).get("/studios/s1/connect/status").set("x-test-user-id", "u1");
    expect(res.body).toMatchObject({ connected: true, chargesEnabled: true });
  });
});
