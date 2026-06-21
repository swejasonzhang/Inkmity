import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

const conditionalDescribe = process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const stripeMock = {
  customers: {
    create: jest.fn(async () => ({ id: "cus_test" })),
    retrieve: jest.fn(async () => ({ id: "cus_test" })),
  },
  checkout: {
    sessions: {
      create: jest.fn(async () => ({ id: "cs_test", url: "https://checkout.stripe.test/cs_test" })),
    },
  },
  paymentIntents: { create: jest.fn() },
  transfers: { create: jest.fn() },
  webhooks: { constructEvent: jest.fn((body) => JSON.parse(body.toString())) },
};
jest.unstable_mockModule("../../lib/stripe.js", () => ({ stripe: stripeMock }));

const { createTipCheckout, stripeWebhook } = await import("../../controllers/billingController.js");
const Booking = (await import("../../models/Booking.js")).default;
const Billing = (await import("../../models/Billing.js")).default;
const Artist = (await import("../../models/Artist.js")).default;
await import("../../models/Client.js");

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) {
    req.user = { clerkId: id };
    req.auth = { userId: id };
  }
  next();
};

const app = express();
app.use(express.json());
app.post("/billing/tip", mockAuth, createTipCheckout);
app.post(
  "/billing/webhook",
  (req, res, next) => {
    req.rawBody = Buffer.from(JSON.stringify(req.body));
    next();
  },
  stripeWebhook
);

const makeBooking = (status) =>
  Booking.create({
    clientId: "client_1",
    artistId: "artist_1",
    appointmentType: "tattoo_session",
    status,
    startAt: new Date(),
    endAt: new Date(Date.now() + 3600000),
    priceCents: 20000,
  });

conditionalDescribe("Tipping", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await Artist.create({
      clerkId: "artist_1",
      email: "artist_1@example.com",
      username: "Artist",
      handle: "@artist_1",
      role: "artist",
      stripeConnectAccountId: "acct_artist_1",
      chargesEnabled: true,
      payoutsEnabled: true,
    });
  });

  describe("gates", () => {
    test("rejects a tip on a booking that isn't completed", async () => {
      const booking = await makeBooking("pending");
      const res = await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "client_1")
        .send({ bookingId: String(booking._id), tipCents: 2000 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("not_completed");
    });

    test("forbids a non-client from tipping", async () => {
      const booking = await makeBooking("completed");
      const res = await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "stranger")
        .send({ bookingId: String(booking._id), tipCents: 2000 });
      expect(res.status).toBe(403);
    });

    test("rejects an invalid tip amount", async () => {
      const res = await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "client_1")
        .send({ bookingId: "507f1f77bcf86cd799439011", tipCents: 0 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_amount");
    });

    test("requires a bookingId", async () => {
      const res = await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "client_1")
        .send({ tipCents: 2000 });
      expect(res.status).toBe(400);
    });
  });

  describe("checkout creation", () => {
    test("routes 100% of the tip to the artist with no platform fee", async () => {
      const booking = await makeBooking("completed");
      const res = await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "client_1")
        .send({ bookingId: String(booking._id), tipCents: 5000 });

      expect(res.status).toBe(200);
      expect(res.body.url).toBeTruthy();

      const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
      expect(args.payment_intent_data.transfer_data.destination).toBe("acct_artist_1");
      expect(args.payment_intent_data.on_behalf_of).toBe("acct_artist_1");
      expect(args.payment_intent_data.application_fee_amount).toBeUndefined();
      expect(args.line_items[0].price_data.unit_amount).toBe(5000);
      expect(args.metadata.type).toBe("tip");

      const bill = await Billing.findOne({ bookingId: booking._id, type: "tip" });
      expect(bill).toBeTruthy();
      expect(bill.amountCents).toBe(5000);
      expect(bill.platformFeeCents).toBe(0);
      expect(bill.status).toBe("pending");
    });

    test("clamps an over-max tip to the cap", async () => {
      const booking = await makeBooking("completed");
      const res = await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "client_1")
        .send({ bookingId: String(booking._id), tipCents: 9_999_999 });

      expect(res.status).toBe(200);
      const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
      expect(args.line_items[0].price_data.unit_amount).toBe(100000);
    });
  });

  describe("webhook", () => {
    test("checkout.session.completed records the tip on the booking", async () => {
      const booking = await makeBooking("completed");
      await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "client_1")
        .send({ bookingId: String(booking._id), tipCents: 5000 });

      const bill = await Billing.findOne({ bookingId: booking._id, type: "tip" });

      const event = {
        id: "evt_tip_1",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test",
            payment_intent: "pi_tip_1",
            metadata: { billingId: String(bill._id), bookingId: String(booking._id), type: "tip" },
          },
        },
      };

      const res = await request(app).post("/billing/webhook").send(event);
      expect(res.status).toBe(200);

      const updated = await Booking.findById(booking._id);
      expect(updated.tipCents).toBe(5000);

      const paidBill = await Billing.findById(bill._id);
      expect(paidBill.status).toBe("paid");
    });

    test("a redelivered tip webhook (new event id, same bill) does not double-count", async () => {
      const booking = await makeBooking("completed");
      await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "client_1")
        .send({ bookingId: String(booking._id), tipCents: 4000 });
      const bill = await Billing.findOne({ bookingId: booking._id, type: "tip" });

      const makeEvent = (id) => ({
        id,
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_dup",
            payment_intent: "pi_dup",
            metadata: { billingId: String(bill._id), bookingId: String(booking._id), type: "tip" },
          },
        },
      });

      await request(app).post("/billing/webhook").send(makeEvent("evt_tip_a"));
      await request(app).post("/billing/webhook").send(makeEvent("evt_tip_b"));

      const updated = await Booking.findById(booking._id);
      expect(updated.tipCents).toBe(4000);
    });

    test("a tip does not trigger a separate payout transfer (destination charge already routed it)", async () => {
      const booking = await makeBooking("completed");
      await request(app)
        .post("/billing/tip")
        .set("x-test-user-id", "client_1")
        .send({ bookingId: String(booking._id), tipCents: 3000 });
      const bill = await Billing.findOne({ bookingId: booking._id, type: "tip" });

      const event = {
        id: "evt_tip_2",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test",
            payment_intent: "pi_tip_2",
            metadata: { billingId: String(bill._id), bookingId: String(booking._id), type: "tip" },
          },
        },
      };
      await request(app).post("/billing/webhook").send(event);

      expect(stripeMock.transfers.create).not.toHaveBeenCalled();
    });
  });
});
