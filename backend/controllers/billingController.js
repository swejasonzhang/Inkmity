import Billing from "../models/Billing.js";
import Booking from "../models/Booking.js";
import Client from "../models/Client.js";
import Artist from "../models/Artist.js";
import { stripe } from "../lib/stripe.js";
import { sendAppointmentConfirmationEmail } from "../services/emailService.js";
import { config } from "../config/index.js";
import { recordFeePaid, getClientPlatformFee } from "../services/rewardsService.js";
import { executePayouts, reversePayouts } from "../services/payoutService.js";
import { applyPayoutScheduleForArtist } from "../services/payoutScheduleService.js";
import { computePlatformFeeCents, estimateStripeFeeCents } from "../lib/fees.js";
import { computeArtistStudioSplit } from "../services/studioService.js";

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
    const gross =
      bill.type === "deposit"
        ? Math.max(0, Number(bill.amountCents || 0) - Number(bill.platformFeeCents || 0))
        : Number(bill.amountCents || 0);
    const stripeFee = estimateStripeFeeCents(
      Number(bill.amountCents || 0),
      config.platformFee.processingPct,
      config.platformFee.processingFlatCents
    );
    const transferable = Math.max(0, gross - stripeFee);
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
  const platformFeeCents = computePlatformFeeCents(
    booking.priceCents,
    await getClientPlatformFee(booking.clientId)
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
  const platformFeeCents = computePlatformFeeCents(
    booking.priceCents,
    await getClientPlatformFee(booking.clientId)
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

export async function createCardSetupIntent(req, res) {
  try {
    const { bookingId } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });

    const booking = await Booking.findById(bookingId);
    requireBooking(booking);

    let customer;
    try {
      const existingBills = await Billing.find({
        clientId: String(booking.clientId),
        stripeCustomerId: { $exists: true, $ne: null },
      }).limit(1);
      const existingId = booking.stripeCustomerId || existingBills[0]?.stripeCustomerId;
      if (existingId) {
        customer = await stripe.customers.retrieve(existingId);
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

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId: String(booking._id),
        clientId: String(booking.clientId),
        type: "card_on_file",
      },
    });

    booking.stripeCustomerId = customer.id;
    await booking.save();

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: customer.id,
    });
  } catch (err) {
    console.error("createCardSetupIntent error:", err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || "Internal error", message: err.publicMessage });
  }
}

export async function createBankSetupIntent(req, res) {
  try {
    const { bookingId } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });

    const booking = await Booking.findById(bookingId);
    requireBooking(booking);

    let customer;
    try {
      const existingBills = await Billing.find({
        clientId: String(booking.clientId),
        stripeCustomerId: { $exists: true, $ne: null },
      }).limit(1);
      const existingId = booking.stripeCustomerId || existingBills[0]?.stripeCustomerId;
      if (existingId) {
        customer = await stripe.customers.retrieve(existingId);
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

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
      payment_method_types: ["us_bank_account"],
      payment_method_options: {
        us_bank_account: { verification_method: "automatic" },
      },
      metadata: {
        bookingId: String(booking._id),
        clientId: String(booking.clientId),
        type: "bank_on_file",
      },
    });

    booking.stripeCustomerId = customer.id;
    await booking.save();

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: customer.id,
    });
  } catch (err) {
    console.error("createBankSetupIntent error:", err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || "Internal error", message: err.publicMessage });
  }
}

async function resolveClientCustomer(clerkId) {
  const client = await Client.findOne({ clerkId });
  if (!client) return null;
  if (client.stripeCustomerId) {
    try {
      const c = await stripe.customers.retrieve(client.stripeCustomerId);
      if (c && !c.deleted) return { customerId: client.stripeCustomerId, client };
    } catch {}
  }
  const customer = await stripe.customers.create({ metadata: { clerkId } });
  client.stripeCustomerId = customer.id;
  await client.save();
  return { customerId: customer.id, client };
}

