import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockArtist = { findOne: jest.fn() };
const mockComputeSplit = jest.fn();
const mockTransfers = { create: jest.fn(), createReversal: jest.fn() };

jest.unstable_mockModule("../../models/Artist.js", () => ({ default: mockArtist }));
jest.unstable_mockModule("../../lib/stripe.js", () => ({
  stripe: { transfers: mockTransfers },
}));
jest.unstable_mockModule("../../services/studioService.js", () => ({
  computeArtistStudioSplit: mockComputeSplit,
}));

const { computePayoutPlan, reversePayouts } = await import(
  "../../services/payoutService.js"
);

function artistAccount(id) {
  mockArtist.findOne.mockResolvedValue(
    id ? { stripeConnectAccountId: id, chargesEnabled: true } : null
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("computePayoutPlan", () => {
  test("throws if the artist has no usable Connect account", async () => {
    artistAccount(null);
    mockComputeSplit.mockResolvedValue(null);
    await expect(
      computePayoutPlan({ artistId: "a1", transferableCents: 10000 })
    ).rejects.toMatchObject({ code: "artist_not_onboarded" });
  });

  test("solo artist gets the full transferable amount", async () => {
    artistAccount("acct_artist");
    mockComputeSplit.mockResolvedValue(null);
    const plan = await computePayoutPlan({ artistId: "a1", transferableCents: 10000 });
    expect(plan.transfers).toEqual([
      { destination: "acct_artist", amountCents: 10000, kind: "artist" },
    ]);
  });

  test("studio member is split between artist and studio", async () => {
    artistAccount("acct_artist");
    mockComputeSplit.mockResolvedValue({
      artistCents: 7000,
      studioCents: 3000,
      studioConnectAccountId: "acct_studio",
      studioPayoutsReady: true,
      studioId: "s1",
    });
    const plan = await computePayoutPlan({ artistId: "a1", transferableCents: 10000 });
    expect(plan.transfers).toEqual([
      { destination: "acct_artist", amountCents: 7000, kind: "artist" },
      { destination: "acct_studio", amountCents: 3000, kind: "studio" },
    ]);
  });

  test("throws if the studio isn't payout-ready", async () => {
    artistAccount("acct_artist");
    mockComputeSplit.mockResolvedValue({
      artistCents: 7000,
      studioCents: 3000,
      studioConnectAccountId: null,
      studioPayoutsReady: false,
      studioId: "s1",
    });
    await expect(
      computePayoutPlan({ artistId: "a1", transferableCents: 10000 })
    ).rejects.toMatchObject({ code: "studio_not_onboarded" });
  });

  test("omits a zero-amount leg (e.g. 100% commission to studio)", async () => {
    artistAccount("acct_artist");
    mockComputeSplit.mockResolvedValue({
      artistCents: 0,
      studioCents: 10000,
      studioConnectAccountId: "acct_studio",
      studioPayoutsReady: true,
      studioId: "s1",
    });
    const plan = await computePayoutPlan({ artistId: "a1", transferableCents: 10000 });
    expect(plan.transfers).toEqual([
      { destination: "acct_studio", amountCents: 10000, kind: "studio" },
    ]);
  });
});

describe("reversePayouts (chargeback clawback)", () => {
  test("reverses each transfer leg and marks them reversed", async () => {
    mockTransfers.createReversal
      .mockResolvedValueOnce({ id: "trr_artist" })
      .mockResolvedValueOnce({ id: "trr_studio" });

    const billing = {
      _id: "bill1",
      transfers: [
        { kind: "artist", amountCents: 7000, stripeTransferId: "tr_a", status: "paid" },
        { kind: "studio", amountCents: 3000, stripeTransferId: "tr_s", status: "paid" },
      ],
      save: jest.fn().mockResolvedValue(undefined),
      markModified: jest.fn(),
    };

    const reversals = await reversePayouts(billing);

    expect(mockTransfers.createReversal).toHaveBeenCalledTimes(2);
    expect(mockTransfers.createReversal).toHaveBeenCalledWith(
      "tr_a",
      expect.objectContaining({ amount: 7000 }),
      expect.objectContaining({ idempotencyKey: "reversal_bill1_artist" })
    );
    expect(reversals).toHaveLength(2);
    expect(billing.transfers.every((t) => t.status === "reversed")).toBe(true);
    expect(billing.save).toHaveBeenCalled();
  });

  test("skips legs already reversed", async () => {
    const billing = {
      _id: "bill2",
      transfers: [
        { kind: "artist", amountCents: 7000, stripeTransferId: "tr_a", status: "reversed" },
      ],
      save: jest.fn().mockResolvedValue(undefined),
      markModified: jest.fn(),
    };
    const reversals = await reversePayouts(billing);
    expect(mockTransfers.createReversal).not.toHaveBeenCalled();
    expect(reversals).toHaveLength(0);
  });
});
