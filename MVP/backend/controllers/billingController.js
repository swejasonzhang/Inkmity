import Stripe from "stripe";
import Billing from "../models/Billing.js";
import Booking from "../models/Booking.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const isFreeMode = () =>
  process.env.FREE_MODE === "1" || process.env.NODE_ENV === "test";
const PLATFORM_FEE_CENTS = isFreeMode() ? 0 : 1000;

export async function checkoutPlatformFee(req, res) {
  try {
    const { bookingId, label } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: "missing_bookingId" });
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "booking_not_found" });

    const bill = await Billing.create({
      bookingId,
      artistId: booking.artistId,
      clientId: booking.clientId,
      type: "platform_fee",
      amountCents: PLATFORM_FEE_CENTS,
      status: isFreeMode() ? "paid" : "pending",
      metadata: { label: label || "Platform Fee" },
      paidAt: isFreeMode() ? new Date() : undefined,
    });

    if (isFreeMode())
      return res.json({ ok: true, mode: "free", billingId: bill._id });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: label || "Platform Fee" },
            unit_amount: PLATFORM_FEE_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/checkout/success?booking=${bookingId}`,
      cancel_url: `${process.env.APP_URL}/checkout/cancel?booking=${bookingId}`,
      metadata: {
        bookingId: String(bookingId),
        billingId: String(bill._id),
        kind: "platform_fee",
      },
    });

    await Billing.findByIdAndUpdate(bill._id, {
      stripeCheckoutSessionId: session.id,
    });
    res.json({ ok: true, url: session.url, billingId: bill._id });
  } catch {
    res.status(500).json({ error: "platform_fee_failed" });
  }
}

export async function checkoutDeposit(req, res) {
  try {
    const { bookingId, overrideAmountCents } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: "missing_bookingId" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "booking_not_found" });

    const rawAmount = overrideAmountCents ?? booking.depositRequiredCents ?? 0;
    const amount = Math.max(0, Number(rawAmount));

    const bill = await Billing.create({
      bookingId,
      artistId: booking.artistId,
      clientId: booking.clientId,
      type: "deposit",
      amountCents: isFreeMode() ? 0 : amount,
      status: isFreeMode() ? "paid" : "pending",
      metadata: { originalRequiredCents: booking.depositRequiredCents },
      paidAt: isFreeMode() ? new Date() : undefined,
    });

    if (isFreeMode()) {
      booking.depositPaidCents = amount;
      booking.depositPaidAt = new Date();
      await booking.save();
      return res.json({ ok: true, mode: "free", billingId: bill._id });
    }

    if (!stripe)
      return res.status(500).json({ error: "stripe_not_configured" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Deposit" },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/checkout/success?booking=${bookingId}`,
      cancel_url: `${process.env.APP_URL}/checkout/cancel?booking=${bookingId}`,
      metadata: {
        bookingId: String(bookingId),
        billingId: String(bill._id),
        kind: "deposit",
      },
    });

    await Billing.findByIdAndUpdate(bill._id, {
      stripeCheckoutSessionId: session.id,
    });
    res.json({ ok: true, url: session.url, billingId: bill._id });
  } catch {
    res.status(500).json({ error: "deposit_failed" });
  }
}

export async function refundBilling(req, res) {
  try {
    const { billingId, bookingId } = req.body || {};
    const bill = billingId
      ? await Billing.findById(billingId)
      : await Billing.findOne({ bookingId }).sort({ createdAt: -1 });
    if (!bill) return res.status(404).json({ error: "billing_not_found" });
    if (bill.status === "refunded") return res.json(bill);

    if (isFreeMode()) {
      bill.status = "refunded";
      bill.refundedAt = new Date();
      await bill.save();
      return res.json(bill);
    }

    if (!stripe)
      return res.status(500).json({ error: "stripe_not_configured" });

    let paymentIntentId = bill.stripePaymentIntentId;
    if (!paymentIntentId && bill.stripeCheckoutSessionId) {
      const sess = await stripe.checkout.sessions.retrieve(
        bill.stripeCheckoutSessionId
      );
      paymentIntentId =
        typeof sess.payment_intent === "string"
          ? sess.payment_intent
          : sess.payment_intent?.id;
    }
    if (!paymentIntentId)
      return res.status(400).json({ error: "no_payment_intent_to_refund" });

    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: bill.amountCents,
    });

    bill.status = "refunded";
    bill.refundedAt = new Date();
    await bill.save();
    res.json(bill);
  } catch {
    res.status(500).json({ error: "refund_failed" });
  }
}
