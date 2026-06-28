import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockBilling = { find: jest.fn(), findOne: jest.fn(), create: jest.fn() };
const mockStripe = {
  paymentMethods: { list: jest.fn() },
  paymentIntents: { create: jest.fn() },
};
const mockExecutePayouts = jest.fn();
const mockGetAvailableCreditCents = jest.fn();
const mockApplyCredits = jest.fn();
const mockRecordFeePaid = jest.fn();
const mockGetClientPlatformFee = jest.fn();
const mockComputePlatformFeeCents = jest.fn();
const mockEstimateStripeFeeCents = jest.fn();

jest.unstable_mockModule("../../models/Billing.js", () => ({ default: mockBilling }));
jest.unstable_mockModule("../../lib/stripe.js", () => ({ stripe: mockStripe }));
jest.unstable_mockModule("../../services/payoutService.js", () => ({
  executePayouts: mockExecutePayouts,
}));
jest.unstable_mockModule("../../services/creditsService.js", () => ({
  getAvailableCreditCents: mockGetAvailableCreditCents,
  applyCredits: mockApplyCredits,
}));
jest.unstable_mockModule("../../services/rewardsService.js", () => ({
  recordFeePaid: mockRecordFeePaid,
  getClientPlatformFee: mockGetClientPlatformFee,
}));
jest.unstable_mockModule("../../lib/fees.js", () => ({
  computePlatformFeeCents: mockComputePlatformFeeCents,
  estimateStripeFeeCents: mockEstimateStripeFeeCents,
}));

const { computeBalanceDueCents, captureBookingBalance } = await import(
  "../../services/balanceCaptureService.js"
);

const makeBooking = (over = {}) => ({
  _id: "b1",
  clientId: "c1",
  artistId: "a1",
  priceCents: 50000,
  depositPaidCents: 10000,
  balancePaidCents: 0,
  stripeCustomerId: "cus_1",
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBilling.find.mockResolvedValue([]);
  mockBilling.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
  mockBilling.create.mockResolvedValue({ _id: "bill1" });
  mockGetAvailableCreditCents.mockResolvedValue(0);
  mockApplyCredits.mockImplementation((_id, amt) => Promise.resolve(amt));
  mockRecordFeePaid.mockResolvedValue(undefined);
  mockGetClientPlatformFee.mockResolvedValue(0);
  mockComputePlatformFeeCents.mockReturnValue(0);
  mockEstimateStripeFeeCents.mockReturnValue(0);
  mockExecutePayouts.mockResolvedValue([]);
  mockStripe.paymentMethods.list.mockResolvedValue({ data: [{ id: "pm_1" }] });
  mockStripe.paymentIntents.create.mockResolvedValue({
    id: "pi_1",
    status: "succeeded",
    latest_charge: "ch_1",
  });
});

describe("computeBalanceDueCents", () => {
  test("price minus deposit and any balance already paid", () => {
    expect(
      computeBalanceDueCents({ priceCents: 50000, depositPaidCents: 10000, balancePaidCents: 0 })
    ).toBe(40000);
  });

  test("never negative when deposit covers the price", () => {
    expect(computeBalanceDueCents({ priceCents: 8000, depositPaidCents: 10000 })).toBe(0);
  });

  test("accounts for a partially-captured balance", () => {
    expect(
      computeBalanceDueCents({ priceCents: 50000, depositPaidCents: 10000, balancePaidCents: 15000 })
    ).toBe(25000);
  });
});

