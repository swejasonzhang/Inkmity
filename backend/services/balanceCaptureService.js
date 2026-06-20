import Billing from "../models/Billing.js";
import { stripe } from "../lib/stripe.js";
import { executePayouts } from "./payoutService.js";
import { getAvailableCreditCents, applyCredits } from "./creditsService.js";
import { recordFeePaid, getClientPlatformFee } from "./rewardsService.js";
import { computePlatformFeeCents, estimateStripeFeeCents } from "../lib/fees.js";
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

  // The client must approve a final price set above their quote before we charge.
  if (booking.finalPriceApproved === false) {
    return { ok: false, reason: "final_price_unapproved" };
  }

  const transferGroup = `booking_${String(booking._id)}`;

  const clientFee = await getClientPlatformFee(booking.clientId);
  const fullFeeCents = computePlatformFeeCents(booking.priceCents, clientFee);
  const priorPaid = await Billing.find({ bookingId: booking._id, status: "paid" });
  const feeAlreadyCollected = priorPaid.reduce(
    (sum, b) => sum + Number(b.platformFeeCents || 0),
    0
  );
  const platformFeeCents = Math.max(0, fullFeeCents - feeAlreadyCollected);

  const available = await getAvailableCreditCents(booking.clientId);
  const plannedCredit = Math.min(balance, available);
  const chargeAmount = balance - plannedCredit + platformFeeCents;

  let pi = null;
  let customerId = booking.stripeCustomerId || null;
  if (!customerId) {
    const priorBill = await Billing.findOne({
      bookingId: booking._id,
      status: "paid",
      stripeCustomerId: { $exists: true, $ne: null },
    }).sort({ paidAt: -1 });
    customerId = priorBill?.stripeCustomerId || null;
  }

  if (chargeAmount > 0) {
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
          metadata: {
            bookingId: String(booking._id),
            type: "final_payment",
            platformFeeCents: String(platformFeeCents),
          },
          description: "Tattoo appointment balance",
        },
        { idempotencyKey: `balance_${booking._id}_${balance}_${platformFeeCents}` }
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

  const appliedCredit = plannedCredit > 0 ? await applyCredits(booking.clientId, plannedCredit) : 0;

  const bill = await Billing.create({
    bookingId: booking._id,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "final_payment",
    amountCents: chargeAmount,
    platformFeeCents,
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
      platformFeeCents,
    },
  });

  booking.balancePaidCents = Number(booking.balancePaidCents || 0) + balance;
  booking.balanceCapturedAt = new Date();
  booking.balanceCaptureError = "";
  if (customerId && !booking.stripeCustomerId) booking.stripeCustomerId = customerId;
  await booking.save();

  if (platformFeeCents > 0) {
    try {
      await recordFeePaid(booking.clientId, platformFeeCents);
    } catch (e) {
      console.error("recordFeePaid failed:", e.message);
    }
  }

  const stripeFeeCents = estimateStripeFeeCents(
    chargeAmount,
    config.platformFee.processingPct,
    config.platformFee.processingFlatCents
  );
  const transferableCents = Math.max(0, balance - stripeFeeCents);

  try {
    await executePayouts({
      billing: bill,
      artistId: booking.artistId,
      transferableCents,
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
