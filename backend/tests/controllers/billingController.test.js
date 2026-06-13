import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const stripeMock = {
  customers: { create: jest.fn(), retrieve: jest.fn() },
  paymentIntents: { create: jest.fn() },
  setupIntents: { create: jest.fn() },
  paymentMethods: { list: jest.fn(), retrieve: jest.fn(), detach: jest.fn() },
  webhooks: { constructEvent: jest.fn((body) => JSON.parse(body.toString())) },
  accounts: { create: jest.fn(), retrieve: jest.fn() },
  accountLinks: { create: jest.fn() },
  refunds: { create: jest.fn() },
};
jest.unstable_mockModule("../../lib/stripe.js", () => ({ stripe: stripeMock }));

const {
  createDepositPaymentIntent,
  createFinalPaymentIntent,
  createBankSetupIntent,
  createClientSetupIntent,
  listClientPaymentMethods,
  deleteClientPaymentMethod,
  stripeWebhook,
} = await import("../../controllers/billingController.js");
const Booking = (await import("../../models/Booking.js")).default;
const Billing = (await import("../../models/Billing.js")).default;
const WebhookEvent = (await import("../../models/WebhookEvent.js")).default;
await import("../../models/Artist.js");
await import("../../models/Client.js");

const PLATFORM_FEE_MIN_CENTS = 500;

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.post("/billing/deposit/intent", mockAuth, createDepositPaymentIntent);
app.post("/billing/final-payment/intent", mockAuth, createFinalPaymentIntent);
app.post("/billing/bank-setup-intent", mockAuth, createBankSetupIntent);
app.post("/billing/client/setup-intent", mockAuth, createClientSetupIntent);
app.get("/billing/client/payment-methods", mockAuth, listClientPaymentMethods);
app.post("/billing/client/payment-methods/delete", mockAuth, deleteClientPaymentMethod);
app.post(
  "/billing/webhook",
  (req, res, next) => {
    req.rawBody = Buffer.from(JSON.stringify(req.body));
    next();
  },
  stripeWebhook
);

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

conditionalDescribe("Billing Controller - Bank Setup Intent (ACH)", () => {
  let bookingId;

  beforeEach(async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId: "artist-123",
      clientId: "client-456",
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "tattoo_session",
      priceCents: 10000,
    });
    bookingId = booking._id.toString();

    stripeMock.customers.create.mockResolvedValue({ id: "cus_bank123" });
    stripeMock.setupIntents.create.mockResolvedValue({
      id: "seti_bank123",
      client_secret: "seti_bank123_secret",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("creates a us_bank_account SetupIntent for off-session ACH charges", async () => {
    const response = await request(app)
      .post("/billing/bank-setup-intent")
      .set("x-test-user-id", "client-456")
      .send({ bookingId });

    expect(response.status).toBe(200);
    expect(response.body.clientSecret).toBe("seti_bank123_secret");
    expect(response.body.setupIntentId).toBe("seti_bank123");
    expect(response.body.customerId).toBe("cus_bank123");
    expect(stripeMock.setupIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_bank123",
        usage: "off_session",
        payment_method_types: ["us_bank_account"],
        metadata: expect.objectContaining({ type: "bank_on_file", bookingId }),
      })
    );

    const booking = await Booking.findById(bookingId);
    expect(booking.stripeCustomerId).toBe("cus_bank123");
  });

  test("rejects when bookingId is missing", async () => {
    const response = await request(app)
      .post("/billing/bank-setup-intent")
      .set("x-test-user-id", "client-456")
      .send({});

    expect(response.status).toBe(400);
    expect(stripeMock.setupIntents.create).not.toHaveBeenCalled();
  });
});

