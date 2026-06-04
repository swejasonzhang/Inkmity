import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

// ESM-safe module mock for Stripe. Must be registered before the controller is
// dynamically imported so the controller binds to this mock (jest.mock does not
// hoist under native ES modules).
const stripeMock = {
  customers: { create: jest.fn(), retrieve: jest.fn() },
  paymentIntents: { create: jest.fn() },
  webhooks: { constructEvent: jest.fn((body) => JSON.parse(body.toString())) },
  accounts: { create: jest.fn(), retrieve: jest.fn() },
  accountLinks: { create: jest.fn() },
  refunds: { create: jest.fn() },
};
jest.unstable_mockModule("../../lib/stripe.js", () => ({ stripe: stripeMock }));

const { createDepositPaymentIntent, createFinalPaymentIntent, stripeWebhook } =
  await import("../../controllers/billingController.js");
const Booking = (await import("../../models/Booking.js")).default;
const Billing = (await import("../../models/Billing.js")).default;
const WebhookEvent = (await import("../../models/WebhookEvent.js")).default;
await import("../../models/Artist.js");
await import("../../models/Client.js");

const PLATFORM_FEE_MIN_CENTS = 500; // config default (max(price*pct, min))

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.post("/billing/deposit/intent", mockAuth, createDepositPaymentIntent);
app.post("/billing/final-payment/intent", mockAuth, createFinalPaymentIntent);
app.post(
  "/billing/webhook",
  (req, res, next) => {
    req.rawBody = Buffer.from(JSON.stringify(req.body));
    next();
  },
  stripeWebhook
);

// A Connect-onboarded artist is required before any client can pay them.
async function createOnboardedArtist(artistId) {
  const Artist = mongoose.model("artist");
  return Artist.create({
    clerkId: artistId,
    email: `${artistId}@example.com`,
    username: "Artist",
    handle: `@${artistId}`,
    role: "artist",
    stripeConnectAccountId: "acct_test_123",
    chargesEnabled: true,
    payoutsEnabled: true,
  });
}

conditionalDescribe("Billing Controller - Deposit PaymentIntent", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    await createOnboardedArtist(artistId);

    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "pending",
      appointmentType: "consultation",
      priceCents: 0,
      depositRequiredCents: 1000,
      depositPaidCents: 0,
    });
    bookingId = booking._id.toString();

    stripeMock.customers.create.mockResolvedValue({ id: "cus_test123" });
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: "pi_test123",
      client_secret: "pi_test123_secret",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should create PaymentIntent charging deposit + platform fee, routed to the artist", async () => {
    const response = await request(app)
      .post("/billing/deposit/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(response.status).toBe(200);
    expect(response.body.clientSecret).toBe("pi_test123_secret");
    expect(response.body.paymentIntentId).toBe("pi_test123");
    // priceCents = 0, so the fee floors at the configured minimum.
    expect(response.body.depositCents).toBe(1000);
    expect(response.body.platformFeeCents).toBe(PLATFORM_FEE_MIN_CENTS);
    expect(response.body.totalChargedCents).toBe(1000 + PLATFORM_FEE_MIN_CENTS);
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000 + PLATFORM_FEE_MIN_CENTS,
        application_fee_amount: PLATFORM_FEE_MIN_CENTS,
        transfer_data: { destination: "acct_test_123" },
        metadata: expect.objectContaining({ type: "deposit", bookingId }),
      })
    );
  });

  test("should reject if the artist has not finished payment onboarding", async () => {
    const Artist = mongoose.model("artist");
    await Artist.updateOne({ clerkId: artistId }, { $set: { chargesEnabled: false } });

    const response = await request(app)
      .post("/billing/deposit/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("artist_not_onboarded");
  });

  test("should reject if deposit already paid", async () => {
    const booking = await Booking.findById(bookingId);
    booking.depositPaidCents = 1000;
    await booking.save();

    const response = await request(app)
      .post("/billing/deposit/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("deposit_already_paid");
  });

  test("should create Billing record with status pending and recorded fee", async () => {
    await request(app)
      .post("/billing/deposit/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    const billing = await Billing.findOne({ bookingId });
    expect(billing).toBeDefined();
    expect(billing.status).toBe("pending");
    expect(billing.type).toBe("deposit");
    expect(billing.amountCents).toBe(1000 + PLATFORM_FEE_MIN_CENTS);
    expect(billing.platformFeeCents).toBe(PLATFORM_FEE_MIN_CENTS);
    expect(billing.stripeConnectAccountId).toBe("acct_test_123");
  });
});

conditionalDescribe("Billing Controller - Final Payment Intent", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    await createOnboardedArtist(artistId);

    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "tattoo_session",
      priceCents: 10000,
      depositRequiredCents: 2000,
      depositPaidCents: 2000,
    });
    bookingId = booking._id.toString();

    stripeMock.customers.create.mockResolvedValue({ id: "cus_test123" });
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: "pi_test123",
      client_secret: "pi_test123_secret",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should charge remaining balance (no extra fee) and transfer fully to the artist", async () => {
    const response = await request(app)
      .post("/billing/final-payment/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(response.status).toBe(200);
    expect(response.body.amountCents).toBe(8000);
    expect(response.body.depositApplied).toBe(2000);
    expect(response.body.totalAmount).toBe(10000);
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 8000,
        transfer_data: { destination: "acct_test_123" },
        metadata: expect.objectContaining({
          type: "final_payment",
          depositApplied: "2000",
        }),
      })
    );
    // No platform fee on the final payment.
    const callArg = stripeMock.paymentIntents.create.mock.calls[0][0];
    expect(callArg.application_fee_amount).toBeUndefined();
  });

  test("should reject if deposit not paid", async () => {
    const booking = await Booking.findById(bookingId);
    booking.depositPaidCents = 0;
    await booking.save();

    const response = await request(app)
      .post("/billing/final-payment/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("deposit_not_paid");
  });

  test("should handle zero remaining balance", async () => {
    const booking = await Booking.findById(bookingId);
    booking.priceCents = 2000;
    booking.depositPaidCents = 2000;
    await booking.save();

    const response = await request(app)
      .post("/billing/final-payment/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("no_payment_required");
  });
});

