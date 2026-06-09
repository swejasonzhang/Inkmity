import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockCredit = { find: jest.fn(), create: jest.fn() };

jest.unstable_mockModule("../../models/Credit.js", () => ({ default: mockCredit }));

const { getAvailableCreditCents, applyCredits, grantCredit } = await import(
  "../../services/creditsService.js"
);

beforeEach(() => jest.clearAllMocks());

describe("getAvailableCreditCents", () => {
  test("sums remaining cents of active credits", async () => {
    mockCredit.find.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ remainingCents: 1500 }, { remainingCents: 500 }]),
      }),
    });
    expect(await getAvailableCreditCents("c1")).toBe(2000);
  });

  test("zero when no clientId", async () => {
    expect(await getAvailableCreditCents("")).toBe(0);
  });
});

describe("grantCredit", () => {
  test("rejects non-positive amounts", async () => {
    await expect(grantCredit("c1", 0)).rejects.toMatchObject({ status: 400 });
  });

  test("creates a credit with remaining = amount", async () => {
    mockCredit.create.mockResolvedValue({ _id: "x" });
    await grantCredit("c1", 2500, "loyalty_annual", { grantedBy: "admin" });
    expect(mockCredit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "c1",
        amountCents: 2500,
        remainingCents: 2500,
        reason: "loyalty_annual",
      })
    );
  });
});

describe("applyCredits", () => {
  test("consumes soonest-expiring first and marks spent", async () => {
    const soon = { remainingCents: 1000, expiresAt: new Date(Date.now() + 86400000), status: "active", save: jest.fn() };
    const noExpiry = { remainingCents: 5000, expiresAt: null, status: "active", save: jest.fn() };
    mockCredit.find.mockResolvedValue([noExpiry, soon]); // unsorted on purpose

    const applied = await applyCredits("c1", 1500);

    expect(applied).toBe(1500);
    // soonest (soon) fully spent first
    expect(soon.remainingCents).toBe(0);
    expect(soon.status).toBe("spent");
    // then 500 from the no-expiry credit
    expect(noExpiry.remainingCents).toBe(4500);
    expect(noExpiry.status).toBe("active");
  });

  test("applies at most what's available", async () => {
    const c = { remainingCents: 300, expiresAt: null, status: "active", save: jest.fn() };
    mockCredit.find.mockResolvedValue([c]);
    expect(await applyCredits("c1", 1000)).toBe(300);
  });

  test("returns 0 for non-positive request", async () => {
    expect(await applyCredits("c1", 0)).toBe(0);
  });
});
