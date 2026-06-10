import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockStudio = { findById: jest.fn() };
const mockMembership = { findOne: jest.fn() };

jest.unstable_mockModule("../../models/Studio.js", () => ({ default: mockStudio }));
jest.unstable_mockModule("../../models/StudioMembership.js", () => ({
  default: mockMembership,
}));

const { effectiveCommissionPct, computeArtistStudioSplit } = await import(
  "../../services/studioService.js"
);

function membershipFindOneReturns(value) {
  mockMembership.findOne.mockReturnValue({
    sort: () => Promise.resolve(value),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("effectiveCommissionPct", () => {
  test("uses the member override when set", () => {
    const studio = { defaultCommissionPct: 0.3 };
    expect(effectiveCommissionPct(studio, { commissionPct: 0.45 })).toBe(0.45);
  });

  test("falls back to studio default when override is null/undefined", () => {
    const studio = { defaultCommissionPct: 0.3 };
    expect(effectiveCommissionPct(studio, { commissionPct: null })).toBe(0.3);
    expect(effectiveCommissionPct(studio, {})).toBe(0.3);
  });

  test("clamps values into [0, 1]", () => {
    expect(effectiveCommissionPct({ defaultCommissionPct: 5 }, {})).toBe(1);
    expect(effectiveCommissionPct({}, { commissionPct: -2 })).toBe(0);
  });
});

describe("computeArtistStudioSplit — solo artists", () => {
  test("returns null when the artist has no active studio membership", async () => {
    membershipFindOneReturns(null);
    const split = await computeArtistStudioSplit("artist_1", 50000);
    expect(split).toBeNull();
  });

  test("returns null when the linked studio is inactive", async () => {
    membershipFindOneReturns({ studioId: "s1", commissionPct: null });
    mockStudio.findById.mockResolvedValue({ _id: "s1", active: false });
    const split = await computeArtistStudioSplit("artist_1", 50000);
    expect(split).toBeNull();
  });
});

describe("computeArtistStudioSplit — studio artists", () => {
  test("splits by the studio default commission", async () => {
    membershipFindOneReturns({ studioId: "s1", commissionPct: null });
    mockStudio.findById.mockResolvedValue({
      _id: "s1",
      active: true,
      defaultCommissionPct: 0.3,
      stripeConnectAccountId: "acct_studio",
      chargesEnabled: true,
    });

    const split = await computeArtistStudioSplit("artist_1", 50000);
    expect(split.commissionPct).toBe(0.3);
    expect(split.studioCents).toBe(15000);
    expect(split.artistCents).toBe(35000);
    expect(split.studioPayoutsReady).toBe(true);
  });

  test("a per-member override beats the studio default", async () => {
    membershipFindOneReturns({ studioId: "s1", commissionPct: 0.4 });
    mockStudio.findById.mockResolvedValue({
      _id: "s1",
      active: true,
      defaultCommissionPct: 0.3,
    });

    const split = await computeArtistStudioSplit("artist_1", 50000);
    expect(split.commissionPct).toBe(0.4);
    expect(split.studioCents).toBe(20000);
    expect(split.artistCents).toBe(30000);
  });

  test("studio + artist cents always sum back to the payable amount", async () => {
    membershipFindOneReturns({ studioId: "s1", commissionPct: 0.3333 });
    mockStudio.findById.mockResolvedValue({ _id: "s1", active: true });

    const payable = 12345;
    const split = await computeArtistStudioSplit("artist_1", payable);
    expect(split.studioCents + split.artistCents).toBe(payable);
  });

  test("studioPayoutsReady is false until the studio finishes Stripe onboarding", async () => {
    membershipFindOneReturns({ studioId: "s1", commissionPct: null });
    mockStudio.findById.mockResolvedValue({
      _id: "s1",
      active: true,
      defaultCommissionPct: 0.3,
      stripeConnectAccountId: "acct_studio",
      chargesEnabled: false,
    });

    const split = await computeArtistStudioSplit("artist_1", 50000);
    expect(split.studioPayoutsReady).toBe(false);
  });
});
