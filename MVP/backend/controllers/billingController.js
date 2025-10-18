import Stripe from "stripe";
import Billing from "../models/Billing.js";
import Booking from "../models/Booking.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const isFreeMode = () =>
  process.env.FREE_MODE === "1" || process.env.NODE_ENV === "test";
const FIXED_FEE_CENTS = isFreeMode() ? 0 : 1000;

export async function createCheckoutSession(req, res) {
  try {
    const { bookingId, label } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: "missing_bookingId" });
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "booking_not_found" });

    const bill = await Billing.create({
      bookingId,
      artistId: booking.artistId,
      clientId: booking.clientId,
      amountCents: FIXED_FEE_CENTS,
      status: isFreeMode() ? "paid" : "pending",
      metadata: { label: label || "Appointment Booking Fee" },
      paidAt: isFreeMode() ? new Date() : undefined,
    });

    if (isFreeMode()) {
      return res.json({ ok: true, mode: "free", billingId: bill._id });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: label || "Appointment Booking Fee" },
            unit_amount: FIXED_FEE_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/checkout/success?booking=${bookingId}`,
      cancel_url: `${process.env.APP_URL}/checkout/cancel?booking=${bookingId}`,
      metadata: {
        bookingId: String(bookingId),
        billingId: String(bill._id),
        kind: "booking_fee",
      },
    });

    await Billing.findByIdAndUpdate(bill._id, {
      stripeCheckoutSessionId: session.id,
    });
    res.json({ ok: true, url: session.url, billingId: bill._id });
  } catch {
    res.status(500).json({ error: "checkout_failed" });
  }
}

export async function refundBilling(req, res) {
  try {
    const { billingId, bookingId } = req.body || {};
    const bill = billingId
      ? await Billing.findById(billingId)
      : await Billing.findOne({ bookingId });
    if (!bill) return res.status(404).json({ error: "billing_not_found" });
    if (bill.status === "refunded") return res.json(bill);

    if (isFreeMode()) {
      bill.status = "refunded";
      bill.refundedAt = new Date();
      await bill.save();
      if (bill.bookingId)
        await Booking.findByIdAndUpdate(bill.bookingId, {
          status: "cancelled",
        });
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
    if (bill.bookingId)
      await Booking.findByIdAndUpdate(bill.bookingId, { status: "cancelled" });

    res.json(bill);
  } catch {
    res.status(500).json({ error: "refund_failed" });
  }
}

export async function createPortalSession(req, res) {
  try {
    if (isFreeMode())
      return res.status(400).json({ error: "portal_disabled_in_free_mode" });
    const { customerId, returnUrl } = req.body || {};
    if (!customerId)
      return res.status(400).json({ error: "missing_customerId" });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || process.env.APP_URL,
    });
    res.json({ url: session.url });
  } catch {
    res.status(500).json({ error: "portal_failed" });
  }
}

export async function scheduleCancel(req, res) {
  try {
    if (isFreeMode())
      return res.status(400).json({ error: "not_applicable_in_free_mode" });
    const { subscriptionId, when } = req.body || {};
    if (!subscriptionId)
      return res.status(400).json({ error: "missing_subscriptionId" });
    if (when !== "current_period_end" && when !== "next_period_end")
      return res.status(400).json({ error: "bad_when" });
    if (!stripe)
      return res.status(500).json({ error: "stripe_not_configured" });

    if (when === "current_period_end") {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (!sub.current_period_end)
        return res.status(400).json({ error: "no_current_period_end" });
      const interval = sub.items?.data?.[0]?.plan?.interval;
      const seconds = interval === "year" ? 365 * 24 * 3600 : 30 * 24 * 3600;
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at: sub.current_period_end + seconds,
      });
    }
    res.json({ ok: true, subscriptionId });
  } catch {
    res.status(500).json({ error: "schedule_cancel_failed" });
  }
}