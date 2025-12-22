import Billing from "../models/Billing.js";
import Booking from "../models/Booking.js";
import { stripe } from "../lib/stripe.js";

let WebhookEvent;
(async () => {
  const module = await import("../models/WebhookEvent.js");
  WebhookEvent = module.default;
})();

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

  if (booking.depositPaidCents >= booking.depositRequiredCents) {
    return res.status(400).json({ error: "deposit_already_paid" });
  }

  const amount = Number(booking.depositRequiredCents || 0);
  if (amount <= 0)
    return res.status(400).json({ error: "no_deposit_required" });

  let customer;
  try {
    const existingBills = await Billing.find({
      clientId: String(booking.clientId),
      stripeCustomerId: { $exists: true, $ne: null },
    }).limit(1);
    if (existingBills.length > 0 && existingBills[0].stripeCustomerId) {
      customer = await stripe.customers.retrieve(
        existingBills[0].stripeCustomerId
      );
    } else {
      customer = await stripe.customers.create({
        metadata: { clientId: String(booking.clientId) },
      });
    }
  } catch {
    customer = await stripe.customers.create({
      metadata: { clientId: String(booking.clientId) },
    });
  }

  const appointmentType = booking.appointmentType || "tattoo_session";
  const productName =
    appointmentType === "consultation"
      ? "Consultation deposit"
      : "Tattoo appointment deposit";

  const bill = await Billing.create({
    bookingId,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "deposit",
    amountCents: amount,
    currency: CURRENCY,
    stripeCustomerId: customer.id,
    status: "pending",
    metadata: {
      appointmentType,
      nonRefundable: true,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          product_data: {
            name: productName,
            description: `Deposit for appointment on ${new Date(
              booking.startAt
            ).toLocaleDateString()}. This deposit is non-refundable and will be applied to your final cost.`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      billingId: String(bill._id),
      bookingId: String(booking._id),
      type: "deposit",
      appointmentType,
    },
    success_url: `${process.env.APP_URL}/appointments/${bookingId}?paid=deposit`,
    cancel_url: `${process.env.APP_URL}/appointments/${bookingId}?cancelled=deposit`,
  });

  bill.stripeCheckoutSessionId = session.id;
  await bill.save();

  res.json({ url: session.url, id: session.id, clientSecret: null });
}

export async function createDepositPaymentIntent(req, res) {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  const booking = await Booking.findById(bookingId);
  requireBooking(booking);

  if (booking.depositPaidCents >= booking.depositRequiredCents) {
    return res.status(400).json({ error: "deposit_already_paid" });
  }

  const amount = Number(booking.depositRequiredCents || 0);
  if (amount <= 0)
    return res.status(400).json({ error: "no_deposit_required" });

  let customer;
  try {
    const existingBills = await Billing.find({
      clientId: String(booking.clientId),
      stripeCustomerId: { $exists: true, $ne: null },
    }).limit(1);
    if (existingBills.length > 0 && existingBills[0].stripeCustomerId) {
      customer = await stripe.customers.retrieve(
        existingBills[0].stripeCustomerId
      );
    } else {
      customer = await stripe.customers.create({
        metadata: { clientId: String(booking.clientId) },
      });
    }
  } catch {
    customer = await stripe.customers.create({
      metadata: { clientId: String(booking.clientId) },
    });
  }

  const appointmentType = booking.appointmentType || "tattoo_session";
  const productName =
    appointmentType === "consultation"
      ? "Consultation deposit"
      : "Tattoo appointment deposit";

  const bill = await Billing.create({
    bookingId,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "deposit",
    amountCents: amount,
    currency: CURRENCY,
    stripeCustomerId: customer.id,
    status: "pending",
    metadata: {
      appointmentType,
      nonRefundable: true,
    },
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: CURRENCY,
    customer: customer.id,
    metadata: {
      billingId: String(bill._id),
      bookingId: String(booking._id),
      type: "deposit",
      appointmentType,
    },
    description: productName,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  bill.stripePaymentIntentId = paymentIntent.id;
  await bill.save();

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    billingId: String(bill._id),
  });
}

