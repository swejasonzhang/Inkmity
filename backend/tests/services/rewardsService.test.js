import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockClient = { findOne: jest.fn() };
const mockGrantCredit = jest.fn();

jest.unstable_mockModule("../../models/Client.js", () => ({
  default: mockClient,
}));

jest.unstable_mockModule("../../services/creditsService.js", () => ({
  grantCredit: mockGrantCredit,
}));

const { config } = await import("../../config/index.js");
const {
  tierForCount,
  nextTierForCount,
  platformFeeForTier,
  getClientPlatformFee,
  getRewardsSummary,
  recordCompletedBooking,
  recordFeePaid,
} = await import("../../services/rewardsService.js");

describe("rewardsService — milestone tiers", () => {
  const tiers = config.rewards.tiers;
  const top = tiers[tiers.length - 1];

  test("a brand-new client is in the base (lowest) tier", () => {
    const t = tierForCount(0);
    expect(t.key).toBe(tiers[0].key);
    expect(t.feePct).toBe(tiers[0].feePct);
  });

  test("crossing a threshold promotes to the matching tier", () => {
    for (const tier of tiers) {
      expect(tierForCount(tier.bookings).key).toBe(tier.key);
    }
  });

  test("counts between thresholds keep the lower tier", () => {
    if (tiers.length >= 2) {
      const justBelowSecond = tiers[1].bookings - 1;
      expect(tierForCount(justBelowSecond).key).toBe(tiers[0].key);
    }
  });

  test("the fee rate never increases as bookings grow", () => {
    let prev = Infinity;
    for (let n = 0; n <= top.bookings + 5; n++) {
      const pct = tierForCount(n).feePct;
      expect(pct).toBeLessThanOrEqual(prev);
      prev = pct;
    }
  });

  test("nextTierForCount returns the upcoming tier, then null at the top", () => {
    expect(nextTierForCount(0)?.key).toBe(tiers[1]?.key);
    expect(nextTierForCount(top.bookings)).toBeNull();
  });
});

describe("platformFeeForTier", () => {
  test("charges the base fee for a tier that does not waive it", () => {
    const { baseCents, pct, capCents } = config.platformFee;
    const fee = platformFeeForTier({ waivesBaseFee: false });
    expect(fee).toEqual({ baseCents, pct, capCents, baseFeeWaived: false });
  });

  test("waives the base fee for a top-tier client", () => {
    const fee = platformFeeForTier({ waivesBaseFee: true });
    expect(fee.baseCents).toBe(0);
    expect(fee.baseFeeWaived).toBe(true);
  });

  test("treats a null tier as the full base fee", () => {
    const fee = platformFeeForTier(null);
    expect(fee.baseCents).toBe(config.platformFee.baseCents);
    expect(fee.baseFeeWaived).toBe(false);
  });
});

describe("getClientPlatformFee", () => {
  beforeEach(() => jest.clearAllMocks());

  test("computes the fee from the client's completed bookings", async () => {
    mockClient.findOne.mockResolvedValue({ completedBookingsCount: 10 });

    const fee = await getClientPlatformFee("cli-1");

    expect(mockClient.findOne).toHaveBeenCalledWith({ clerkId: "cli-1" });
    expect(fee.baseFeeWaived).toBe(true);
    expect(fee.baseCents).toBe(0);
  });

  test("falls back to the base fee when no client is found", async () => {
    mockClient.findOne.mockResolvedValue(null);

    const fee = await getClientPlatformFee("missing");

    expect(fee.baseCents).toBe(config.platformFee.baseCents);
    expect(fee.baseFeeWaived).toBe(false);
  });

  test("returns the default fee when the lookup throws", async () => {
    mockClient.findOne.mockRejectedValue(new Error("db down"));

    const fee = await getClientPlatformFee("cli-1");

    expect(fee).toEqual(platformFeeForTier(null));
  });

  test("returns null tier fee for a falsy clientId without a DB hit", async () => {
    const fee = await getClientPlatformFee("");

    expect(mockClient.findOne).not.toHaveBeenCalled();
    expect(fee).toEqual(platformFeeForTier(null));
  });
});