conditionalDescribe("Billing Controller - Stripe Webhook", () => {
  let artistId;
  let clientId;
  let bookingId;
  let billingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "pending",
      appointmentType: "consultation",
      depositRequiredCents: 1000,
      depositPaidCents: 0,
    });
    bookingId = booking._id.toString();

    const billing = await Billing.create({
      bookingId,
      artistId,
      clientId,
      type: "deposit",
      amountCents: 1500,
      platformFeeCents: 500,
      status: "pending",
    });
    billingId = billing._id.toString();
  });

  test("should handle payment_intent.succeeded event", async () => {
    const event = {
      id: "evt_test123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test123",
          metadata: { billingId, bookingId, type: "deposit" },
        },
      },
    };

    const response = await request(app).post("/billing/webhook").send(event);
    expect(response.status).toBe(200);

    const billing = await Billing.findById(billingId);
    expect(billing.status).toBe("paid");
    expect(billing.stripePaymentIntentId).toBe("pi_test123");

    const booking = await Booking.findById(bookingId);
    expect(booking.depositPaidCents).toBe(1000);
    expect(booking.status).toBe("confirmed");
  });

  test("should be idempotent - handle duplicate webhook events safely", async () => {
    const event = {
      id: "evt_test123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test123",
          metadata: { billingId, bookingId, type: "deposit" },
        },
      },
    };

    await request(app).post("/billing/webhook").send(event);
    const response = await request(app).post("/billing/webhook").send(event);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Event already processed");

    const webhookEvents = await WebhookEvent.find({ stripeEventId: "evt_test123" });
    expect(webhookEvents.length).toBe(1);
    expect(webhookEvents[0].processed).toBe(true);
  });

  test("should not double-charge on duplicate events", async () => {
    const event = {
      id: "evt_test123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test123",
          metadata: { billingId, bookingId, type: "deposit" },
        },
      },
    };

    await request(app).post("/billing/webhook").send(event);
    const booking1 = await Booking.findById(bookingId);
    const depositPaid1 = booking1.depositPaidCents;

    await request(app).post("/billing/webhook").send(event);
    const booking2 = await Booking.findById(bookingId);
    const depositPaid2 = booking2.depositPaidCents;

    expect(depositPaid1).toBe(depositPaid2);
    expect(depositPaid1).toBe(1000);
  });

  test("should mark billing failed on payment_intent.payment_failed", async () => {
    const event = {
      id: "evt_failed_1",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_fail", metadata: { billingId } } },
    };

    const response = await request(app).post("/billing/webhook").send(event);
    expect(response.status).toBe(200);

    const billing = await Billing.findById(billingId);
    expect(billing.status).toBe("failed");
  });

  test("should sync artist Connect flags on account.updated", async () => {
    const Artist = mongoose.model("artist");
    await Artist.create({
      clerkId: artistId,
      email: "a@example.com",
      username: "Artist",
      handle: "@artist-acct",
      role: "artist",
      stripeConnectAccountId: "acct_sync_1",
      chargesEnabled: false,
    });

    const event = {
      id: "evt_acct_1",
      type: "account.updated",
      data: {
        object: {
          id: "acct_sync_1",
          charges_enabled: true,
          payouts_enabled: true,
          requirements: { currently_due: [] },
        },
      },
    };

    const response = await request(app).post("/billing/webhook").send(event);
    expect(response.status).toBe(200);

    const artist = await Artist.findOne({ stripeConnectAccountId: "acct_sync_1" });
    expect(artist.chargesEnabled).toBe(true);
    expect(artist.payoutsEnabled).toBe(true);
    expect(artist.onboardingCompletedAt).toBeTruthy();
  });
});