conditionalDescribe("Billing Controller - Client saved payment methods (profile)", () => {
  const CLERK = "client-pm";

  beforeEach(async () => {
    const Client = mongoose.model("client");
    await Client.create({
      clerkId: CLERK,
      email: "pm@example.com",
      username: "PM Client",
      handle: "@pmclient",
      role: "client",
    });
    stripeMock.customers.create.mockResolvedValue({ id: "cus_pm1", invoice_settings: {} });
    stripeMock.customers.retrieve.mockResolvedValue({
      id: "cus_pm1",
      invoice_settings: { default_payment_method: "pm_card_1" },
    });
    stripeMock.setupIntents.create.mockResolvedValue({
      id: "seti_pm1",
      client_secret: "seti_pm1_secret",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("creates an automatic-methods SetupIntent (card + bank) and persists the Stripe customer", async () => {
    const res = await request(app)
      .post("/billing/client/setup-intent")
      .set("x-test-user-id", CLERK)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.clientSecret).toBe("seti_pm1_secret");
    expect(stripeMock.setupIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_pm1",
        usage: "off_session",
        payment_method_types: expect.arrayContaining(["card", "klarna"]),
      })
    );
    const passed = stripeMock.setupIntents.create.mock.calls[0][0].payment_method_types;
    expect(passed).not.toContain("bancontact");
    expect(passed).not.toContain("amazon_pay");

    const Client = mongoose.model("client");
    const saved = await Client.findOne({ clerkId: CLERK });
    expect(saved.stripeCustomerId).toBe("cus_pm1");
  });

  test("lists saved card + bank methods with display details and default flag", async () => {
    const Client = mongoose.model("client");
    await Client.updateOne({ clerkId: CLERK }, { $set: { stripeCustomerId: "cus_pm1" } });

    stripeMock.paymentMethods.list.mockImplementation(async ({ type }) =>
      type === "card"
        ? { data: [{ id: "pm_card_1", card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 } }] }
        : { data: [{ id: "pm_bank_1", us_bank_account: { bank_name: "Test Bank", last4: "6789" } }] }
    );

    const res = await request(app)
      .get("/billing/client/payment-methods")
      .set("x-test-user-id", CLERK);

    expect(res.status).toBe(200);
    expect(res.body.methods).toHaveLength(2);
    const card = res.body.methods.find((m) => m.type === "card");
    expect(card).toMatchObject({ brand: "visa", last4: "4242", isDefault: true });
    const bank = res.body.methods.find((m) => m.type === "us_bank_account");
    expect(bank).toMatchObject({ bankName: "Test Bank", last4: "6789", isDefault: false });
  });

  test("returns empty list when the client has no Stripe customer yet", async () => {
    const res = await request(app)
      .get("/billing/client/payment-methods")
      .set("x-test-user-id", CLERK);

    expect(res.status).toBe(200);
    expect(res.body.methods).toEqual([]);
  });

  test("detaches (swaps out) a saved payment method the client owns", async () => {
    const Client = mongoose.model("client");
    await Client.updateOne({ clerkId: CLERK }, { $set: { stripeCustomerId: "cus_pm1" } });
    stripeMock.paymentMethods.retrieve.mockResolvedValue({ id: "pm_card_1", customer: "cus_pm1" });
    stripeMock.paymentMethods.detach.mockResolvedValue({ id: "pm_card_1" });

    const res = await request(app)
      .post("/billing/client/payment-methods/delete")
      .set("x-test-user-id", CLERK)
      .send({ paymentMethodId: "pm_card_1" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(stripeMock.paymentMethods.detach).toHaveBeenCalledWith("pm_card_1");
  });

  test("refuses to detach a payment method owned by another customer", async () => {
    const Client = mongoose.model("client");
    await Client.updateOne({ clerkId: CLERK }, { $set: { stripeCustomerId: "cus_pm1" } });
    stripeMock.paymentMethods.retrieve.mockResolvedValue({ id: "pm_x", customer: "cus_other" });

    const res = await request(app)
      .post("/billing/client/payment-methods/delete")
      .set("x-test-user-id", CLERK)
      .send({ paymentMethodId: "pm_x" });

    expect(res.status).toBe(403);
    expect(stripeMock.paymentMethods.detach).not.toHaveBeenCalled();
  });
});
