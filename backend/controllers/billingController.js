import Billing from "../models/Billing.js";
import Booking from "../models/Booking.js";
import Client from "../models/Client.js";
import Artist from "../models/Artist.js";
import { stripe } from "../lib/stripe.js";
import { sendAppointmentConfirmationEmail } from "../services/emailService.js";
import { config } from "../config/index.js";
import {
  getEffectiveFeePct,
  recordFeePaid,
} from "../services/rewardsService.js";
import { executePayouts, reversePayouts } from "../services/payoutService.js";
import { applyPayoutScheduleForArtist } from "../services/payoutScheduleService.js";

function bookingTransferGroup(bookingId) {
  return `booking_${String(bookingId)}`;
}

let WebhookEvent;
(async () => {
  const module = await import("../models/WebhookEvent.js");
  WebhookEvent = module.default;
})();

const CURRENCY = config.stripe.currency || "usd";

async function runPayoutsForBill(bill) {
  if (!bill) return;
  try {
    const transferable =
      bill.type === "deposit"
        ? Math.max(0, Number(bill.amountCents || 0) - Number(bill.platformFeeCents || 0))
        : Number(bill.amountCents || 0);
    await executePayouts({
      billing: bill,
      artistId: bill.artistId,
      transferableCents: transferable,
      transferGroup: bill.transferGroup || bookingTransferGroup(bill.bookingId),
      currency: bill.currency || CURRENCY,
    });
  } catch (e) {
    console.error("runPayoutsForBill failed:", e.code || e.message);
  }
}

function computePlatformFeeCents(priceCents, effectivePct, minCents) {
  const base = Math.max(0, Number(priceCents || 0));
  const pct = Math.max(0, Math.min(1, Number(effectivePct)));
  return Math.max(Math.round(base * pct), Math.max(0, Number(minCents || 0)));
}

async function resolveArtistPayoutAccount(artistId) {
  const artist = await Artist.findOne({ clerkId: String(artistId) });
  if (artist?.stripeConnectAccountId && artist.chargesEnabled) {
    return artist.stripeConnectAccountId;
  }
  if (config.dev.bypassGates) return null;
  const e = new Error("artist_not_onboarded");
  e.status = 409;
  e.publicMessage =
    "This artist hasn't finished payment setup yet, so payments can't be processed.";
  throw e;
}

function requireBooking(booking) {
  if (!booking) {
    const e = new Error("booking_not_found");
    e.status = 404;
    throw e;
  }
}

export async function checkoutPlatformFee(_req, res) {
  return res.status(410).json({
    error: "deprecated",
    message:
      "The platform fee is now collected automatically on the deposit. This endpoint is no longer used.",
  });
}