export async function createClientSetupIntent(req, res) {
  try {
    const clerkId = String(req.user?.clerkId || req.auth?.userId || "");
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const resolved = await resolveClientCustomer(clerkId);
    if (!resolved) return res.status(404).json({ error: "client_not_found" });

    const setupIntent = await stripe.setupIntents.create({
      customer: resolved.customerId,
      usage: "off_session",
      payment_method_types: ["card", "klarna", "cashapp", "us_bank_account"],
      metadata: { clerkId, type: "client_payment_method" },
    });

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: resolved.customerId,
    });
  } catch (err) {
    console.error("createClientSetupIntent error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function listClientPaymentMethods(req, res) {
  try {
    const clerkId = String(req.user?.clerkId || req.auth?.userId || "");
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const client = await Client.findOne({ clerkId });
    if (!client?.stripeCustomerId) return res.json({ methods: [] });

    const customerId = client.stripeCustomerId;
    let defaultPm = null;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      defaultPm = customer?.invoice_settings?.default_payment_method || null;
    } catch {}

    const [cards, banks] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: "card" }),
      stripe.paymentMethods.list({ customer: customerId, type: "us_bank_account" }),
    ]);

    const methods = [
      ...(cards?.data || []).map((pm) => ({
        id: pm.id,
        type: "card",
        brand: pm.card?.brand || "card",
        last4: pm.card?.last4 || "",
        expMonth: pm.card?.exp_month || null,
        expYear: pm.card?.exp_year || null,
        isDefault: pm.id === defaultPm,
      })),
      ...(banks?.data || []).map((pm) => ({
        id: pm.id,
        type: "us_bank_account",
        bankName: pm.us_bank_account?.bank_name || "Bank account",
        last4: pm.us_bank_account?.last4 || "",
        isDefault: pm.id === defaultPm,
      })),
    ];

    res.json({ methods });
  } catch (err) {
    console.error("listClientPaymentMethods error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function deleteClientPaymentMethod(req, res) {
  try {
    const clerkId = String(req.user?.clerkId || req.auth?.userId || "");
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const { paymentMethodId } = req.body || {};
    if (!paymentMethodId) return res.status(400).json({ error: "paymentMethodId required" });

    const client = await Client.findOne({ clerkId });
    if (!client?.stripeCustomerId) return res.status(404).json({ error: "no_customer" });

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer && String(pm.customer) !== String(client.stripeCustomerId))
      return res.status(403).json({ error: "forbidden" });

    await stripe.paymentMethods.detach(paymentMethodId);
    res.json({ ok: true });
  } catch (err) {
    console.error("deleteClientPaymentMethod error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function refundDepositForBooking(bookingId) {
  const deposits = await Billing.find({ bookingId, type: "deposit", status: "paid" });
  const refunds = [];
  for (const b of deposits) {
    if (b.stripePaymentIntentId) {
      try {
        const rr = await stripe.refunds.create({ payment_intent: b.stripePaymentIntentId });
        b.stripeRefundIds = b.stripeRefundIds || [];
        b.stripeRefundIds.push(rr.id);
        refunds.push(rr.id);
      } catch (e) {
        console.error("refundDepositForBooking refund failed:", e.message);
      }
    }
    b.status = "refunded";
    b.refundedAt = new Date();
    await b.save();
    try {
      await reversePayouts(b);
    } catch (e) {
      console.error("refundDepositForBooking clawback failed:", e.message);
    }
  }
  return refunds;
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

const TIP_MIN_CENTS = 100;
const TIP_MAX_CENTS = 100000;

export async function createTipCheckout(req, res) {
  try {
    const userId = String(req.user?.clerkId || req.auth?.userId || "").trim();
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { bookingId } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });

    let tipCents = Math.round(Number(req.body?.tipCents || 0));
    if (!Number.isFinite(tipCents) || tipCents < TIP_MIN_CENTS) {
      return res.status(400).json({ error: "invalid_amount", message: "Choose a tip amount." });
    }
    tipCents = Math.min(tipCents, TIP_MAX_CENTS);

    const booking = await Booking.findById(bookingId);
    requireBooking(booking);

    if (String(booking.clientId) !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({
        error: "not_completed",
        message: "You can tip once your session is completed.",
      });
    }

    const connectAccountId = await resolveArtistPayoutAccount(booking.artistId);

    let customer;
    try {
      const existingBills = await Billing.find({
        clientId: String(booking.clientId),
        stripeCustomerId: { $exists: true, $ne: null },
      }).limit(1);
      if (existingBills.length > 0 && existingBills[0].stripeCustomerId) {
        customer = await stripe.customers.retrieve(existingBills[0].stripeCustomerId);
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

    const transferGroup = bookingTransferGroup(booking._id);

    const bill = await Billing.create({
      bookingId,
      artistId: booking.artistId,
      clientId: booking.clientId,
      type: "tip",
      amountCents: tipCents,
      platformFeeCents: 0,
      stripeConnectAccountId: connectAccountId,
      transferGroup,
      currency: CURRENCY,
      stripeCustomerId: customer.id,
      status: "pending",
      metadata: { kind: "tip" },
    });

    const paymentIntentData = { transfer_group: transferGroup };
    if (connectAccountId) {
      paymentIntentData.transfer_data = { destination: connectAccountId };
      paymentIntentData.on_behalf_of = connectAccountId;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customer.id,
      payment_method_types: ["card"],
      payment_intent_data: paymentIntentData,
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: "Tip for your artist",
              description: "100% of your tip goes to your artist — Inkmity takes nothing.",
            },
            unit_amount: tipCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        billingId: String(bill._id),
        bookingId: String(booking._id),
        type: "tip",
      },
      success_url: `${process.env.APP_URL}/appointments/${bookingId}?tipped=1`,
      cancel_url: `${process.env.APP_URL}/appointments/${bookingId}?tip_cancelled=1`,
    });

    bill.stripeCheckoutSessionId = session.id;
    await bill.save();

    res.json({ url: session.url, id: session.id, tipCents });
  } catch (err) {
    console.error("createTipCheckout error:", err);
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
          if (type === "tip" && bookingId) {
            const book = await Booking.findById(bookingId);
            if (book) {
              book.tipCents = Number(book.tipCents || 0) + Number(bill?.amountCents || 0);
              await book.save();
            }
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
export async function getPaymentBreakdown(req, res) {
  try {
    const me = String(req.user?.clerkId || req.auth?.userId || "").trim();
    if (!me) return res.status(401).json({ error: "Unauthorized" });

    let artistClerkId, priceCents, clientId, status = null;
    if (req.body?.bookingId) {
      const booking = await Booking.findById(req.body.bookingId).lean();
      if (!booking) return res.status(404).json({ error: "not_found" });
      if (me !== String(booking.clientId) && me !== String(booking.artistId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      artistClerkId = String(booking.artistId);
      priceCents = Math.max(0, Number(booking.priceCents || 0));
      clientId = String(booking.clientId);
      status = booking.status;
    } else {
      artistClerkId = String(req.body?.artistClerkId || "").trim();
      priceCents = Math.max(0, Number(req.body?.priceCents || 0));
      clientId = me;
      if (!artistClerkId) return res.status(400).json({ error: "bookingId or artistClerkId required" });
    }

    const fee = await getClientPlatformFee(clientId);
    const platformFeeCents = computePlatformFeeCents(priceCents, fee);
    const clientTotalCents = priceCents + platformFeeCents;

    const split = await computeArtistStudioSplit(artistClerkId, priceCents);
    const isStudio = !!split;
    const artistGrossCents = isStudio ? split.artistCents : priceCents;
    const studioCents = isStudio ? split.studioCents : 0;

    const stripeFeeCents = estimateStripeFeeCents(
      clientTotalCents,
      config.platformFee.processingPct,
      config.platformFee.processingFlatCents
    );
    const artistNetCents = Math.max(0, artistGrossCents - stripeFeeCents);

    const payload = {
      priceCents,
      platformFeeCents,
      baseFeeWaived: !!fee.baseFeeWaived,
      clientTotalCents,
      status,
    };

    if (me === artistClerkId) {
      payload.isStudio = isStudio;
      payload.commissionPct = split?.commissionPct || 0;
      payload.artistGrossCents = artistGrossCents;
      payload.artistNetCents = artistNetCents;
      payload.studioCents = studioCents;
      payload.stripeFeeCents = stripeFeeCents;
    }

    res.json(payload);
  } catch (e) {
    console.error("getPaymentBreakdown error:", e.message);
    res.status(500).json({ error: "breakdown_failed" });
  }
}