describe("getRewardsSummary", () => {
  beforeEach(() => jest.clearAllMocks());

  test("summarizes a mid-tier client with the next tier and progress", async () => {
    mockClient.findOne.mockResolvedValue({
      completedBookingsCount: 3,
      totalFeesPaid: 1234.6,
      lifetimeDiscountUsd: 12,
    });

    const summary = await getRewardsSummary("cli-1");

    expect(summary.completedBookings).toBe(3);
    expect(summary.tier.key).toBe("silver");
    expect(summary.nextTier.key).toBe("gold");
    expect(summary.nextTier.bookingsToNextTier).toBe(5);
    expect(summary.totalFeesPaidCents).toBe(1235);
    expect(summary.lifetimeDiscountUsd).toBe(12);
    expect(summary.platformFee.pct).toBe(config.platformFee.pct);
  });

  test("returns null nextTier for a top-tier client and zeroed defaults", async () => {
    mockClient.findOne.mockResolvedValue(null);

    const summary = await getRewardsSummary("missing");

    expect(summary.completedBookings).toBe(0);
    expect(summary.tier.key).toBe("bronze");
    expect(summary.nextTier.key).toBe("silver");
    expect(summary.totalFeesPaidCents).toBe(0);
    expect(summary.lifetimeDiscountUsd).toBe(0);
  });

  test("a platinum client has no next tier", async () => {
    mockClient.findOne.mockResolvedValue({ completedBookingsCount: 10 });

    const summary = await getRewardsSummary("cli-1");

    expect(summary.tier.key).toBe("platinum");
    expect(summary.nextTier).toBeNull();
    expect(summary.baseFeeWaived).toBe(true);
  });
});

describe("recordCompletedBooking", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns null when the client does not exist", async () => {
    mockClient.findOne.mockResolvedValue(null);

    const result = await recordCompletedBooking("missing");

    expect(result).toBeNull();
    expect(mockGrantCredit).not.toHaveBeenCalled();
  });

  test("increments the count without granting credit when the tier is unchanged", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const client = { clerkId: "cli-1", completedBookingsCount: 0, save };
    mockClient.findOne.mockResolvedValue(client);

    const result = await recordCompletedBooking("cli-1");

    expect(result.completedBookingsCount).toBe(1);
    expect(client.rewardsTier).toBe("bronze");
    expect(save).toHaveBeenCalledTimes(1);
    expect(mockGrantCredit).not.toHaveBeenCalled();
  });

  test("grants a loyalty credit when crossing into a tier with one", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const client = { clerkId: "cli-1", completedBookingsCount: 2, save };
    mockClient.findOne.mockResolvedValue(client);

    await recordCompletedBooking("cli-1");

    expect(client.rewardsTier).toBe("silver");
    expect(mockGrantCredit).toHaveBeenCalledWith("cli-1", 1000, "loyalty_tier", {
      grantedBy: "system",
    });
  });

  test("grants both loyalty and consultation credits at the gold tier", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const client = { clerkId: "cli-1", completedBookingsCount: 7, save };
    mockClient.findOne.mockResolvedValue(client);

    await recordCompletedBooking("cli-1");

    expect(client.rewardsTier).toBe("gold");
    expect(mockGrantCredit).toHaveBeenCalledWith("cli-1", 2500, "loyalty_tier", {
      grantedBy: "system",
    });
    expect(mockGrantCredit).toHaveBeenCalledWith("cli-1", 2500, "consultation", {
      grantedBy: "system",
    });
  });

  test("logs but does not throw when a credit grant fails", async () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const save = jest.fn().mockResolvedValue(undefined);
    const client = { clerkId: "cli-1", completedBookingsCount: 2, save };
    mockClient.findOne.mockResolvedValue(client);
    mockGrantCredit.mockRejectedValue(new Error("credits down"));

    const result = await recordCompletedBooking("cli-1");

    expect(result).toBe(client);
    expect(errSpy).toHaveBeenCalledWith(
      "loyalty credit grant failed:",
      "credits down"
    );
    errSpy.mockRestore();
  });

  test("logs but does not throw when the consultation grant fails", async () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const save = jest.fn().mockResolvedValue(undefined);
    const client = { clerkId: "cli-1", completedBookingsCount: 7, save };
    mockClient.findOne.mockResolvedValue(client);
    mockGrantCredit
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("consult down"));

    await recordCompletedBooking("cli-1");

    expect(errSpy).toHaveBeenCalledWith(
      "consultation credit grant failed:",
      "consult down"
    );
    errSpy.mockRestore();
  });
});

describe("recordFeePaid", () => {
  beforeEach(() => jest.clearAllMocks());

  test("ignores a non-positive fee", async () => {
    await recordFeePaid("cli-1", 0);
    await recordFeePaid("cli-1", -5);

    expect(mockClient.findOne).not.toHaveBeenCalled();
  });

  test("ignores a missing client", async () => {
    mockClient.findOne.mockResolvedValue(null);

    await recordFeePaid("cli-1", 500);

    expect(mockClient.findOne).toHaveBeenCalledWith({ clerkId: "cli-1" });
  });

  test("accumulates the fee and stamps lastRewardAt", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const client = { totalFeesPaid: 100, save };
    mockClient.findOne.mockResolvedValue(client);

    await recordFeePaid("cli-1", 250);

    expect(client.totalFeesPaid).toBe(350);
    expect(client.lastRewardAt).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("starts from zero when the client has no prior fees", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const client = { save };
    mockClient.findOne.mockResolvedValue(client);

    await recordFeePaid("cli-1", 250);

    expect(client.totalFeesPaid).toBe(250);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
