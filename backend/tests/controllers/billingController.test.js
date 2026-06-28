import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const ADMIN_ID = "admin-1";
process.env.ADMIN_CLERK_IDS = ADMIN_ID;

const stripeMock = {
  customers: { create: jest.fn(), retrieve: jest.fn() },
  paymentIntents: { create: jest.fn() },
  setupIntents: { create: jest.fn() },
  paymentMethods: { list: jest.fn(), retrieve: jest.fn(), detach: jest.fn() },
  webhooks: { constructEvent: jest.fn((body) => JSON.parse(body.toString())) },
  accounts: { create: jest.fn(), retrieve: jest.fn() },
  accountLinks: { create: jest.fn() },
  refunds: { create: jest.fn() },
  transfers: { create: jest.fn(), createReversal: jest.fn() },
  billingPortal: { sessions: { create: jest.fn() } },
};
jest.unstable_mockModule("../../lib/stripe.js", () => ({ stripe: stripeMock }));

const {
  checkoutDeposit,
  createDepositPaymentIntent,
  createFinalPaymentIntent,
  createCardSetupIntent,
  createBankSetupIntent,
  createClientSetupIntent,
  listClientPaymentMethods,
  deleteClientPaymentMethod,
  refundDepositForBooking,
  createTipCheckout,
  getPaymentBreakdown,
  stripeWebhook,
  checkoutPlatformFee,
  refundBilling,
  createPortalSession,
  scheduleCancel,
  retryPayoutsHandler,
} = await import("../../controllers/billingController.js");
const Booking = (await import("../../models/Booking.js")).default;
const Billing = (await import("../../models/Billing.js")).default;
const WebhookEvent = (await import("../../models/WebhookEvent.js")).default;
const Artist = (await import("../../models/Artist.js")).default;
await import("../../models/Client.js");

