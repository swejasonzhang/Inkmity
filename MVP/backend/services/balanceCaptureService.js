import Billing from "../models/Billing.js";
import { stripe } from "../lib/stripe.js";
import { executePayouts } from "./payoutService.js";
import { getAvailableCreditCents, applyCredits } from "./creditsService.js";
import { config } from "../config/index.js";

const CURRENCY = config.stripe.currency || "usd";

export function computeBalanceDueCents(booking) {
  const price = Number(booking?.priceCents || 0);
  const depositPaid = Number(booking?.depositPaidCents || 0);
  const balancePaid = Number(booking?.balancePaidCents || 0);
  return Math.max(0, price - depositPaid - balancePaid);
}

export async function captureBookingBalance(booking) {
  if (!booking) return { ok: false, reason: "no_booking" };

  const balance = computeBalanceDueCents(booking);
  if (balance <= 0) return { ok: true, skipped: true, reason: "no_balance_due" };

  const transferGroup = `booking_${String(booking._id)}`;

  // Platform-funded credits reduce what the client pays; the artist/studio
  // still receive the full balance via transfers (Inkmity absorbs the credit).
  const available = await getAvailableCreditCents(booking.clientId);
  const plannedCredit = Math.min(balance, available);
  const chargeAmount = balance - plannedCredit;

  let pi = null;
  let customerId = null;

  if (chargeAmount > 0) {
    const depositBill = await Billing.findOne({
      bookingId: booking._id,
      type: "deposit",
      status: "paid",
    }).sort({ paidAt: -1 });
    customerId = depositBill?.stripeCustomerId;
    if (!customerId) return { ok: false, reason: "no_saved_customer" };

    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
    const pmId = pms.data?.[0]?.id;
    if (!pmId) return { ok: false, reason: "no_saved_card" };

    try {
      pi = await stripe.paymentIntents.create(
        {
          amount: chargeAmount,
          currency: CURRENCY,
          customer: customerId,
          payment_method: pmId,
          confirm: true,
          off_session: true,
          transfer_group: transferGroup,
          metadata: { bookingId: String(booking._id), type: "final_payment" },
          description: "Tattoo appointment balance",
        },
        { idempotencyKey: `balance_${booking._id}_${balance}` }
      );
    } catch (e) {
      booking.balanceCaptureError = e?.code || e?.message || "charge_failed";
      await booking.save();
      return { ok: false, reason: "charge_failed", error: booking.balanceCaptureError };
    }

    if (pi.status !== "succeeded") {
      booking.balanceCaptureError = `status_${pi.status}`;
      await booking.save();
      return { ok: false, reason: "not_succeeded", status: pi.status };
    }
  }

  // Charge succeeded (or fully covered by credit) — now consume the credit.
  const appliedCredit = plannedCredit > 0 ? await applyCredits(booking.clientId, plannedCredit) : 0;

  const bill = await Billing.create({
    bookingId: booking._id,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "final_payment",
    amountCents: chargeAmount,
    platformFeeCents: 0,
    transferGroup,
    currency: CURRENCY,
    stripeCustomerId: customerId || undefined,
    status: "paid",
    stripePaymentIntentId: pi?.id,
    stripeChargeId: pi?.latest_charge || null,
    paidAt: new Date(),
    metadata: {
      capture: "auto_on_completion",
      balanceCents: balance,
      creditAppliedCents: appliedCredit,
    },
  });

  booking.balancePaidCents = Number(booking.balancePaidCents || 0) + balance;
  booking.balanceCapturedAt = new Date();
  booking.balanceCaptureError = "";
  await booking.save();

  try {
    await executePayouts({
      billing: bill,
      artistId: booking.artistId,
      transferableCents: balance,
      transferGroup,
      currency: CURRENCY,
    });
  } catch (e) {
    console.error("balance payout failed:", e.code || e.message);
  }

  return {
    ok: true,
    balanceCents: balance,
    chargeCents: chargeAmount,
    creditAppliedCents: appliedCredit,
    paymentIntentId: pi?.id || null,
  };
}
