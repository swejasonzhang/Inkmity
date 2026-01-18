import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import Booking from "../../models/Booking.js";
import Project from "../../models/Project.js";
import ArtistPolicy from "../../models/ArtistPolicy.js";
import Client from "../../models/Client.js";
import {
  createConsultation,
  createTattooSession,
  submitIntakeForm,
  rescheduleAppointment,
  cancelBooking,
  markNoShow,
} from "../../controllers/bookingController.js";
import {
  createDepositPaymentIntent,
  createFinalPaymentIntent,
  stripeWebhook,
} from "../../controllers/billingController.js";
import { stripe } from "../../lib/stripe.js";
import { sendAppointmentConfirmationEmail } from "../../services/emailService.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.post("/bookings/consultation", mockAuth, createConsultation);
app.post("/bookings/session", mockAuth, createTattooSession);
app.post("/bookings/:bookingId/intake", mockAuth, submitIntakeForm);
app.post("/bookings/:id/reschedule", mockAuth, rescheduleAppointment);
app.post("/bookings/:id/cancel", mockAuth, cancelBooking);
app.post("/bookings/:id/no-show", mockAuth, markNoShow);
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

jest.mock("../../services/emailService.js", () => ({
  sendAppointmentConfirmationEmail: jest.fn(),
  sendAppointmentCancellationEmail: jest.fn(),
}));

const conditionalDescribe = process.env.DATABASE_AVAILABLE === 'true' ? describe : describe.skip;

conditionalDescribe("Integration - Complete Consultation Booking Flow", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    await ArtistPolicy.create({
      artistId: artistId,
      deposit: {
        mode: "percent",
        percent: 0.2,
        minCents: 1000,
      },
    });

    stripe.customers.create.mockResolvedValue({ id: "cus_test123" });
    stripe.paymentIntents.create.mockResolvedValue({
      id: "pi_test123",
      client_secret: "pi_test123_secret",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should complete full consultation booking flow", async () => {
    const startISO = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const createResponse = await request(app)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 30,
        priceCents: 10000,
      });

    expect(createResponse.status).toBe(201);
    bookingId = createResponse.body._id;

    const intakeResponse = await request(app)
      .post(`/bookings/${bookingId}/intake`)
      .set("x-test-user-id", clientId)
      .send({
        consent: {
          ageVerification: true,
          healthDisclosure: true,
          aftercareInstructions: true,
          depositPolicy: true,
          cancellationPolicy: true,
        },
      });

    expect(intakeResponse.status).toBe(200);

    const depositResponse = await request(app)
      .post("/billing/deposit/intent")
      .set("x-test-user-id", clientId)
      .send({ bookingId });

    expect(depositResponse.status).toBe(200);
    expect(depositResponse.body.clientSecret).toBeDefined();

    const webhookEvent = {
      id: "evt_test123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test123",
          metadata: {
            billingId: depositResponse.body.billingId,
            bookingId,
            type: "deposit",
          },
        },
      },
    };

    const webhookResponse = await request(app)
      .post("/billing/webhook")
      .send(webhookEvent);

    expect(webhookResponse.status).toBe(200);

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe("confirmed");
    expect(booking.depositPaidCents).toBe(booking.depositRequiredCents);
    expect(booking.intakeFormId).toBeDefined();

    expect(sendAppointmentConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ _id: bookingId }),
      expect.any(String),
      expect.any(String)
    );
  });
});

conditionalDescribe("Integration - Multi-Session Project Booking Flow", () => {
  let artistId;
  let clientId;
  let projectId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    const project = await Project.create({
      artistId,
      clientId,
      name: "Full Sleeve",
      estimatedSessions: 3,
      completedSessions: 0,
      status: "active",
    });
    projectId = project._id.toString();

    stripe.customers.create.mockResolvedValue({ id: "cus_test123" });
    stripe.paymentIntents.create.mockResolvedValue({
      id: "pi_test123",
      client_secret: "pi_test123_secret",
    });
  });

  test("should create multiple sessions for a project", async () => {
    const sessions = [];
    for (let i = 1; i <= 3; i++) {
      const startISO = new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await request(app)
        .post("/bookings/session")
        .set("x-test-user-id", clientId)
        .send({
          artistId,
          startISO,
          durationMinutes: 180,
          priceCents: 30000,
          projectId,
          sessionNumber: i,
        });

      expect(response.status).toBe(201);
      sessions.push(response.body);
    }

    const project = await Project.findById(projectId);
    expect(project.completedSessions).toBe(3);
    expect(project.status).toBe("completed");
  });
});

conditionalDescribe("Integration - Rescheduling with Deposit Forfeiture", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    const startISO = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "consultation",
      depositPaidCents: 2000,
      depositRequiredCents: 2000,
    });
    bookingId = booking._id.toString();
  });

  test("should forfeit deposit when rescheduling <48 hours before", async () => {
    const newStartISO = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const newEndISO = new Date(newStartISO.getTime() + 60 * 60 * 1000);

    const response = await request(app)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({
        startISO: newStartISO.toISOString(),
        endISO: newEndISO.toISOString(),
      });

    expect(response.status).toBe(200);
    const booking = await Booking.findById(bookingId);
    expect(booking.depositPaidCents).toBe(0);
    expect(booking.rescheduledFrom).toBeDefined();
  });
});

conditionalDescribe("Integration - Deposit Application to Final Payment", () => {
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
      endAt: new Date(startISO.getTime() + 3 * 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "tattoo_session",
      priceCents: 10000,
      depositRequiredCents: 2000,
      depositPaidCents: 2000,
    });
    bookingId = booking._id.toString();

    stripe.customers.create.mockResolvedValue({ id: "cus_test123" });
    stripe.paymentIntents.create.mockResolvedValue({
      id: "pi_final123",
      client_secret: "pi_final123_secret",
    });
  });

  test("should create final payment intent with deposit applied", async () => {
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
});