import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockArtist = { findOne: jest.fn() };
const mockStripe = { accounts: { update: jest.fn() } };
const mockComputeArtistTier = jest.fn();

jest.unstable_mockModule("../../models/Artist.js", () => ({
  default: mockArtist,
}));

jest.unstable_mockModule("../../lib/stripe.js", () => ({
  stripe: mockStripe,
}));

jest.unstable_mockModule("../../services/artistTierService.js", () => ({
  computeArtistTier: mockComputeArtistTier,
}));

const { payoutScheduleForSpeed, applyPayoutScheduleForArtist } = await import(
  "../../services/payoutScheduleService.js"
);

describe("payoutScheduleForSpeed", () => {
  test("standard pays out on a slower daily schedule", () => {
    expect(payoutScheduleForSpeed("standard")).toEqual({
      interval: "daily",
      delay_days: 7,
    });
  });

  test("two_day (Pro) pays out in 2 days", () => {
    expect(payoutScheduleForSpeed("two_day")).toEqual({
      interval: "daily",
      delay_days: 2,
    });
  });

  test("instant (Elite) uses the minimum payout delay", () => {
    expect(payoutScheduleForSpeed("instant")).toEqual({
      interval: "daily",
      delay_days: "minimum",
    });
  });

  test("unknown speed falls back to standard", () => {
    expect(payoutScheduleForSpeed("whatever").delay_days).toBe(7);
  });
});

describe("applyPayoutScheduleForArtist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does nothing when the artist is not found", async () => {
    mockArtist.findOne.mockResolvedValue(null);

    await applyPayoutScheduleForArtist("art-1");

    expect(mockArtist.findOne).toHaveBeenCalledWith({ clerkId: "art-1" });
    expect(mockComputeArtistTier).not.toHaveBeenCalled();
    expect(mockStripe.accounts.update).not.toHaveBeenCalled();
  });

  test("does nothing when the artist has no connect account", async () => {
    mockArtist.findOne.mockResolvedValue({ chargesEnabled: true });

    await applyPayoutScheduleForArtist("art-1");

    expect(mockStripe.accounts.update).not.toHaveBeenCalled();
  });

  test("does nothing when charges are not enabled", async () => {
    mockArtist.findOne.mockResolvedValue({
      stripeConnectAccountId: "acct_1",
      chargesEnabled: false,
    });

    await applyPayoutScheduleForArtist("art-1");

    expect(mockStripe.accounts.update).not.toHaveBeenCalled();
  });

  test("skips the update when the payout speed already matches the tier", async () => {
    mockArtist.findOne.mockResolvedValue({
      stripeConnectAccountId: "acct_1",
      chargesEnabled: true,
      payoutSpeed: "two_day",
      bookingsCount: 12,
      rating: 4.8,
    });
    mockComputeArtistTier.mockReturnValue({ payoutSpeed: "two_day" });

    await applyPayoutScheduleForArtist("art-1");

    expect(mockComputeArtistTier).toHaveBeenCalledWith(12, 4.8);
    expect(mockStripe.accounts.update).not.toHaveBeenCalled();
  });

  test("updates Stripe and persists the new payout speed when the tier changes", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const artist = {
      stripeConnectAccountId: "acct_42",
      chargesEnabled: true,
      payoutSpeed: "standard",
      bookingsCount: 50,
      rating: 5,
      save,
    };
    mockArtist.findOne.mockResolvedValue(artist);
    mockComputeArtistTier.mockReturnValue({ payoutSpeed: "instant" });

    await applyPayoutScheduleForArtist("art-1");

    expect(mockStripe.accounts.update).toHaveBeenCalledWith("acct_42", {
      settings: {
        payouts: { schedule: { interval: "daily", delay_days: "minimum" } },
      },
    });
    expect(artist.payoutSpeed).toBe("instant");
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("coerces the artistId to a string for the lookup", async () => {
    mockArtist.findOne.mockResolvedValue(null);

    await applyPayoutScheduleForArtist(12345);

    expect(mockArtist.findOne).toHaveBeenCalledWith({ clerkId: "12345" });
  });

  test("swallows errors and logs instead of throwing", async () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockArtist.findOne.mockRejectedValue(new Error("db down"));

    await expect(applyPayoutScheduleForArtist("art-1")).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalledWith(
      "applyPayoutScheduleForArtist failed:",
      "db down"
    );
    errSpy.mockRestore();
  });
});