const PLATFORM_FEE_MIN_CENTS = 1000; // $10 platform base fee (config.platformFee.baseCents)

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.post("/billing/deposit/checkout", mockAuth, checkoutDeposit);
app.post("/billing/deposit/intent", mockAuth, createDepositPaymentIntent);
app.post("/billing/card-setup-intent", mockAuth, createCardSetupIntent);
app.post("/billing/tip", mockAuth, createTipCheckout);
app.post("/billing/breakdown", mockAuth, getPaymentBreakdown);
app.post("/billing/final-payment/intent", mockAuth, createFinalPaymentIntent);
app.post("/billing/bank-setup-intent", mockAuth, createBankSetupIntent);
app.post("/billing/client/setup-intent", mockAuth, createClientSetupIntent);
app.get("/billing/client/payment-methods", mockAuth, listClientPaymentMethods);
app.post("/billing/client/payment-methods/delete", mockAuth, deleteClientPaymentMethod);
app.post("/billing/checkout", mockAuth, checkoutPlatformFee);
app.post("/billing/refund", mockAuth, refundBilling);
app.post("/billing/portal", mockAuth, createPortalSession);
app.post("/billing/schedule-cancel", mockAuth, scheduleCancel);
app.post("/billing/payouts/retry", mockAuth, retryPayoutsHandler);
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
        transfer_group: expect.stringContaining("booking_"),
        metadata: expect.objectContaining({ type: "deposit", bookingId }),
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
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

  test("403 when a user who is not the booking's client requests a deposit intent", async () => {
    const response = await request(app)
      .post("/billing/deposit/intent")
      .set("x-test-user-id", "intruder")
      .send({ bookingId });
    expect(response.status).toBe(403);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(await Billing.findOne({ bookingId })).toBeNull();
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
        transfer_group: expect.stringContaining("booking_"),
        metadata: expect.objectContaining({
          type: "final_payment",
          depositApplied: "2000",
        }),
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
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

  test("403 when a user who is not the booking's client requests the final-payment intent", async () => {
    const response = await request(app)
      .post("/billing/final-payment/intent")
      .set("x-test-user-id", "intruder")
      .send({ bookingId });
    expect(response.status).toBe(403);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
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

  test("a final_payment succeeded event pays out to an onboarded artist", async () => {
    await Artist.create({
      clerkId: artistId,
      email: "artist-123@example.com",
      username: "Artist",
      handle: "@artist-123",
      role: "artist",
      stripeConnectAccountId: "acct_x",
      chargesEnabled: true,
      payoutsEnabled: true,
    });
    const fpBill = await Billing.create({
      bookingId,
      artistId,
      clientId,
      type: "final_payment",
      amountCents: 8000,
      platformFeeCents: 0,
      status: "pending",
      transferGroup: `booking_${bookingId}`,
    });
    stripeMock.transfers.create.mockResolvedValue({ id: "tr_final" });

    const event = {
      id: "evt_final_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_final",
          amount_received: 8000,
          metadata: { billingId: fpBill._id.toString(), bookingId, type: "final_payment" },
        },
      },
    };
    const res = await request(app).post("/billing/webhook").send(event);
    expect(res.status).toBe(200);

    const updated = await Billing.findById(fpBill._id);
    expect(updated.status).toBe("paid");
    expect(updated.payoutStatus).toBe("paid");
    expect(stripeMock.transfers.create).toHaveBeenCalled();
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

conditionalDescribe("Billing Controller - misc endpoints", () => {
  test("checkoutPlatformFee is deprecated (410)", async () => {
    const res = await request(app).post("/billing/checkout").set("x-test-user-id", "u1");
    expect(res.status).toBe(410);
    expect(res.body.error).toBe("deprecated");
  });

  test("scheduleCancel returns ok", async () => {
    const res = await request(app).post("/billing/schedule-cancel").set("x-test-user-id", "u1");
    expect(res.body).toEqual({ ok: true });
  });

  test("createPortalSession 404 when the client has no Stripe customer", async () => {
    const res = await request(app).post("/billing/portal").set("x-test-user-id", "no-cust");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("no_customer");
  });

  test("createPortalSession returns a billing-portal url", async () => {
    await Billing.create({
      bookingId: new mongoose.Types.ObjectId(),
      clientId: "u1",
      artistId: "a1",
      type: "deposit",
      amountCents: 1000,
      status: "paid",
      stripeCustomerId: "cus_1",
    });
    stripeMock.billingPortal.sessions.create.mockResolvedValue({ url: "https://portal" });
    const res = await request(app).post("/billing/portal").set("x-test-user-id", "u1");
    expect(res.body).toEqual({ url: "https://portal" });
  });

  test("refundBilling refunds a paid platform_fee bill the actor owns", async () => {
    const bill = await Billing.create({
      bookingId: new mongoose.Types.ObjectId(),
      clientId: "u1",
      artistId: "a1",
      type: "platform_fee",
      amountCents: 1000,
      status: "paid",
      stripePaymentIntentId: "pi_1",
      stripeRefundIds: [],
    });
    stripeMock.refunds.create.mockResolvedValue({ id: "re_1" });
    const res = await request(app).post("/billing/refund").set("x-test-user-id", "u1").send({ billingId: String(bill._id) });
    expect(res.body.ok).toBe(true);
    expect(res.body.refunds).toHaveLength(1);
    const updated = await Billing.findById(bill._id);
    expect(updated.status).toBe("refunded");
  });

  test("refundBilling 403 when the actor doesn't own the bill", async () => {
    const bill = await Billing.create({
      bookingId: new mongoose.Types.ObjectId(),
      clientId: "someone",
      artistId: "else",
      type: "platform_fee",
      amountCents: 1000,
      status: "paid",
      stripePaymentIntentId: "pi_1",
    });
    const res = await request(app).post("/billing/refund").set("x-test-user-id", "intruder").send({ billingId: String(bill._id) });
    expect(res.status).toBe(403);
  });

  test("retryPayoutsHandler 403 for a non-admin", async () => {
    const res = await request(app).post("/billing/payouts/retry").set("x-test-user-id", "u1");
    expect(res.status).toBe(403);
  });

  test("retryPayoutsHandler runs for a platform admin", async () => {
    const res = await request(app).post("/billing/payouts/retry").set("x-test-user-id", ADMIN_ID);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("attempted");
  });
});

conditionalDescribe("Billing Controller - checkoutDeposit (Stripe Checkout)", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-co";
    clientId = "client-co";
    await createOnboardedArtist(artistId);

    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "pending",
      appointmentType: "tattoo_session",
      priceCents: 20000,
      depositRequiredCents: 5000,
      depositPaidCents: 0,
    });
    bookingId = booking._id.toString();

    stripeMock.customers.create.mockResolvedValue({ id: "cus_co1" });
    stripeMock.checkout = { sessions: { create: jest.fn() } };
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_co1",
      url: "https://checkout.stripe/co1",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("creates a checkout session with deposit + platform-fee line items", async () => {
    const res = await request(app)
      .post("/billing/deposit/checkout")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://checkout.stripe/co1");
    expect(res.body.id).toBe("cs_co1");
    expect(res.body.clientSecret).toBeNull();

    const expectedFee = PLATFORM_FEE_MIN_CENTS + Math.round(20000 * 0.05); // base + 5% of price
    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.mode).toBe("payment");
    expect(args.line_items).toHaveLength(2);
    expect(args.line_items[0].price_data.unit_amount).toBe(5000);
    expect(args.line_items[1].price_data.product_data.name).toBe("Platform service fee");
    expect(args.line_items[1].price_data.unit_amount).toBe(expectedFee);
    expect(args.metadata).toMatchObject({ type: "deposit", bookingId });

    const bill = await Billing.findOne({ bookingId, type: "deposit" });
    expect(bill.status).toBe("pending");
    expect(bill.amountCents).toBe(5000 + expectedFee);
    expect(bill.platformFeeCents).toBe(expectedFee);
    expect(bill.stripeCheckoutSessionId).toBe("cs_co1");
  });

  test("rejects when bookingId missing", async () => {
    const res = await request(app)
      .post("/billing/deposit/checkout")
      .set("x-test-user-id", clientId)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("bookingId required");
  });

  test("404 when booking not found", async () => {
    const res = await request(app)
      .post("/billing/deposit/checkout")
      .set("x-test-user-id", clientId)
      .send({ bookingId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(404);
  });

  test("rejects deposit already paid", async () => {
    await Booking.updateOne({ _id: bookingId }, { $set: { depositPaidCents: 5000 } });
    const res = await request(app)
      .post("/billing/deposit/checkout")
      .set("x-test-user-id", clientId)
      .send({ bookingId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("deposit_already_paid");
  });

  test("403 when a user who is not the booking's client starts a deposit checkout", async () => {
    const res = await request(app)
      .post("/billing/deposit/checkout")
      .set("x-test-user-id", "intruder")
      .send({ bookingId });
    expect(res.status).toBe(403);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  test("falls back to creating a customer when retrieve throws", async () => {
    await Billing.create({
      bookingId: new mongoose.Types.ObjectId(),
      artistId,
      clientId,
      type: "deposit",
      amountCents: 1000,
      status: "paid",
      stripeCustomerId: "cus_stale",
    });
    stripeMock.customers.retrieve.mockRejectedValue(new Error("no such customer"));

    const res = await request(app)
      .post("/billing/deposit/checkout")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(res.status).toBe(200);
    expect(stripeMock.customers.create).toHaveBeenCalled();
  });

  test("reuses an existing Stripe customer from a prior bill", async () => {
    await Billing.create({
      bookingId: new mongoose.Types.ObjectId(),
      artistId,
      clientId,
      type: "deposit",
      amountCents: 1000,
      status: "paid",
      stripeCustomerId: "cus_existing",
    });
    stripeMock.customers.retrieve.mockResolvedValue({ id: "cus_existing" });

    const res = await request(app)
      .post("/billing/deposit/checkout")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(res.status).toBe(200);
    expect(stripeMock.customers.retrieve).toHaveBeenCalledWith("cus_existing");
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });
});

conditionalDescribe("Billing Controller - createCardSetupIntent", () => {
  let bookingId;

  beforeEach(async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId: "artist-card",
      clientId: "client-card",
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "tattoo_session",
      priceCents: 10000,
    });
    bookingId = booking._id.toString();
    stripeMock.customers.create.mockResolvedValue({ id: "cus_card1" });
    stripeMock.setupIntents.create.mockResolvedValue({
      id: "seti_card1",
      client_secret: "seti_card1_secret",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("creates an automatic-methods card SetupIntent and saves the customer on the booking", async () => {
    const res = await request(app)
      .post("/billing/card-setup-intent")
      .set("x-test-user-id", "client-card")
      .send({ bookingId });

    expect(res.status).toBe(200);
    expect(res.body.clientSecret).toBe("seti_card1_secret");
    expect(res.body.customerId).toBe("cus_card1");
    const args = stripeMock.setupIntents.create.mock.calls[0][0];
    expect(args.automatic_payment_methods).toEqual({ enabled: true });
    expect(args.metadata.type).toBe("card_on_file");

    const booking = await Booking.findById(bookingId);
    expect(booking.stripeCustomerId).toBe("cus_card1");
  });

  test("rejects when bookingId missing", async () => {
    const res = await request(app)
      .post("/billing/card-setup-intent")
      .set("x-test-user-id", "client-card")
      .send({});
    expect(res.status).toBe(400);
  });

  test("404 when booking not found", async () => {
    const res = await request(app)
      .post("/billing/card-setup-intent")
      .set("x-test-user-id", "client-card")
      .send({ bookingId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(404);
  });
});

conditionalDescribe("Billing Controller - createClientSetupIntent edge cases", () => {
  afterEach(() => jest.clearAllMocks());

  test("404 when no Client record exists for the clerkId", async () => {
    const res = await request(app)
      .post("/billing/client/setup-intent")
      .set("x-test-user-id", "ghost-client")
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("client_not_found");
  });

  test("reuses the existing Stripe customer stored on the client", async () => {
    const Client = mongoose.model("client");
    await Client.create({
      clerkId: "client-reuse",
      email: "reuse@example.com",
      username: "Reuse",
      handle: "@reuse",
      role: "client",
      stripeCustomerId: "cus_reuse",
    });
    stripeMock.customers.retrieve.mockResolvedValue({ id: "cus_reuse", deleted: false });
    stripeMock.setupIntents.create.mockResolvedValue({
      id: "seti_reuse",
      client_secret: "seti_reuse_secret",
    });

    const res = await request(app)
      .post("/billing/client/setup-intent")
      .set("x-test-user-id", "client-reuse")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.customerId).toBe("cus_reuse");
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });
});

conditionalDescribe("Billing Controller - createTipCheckout (100% to artist)", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-tip";
    clientId = "client-tip";
    await createOnboardedArtist(artistId);

    const startISO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "completed",
      appointmentType: "tattoo_session",
      priceCents: 10000,
    });
    bookingId = booking._id.toString();

    stripeMock.customers.create.mockResolvedValue({ id: "cus_tip1" });
    stripeMock.checkout = { sessions: { create: jest.fn() } };
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_tip1",
      url: "https://checkout.stripe/tip1",
    });
  });

  afterEach(() => jest.clearAllMocks());

  test("creates a destination-charge tip session routed 100% to the artist", async () => {
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", clientId)
      .send({ bookingId, tipCents: 2500 });

    expect(res.status).toBe(200);
    expect(res.body.tipCents).toBe(2500);
    expect(res.body.url).toBe("https://checkout.stripe/tip1");

    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.payment_intent_data.transfer_data).toEqual({ destination: "acct_test_123" });
    expect(args.payment_intent_data.on_behalf_of).toBe("acct_test_123");
    expect(args.payment_intent_data.application_fee_amount).toBeUndefined();
    expect(args.line_items[0].price_data.unit_amount).toBe(2500);

    const bill = await Billing.findOne({ bookingId, type: "tip" });
    expect(bill.amountCents).toBe(2500);
    expect(bill.platformFeeCents).toBe(0);
  });

  test("400 when bookingId missing", async () => {
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", clientId)
      .send({ tipCents: 2500 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("bookingId required");
  });

  test("rejects a tip below the minimum", async () => {
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", clientId)
      .send({ bookingId, tipCents: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_amount");
  });

  test("403 when a non-client tries to tip", async () => {
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", "someone-else")
      .send({ bookingId, tipCents: 2500 });
    expect(res.status).toBe(403);
  });

  test("rejects tipping before the session is completed", async () => {
    await Booking.updateOne({ _id: bookingId }, { $set: { status: "confirmed" } });
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", clientId)
      .send({ bookingId, tipCents: 2500 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("not_completed");
  });

  test("caps an oversized tip at the maximum", async () => {
    const res = await request(app)
      .post("/billing/tip")
      .set("x-test-user-id", clientId)
      .send({ bookingId, tipCents: 9999999 });
    expect(res.status).toBe(200);
    expect(res.body.tipCents).toBe(100000);
  });
});

conditionalDescribe("Billing Controller - getPaymentBreakdown (hides payout split from clients)", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-bd";
    clientId = "client-bd";
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "tattoo_session",
      priceCents: 20000,
    });
    bookingId = booking._id.toString();
  });

  afterEach(() => jest.clearAllMocks());

  test("client sees totals but NOT artist net / studio commission", async () => {
    const res = await request(app)
      .post("/billing/breakdown")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(res.status).toBe(200);
    expect(res.body.priceCents).toBe(20000);
    expect(res.body.platformFeeCents).toBeGreaterThan(0);
    expect(res.body.clientTotalCents).toBe(20000 + res.body.platformFeeCents);
    expect(res.body).not.toHaveProperty("artistNetCents");
    expect(res.body).not.toHaveProperty("studioCents");
    expect(res.body).not.toHaveProperty("artistGrossCents");
    expect(res.body).not.toHaveProperty("stripeFeeCents");
  });

  test("the artist sees their own gross/net/studio split", async () => {
    const res = await request(app)
      .post("/billing/breakdown")
      .set("x-test-user-id", artistId)
      .send({ bookingId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("artistGrossCents");
    expect(res.body).toHaveProperty("artistNetCents");
    expect(res.body).toHaveProperty("studioCents");
    expect(res.body.isStudio).toBe(false);
    expect(res.body.artistNetCents).toBeLessThan(res.body.artistGrossCents);
  });

  test("403 when an unrelated user requests a booking breakdown", async () => {
    const res = await request(app)
      .post("/billing/breakdown")
      .set("x-test-user-id", "intruder")
      .send({ bookingId });
    expect(res.status).toBe(403);
  });

  test("404 when the booking does not exist", async () => {
    const res = await request(app)
      .post("/billing/breakdown")
      .set("x-test-user-id", clientId)
      .send({ bookingId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(404);
  });

  test("supports ad-hoc artistClerkId + priceCents (no booking)", async () => {
    const res = await request(app)
      .post("/billing/breakdown")
      .set("x-test-user-id", clientId)
      .send({ artistClerkId: artistId, priceCents: 15000 });
    expect(res.status).toBe(200);
    expect(res.body.priceCents).toBe(15000);
    expect(res.body).not.toHaveProperty("artistNetCents");
  });

  test("400 when neither bookingId nor artistClerkId provided", async () => {
    const res = await request(app)
      .post("/billing/breakdown")
      .set("x-test-user-id", clientId)
      .send({ priceCents: 15000 });
    expect(res.status).toBe(400);
  });
});

conditionalDescribe("Billing Controller - refundDepositForBooking (forfeit/clawback helper)", () => {
  afterEach(() => jest.clearAllMocks());

  test("refunds paid deposits, marks them refunded and reverses payouts", async () => {
    const bookingObjId = new mongoose.Types.ObjectId();
    const bill = await Billing.create({
      bookingId: bookingObjId,
      artistId: "artist-rf",
      clientId: "client-rf",
      type: "deposit",
      amountCents: 5000,
      status: "paid",
      stripePaymentIntentId: "pi_dep_rf",
      stripeRefundIds: [],
    });
    stripeMock.refunds.create.mockResolvedValue({ id: "re_dep_rf" });
    stripeMock.transfers.createReversal.mockResolvedValue({ id: "trr_rf" });

    const refunds = await refundDepositForBooking(bookingObjId.toString());
    expect(refunds).toContain("re_dep_rf");
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      { payment_intent: "pi_dep_rf" },
      expect.objectContaining({ idempotencyKey: expect.any(String) })
    );

    const updated = await Billing.findById(bill._id);
    expect(updated.status).toBe("refunded");
    expect(updated.refundedAt).toBeTruthy();
    expect(updated.stripeRefundIds).toContain("re_dep_rf");
  });

  test("still marks refunded when there is no payment intent to refund", async () => {
    const bookingObjId = new mongoose.Types.ObjectId();
    const bill = await Billing.create({
      bookingId: bookingObjId,
      artistId: "artist-rf2",
      clientId: "client-rf2",
      type: "deposit",
      amountCents: 5000,
      status: "paid",
    });
    const refunds = await refundDepositForBooking(bookingObjId.toString());
    expect(refunds).toHaveLength(0);
    const updated = await Billing.findById(bill._id);
    expect(updated.status).toBe("refunded");
  });
});

conditionalDescribe("Billing Controller - webhook checkout.session.completed + dispute", () => {
  let artistId;
  let clientId;
  let bookingId;
  let billingId;

  beforeEach(async () => {
    artistId = "artist-wh2";
    clientId = "client-wh2";
    await createOnboardedArtist(artistId);

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
      transferGroup: `booking_${bookingId}`,
    });
    billingId = billing._id.toString();
    stripeMock.transfers.create.mockResolvedValue({ id: "tr_wh2" });
  });

  afterEach(() => jest.clearAllMocks());

  test("checkout.session.completed for a deposit marks bill paid and confirms booking", async () => {
    const event = {
      id: "evt_cs_dep",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_dep",
          payment_intent: "pi_cs_dep",
          metadata: { billingId, bookingId, type: "deposit" },
        },
      },
    };
    const res = await request(app).post("/billing/webhook").send(event);
    expect(res.status).toBe(200);

    const bill = await Billing.findById(billingId);
    expect(bill.status).toBe("paid");
    expect(bill.stripePaymentIntentId).toBe("pi_cs_dep");

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe("confirmed");
    expect(booking.depositPaidCents).toBe(1000);
  });

  test("checkout.session.completed for a tip increments booking.tipCents", async () => {
    const tipBill = await Billing.create({
      bookingId,
      artistId,
      clientId,
      type: "tip",
      amountCents: 3000,
      platformFeeCents: 0,
      status: "pending",
    });
    const event = {
      id: "evt_cs_tip",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_tip",
          payment_intent: "pi_cs_tip",
          metadata: { billingId: tipBill._id.toString(), bookingId, type: "tip" },
        },
      },
    };
    const res = await request(app).post("/billing/webhook").send(event);
    expect(res.status).toBe(200);

    const booking = await Booking.findById(bookingId);
    expect(booking.tipCents).toBe(3000);
    const bill = await Billing.findById(tipBill._id);
    expect(bill.status).toBe("paid");
  });

  test("charge.dispute.created flags the bill disputed and reverses payouts", async () => {
    const bill = await Billing.create({
      bookingId,
      artistId,
      clientId,
      type: "deposit",
      amountCents: 1500,
      status: "paid",
      stripeChargeId: "ch_disp",
    });
    stripeMock.transfers.createReversal.mockResolvedValue({ id: "trr_disp" });

    const event = {
      id: "evt_disp",
      type: "charge.dispute.created",
      data: {
        object: { id: "dp_1", charge: "ch_disp", payment_intent: "pi_disp" },
      },
    };
    const res = await request(app).post("/billing/webhook").send(event);
    expect(res.status).toBe(200);

    const updated = await Billing.findById(bill._id);
    expect(["reversed", "disputed", "reversal_failed"]).toContain(updated.disputeStatus);
  });

  test("returns 400 on an invalid webhook signature", async () => {
    stripeMock.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error("bad sig");
    });
    const res = await request(app).post("/billing/webhook").send({ id: "x", type: "noop" });
    expect(res.status).toBe(400);
  });
});