export async function checkoutDeposit(req, res) {
  try {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  const booking = await Booking.findById(bookingId);
  requireBooking(booking);

  if (booking.depositPaidCents >= booking.depositRequiredCents) {
    return res.status(400).json({ error: "deposit_already_paid" });
  }

  let amount = Number(booking.depositRequiredCents || 0);
  if (amount <= 0)
    return res.status(400).json({ error: "no_deposit_required" });

  if (config.stripe.testMode && amount < config.stripe.testMinAmountCents) {
    amount = config.stripe.testMinAmountCents;
  }

  const connectAccountId = await resolveArtistPayoutAccount(booking.artistId);
  const effectivePct = await getEffectiveFeePct(booking.clientId);
  const platformFeeCents = computePlatformFeeCents(
    booking.priceCents,
    effectivePct,
    config.platformFee.minCents
  );

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

  const transferGroup = bookingTransferGroup(booking._id);

  const bill = await Billing.create({
    bookingId,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "deposit",
    amountCents: amount + platformFeeCents,
    platformFeeCents,
    stripeConnectAccountId: connectAccountId,
    transferGroup,
    currency: CURRENCY,
    stripeCustomerId: customer.id,
    status: "pending",
    metadata: {
      appointmentType,
      depositCents: amount,
      nonRefundable: true,
    },
  });

  booking.platformFeeCents = platformFeeCents;
  await booking.save();

  const lineItems = [
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
  ];
  if (platformFeeCents > 0) {
    lineItems.push({
      price_data: {
        currency: CURRENCY,
        product_data: { name: "Platform service fee" },
        unit_amount: platformFeeCents,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    payment_intent_data: {
      transfer_group: transferGroup,
      setup_future_usage: "off_session",
    },
    line_items: lineItems,
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
  } catch (err) {
    console.error("checkoutDeposit error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function createDepositPaymentIntent(req, res) {
  try {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  const booking = await Booking.findById(bookingId);
  requireBooking(booking);

  if (booking.depositPaidCents >= booking.depositRequiredCents) {
    return res.status(400).json({ error: "deposit_already_paid" });
  }

  let amount = Number(booking.depositRequiredCents || 0);
  if (amount <= 0)
    return res.status(400).json({ error: "no_deposit_required" });

  if (config.stripe.testMode && amount < config.stripe.testMinAmountCents) {
    amount = config.stripe.testMinAmountCents;
  }

  const connectAccountId = await resolveArtistPayoutAccount(booking.artistId);
  const effectivePct = await getEffectiveFeePct(booking.clientId);
  const platformFeeCents = computePlatformFeeCents(
    booking.priceCents,
    effectivePct,
    config.platformFee.minCents
  );
  const chargeAmount = amount + platformFeeCents;

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

  const transferGroup = bookingTransferGroup(booking._id);

  const bill = await Billing.create({
    bookingId,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "deposit",
    amountCents: chargeAmount,
    platformFeeCents,
    stripeConnectAccountId: connectAccountId,
    transferGroup,
    currency: CURRENCY,
    stripeCustomerId: customer.id,
    status: "pending",
    metadata: {
      appointmentType,
      depositCents: amount,
      nonRefundable: true,
    },
  });

  booking.platformFeeCents = platformFeeCents;
  await booking.save();

  const depositIntentParams = {
    amount: chargeAmount,
    currency: CURRENCY,
    customer: customer.id,
    transfer_group: transferGroup,
    setup_future_usage: "off_session",
    metadata: {
      billingId: String(bill._id),
      bookingId: String(booking._id),
      type: "deposit",
      appointmentType,
      platformFeeCents: String(platformFeeCents),
    },
    description: productName,
    automatic_payment_methods: {
      enabled: true,
    },
  };
  const paymentIntent = await stripe.paymentIntents.create(depositIntentParams);

  bill.stripePaymentIntentId = paymentIntent.id;
  await bill.save();

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    billingId: String(bill._id),
    depositCents: amount,
    platformFeeCents,
    totalChargedCents: chargeAmount,
  });
  } catch (err) {
    console.error("createDepositPaymentIntent error:", err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || "Internal error", message: err.publicMessage });
  }
}

export async function refundBilling(req, res) {
  try {
    const actorId = String(req.user?.clerkId || req.auth?.userId || "").trim();
    const { billingId, bookingId } = req.body || {};
    const byId = billingId ? await Billing.findById(billingId) : null;
    const list = byId
      ? [byId]
      : await Billing.find({ bookingId, type: "platform_fee", status: "paid" });

    const authorized =
      !!actorId &&
      list.every(
        (b) => b && (String(b.clientId) === actorId || String(b.artistId) === actorId)
      );
    if (!authorized) {
      return res.status(403).json({ error: "forbidden" });
    }

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
  } catch (err) {
    console.error("refundBilling error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function createPortalSession(req, res) {
  try {
    const { customerId } = req.body || {};
    if (!customerId)
      return res.status(400).json({ error: "customerId required" });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.APP_URL,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("createPortalSession error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function scheduleCancel(_req, res) {
  try {
    res.json({ ok: true });
  } catch (err) {
    console.error("scheduleCancel error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function createFinalPaymentIntent(req, res) {
  try {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  const booking = await Booking.findById(bookingId);
  requireBooking(booking);

  if (booking.depositPaidCents < booking.depositRequiredCents) {
    return res.status(400).json({ error: "deposit_not_paid" });
  }

  const totalCents = Number(booking.priceCents || 0);
  const depositPaidCents = Number(booking.depositPaidCents || 0);
  let remainingCents = Math.max(0, totalCents - depositPaidCents);

  if (remainingCents <= 0) {
    return res.status(400).json({
      error: "no_payment_required",
      message: "Deposit covers full amount",
    });
  }

  if (config.stripe.testMode && remainingCents > 0 && remainingCents < config.stripe.testMinAmountCents) {
    remainingCents = config.stripe.testMinAmountCents;
  }

  const connectAccountId = await resolveArtistPayoutAccount(booking.artistId);

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

  const transferGroup = bookingTransferGroup(booking._id);

  const bill = await Billing.create({
    bookingId,
    artistId: booking.artistId,
    clientId: booking.clientId,
    type: "final_payment",
    amountCents: remainingCents,
    platformFeeCents: 0,
    stripeConnectAccountId: connectAccountId,
    transferGroup,
    currency: CURRENCY,
    stripeCustomerId: customer.id,
    status: "pending",
    metadata: {
      appointmentType,
      depositApplied: depositPaidCents,
      totalAmount: totalCents,
    },
  });

  const finalIntentParams = {
    amount: remainingCents,
    currency: CURRENCY,
    customer: customer.id,
    transfer_group: transferGroup,
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
  };
  const paymentIntent = await stripe.paymentIntents.create(finalIntentParams);

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
  } catch (err) {
    console.error("createFinalPaymentIntent error:", err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || "Internal error", message: err.publicMessage });
  }
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

          let feeCents = 0;
          let bill = null;
          if (billingId) {
            bill = await Billing.findById(billingId);
            if (bill) {
              feeCents = Number(bill.platformFeeCents || 0);
              if (bill.status !== "paid") {
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
          }
          if (type === "deposit" && bookingId) {
            const book = await Booking.findById(bookingId);
            if (book && book.depositPaidCents < book.depositRequiredCents) {
              book.depositPaidCents = book.depositRequiredCents;
              book.status = "confirmed";
              book.confirmedAt = new Date();
              await book.save();
              try {
                await recordFeePaid(book.clientId, feeCents);
              } catch (e) {
                console.error("recordFeePaid failed:", e.message);
              }
            }
            await runPayoutsForBill(bill);
          }
          break;
        }
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          const { billingId, bookingId, type } = pi.metadata || {};

          let feeCents = 0;
          let bill = null;
          if (billingId) {
            bill = await Billing.findById(billingId);
            if (bill) {
              feeCents = Number(bill.platformFeeCents || 0);
              if (bill.status !== "paid") {
                bill.status = "paid";
                bill.stripePaymentIntentId = pi.id;
                bill.stripeChargeId = pi.latest_charge || null;
                bill.paidAt = new Date();
                await bill.save();
              }
            }
          }
          if (type === "deposit" && bookingId) {
            const book = await Booking.findById(bookingId);
            if (book && book.depositPaidCents < book.depositRequiredCents) {
              book.depositPaidCents = book.depositRequiredCents;
              book.status = "confirmed";
              book.confirmedAt = new Date();
              await book.save();

              try {
                await recordFeePaid(book.clientId, feeCents);
              } catch (e) {
                console.error("recordFeePaid failed:", e.message);
              }

              try {
                let clientEmail = null;
                let clientName = "Valued Client";
                if (book.clientId) {
                  const client = await Client.findOne({ clerkId: String(book.clientId) });
                  if (client) {
                    clientEmail = client.email;
                    clientName = client.username || client.handle || "Valued Client";
                  }
                }

                if (clientEmail) {
                  await sendAppointmentConfirmationEmail(book, clientEmail, clientName);
                }
              } catch (emailError) {
                console.error("Failed to send confirmation email:", emailError);
              }
            }
          }
          if (type === "deposit" || type === "final_payment") {
            await runPayoutsForBill(bill);
          }
          break;
        }
        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          const { billingId } = pi.metadata || {};
          if (billingId) {
            const bill = await Billing.findById(billingId);
            if (bill && bill.status === "pending") {
              bill.status = "failed";
              await bill.save();
            }
          }
          break;
        }
        case "account.updated": {
          const account = event.data.object;
          const owner =
            (await Artist.findOne({ stripeConnectAccountId: account.id })) ||
            (await (await import("../models/Studio.js")).default.findOne({
              stripeConnectAccountId: account.id,
            }));
          if (owner) {
            owner.chargesEnabled = Boolean(account.charges_enabled);
            owner.payoutsEnabled = Boolean(account.payouts_enabled);
            owner.connectRequirementsDue = account.requirements?.currently_due || [];
            if (
              account.charges_enabled &&
              account.payouts_enabled &&
              !owner.onboardingCompletedAt
            ) {
              owner.onboardingCompletedAt = new Date();
            }
            await owner.save();
            if (owner.clerkId && account.charges_enabled) {
              await applyPayoutScheduleForArtist(owner.clerkId);
            }
          }
          break;
        }
        case "charge.dispute.created": {
          const dispute = event.data.object;
          const chargeId = dispute.charge;
          const piId = dispute.payment_intent;
          const or = [];
          if (chargeId) or.push({ stripeChargeId: chargeId });
          if (piId) or.push({ stripePaymentIntentId: piId });
          const bill = or.length ? await Billing.findOne({ $or: or }) : null;
          if (bill) {
            bill.disputeStatus = "disputed";
            await bill.save();
            try {
              await reversePayouts(bill);
              bill.disputeStatus = "reversed";
              await bill.save();
            } catch (e) {
              console.error("dispute clawback failed:", e.message);
              bill.disputeStatus = "reversal_failed";
              await bill.save();
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
    "/billing/webhook",
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