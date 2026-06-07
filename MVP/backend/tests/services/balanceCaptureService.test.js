import { jest, describe, test, expect } from "@jest/globals";

jest.unstable_mockModule("../../models/Billing.js", () => ({
  default: { findOne: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule("../../lib/stripe.js", () => ({
  stripe: { paymentMethods: { list: jest.fn() }, paymentIntents: { create: jest.fn() } },
}));
jest.unstable_mockModule("../../services/payoutService.js", () => ({
  executePayouts: jest.fn(),
}));

const { computeBalanceDueCents, captureBookingBalance } = await import(
  "../../services/balanceCaptureService.js"
);

describe("computeBalanceDueCents", () => {
  test("price minus deposit and any balance already paid", () => {
    expect(
      computeBalanceDueCents({ priceCents: 50000, depositPaidCents: 10000, balancePaidCents: 0 })
    ).toBe(40000);
  });

  test("never negative when deposit covers the price", () => {
    expect(
      computeBalanceDueCents({ priceCents: 8000, depositPaidCents: 10000 })
    ).toBe(0);
  });

  test("accounts for a partially-captured balance", () => {
    expect(
      computeBalanceDueCents({ priceCents: 50000, depositPaidCents: 10000, balancePaidCents: 15000 })
    ).toBe(25000);
  });
});

describe("captureBookingBalance", () => {
  test("skips cleanly when no balance is due (artist never charged early)", async () => {
    const res = await captureBookingBalance({
      _id: "b1",
      priceCents: 10000,
      depositPaidCents: 10000,
      balancePaidCents: 0,
    });
    expect(res).toEqual({ ok: true, skipped: true, reason: "no_balance_due" });
  });
});
