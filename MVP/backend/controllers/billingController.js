import Billing from "../models/Billing.js";
import Booking from "../models/Booking.js";
import { stripe } from "../lib/stripe.js";

const PLATFORM_FEE_CENTS = 1000;
const CURRENCY = "usd";

function requireBooking(booking) {
  if (!booking) {
    const e = new Error("booking_not_found");
    e.status = 404;
    throw e;
  }
}

export async function checkoutPlatformFee(req, res) {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  const booking = await Booking.findById(bookingId);
  requireBooking(booking);

  const customer = await stripe.customers.create({
    metadata: { clientId: String(booking.clientId) },
  });

  const bill = await Billing.create({
    bookingId,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "platform_fee",
    amountCents: PLATFORM_FEE_CENTS,
    currency: CURRENCY,
    stripeCustomerId: customer.id,
    status: "pending",
    metadata: {},
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          product_data: { name: "Booking platform fee" },
          unit_amount: PLATFORM_FEE_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: {
      billingId: String(bill._id),
      bookingId: String(booking._id),
      type: "platform_fee",
    },
    success_url: `${process.env.APP_URL}/booking/${bookingId}?paid=platform_fee`,
    cancel_url: `${process.env.APP_URL}/booking/${bookingId}?cancelled=platform_fee`,
  });

  bill.stripeCheckoutSessionId = session.id;
  await bill.save();

  res.json({ url: session.url, id: session.id });
}

export async function checkoutDeposit(req, res) {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  const booking = await Booking.findById(bookingId);
  requireBooking(booking);

  const amount = Number(booking.depositRequiredCents || 0);
  if (amount <= 0)
    return res.status(400).json({ error: "no_deposit_required" });

  const customer = await stripe.customers.create({
    metadata: { clientId: String(booking.clientId) },
  });

  const bill = await Billing.create({
    bookingId,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "deposit",
    amountCents: amount,
    currency: CURRENCY,
    stripeCustomerId: customer.id,
    status: "pending",
    metadata: {},
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          product_data: { name: "Tattoo appointment deposit" },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      billingId: String(bill._id),
      bookingId: String(booking._id),
      type: "deposit",
    },
    success_url: `${process.env.APP_URL}/booking/${bookingId}?paid=deposit`,
    cancel_url: `${process.env.APP_URL}/booking/${bookingId}?cancelled=deposit`,
  });

  bill.stripeCheckoutSessionId = session.id;
  await bill.save();

  res.json({ url: session.url, id: session.id });
}

export async function refundBilling(req, res) {
  const { billingId, bookingId } = req.body || {};
  const byId = billingId ? await Billing.findById(billingId) : null;
  const list = byId
    ? [byId]
    : await Billing.find({ bookingId, type: "platform_fee", status: "paid" });

  const refunds = [];
  for (const b of list) {
    if (b.type !== "platform_fee") continue; // deposit never refunded
    const pi = b.stripePaymentIntentId;
    if (!pi) continue;
    const rr = await stripe.refunds.create({ payment_intent: pi });
    b.status = "refunded";
    b.stripeRefundIds.push(rr.id);
    b.refundedAt = new Date();
    await b.save();
    refunds.push({ billingId: String(b._id), refundId: rr.id });
  }
  res.json({ ok: true, refunds });
}

export async function createPortalSession(req, res) {
  const { customerId } = req.body || {};
  if (!customerId)
    return res.status(400).json({ error: "customerId required" });
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: process.env.APP_URL,
  });
  res.json({ url: session.url });
}

export async function scheduleCancel(_req, res) {
  res.json({ ok: true });
}

export async function stripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const { billingId, bookingId, type } = s.metadata || {};
        const paymentIntent = s.payment_intent;

        if (billingId) {
          const bill = await (
            await import("../models/Billing.js")
          ).default.findById(billingId);
          if (bill) {
            bill.status = "paid";
            bill.stripePaymentIntentId =
              typeof paymentIntent === "string"
                ? paymentIntent
                : paymentIntent?.id;
            bill.paidAt = new Date();
            bill.receiptUrl = s.invoice || bill.receiptUrl || "";
            await bill.save();
          }
        }
        if (type === "deposit" && bookingId) {
          const book = await (
            await import("../models/Booking.js")
          ).default.findById(bookingId);
          if (book) {
            book.depositPaidCents = book.depositRequiredCents;
            await book.save();
          }
        }
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch {
    res.status(500).json({ error: "webhook_handler_failed" });
  }
}