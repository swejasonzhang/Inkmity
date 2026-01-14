import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import Booking from "../../models/Booking.js";
import Billing from "../../models/Billing.js";
import WebhookEvent from "../../models/WebhookEvent.js";
import {
  createDepositPaymentIntent,
  createFinalPaymentIntent,
  stripeWebhook,
} from "../../controllers/billingController.js";
import { stripe } from "../../lib/stripe.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.post("/billing/deposit/intent", mockAuth, createDepositPaymentIntent);
app.post("/billing/final-payment/intent", mockAuth, createFinalPaymentIntent);
app.post("/billing/webhook", (req, res, next) => {
  req.rawBody = Buffer.from(JSON.stringify(req.body));
  next();
}, stripeWebhook);

jest.mock("../../lib/stripe.js", () => ({
  stripe: {
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn((body, sig, secret) => {
        return JSON.parse(body.toString());
      }),
    },
  },
}));

describe("Billing Controller - Deposit PaymentIntent", () => {
  let artistId;
  let clientId;
  let bookingId;

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

    stripe.customers.create.mockResolvedValue({ id: "cus_test123" });
    stripe.paymentIntents.create.mockResolvedValue({
      id: "pi_test123",
      client_secret: "pi_test123_secret",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should create PaymentIntent for deposit amount", async () => {
    const response = await request(app)
      .post("/billing/deposit/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(response.status).toBe(200);
    expect(response.body.clientSecret).toBe("pi_test123_secret");
    expect(response.body.paymentIntentId).toBe("pi_test123");
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        metadata: expect.objectContaining({
          type: "deposit",
          bookingId,
        }),
      })
    );
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

  test("should create Billing record with status pending", async () => {
    await request(app)
      .post("/billing/deposit/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    const billing = await Billing.findOne({ bookingId });
    expect(billing).toBeDefined();
    expect(billing.status).toBe("pending");
    expect(billing.type).toBe("deposit");
    expect(billing.amountCents).toBe(1000);
  });
});

describe("Billing Controller - Final Payment Intent", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";
    
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

    stripe.customers.create.mockResolvedValue({ id: "cus_test123" });
    stripe.paymentIntents.create.mockResolvedValue({
      id: "pi_test123",
      client_secret: "pi_test123_secret",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should calculate remaining balance (total - deposit)", async () => {
    const response = await request(app)
      .post("/billing/final-payment/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(response.status).toBe(200);
    expect(response.body.amountCents).toBe(8000);
    expect(response.body.depositApplied).toBe(2000);
    expect(response.body.totalAmount).toBe(10000);
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 8000,
        metadata: expect.objectContaining({
          type: "final_payment",
          depositApplied: "2000",
        }),
      })
    );
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

describe("Billing Controller - Stripe Webhook", () => {
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
      amountCents: 1000,
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
          metadata: {
            billingId,
            bookingId,
            type: "deposit",
          },
        },
      },
    };

    const response = await request(app)
      .post("/billing/webhook")
      .send(event);

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
          metadata: {
            billingId,
            bookingId,
            type: "deposit",
          },
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
          metadata: {
            billingId,
            bookingId,
            type: "deposit",
          },
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
});