describe("captureBookingBalance — guards", () => {
  test("returns no_booking when called with nothing", async () => {
    expect(await captureBookingBalance(null)).toEqual({ ok: false, reason: "no_booking" });
  });

  test("skips cleanly when no balance is due", async () => {
    const res = await captureBookingBalance(
      makeBooking({ priceCents: 10000, depositPaidCents: 10000 })
    );
    expect(res).toEqual({ ok: true, skipped: true, reason: "no_balance_due" });
    expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test("refuses to charge an unapproved final price", async () => {
    const res = await captureBookingBalance(makeBooking({ finalPriceApproved: false }));
    expect(res).toEqual({ ok: false, reason: "final_price_unapproved" });
  });
});

describe("captureBookingBalance — charging", () => {
  test("charges the balance off-session and records the payment + payout", async () => {
    const booking = makeBooking();
    const res = await captureBookingBalance(booking);

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 40000,
        off_session: true,
        confirm: true,
        metadata: expect.objectContaining({ type: "final_payment" }),
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining("balance_b1_40000") })
    );
    expect(mockBilling.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "final_payment", amountCents: 40000, status: "paid" })
    );
    expect(booking.balancePaidCents).toBe(40000);
    expect(booking.save).toHaveBeenCalled();
    expect(mockExecutePayouts).toHaveBeenCalledWith(
      expect.objectContaining({ transferGroup: "booking_b1" })
    );
    expect(res).toMatchObject({ ok: true, balanceCents: 40000, chargeCents: 40000, paymentIntentId: "pi_1" });
  });

  test("adds the platform fee to the charge and records it", async () => {
    mockComputePlatformFeeCents.mockReturnValue(1500);
    const booking = makeBooking();
    await captureBookingBalance(booking);

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 41500 }),
      expect.anything()
    );
    expect(mockBilling.create).toHaveBeenCalledWith(
      expect.objectContaining({ platformFeeCents: 1500 })
    );
    expect(mockRecordFeePaid).toHaveBeenCalledWith("c1", 1500);
  });

  test("applies client credit and skips Stripe entirely when credit covers the balance", async () => {
    mockGetAvailableCreditCents.mockResolvedValue(40000);
    const booking = makeBooking();
    const res = await captureBookingBalance(booking);

    expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(mockApplyCredits).toHaveBeenCalledWith("c1", 40000);
    expect(mockBilling.create).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 0, status: "paid" })
    );
    expect(res).toMatchObject({ ok: true, chargeCents: 0, creditAppliedCents: 40000, paymentIntentId: null });
  });

  test("falls back to a prior paid bill's customer when the booking has none", async () => {
    mockBilling.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue({ stripeCustomerId: "cus_prior" }),
    });
    const booking = makeBooking({ stripeCustomerId: null });
    await captureBookingBalance(booking);
    expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_prior" })
    );
  });

  test("subtracts the platform fee already collected on the deposit", async () => {
    mockComputePlatformFeeCents.mockReturnValue(2000);
    mockBilling.find.mockResolvedValue([{ platformFeeCents: 1500 }]);
    const booking = makeBooking();
    await captureBookingBalance(booking);
    expect(mockBilling.create).toHaveBeenCalledWith(
      expect.objectContaining({ platformFeeCents: 500 })
    );
  });
});

describe("captureBookingBalance — failure paths", () => {
  test("no_saved_customer when there is no customer anywhere", async () => {
    const res = await captureBookingBalance(makeBooking({ stripeCustomerId: null }));
    expect(res).toEqual({ ok: false, reason: "no_saved_customer" });
  });

  test("no_saved_card when the customer has no card on file", async () => {
    mockStripe.paymentMethods.list.mockResolvedValue({ data: [] });
    const res = await captureBookingBalance(makeBooking());
    expect(res).toEqual({ ok: false, reason: "no_saved_card" });
  });

  test("charge_failed records the error on the booking", async () => {
    mockStripe.paymentIntents.create.mockRejectedValue(
      Object.assign(new Error("card_declined"), { code: "card_declined" })
    );
    const booking = makeBooking();
    const res = await captureBookingBalance(booking);
    expect(res).toMatchObject({ ok: false, reason: "charge_failed" });
    expect(booking.balanceCaptureError).toBe("card_declined");
    expect(booking.save).toHaveBeenCalled();
  });

  test("charge_failed falls back to the error message when there is no code", async () => {
    mockStripe.paymentIntents.create.mockRejectedValue(new Error("network_down"));
    const booking = makeBooking();
    const res = await captureBookingBalance(booking);
    expect(res).toMatchObject({ ok: false, reason: "charge_failed" });
    expect(booking.balanceCaptureError).toBe("network_down");
  });

  test("not_succeeded when the PaymentIntent needs more action", async () => {
    mockStripe.paymentIntents.create.mockResolvedValue({ id: "pi_x", status: "requires_action" });
    const booking = makeBooking();
    const res = await captureBookingBalance(booking);
    expect(res).toEqual({ ok: false, reason: "not_succeeded", status: "requires_action" });
    expect(booking.balanceCaptureError).toBe("status_requires_action");
  });

  test("a failed payout is swallowed — the capture still succeeds", async () => {
    mockExecutePayouts.mockRejectedValue(new Error("transfer_boom"));
    const res = await captureBookingBalance(makeBooking());
    expect(res).toMatchObject({ ok: true, balanceCents: 40000 });
  });

  test("a failed recordFeePaid is swallowed — the capture still succeeds", async () => {
    mockComputePlatformFeeCents.mockReturnValue(1500);
    mockRecordFeePaid.mockRejectedValue(new Error("rewards_boom"));
    const res = await captureBookingBalance(makeBooking());
    expect(res).toMatchObject({ ok: true });
  });
});