export async function refundBilling(req, res) {
  const { billingId, bookingId } = req.body || {};
  const byId = billingId ? await Billing.findById(billingId) : null;
  const list = byId
    ? [byId]
    : await Billing.find({ bookingId, type: "platform_fee", status: "paid" });

  const refunds = [];
  for (const b of list) {
    if (b.type !== "platform_fee") continue;
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

export async function createFinalPaymentIntent(req, res) {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  const booking = await Booking.findById(bookingId);
  requireBooking(booking);

  if (booking.depositPaidCents < booking.depositRequiredCents) {
    return res.status(400).json({ error: "deposit_not_paid" });
  }

  const totalCents = Number(booking.priceCents || 0);
  const depositPaidCents = Number(booking.depositPaidCents || 0);
  const remainingCents = Math.max(0, totalCents - depositPaidCents);

  if (remainingCents <= 0) {
    return res.status(400).json({
      error: "no_payment_required",
      message: "Deposit covers full amount",
    });
  }

  let customer;
  try {
    const existingBills = await Billing.find({
      clientId: String(booking.clientId),
      stripeCustomerId: { $exists: true, $ne: null },
    }).limit(1);
    if (existingBills.length > 0 && existingBills[0].stripeCustomerId) {
      customer = await stripe.customers.retrieve(
        existingBills[0].stripeCustomerId
      );
    } else {
      customer = await stripe.customers.create({
        metadata: { clientId: String(booking.clientId) },
      });
    }
  } catch {
    customer = await stripe.customers.create({
      metadata: { clientId: String(booking.clientId) },
    });
  }

  const appointmentType = booking.appointmentType || "tattoo_session";
  const productName =
    appointmentType === "consultation"
      ? "Consultation final payment"
      : "Tattoo appointment final payment";

  const bill = await Billing.create({
    bookingId,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "final_payment",
    amountCents: remainingCents,
    currency: CURRENCY,
    stripeCustomerId: customer.id,
    status: "pending",
    metadata: {
      appointmentType,
      depositApplied: depositPaidCents,
      totalAmount: totalCents,
    },
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: remainingCents,
    currency: CURRENCY,
    customer: customer.id,
    metadata: {
      billingId: String(bill._id),
      bookingId: String(booking._id),
      type: "final_payment",
      appointmentType,
      depositApplied: depositPaidCents.toString(),
    },
    description: productName,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  bill.stripePaymentIntentId = paymentIntent.id;
  await bill.save();

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    billingId: String(bill._id),
    amountCents: remainingCents,
    depositApplied: depositPaidCents,
    totalAmount: totalCents,
  });
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
    if (!WebhookEvent) {
      const module = await import("../models/WebhookEvent.js");
      WebhookEvent = module.default;
    }

    const existingEvent = await WebhookEvent.findOne({
      stripeEventId: event.id,
    });
    if (existingEvent && existingEvent.processed) {
      return res.json({ received: true, message: "Event already processed" });
    }

    let webhookRecord = existingEvent;
    if (!webhookRecord) {
      webhookRecord = await WebhookEvent.create({
        stripeEventId: event.id,
        eventType: event.type,
        processed: false,
        metadata: { event },
      });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const s = event.data.object;
          const { billingId, bookingId, type } = s.metadata || {};
          const paymentIntent = s.payment_intent;

          if (billingId) {
            const bill = await Billing.findById(billingId);
            if (bill && bill.status !== "paid") {
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
            const book = await Booking.findById(bookingId);
            if (book && book.depositPaidCents < book.depositRequiredCents) {
              book.depositPaidCents = book.depositRequiredCents;
              book.status = "confirmed";
              book.confirmedAt = new Date();
              await book.save();
            }
          }
          break;
        }
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          const { billingId, bookingId, type } = pi.metadata || {};

          if (billingId) {
            const bill = await Billing.findById(billingId);
            if (bill && bill.status !== "paid") {
              bill.status = "paid";
              bill.stripePaymentIntentId = pi.id;
              bill.stripeChargeId = pi.latest_charge || null;
              bill.paidAt = new Date();
              await bill.save();
            }
          }
          if (type === "deposit" && bookingId) {
            const book = await Booking.findById(bookingId);
            if (book && book.depositPaidCents < book.depositRequiredCents) {
              book.depositPaidCents = book.depositRequiredCents;
              book.status = "confirmed";
              book.confirmedAt = new Date();
              await book.save();
            }
          }
          break;
        }
        default:
          break;
      }

      webhookRecord.processed = true;
      webhookRecord.processedAt = new Date();
      await webhookRecord.save();

      res.json({ received: true });
    } catch (error) {
      webhookRecord.error = error.message;
      await webhookRecord.save();
      throw error;
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "webhook_handler_failed" });
  }
}

export function mountStripeWebhook(app) {
  app.post(
    "/api/billing/webhook",
    (req, _res, next) => {
      let data = Buffer.alloc(0);
      req.on("data", (chunk) => (data = Buffer.concat([data, chunk])));
      req.on("end", () => {
        req.rawBody = data;
        next();
      });
    },
    stripeWebhook
  );
}