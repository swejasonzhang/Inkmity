import request from "supertest";
import express from "express";
import mongoose from "mongoose";

const conditionalDescribe = process.env.DATABASE_AVAILABLE === 'true' ? describe : describe.skip;
import Booking from "../../models/Booking.js";
import Billing from "../../models/Billing.js";
import ArtistPolicy from "../../models/ArtistPolicy.js";
import Project from "../../models/Project.js";
import "../../models/IntakeForm.js";
import "../../models/Image.js";
import Artist from "../../models/Artist.js";
import Client from "../../models/Client.js";
import ClientBookingPermission from "../../models/ClientBookingPermission.js";
import BookingCooldown from "../../models/BookingCooldown.js";
import SignedDocument from "../../models/SignedDocument.js";
import { DOCUMENTS } from "../../services/documentsService.js";
import {
  createBooking,
  createMultiSession,
  acceptAppointment,
  denyAppointment,
  resolveArtistNoShow,
  createConsultation,
  createTattooSession,
  rescheduleAppointment,
  cancelBooking,
  markNoShow,
  reportArtistNoShow,
  respondArtistNoShow,
  listArtistNoShowDisputes,
  checkInBooking,
  submitIntakeForm,
  getIntakeForm,
  deleteIntakeForm,
  completeBooking,
  getBooking,
  setFinalPrice,
  approveFinalPrice,
  getClientBookings,
  getArtistBookings,
  getAppointments,
  checkConsultationStatus,
  getBookingsForDay,
  startVerification,
  verifyBookingCode,
  getAppointmentDetails,
  cancelBookingViaLink,
  updateBookingTime,
} from "../../controllers/bookingController.js";
import { captureBookingBalance } from "../../services/balanceCaptureService.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.post("/bookings/consultation", mockAuth, createConsultation);
app.post("/bookings/session", mockAuth, createTattooSession);
app.post("/bookings/create", mockAuth, createBooking);
app.post("/bookings/multi-session", mockAuth, createMultiSession);
app.post("/bookings/:id/accept", mockAuth, acceptAppointment);
app.post("/bookings/:id/deny", mockAuth, denyAppointment);
app.post("/bookings/:id/no-show-disputes/resolve", mockAuth, resolveArtistNoShow);

const VALID_INTAKE = {
  consent: {
    ageVerification: true,
    healthDisclosure: true,
    aftercareInstructions: true,
    depositPolicy: true,
    cancellationPolicy: true,
  },
  tattooDetails: { placement: "forearm", description: "small line work" },
};
app.post("/bookings/:id/reschedule", mockAuth, rescheduleAppointment);
app.post("/bookings/:id/cancel", mockAuth, cancelBooking);
app.post("/bookings/:id/no-show", mockAuth, markNoShow);
app.post("/bookings/:bookingId/intake", mockAuth, submitIntakeForm);
app.get("/bookings/:bookingId/intake", mockAuth, getIntakeForm);
app.delete("/bookings/:bookingId/intake", mockAuth, deleteIntakeForm);
app.post("/bookings/:id/complete", mockAuth, completeBooking);
app.post("/bookings/:id/artist-no-show", mockAuth, reportArtistNoShow);
app.post("/bookings/:id/artist-no-show/respond", mockAuth, respondArtistNoShow);
app.get("/bookings/no-show-disputes", mockAuth, listArtistNoShowDisputes);
app.post("/bookings/:id/check-in", mockAuth, checkInBooking);
app.get("/bookings/client", mockAuth, getClientBookings);
app.get("/bookings/artist", mockAuth, getArtistBookings);
app.get("/bookings/appointments", mockAuth, getAppointments);
app.get("/bookings/consultation-status", mockAuth, checkConsultationStatus);
app.get("/bookings/day", mockAuth, getBookingsForDay);
app.post("/bookings/:id/start-verification", mockAuth, startVerification);
app.post("/bookings/:id/verify", mockAuth, verifyBookingCode);
app.get("/bookings/:id/details", mockAuth, getAppointmentDetails);
app.get("/bookings/:id/cancel-link", cancelBookingViaLink);
app.patch("/bookings/:id/time", mockAuth, updateBookingTime);
app.get("/bookings/:id", mockAuth, getBooking);
app.patch("/bookings/:id/final-price", mockAuth, setFinalPrice);
app.post("/bookings/:id/approve-final-price", mockAuth, approveFinalPrice);

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

conditionalDescribe("Booking Controller - final price re-consent", () => {
  async function bookingQuoted(priceCents = 20000) {
    return Booking.create({
      artistId: "artist-rc",
      clientId: "client-rc",
      startAt: new Date("2026-08-01T15:00:00Z"),
      endAt: new Date("2026-08-01T16:00:00Z"),
      status: "accepted",
      priceCents,
      depositPaidCents: 5000,
    });
  }

  test("a final price within tolerance is auto-approved", async () => {
    const b = await bookingQuoted(20000);
    const res = await request(server)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "artist-rc")
      .send({ finalPriceCents: 21000 });
    expect(res.status).toBe(200);
    expect(res.body.finalPriceApproved).toBe(true);
  });

  test("a final price beyond tolerance requires client approval", async () => {
    const b = await bookingQuoted(20000);
    const res = await request(server)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "artist-rc")
      .send({ finalPriceCents: 30000 });
    expect(res.status).toBe(200);
    expect(res.body.finalPriceApproved).toBe(false);
  });

  test("captureBookingBalance refuses to charge an unapproved final price", async () => {
    const result = await captureBookingBalance({
      _id: "x",
      priceCents: 30000,
      depositPaidCents: 5000,
      balancePaidCents: 0,
      finalPriceApproved: false,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("final_price_unapproved");
  });

  test("the client can approve the final price", async () => {
    const b = await bookingQuoted(20000);
    await request(server)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "artist-rc")
      .send({ finalPriceCents: 30000 });

    const denied = await request(server)
      .post(`/bookings/${b._id}/approve-final-price`)
      .set("x-test-user-id", "artist-rc");
    expect(denied.status).toBe(403);

    const res = await request(server)
      .post(`/bookings/${b._id}/approve-final-price`)
      .set("x-test-user-id", "client-rc");
    expect(res.status).toBe(200);
    expect(res.body.finalPriceApproved).toBe(true);
  });

  test("approve-final-price 404 for a missing booking", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/approve-final-price`)
      .set("x-test-user-id", "client-rc");
    expect(res.status).toBe(404);
  });

  test("approve-final-price 400 when no final price was set", async () => {
    const b = await bookingQuoted(20000);
    const res = await request(server)
      .post(`/bookings/${b._id}/approve-final-price`)
      .set("x-test-user-id", "client-rc");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("no_final_price");
  });

  test("approving on a completed booking attempts a balance capture", async () => {
    const b = await Booking.create({
      artistId: "artist-rc",
      clientId: "client-rc",
      startAt: new Date(Date.now() - 7200000),
      endAt: new Date(Date.now() - 3600000),
      status: "completed",
      completedAt: new Date(),
      priceCents: 30000,
      depositPaidCents: 5000,
      finalPriceSetAt: new Date(),
      finalPriceApproved: false,
    });
    const res = await request(server)
      .post(`/bookings/${b._id}/approve-final-price`)
      .set("x-test-user-id", "client-rc");
    expect(res.status).toBe(200);
    expect(res.body.finalPriceApproved).toBe(true);
  });
});

conditionalDescribe("Booking Controller - price guardrails", () => {
  test("setFinalPrice rejects a price above the absolute cap", async () => {
    const b = await Booking.create({
      artistId: "artist-cap",
      clientId: "client-cap",
      startAt: new Date("2026-07-02T15:00:00Z"),
      endAt: new Date("2026-07-02T16:00:00Z"),
      status: "accepted",
      priceCents: 20000,
      depositPaidCents: 5000,
    });
    const res = await request(server)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "artist-cap")
      .send({ finalPriceCents: 6_000_000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("price_above_max");
  });

  test("setFinalPrice 404 for a missing booking", async () => {
    const res = await request(server)
      .patch(`/bookings/${new mongoose.Types.ObjectId()}/final-price`)
      .set("x-test-user-id", "artist-cap")
      .send({ finalPriceCents: 10000 });
    expect(res.status).toBe(404);
  });

  test("setFinalPrice 403 when a non-artist sets the price", async () => {
    const b = await Booking.create({
      artistId: "sfp-artist",
      clientId: "sfp-client",
      startAt: new Date("2026-07-04T15:00:00Z"),
      endAt: new Date("2026-07-04T16:00:00Z"),
      status: "accepted",
      priceCents: 20000,
      depositPaidCents: 5000,
    });
    const res = await request(server)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "sfp-client")
      .send({ finalPriceCents: 10000 });
    expect(res.status).toBe(403);
  });

  test("setFinalPrice 400 for a completed booking", async () => {
    const b = await Booking.create({
      artistId: "sfp-artist",
      clientId: "sfp-client",
      startAt: new Date("2026-07-04T15:00:00Z"),
      endAt: new Date("2026-07-04T16:00:00Z"),
      status: "completed",
      priceCents: 20000,
      depositPaidCents: 5000,
    });
    const res = await request(server)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "sfp-artist")
      .send({ finalPriceCents: 25000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot change price for this appointment");
  });

  test("setFinalPrice 400 price_below_deposit", async () => {
    const b = await Booking.create({
      artistId: "sfp-artist",
      clientId: "sfp-client",
      startAt: new Date("2026-07-04T15:00:00Z"),
      endAt: new Date("2026-07-04T16:00:00Z"),
      status: "accepted",
      priceCents: 20000,
      depositPaidCents: 8000,
    });
    const res = await request(server)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "sfp-artist")
      .send({ finalPriceCents: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("price_below_deposit");
  });

  test("deleteIntakeForm is locked after the session is completed", async () => {
    const b = await Booking.create({
      artistId: "artist-done",
      clientId: "client-done",
      startAt: new Date("2026-07-03T15:00:00Z"),
      endAt: new Date("2026-07-03T16:00:00Z"),
      status: "completed",
      priceCents: 20000,
    });
    const res = await request(server)
      .delete(`/bookings/${b._id}/intake`)
      .set("x-test-user-id", "client-done");
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("intake_locked");
  });
});

conditionalDescribe("Booking Controller - getBooking ownership", () => {
  async function makeBooking() {
    return Booking.create({
      artistId: "artist-owner",
      clientId: "client-owner",
      startAt: new Date("2026-07-01T15:00:00Z"),
      endAt: new Date("2026-07-01T16:00:00Z"),
      status: "accepted",
      priceCents: 20000,
    });
  }

  test("a party to the booking can read it", async () => {
    const b = await makeBooking();
    for (const uid of ["client-owner", "artist-owner"]) {
      const res = await request(server).get(`/bookings/${b._id}`).set("x-test-user-id", uid);
      expect(res.status).toBe(200);
      expect(String(res.body._id)).toBe(String(b._id));
    }
  });

  test("a non-party is forbidden", async () => {
    const b = await makeBooking();
    const res = await request(server).get(`/bookings/${b._id}`).set("x-test-user-id", "stranger-999");
    expect(res.status).toBe(403);
  });
});

conditionalDescribe("Booking Controller - Consultation Creation", () => {
  let artistId;
  let clientId;

  beforeEach(() => {
    artistId = "artist-123";
    clientId = "client-456";
  });

  test("should create consultation with 15-60 minute duration", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 30,
        priceCents: 5000,
      });

    expect(response.status).toBe(201);
    expect(response.body.appointmentType).toBe("consultation");
    expect(response.body.status).toBe("pending");
    expect(response.body.clientId).toBe(clientId);
    expect(response.body.artistId).toBe(artistId);
  });

  test("should reject consultation with duration outside 15-60 minute range", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 10,
        priceCents: 5000,
      });

    expect(response.status).toBe(201);
    const booking = await Booking.findById(response.body._id);
    const duration = (new Date(booking.endAt) - new Date(booking.startAt)) / (1000 * 60);
    expect(duration).toBeGreaterThanOrEqual(15);
    expect(duration).toBeLessThanOrEqual(60);
  });

  test("should calculate deposit based on artist policy", async () => {
    await ArtistPolicy.create({
      artistId: artistId,
      deposit: {
        mode: "percent",
        percent: 0.2,
        minCents: 1000,
        consultationFree: false,
      },
    });

    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 30,
        priceCents: 10000,
      });

    expect(response.status).toBe(201);
    expect(response.body.depositRequiredCents).toBeGreaterThan(0);
  });

  test("should set status to pending until deposit paid", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 30,
        priceCents: 5000,
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("pending");
    expect(response.body.depositPaidCents).toBe(0);
  });

  test("400 when artistId or startISO is missing", async () => {
    const res = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({ artistId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("artistId and startISO required");
  });

  test("400 on an invalid start date", async () => {
    const res = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: "not-a-date" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid start date");
  });

  test("409 Slot already booked when the consultation overlaps an existing booking", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await Booking.create({
      artistId,
      clientId: "someone-else",
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 30 * 60 * 1000),
      status: "accepted",
      appointmentType: "consultation",
    });
    const res = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: new Date(startISO.getTime() + 10 * 60 * 1000).toISOString(), durationMinutes: 30 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Slot already booked");
  });
});

conditionalDescribe("Booking Controller - Tattoo Session Creation", () => {
  let artistId;
  let clientId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    await Artist.create({
      clerkId: artistId,
      email: `${artistId}@example.com`,
      username: "Artist",
      handle: `@${artistId}`,
      role: "artist",
      stripeConnectAccountId: "acct_test_123",
      chargesEnabled: true,
      payoutsEnabled: true,
    });
    await ClientBookingPermission.create({
      artistId,
      clientId,
      enabled: true,
      enabledBy: "artist",
      maxSessions: 10,
    });
    await SignedDocument.create({
      docType: "client_waiver",
      version: DOCUMENTS.client_waiver.version,
      signerClerkId: clientId,
      signerRole: "client",
      signatureName: "Test Client",
      contentHash: "test-hash",
    });
    await Client.create({
      clerkId: clientId,
      email: `${clientId}@example.com`,
      username: "Client",
      handle: `@${clientId}`,
      role: "client",
      dob: new Date("1995-01-01"),
    });
  });

  test("should create tattoo session with custom duration", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 120,
        priceCents: 20000,
        intake: VALID_INTAKE,
      });

    expect(response.status).toBe(201);
    expect(response.body.appointmentType).toBe("tattoo_session");
    expect(response.body.status).toBe("pending");
    expect(response.body.intakeFormId).toBeDefined();
  });

  test("should reject a session when the intake form is missing", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 120,
        priceCents: 20000,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("intake_required");
  });

  test("should link to existing project", async () => {
    const project = await Project.create({
      artistId,
      clientId,
      name: "Test Project",
      estimatedSessions: 3,
      completedSessions: 0,
      status: "active",
    });

    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 120,
        priceCents: 20000,
        projectId: project._id.toString(),
        sessionNumber: 1,
        intake: VALID_INTAKE,
      });

    expect(response.status).toBe(201);
    expect(response.body.projectId.toString()).toBe(project._id.toString());
    expect(response.body.sessionNumber).toBe(1);
  });

  test("should set sessionNumber correctly", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO,
        durationMinutes: 120,
        priceCents: 20000,
        sessionNumber: 2,
        intake: VALID_INTAKE,
      });

    expect(response.status).toBe(201);
    expect(response.body.sessionNumber).toBe(2);
  });

  test("400 when artistId or startISO is missing", async () => {
    const res = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({ artistId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("artistId and startISO required");
  });

  test("400 on an invalid start date", async () => {
    const res = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: "nope" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid start date");
  });

  test("404 Project not found for an unknown projectId", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO, projectId: new mongoose.Types.ObjectId().toString(), intake: VALID_INTAKE });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  test("403 Project access denied for another client's project", async () => {
    const project = await Project.create({
      artistId,
      clientId: "another-client",
      name: "Someone Else's",
      estimatedSessions: 2,
      status: "active",
    });
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO, projectId: project._id.toString(), intake: VALID_INTAKE });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Project access denied");
  });

  test("409 Slot already booked when the session overlaps an existing booking", async () => {
    const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await Booking.create({
      artistId,
      clientId: "x-client",
      startAt: start,
      endAt: new Date(start.getTime() + 120 * 60 * 1000),
      status: "accepted",
      appointmentType: "tattoo_session",
    });
    const res = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: new Date(start.getTime() + 30 * 60 * 1000).toISOString(), durationMinutes: 60, intake: VALID_INTAKE });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Slot already booked");
  });

  test("403 too_many_sessions when the session number exceeds the approved max", async () => {
    await ClientBookingPermission.updateOne({ artistId, clientId }, { $set: { maxSessions: 1 } });
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO, sessionNumber: 5, intake: VALID_INTAKE });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("too_many_sessions");
  });

  test("lets a participant check in within the window", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 10 * 60 * 1000), endAt: new Date(Date.now() + 60 * 60 * 1000), priceCents: 20000,
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/check-in`)
      .set("x-test-user-id", clientId)
      .send({ lat: 40.7, lng: -74 });
    expect(res.status).toBe(200);
    expect(res.body.clientCheckedInAt).toBeTruthy();
  });

  test("rejects check-in more than an hour before the appointment", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() + 5 * 60 * 60 * 1000), endAt: new Date(Date.now() + 6 * 60 * 60 * 1000), priceCents: 20000,
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/check-in`)
      .set("x-test-user-id", clientId)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("too_early");
  });

  test("forbids a non-participant from checking in", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 10 * 60 * 1000), endAt: new Date(Date.now() + 60 * 60 * 1000), priceCents: 20000,
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/check-in`)
      .set("x-test-user-id", "stranger")
      .send({});
    expect(res.status).toBe(403);
  });

  test("lets the client report an artist no-show after the start time", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 3600000), endAt: new Date(), priceCents: 20000,
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/artist-no-show`)
      .set("x-test-user-id", clientId)
      .send({ reason: "Artist never arrived" });
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowReportedAt).toBeTruthy();
  });

  test("forbids a non-client from reporting an artist no-show", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 3600000), endAt: new Date(), priceCents: 20000,
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/artist-no-show`)
      .set("x-test-user-id", artistId)
      .send({});
    expect(res.status).toBe(403);
  });

  test("rejects an artist-no-show report before the appointment starts", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 90000000), priceCents: 20000,
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/artist-no-show`)
      .set("x-test-user-id", clientId)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("too_early");
  });

  test("forbids non-admins from listing no-show disputes", async () => {
    const res = await request(server).get("/bookings/no-show-disputes").set("x-test-user-id", clientId);
    expect(res.status).toBe(403);
  });

  test("artist accepting a no-show report marks it refunded + cancels the booking", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 3600000), endAt: new Date(), priceCents: 20000,
      artistNoShowReportedAt: new Date(), artistNoShowStatus: "reported",
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/artist-no-show/respond`)
      .set("x-test-user-id", artistId)
      .send({ accept: true });
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowStatus).toBe("refunded");
    expect(res.body.status).toBe("cancelled");
  });

  test("artist disputing a no-show report sends it to review", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 3600000), endAt: new Date(), priceCents: 20000,
      artistNoShowReportedAt: new Date(), artistNoShowStatus: "reported",
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/artist-no-show/respond`)
      .set("x-test-user-id", artistId)
      .send({ accept: false, note: "I was there on time." });
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowStatus).toBe("disputed");
  });

  test("a client cannot respond to (self-resolve) a no-show report", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 3600000), endAt: new Date(), priceCents: 20000,
      artistNoShowReportedAt: new Date(), artistNoShowStatus: "reported",
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/artist-no-show/respond`)
      .set("x-test-user-id", clientId)
      .send({ accept: true });
    expect(res.status).toBe(403);
  });

  test("blocks unilateral completion until both parties verify", async () => {
    const booking = await Booking.create({
      clientId,
      artistId,
      appointmentType: "tattoo_session",
      status: "accepted",
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(),
      priceCents: 20000,
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/complete`)
      .set("x-test-user-id", artistId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("verification_required");
  });

  test("refuses to complete a cancelled booking even when both verify flags are set", async () => {
    const booking = await Booking.create({
      clientId,
      artistId,
      appointmentType: "tattoo_session",
      status: "cancelled",
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(),
      priceCents: 20000,
      clientVerifiedAt: new Date(),
      artistVerifiedAt: new Date(),
    });
    const res = await request(server)
      .post(`/bookings/${booking._id}/complete`)
      .set("x-test-user-id", artistId);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("invalid_status");
    const after = await Booking.findById(booking._id);
    expect(after.status).toBe("cancelled");
  });

  test("rejects a tattoo session for an underage client", async () => {
    await Client.create({
      clerkId: "minor-1",
      email: "minor-1@example.com",
      username: "Minor",
      handle: "@minor-1",
      role: "client",
      dob: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000),
    });
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(server)
      .post("/bookings/session")
      .set("x-test-user-id", "minor-1")
      .send({ artistId, startISO, durationMinutes: 120, priceCents: 20000, intake: VALID_INTAKE });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("underage");
  });
});

conditionalDescribe("Booking Controller - Double Booking Prevention", () => {
  let artistId;
  let clientId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";
  });

  test("should reject booking when artist has conflicting appointment", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const endISO = new Date(startISO.getTime() + 30 * 60 * 1000);

    await Booking.create({
      artistId,
      clientId: "other-client",
      startAt: startISO,
      endAt: endISO,
      status: "confirmed",
      appointmentType: "consultation",
    });

    const response = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO: startISO.toISOString(),
        durationMinutes: 30,
        priceCents: 5000,
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Slot already booked");
  });

  test("the DB unique index blocks a second live booking at the same artist+slot (race-safe)", async () => {
    await Booking.init();
    const startAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const end = new Date(startAt.getTime() + 60 * 60 * 1000);
    await Booking.create({
      artistId: "race-artist", clientId: "c1", startAt, endAt: end,
      status: "accepted", appointmentType: "consultation",
    });
    await expect(
      Booking.create({
        artistId: "race-artist", clientId: "c2", startAt, endAt: end,
        status: "pending", appointmentType: "consultation",
      })
    ).rejects.toMatchObject({ code: 11000 });
  });

  test("a cancelled booking does not reserve the slot in the unique index", async () => {
    await Booking.init();
    const startAt = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const end = new Date(startAt.getTime() + 60 * 60 * 1000);
    await Booking.create({
      artistId: "freed-artist", clientId: "c1", startAt, endAt: end,
      status: "cancelled", appointmentType: "consultation",
    });
    const ok = await Booking.create({
      artistId: "freed-artist", clientId: "c2", startAt, endAt: end,
      status: "pending", appointmentType: "consultation",
    });
    expect(ok._id).toBeTruthy();
  });

  test("should allow booking when only cancelled appointments conflict", async () => {
    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const endISO = new Date(startISO.getTime() + 30 * 60 * 1000);

    await Booking.create({
      artistId,
      clientId: "other-client",
      startAt: startISO,
      endAt: endISO,
      status: "cancelled",
      appointmentType: "consultation",
    });

    const response = await request(server)
      .post("/bookings/consultation")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO: startISO.toISOString(),
        durationMinutes: 30,
        priceCents: 5000,
      });

    expect(response.status).toBe(201);
  });
});

conditionalDescribe("Booking Controller - Rescheduling", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    const startISO = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "consultation",
      depositPaidCents: 1000,
      depositRequiredCents: 1000,
    });
    bookingId = booking._id.toString();
  });

  test("should allow rescheduling with 48+ hours notice (deposit preserved)", async () => {
    const newStartISO = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const newEndISO = new Date(newStartISO.getTime() + 60 * 60 * 1000);

    const response = await request(server)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({
        startISO: newStartISO.toISOString(),
        endISO: newEndISO.toISOString(),
      });

    expect(response.status).toBe(200);
    const booking = await Booking.findById(bookingId);
    expect(booking.depositPaidCents).toBe(1000);
    expect(booking.rescheduledFrom).toBeDefined();
  });

  test("should forfeit deposit when rescheduling <48 hours before appointment", async () => {
    const booking = await Booking.findById(bookingId);
    booking.startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await booking.save();

    const newStartISO = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const newEndISO = new Date(newStartISO.getTime() + 60 * 60 * 1000);

    const response = await request(server)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({
        startISO: newStartISO.toISOString(),
        endISO: newEndISO.toISOString(),
      });

    expect(response.status).toBe(200);
    const updatedBooking = await Booking.findById(bookingId);
    expect(updatedBooking.depositPaidCents).toBe(0);
  });

  test("400 when startISO or endISO is missing", async () => {
    const response = await request(server)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({ startISO: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("startISO and endISO required");
  });

  test("404 for a missing booking", async () => {
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const response = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({ startISO: start.toISOString(), endISO: new Date(start.getTime() + 3600000).toISOString() });
    expect(response.status).toBe(404);
  });

  test("403 when the actor is neither client nor artist", async () => {
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const response = await request(server)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", "stranger")
      .send({ startISO: start.toISOString(), endISO: new Date(start.getTime() + 3600000).toISOString() });
    expect(response.status).toBe(403);
  });

  test("400 when rescheduling a completed appointment", async () => {
    await Booking.findByIdAndUpdate(bookingId, { status: "completed" });
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const response = await request(server)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({ startISO: start.toISOString(), endISO: new Date(start.getTime() + 3600000).toISOString() });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/cancelled or completed/i);
  });

  test("400 insufficient_notice when the new start is too soon", async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const response = await request(server)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({ startISO: start.toISOString(), endISO: new Date(start.getTime() + 3600000).toISOString() });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("insufficient_notice");
    expect(typeof response.body.hoursUntilAppointment).toBe("number");
  });

  test("400 when end is not after start", async () => {
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const response = await request(server)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({ startISO: start.toISOString(), endISO: new Date(start.getTime() - 3600000).toISOString() });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid dates");
  });

  test("409 when the new slot conflicts with another booking", async () => {
    const conflictStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const conflictEnd = new Date(conflictStart.getTime() + 60 * 60 * 1000);
    await Booking.create({
      artistId,
      clientId: "other-client",
      startAt: conflictStart,
      endAt: conflictEnd,
      status: "confirmed",
      appointmentType: "consultation",
    });

    const response = await request(server)
      .post(`/bookings/${bookingId}/reschedule`)
      .set("x-test-user-id", clientId)
      .send({
        startISO: new Date(conflictStart.getTime() + 15 * 60 * 1000).toISOString(),
        endISO: new Date(conflictEnd.getTime() + 15 * 60 * 1000).toISOString(),
      });
    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Slot already booked");
  });
});

conditionalDescribe("Booking Controller - Cancellation", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    const startISO = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "consultation",
      depositPaidCents: 1000,
      depositRequiredCents: 1000,
    });
    bookingId = booking._id.toString();
  });

  test("should forfeit deposit if cancelled <48 hours before", async () => {
    const booking = await Booking.findById(bookingId);
    booking.startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await booking.save();

    const response = await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set("x-test-user-id", clientId)
      .send({ reason: "Emergency" });

    expect(response.status).toBe(200);
    const updatedBooking = await Booking.findById(bookingId);
    expect(updatedBooking.status).toBe("cancelled");
    expect(updatedBooking.depositPaidCents).toBe(0);
  });

  test("should preserve deposit if cancelled 48+ hours before", async () => {
    const response = await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set("x-test-user-id", clientId)
      .send({ reason: "Schedule conflict" });

    expect(response.status).toBe(200);
    const updatedBooking = await Booking.findById(bookingId);
    expect(updatedBooking.status).toBe("cancelled");
    expect(updatedBooking.depositPaidCents).toBe(1000);
  });

  test("actually refunds the deposit bill on a good-faith cancellation", async () => {
    const bill = await Billing.create({
      bookingId,
      clientId,
      artistId,
      type: "deposit",
      amountCents: 1000,
      status: "paid",
      currency: "usd",
    });

    const response = await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set("x-test-user-id", clientId)
      .send({ reason: "Schedule conflict" });

    expect(response.status).toBe(200);
    const updatedBill = await Billing.findById(bill._id);
    expect(updatedBill.status).toBe("refunded");
  });
});

conditionalDescribe("Booking Controller - No-Show", () => {
  let artistId;
  let clientId;
  let bookingId;

  beforeEach(async () => {
    artistId = "artist-123";
    clientId = "client-456";

    const startISO = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const booking = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      appointmentType: "consultation",
      depositPaidCents: 1000,
      depositRequiredCents: 1000,
    });
    bookingId = booking._id.toString();
  });

  test("should automatically forfeit deposit when marked no-show", async () => {
    const response = await request(server)
      .post(`/bookings/${bookingId}/no-show`)
      .set("x-test-user-id", artistId)
      .send({ reason: "Client did not arrive" });

    expect(response.status).toBe(200);
    const updatedBooking = await Booking.findById(bookingId);
    expect(updatedBooking.status).toBe("no-show");
    expect(updatedBooking.depositPaidCents).toBe(0);
    expect(updatedBooking.noShowMarkedAt).toBeDefined();
  });

  test("should reject marking no-show for future appointments", async () => {
    const booking = await Booking.findById(bookingId);
    booking.startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await booking.save();

    const response = await request(server)
      .post(`/bookings/${bookingId}/no-show`)
      .set("x-test-user-id", artistId)
      .send({ reason: "Test" });

    expect(response.status).toBe(400);
  });

  test("rejects marking no-show on a never-accepted (pending) booking and preserves the deposit", async () => {
    const startISO = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pending = await Booking.create({
      artistId,
      clientId,
      startAt: startISO,
      endAt: new Date(startISO.getTime() + 60 * 60 * 1000),
      status: "pending",
      appointmentType: "consultation",
      depositPaidCents: 1000,
      depositRequiredCents: 1000,
    });

    const response = await request(server)
      .post(`/bookings/${pending._id}/no-show`)
      .set("x-test-user-id", artistId)
      .send({ reason: "Client did not arrive" });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("invalid_status");
    const after = await Booking.findById(pending._id);
    expect(after.status).toBe("pending");
    expect(after.depositPaidCents).toBe(1000);
  });

  test("404 marking a missing booking", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/no-show`)
      .set("x-test-user-id", artistId);
    expect(res.status).toBe(404);
  });

  test("403 when a non-artist marks no-show", async () => {
    const res = await request(server)
      .post(`/bookings/${bookingId}/no-show`)
      .set("x-test-user-id", clientId)
      .send({ reason: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Only artist can mark no-show");
  });

  test("marking an already no-show booking is a no-op", async () => {
    await Booking.findByIdAndUpdate(bookingId, { status: "no-show", noShowMarkedAt: new Date() });
    const res = await request(server)
      .post(`/bookings/${bookingId}/no-show`)
      .set("x-test-user-id", artistId);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("no-show");
  });
});

conditionalDescribe("Booking Controller - Intake Form", () => {
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
    });
    bookingId = booking._id.toString();
  });

  test("should require all mandatory consent fields", async () => {
    const response = await request(server)
      .post(`/bookings/${bookingId}/intake`)
      .set("x-test-user-id", clientId)
      .send({
        consent: {
          ageVerification: true,
          healthDisclosure: false,
          aftercareInstructions: true,
          depositPolicy: true,
          cancellationPolicy: true,
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing required consent fields");
  });

  test("should successfully submit intake form with all required fields", async () => {
    const response = await request(server)
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
        healthInfo: {
          allergies: "None",
        },
      });

    expect(response.status).toBe(200);
    const booking = await Booking.findById(bookingId);
    expect(booking.intakeFormId).toBeDefined();
  });

  test("lets the client delete their submitted intake data", async () => {
    await request(server)
      .post(`/bookings/${bookingId}/intake`)
      .set("x-test-user-id", clientId)
      .send({
        consent: { ageVerification: true, healthDisclosure: true, aftercareInstructions: true, depositPolicy: true, cancellationPolicy: true },
      });

    const del = await request(server).delete(`/bookings/${bookingId}/intake`).set("x-test-user-id", clientId);
    expect(del.status).toBe(200);

    const get = await request(server).get(`/bookings/${bookingId}/intake`).set("x-test-user-id", clientId);
    expect(get.status).toBe(404);
  });

  test("forbids a non-client from deleting intake data", async () => {
    await request(server)
      .post(`/bookings/${bookingId}/intake`)
      .set("x-test-user-id", clientId)
      .send({
        consent: { ageVerification: true, healthDisclosure: true, aftercareInstructions: true, depositPolicy: true, cancellationPolicy: true },
      });

    const del = await request(server).delete(`/bookings/${bookingId}/intake`).set("x-test-user-id", "stranger");
    expect(del.status).toBe(403);
  });

  test("submitIntakeForm 404 for a missing booking", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/intake`)
      .set("x-test-user-id", clientId)
      .send({ consent: { ageVerification: true, healthDisclosure: true, aftercareInstructions: true } });
    expect(res.status).toBe(404);
  });

  test("submitIntakeForm 403 when the actor is not the client", async () => {
    const res = await request(server)
      .post(`/bookings/${bookingId}/intake`)
      .set("x-test-user-id", "stranger")
      .send({ consent: { ageVerification: true, healthDisclosure: true, aftercareInstructions: true } });
    expect(res.status).toBe(403);
  });

  test("getIntakeForm 404 for a missing booking", async () => {
    const res = await request(server)
      .get(`/bookings/${new mongoose.Types.ObjectId()}/intake`)
      .set("x-test-user-id", clientId);
    expect(res.status).toBe(404);
  });

  test("getIntakeForm 403 for a non-party", async () => {
    const res = await request(server).get(`/bookings/${bookingId}/intake`).set("x-test-user-id", "stranger");
    expect(res.status).toBe(403);
  });

  test("getIntakeForm 404 when no form has been submitted", async () => {
    const res = await request(server).get(`/bookings/${bookingId}/intake`).set("x-test-user-id", artistId);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Intake form not found");
  });

  test("getIntakeForm returns a submitted form for the artist", async () => {
    await request(server)
      .post(`/bookings/${bookingId}/intake`)
      .set("x-test-user-id", clientId)
      .send({ consent: { ageVerification: true, healthDisclosure: true, aftercareInstructions: true } });
    const res = await request(server).get(`/bookings/${bookingId}/intake`).set("x-test-user-id", artistId);
    expect(res.status).toBe(200);
    expect(res.body.consent.ageVerification).toBe(true);
  });

  test("deleteIntakeForm 404 for a missing booking", async () => {
    const res = await request(server)
      .delete(`/bookings/${new mongoose.Types.ObjectId()}/intake`)
      .set("x-test-user-id", clientId);
    expect(res.status).toBe(404);
  });
});
conditionalDescribe("Booking Controller - queries", () => {
  const Client = mongoose.model("client");
  const Artist = mongoose.model("artist");

  async function seedBooking(over = {}) {
    return Booking.create({
      artistId: "qa-artist",
      clientId: "qa-client",
      startAt: new Date(Date.now() + 86400000),
      endAt: new Date(Date.now() + 90000000),
      status: "confirmed",
      appointmentType: "consultation",
      priceCents: 5000,
      ...over,
    });
  }

  test("getClientBookings returns the client's bookings enriched with the artist", async () => {
    await Artist.create({ clerkId: "qa-artist", email: "a@x.com", username: "ArtPro", handle: "@qa-artist", role: "artist" });
    await seedBooking();
    const res = await request(server).get("/bookings/client").set("x-test-user-id", "qa-client");
    expect(res.status).toBe(200);
    expect(res.body[0].artist.username).toBe("ArtPro");
  });

  test("getArtistBookings returns the artist's bookings enriched with the client", async () => {
    await Client.create({ clerkId: "qa-client", email: "c@x.com", username: "CliName", handle: "@qa-client", role: "client" });
    await seedBooking();
    const res = await request(server).get("/bookings/artist").set("x-test-user-id", "qa-artist");
    expect(res.status).toBe(200);
    expect(res.body[0].client.username).toBe("CliName");
  });

  test("getClientBookings falls back to Unknown Artist when the artist user is missing", async () => {
    await seedBooking();
    const res = await request(server).get("/bookings/client").set("x-test-user-id", "qa-client");
    expect(res.status).toBe(200);
    expect(res.body[0].artist.username).toBe("Unknown Artist");
  });

  test("getArtistBookings falls back to Unknown Client when the client user is missing", async () => {
    await seedBooking();
    const res = await request(server).get("/bookings/artist").set("x-test-user-id", "qa-artist");
    expect(res.status).toBe(200);
    expect(res.body[0].client.username).toBe("Unknown Client");
  });

  test("getAppointments returns both-party appointments with a reviewed flag", async () => {
    const b = await seedBooking({ status: "completed" });
    const res = await request(server).get("/bookings/appointments").set("x-test-user-id", "qa-client");
    expect(res.status).toBe(200);
    expect(res.body.some((a) => String(a._id) === String(b._id))).toBe(true);
    expect(res.body[0].reviewed).toBe(false);
  });

  test("getAppointments filters by role=artist", async () => {
    await seedBooking();
    const res = await request(server).get("/bookings/appointments?role=artist").set("x-test-user-id", "qa-artist");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test("getAppointments enriches with client/artist and project metadata", async () => {
    await Artist.create({ clerkId: "qa-artist", email: "a2@x.com", username: "EnrichArtist", handle: "@qa-artist", role: "artist" });
    await Client.create({ clerkId: "qa-client", email: "c2@x.com", username: "EnrichClient", handle: "@qa-client", role: "client" });
    const project = await Project.create({
      artistId: "qa-artist",
      clientId: "qa-client",
      name: "Sleeve Project",
      estimatedSessions: 3,
    });
    const b = await seedBooking({ projectId: project._id });
    const res = await request(server).get("/bookings/appointments").set("x-test-user-id", "qa-client");
    expect(res.status).toBe(200);
    const appt = res.body.find((a) => String(a._id) === String(b._id));
    expect(appt.client.username).toBe("EnrichClient");
    expect(appt.artist.username).toBe("EnrichArtist");
    expect(appt.projectName).toBe("Sleeve Project");
    expect(appt.projectSessions).toBe(3);
  });

  test("getAppointments auto-completes a booking past its end + grace window", async () => {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const b = await seedBooking({
      status: "accepted",
      startAt: new Date(eightHoursAgo.getTime() - 3600000),
      endAt: eightHoursAgo,
      appointmentType: "tattoo_session",
    });

    const res = await request(server).get("/bookings/appointments").set("x-test-user-id", "qa-client");
    expect(res.status).toBe(200);

    const persisted = await Booking.findById(b._id).lean();
    expect(persisted.status).toBe("completed");
    expect(persisted.autoCompleted).toBe(true);
    expect(persisted.completedAt).toBeTruthy();
  });

  test("getAppointments auto-completes and attempts balance capture when a balance is due", async () => {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const b = await seedBooking({
      status: "accepted",
      startAt: new Date(eightHoursAgo.getTime() - 3600000),
      endAt: eightHoursAgo,
      appointmentType: "tattoo_session",
      priceCents: 30000,
      depositPaidCents: 5000,
      finalPriceApproved: true,
      finalPriceSetAt: new Date(),
    });
    const res = await request(server).get("/bookings/appointments").set("x-test-user-id", "qa-client");
    expect(res.status).toBe(200);
    const persisted = await Booking.findById(b._id).lean();
    expect(persisted.status).toBe("completed");
    expect(persisted.autoCompleted).toBe(true);
  });

  test("getAppointments leaves a recently-ended booking untouched", async () => {
    const b = await seedBooking({
      status: "accepted",
      startAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    await request(server).get("/bookings/appointments").set("x-test-user-id", "qa-client");
    const persisted = await Booking.findById(b._id).lean();
    expect(persisted.status).toBe("accepted");
    expect(persisted.autoCompleted).toBeFalsy();
  });

  test("checkConsultationStatus 400 without ids", async () => {
    const res = await request(server).get("/bookings/consultation-status").set("x-test-user-id", "u1");
    expect(res.status).toBe(400);
  });

  test("checkConsultationStatus reports a completed consultation", async () => {
    await seedBooking({ status: "completed", completedAt: new Date() });
    const res = await request(server)
      .get("/bookings/consultation-status?artistId=qa-artist&clientId=qa-client")
      .set("x-test-user-id", "qa-client");
    expect(res.body.hasCompletedConsultation).toBe(true);
  });

  test("getBookingsForDay 400 without artistId/date", async () => {
    const res = await request(server).get("/bookings/day").set("x-test-user-id", "u1");
    expect(res.status).toBe(400);
  });

  test("getBookingsForDay returns busy slots for the day", async () => {
    const day = new Date(Date.now() + 86400000);
    await seedBooking({ startAt: day, endAt: new Date(day.getTime() + 3600000), status: "accepted" });
    const res = await request(server)
      .get(`/bookings/day?artistId=qa-artist&date=${day.toISOString().slice(0, 10)}`)
      .set("x-test-user-id", "qa-artist");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("getBooking 404 for a valid id that does not exist", async () => {
    const res = await request(server).get(`/bookings/${new mongoose.Types.ObjectId()}`).set("x-test-user-id", "qa-client");
    expect(res.status).toBe(404);
  });

  test("getBooking 400 for an invalid booking id", async () => {
    const res = await request(server).get("/bookings/not-an-id").set("x-test-user-id", "qa-client");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid booking id");
  });

  test("getBooking lets an admin read any booking", async () => {
    const prevAdminEnv = process.env.ADMIN_CLERK_IDS;
    process.env.ADMIN_CLERK_IDS = "qa-admin";
    try {
      const b = await seedBooking();
      const res = await request(server).get(`/bookings/${b._id}`).set("x-test-user-id", "qa-admin");
      expect(res.status).toBe(200);
    } finally {
      if (prevAdminEnv === undefined) delete process.env.ADMIN_CLERK_IDS;
      else process.env.ADMIN_CLERK_IDS = prevAdminEnv;
    }
  });
});

conditionalDescribe("Booking Controller - verification", () => {
  async function seedBooking(over = {}) {
    return Booking.create({
      artistId: "v-artist",
      clientId: "v-client",
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(),
      status: "accepted",
      appointmentType: "tattoo_session",
      priceCents: 20000,
      ...over,
    });
  }

  test("startVerification issues codes and an expiry", async () => {
    const b = await seedBooking();
    const res = await request(server).post(`/bookings/${b._id}/start-verification`).set("x-test-user-id", "v-artist");
    expect(res.body.ok).toBe(true);
    expect(res.body.expiresAt).toBeTruthy();
    const updated = await Booking.findById(b._id);
    expect(updated.clientCode).toBeTruthy();
    expect(updated.artistCode).toBeTruthy();
  });

  test("startVerification 404 for a missing booking", async () => {
    const res = await request(server).post(`/bookings/${new mongoose.Types.ObjectId()}/start-verification`).set("x-test-user-id", "v-artist");
    expect(res.status).toBe(404);
  });

  test("startVerification 400 for a cancelled booking", async () => {
    const b = await seedBooking({ status: "cancelled" });
    const res = await request(server).post(`/bookings/${b._id}/start-verification`).set("x-test-user-id", "v-artist");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("booking_cancelled");
  });

  test("startVerification emails both parties when users exist", async () => {
    await mongoose.model("artist").create({ clerkId: "v-artist", email: "va@x.com", username: "VArtist", handle: "@v-artist", role: "artist" });
    await mongoose.model("client").create({ clerkId: "v-client", email: "vc@x.com", username: "VClient", handle: "@v-client", role: "client" });
    const b = await seedBooking();
    const res = await request(server).post(`/bookings/${b._id}/start-verification`).set("x-test-user-id", "v-artist");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("verify completion attempts a balance capture when a balance remains", async () => {
    const b = await seedBooking({
      priceCents: 20000,
      depositPaidCents: 5000,
      finalPriceApproved: true,
      finalPriceSetAt: new Date(),
      clientCode: "CCODEZ",
      artistCode: "ACODEZ",
      clientVerifiedAt: new Date(),
      codeExpiresAt: new Date(Date.now() + 60000),
    });
    const res = await request(server)
      .post(`/bookings/${b._id}/verify`)
      .set("x-test-user-id", "v-artist")
      .send({ role: "artist", code: "ACODEZ" });
    expect(res.status).toBe(200);
    const updated = await Booking.findById(b._id);
    expect(updated.status).toBe("completed");
  });

  test("verifyBookingCode 400 without role/code", async () => {
    const b = await seedBooking();
    const res = await request(server).post(`/bookings/${b._id}/verify`).set("x-test-user-id", "v-client").send({});
    expect(res.status).toBe(400);
  });

  test("verifyBookingCode rejects an expired code", async () => {
    const b = await seedBooking({ clientCode: "ABC123", codeExpiresAt: new Date(Date.now() - 1000) });
    const res = await request(server).post(`/bookings/${b._id}/verify`).set("x-test-user-id", "v-client").send({ role: "client", code: "ABC123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("code_expired");
  });

  test("verifyBookingCode rejects a bad code", async () => {
    const b = await seedBooking({ clientCode: "ABC123", codeExpiresAt: new Date(Date.now() + 60000) });
    const res = await request(server).post(`/bookings/${b._id}/verify`).set("x-test-user-id", "v-client").send({ role: "client", code: "WRONG" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("bad_code");
  });

  test("verifyBookingCode accepts the client's correct code", async () => {
    const b = await seedBooking({ clientCode: "ABC123", codeExpiresAt: new Date(Date.now() + 60000) });
    const res = await request(server).post(`/bookings/${b._id}/verify`).set("x-test-user-id", "v-client").send({ role: "client", code: "abc123" });
    expect(res.status).toBe(200);
    const updated = await Booking.findById(b._id);
    expect(updated.clientVerifiedAt).toBeTruthy();
  });

  test("verifyBookingCode blocks a role mismatch", async () => {
    const b = await seedBooking({ clientCode: "ABC123", codeExpiresAt: new Date(Date.now() + 60000) });
    const res = await request(server).post(`/bookings/${b._id}/verify`).set("x-test-user-id", "v-client").send({ role: "artist", code: "ABC123" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("role_mismatch");
  });
});

conditionalDescribe("Booking Controller - details, cancel-link, time", () => {
  async function seed(over = {}) {
    return Booking.create({
      artistId: "dl-artist",
      clientId: "dl-client",
      startAt: new Date(Date.now() + 3 * 86400000),
      endAt: new Date(Date.now() + 3 * 86400000 + 3600000),
      status: "accepted",
      appointmentType: "consultation",
      priceCents: 5000,
      ...over,
    });
  }

  test("getAppointmentDetails 404 for a missing booking", async () => {
    const res = await request(server).get(`/bookings/${new mongoose.Types.ObjectId()}/details`).set("x-test-user-id", "dl-client");
    expect(res.status).toBe(404);
  });

  test("getAppointmentDetails 403 for a non-party", async () => {
    const b = await seed();
    const res = await request(server).get(`/bookings/${b._id}/details`).set("x-test-user-id", "stranger");
    expect(res.status).toBe(403);
  });

  test("getAppointmentDetails returns details with enriched parties", async () => {
    const b = await seed();
    const res = await request(server).get(`/bookings/${b._id}/details`).set("x-test-user-id", "dl-client");
    expect(res.status).toBe(200);
    expect(String(res.body._id)).toBe(String(b._id));
  });

  test("cancelBookingViaLink redirects with an error on an invalid token", async () => {
    const b = await seed({ cancelToken: "good" });
    const res = await request(server).get(`/bookings/${b._id}/cancel-link?token=bad`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("invalid_token");
  });

  test("cancelBookingViaLink cancels and redirects with the valid token", async () => {
    const b = await seed({ cancelToken: "good" });
    const res = await request(server).get(`/bookings/${b._id}/cancel-link?token=good`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("cancelled=true");
    const updated = await Booking.findById(b._id);
    expect(updated.status).toBe("cancelled");
  });

  test("cancelBookingViaLink 404 for a missing booking", async () => {
    const res = await request(server).get(`/bookings/${new mongoose.Types.ObjectId()}/cancel-link?token=x`);
    expect(res.status).toBe(404);
  });

  test("cancelBookingViaLink redirects cancelled=true for an already-cancelled booking", async () => {
    const b = await seed({ cancelToken: "good", status: "cancelled" });
    const res = await request(server).get(`/bookings/${b._id}/cancel-link?token=good`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("cancelled=true");
  });

  test("cancelBookingViaLink emails the client when the clientId is a real Client document", async () => {
    const client = await Client.create({
      clerkId: "cl-link-client",
      email: "linkclient@example.com",
      username: "LinkClient",
      handle: "@cl-link-client",
      role: "client",
    });
    const b = await Booking.create({
      artistId: "dl-artist",
      clientId: String(client._id),
      startAt: new Date(Date.now() + 3 * 86400000),
      endAt: new Date(Date.now() + 3 * 86400000 + 3600000),
      status: "accepted",
      appointmentType: "consultation",
      cancelToken: "good",
    });
    const res = await request(server).get(`/bookings/${b._id}/cancel-link?token=good`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("cancelled=true");
    const updated = await Booking.findById(b._id);
    expect(updated.status).toBe("cancelled");
  });

  test("updateBookingTime 400 without dates", async () => {
    const b = await seed();
    const res = await request(server).patch(`/bookings/${b._id}/time`).set("x-test-user-id", "dl-artist").send({});
    expect(res.status).toBe(400);
  });

  test("updateBookingTime 403 when not the artist", async () => {
    const b = await seed();
    const res = await request(server)
      .patch(`/bookings/${b._id}/time`)
      .set("x-test-user-id", "dl-client")
      .send({ startISO: new Date().toISOString(), endISO: new Date(Date.now() + 3600000).toISOString() });
    expect(res.status).toBe(403);
  });

  test("updateBookingTime 400 on invalid dates (end before start)", async () => {
    const b = await seed();
    const res = await request(server)
      .patch(`/bookings/${b._id}/time`)
      .set("x-test-user-id", "dl-artist")
      .send({ startISO: new Date(Date.now() + 7200000).toISOString(), endISO: new Date(Date.now() + 3600000).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid dates");
  });
});

async function seedBookableArtist(artistId, clientId) {
  await Artist.create({
    clerkId: artistId,
    email: `${artistId}@example.com`,
    username: "Artist",
    handle: `@${artistId}`,
    role: "artist",
    stripeConnectAccountId: "acct_test_123",
    chargesEnabled: true,
    payoutsEnabled: true,
  });
  await SignedDocument.create({
    docType: "client_waiver",
    version: DOCUMENTS.client_waiver.version,
    signerClerkId: clientId,
    signerRole: "client",
    signatureName: "Test Client",
    contentHash: "test-hash",
  });
  await Client.create({
    clerkId: clientId,
    email: `${clientId}@example.com`,
    username: "Client",
    handle: `@${clientId}`,
    role: "client",
    dob: new Date("1995-01-01"),
  });
}

conditionalDescribe("Booking Controller - createBooking", () => {
  const artistId = "cb-artist";
  const clientId = "cb-client";

  async function enablePermission(maxSessions = 10) {
    await ClientBookingPermission.create({
      artistId,
      clientId,
      enabled: true,
      enabledBy: "artist",
      maxSessions,
    });
  }

  beforeEach(async () => {
    await seedBookableArtist(artistId, clientId);
  });

  test("400 when artistId or startISO is missing", async () => {
    await enablePermission();
    const res = await request(server)
      .post("/bookings/create")
      .set("x-test-user-id", clientId)
      .send({ artistId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("artistId and startISO required");
  });

  test("400 on an unparseable start date", async () => {
    await enablePermission();
    const res = await request(server)
      .post("/bookings/create")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: "not-a-date" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid dates");
  });

  test("400 when end is not after start", async () => {
    await enablePermission();
    const start = new Date(Date.now() + 2 * 86400000).toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();
    const res = await request(server)
      .post("/bookings/create")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: start, endISO: end });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("end must be after start");
  });

  test("403 bookings_disabled when the client has no permission", async () => {
    const start = new Date(Date.now() + 2 * 86400000).toISOString();
    const res = await request(server)
      .post("/bookings/create")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: start });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("bookings_disabled");
  });

  test("creates a booking and auto-computes the end from default availability", async () => {
    await enablePermission();
    const start = new Date(Date.now() + 2 * 86400000).toISOString();
    const res = await request(server)
      .post("/bookings/create")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: start, priceCents: 15000, note: "sleeve" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("booked");
    expect(res.body.priceCents).toBe(15000);
    expect(new Date(res.body.endAt).getTime()).toBeGreaterThan(
      new Date(res.body.startAt).getTime()
    );
  });

  test("409 when the slot overlaps an existing booking", async () => {
    await enablePermission();
    const start = new Date(Date.now() + 2 * 86400000);
    const end = new Date(start.getTime() + 3600000);
    await Booking.create({
      artistId,
      clientId: "someone-else",
      startAt: start,
      endAt: end,
      status: "accepted",
    });
    const res = await request(server)
      .post("/bookings/create")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        startISO: new Date(start.getTime() + 600000).toISOString(),
        endISO: new Date(start.getTime() + 1800000).toISOString(),
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Slot already booked");
  });

  test("409 artist_not_onboarded when the artist cannot receive payments", async () => {
    await Artist.updateOne(
      { clerkId: artistId },
      { $set: { chargesEnabled: false } }
    );
    await enablePermission();
    const start = new Date(Date.now() + 2 * 86400000).toISOString();
    const res = await request(server)
      .post("/bookings/create")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: start });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("artist_not_onboarded");
  });

  test("403 waiver_required when the client has not signed the waiver", async () => {
    await SignedDocument.deleteMany({ signerClerkId: clientId });
    await enablePermission();
    const start = new Date(Date.now() + 2 * 86400000).toISOString();
    const res = await request(server)
      .post("/bookings/create")
      .set("x-test-user-id", clientId)
      .send({ artistId, startISO: start });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("waiver_required");
  });
});

conditionalDescribe("Booking Controller - createMultiSession", () => {
  const artistId = "ms-artist";
  const clientId = "ms-client";

  function sessions(n) {
    return Array.from({ length: n }, (_, i) => ({
      startISO: new Date(Date.now() + (i + 2) * 86400000).toISOString(),
      durationMinutes: 120,
    }));
  }

  async function enablePermission(maxSessions = 10) {
    await ClientBookingPermission.create({
      artistId,
      clientId,
      enabled: true,
      enabledBy: "artist",
      maxSessions,
    });
  }

  beforeEach(async () => {
    await seedBookableArtist(artistId, clientId);
  });

  test("400 when artistId is missing", async () => {
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({ sessions: sessions(2) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("artistId required");
  });

  test("400 when fewer than two sessions are provided", async () => {
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({ artistId, sessions: sessions(1) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("At least two sessions are required");
  });

  test("400 when more than twelve sessions are provided", async () => {
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({ artistId, sessions: sessions(13) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Too many sessions (max 12)");
  });

  test("400 Invalid session start for an unparseable date", async () => {
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        sessions: [
          { startISO: "not-a-date", durationMinutes: 120 },
          { startISO: new Date(Date.now() + 3 * 86400000).toISOString(), durationMinutes: 120 },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid session start");
  });

  test("403 bookings_disabled without permission", async () => {
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({ artistId, sessions: sessions(2), intake: VALID_INTAKE });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("bookings_disabled");
  });

  test("403 too_many_sessions when the count exceeds the approved max", async () => {
    await enablePermission(1);
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({ artistId, sessions: sessions(2), intake: VALID_INTAKE });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("too_many_sessions");
    expect(res.body.maxSessions).toBe(1);
  });

  test("400 intake_required when consent is incomplete", async () => {
    await enablePermission();
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({ artistId, sessions: sessions(2) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("intake_required");
  });

  test("creates a project with one booking per session", async () => {
    await enablePermission();
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({
        artistId,
        name: "Back piece",
        placement: "back",
        priceCents: 40000,
        sessions: sessions(3),
        intake: VALID_INTAKE,
      });
    expect(res.status).toBe(201);
    expect(res.body.project.estimatedSessions).toBe(3);
    expect(res.body.bookings).toHaveLength(3);
    expect(res.body.bookings[0].sessionNumber).toBe(1);
    expect(res.body.bookings.every((b) => b.status === "pending")).toBe(true);
  });

  test("409 artist_not_onboarded when the artist cannot receive payments", async () => {
    const naId = "ms-artist-na";
    await Artist.create({
      clerkId: naId,
      email: `${naId}@example.com`,
      username: "NoPay",
      handle: `@${naId}`,
      role: "artist",
    });
    await ClientBookingPermission.create({
      artistId: naId,
      clientId,
      enabled: true,
      enabledBy: "artist",
      maxSessions: 10,
    });
    const ss = Array.from({ length: 2 }, (_, i) => ({
      startISO: new Date(Date.now() + (i + 2) * 86400000).toISOString(),
      durationMinutes: 120,
    }));
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({ artistId: naId, sessions: ss, intake: VALID_INTAKE });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("artist_not_onboarded");
  });

  test("409 slot_conflict when a session overlaps an existing booking", async () => {
    await enablePermission();
    const ss = sessions(2);
    const conflictStart = new Date(ss[0].startISO);
    await Booking.create({
      artistId,
      clientId: "other",
      startAt: conflictStart,
      endAt: new Date(conflictStart.getTime() + 3600000),
      status: "accepted",
    });
    const res = await request(server)
      .post("/bookings/multi-session")
      .set("x-test-user-id", clientId)
      .send({ artistId, sessions: ss, intake: VALID_INTAKE });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("slot_conflict");
  });
});

conditionalDescribe("Booking Controller - accept/deny appointment", () => {
  const artistId = "ad-artist";
  const clientId = "ad-client";

  async function pending(extra = {}) {
    return Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() + 2 * 86400000),
      endAt: new Date(Date.now() + 2 * 86400000 + 3600000),
      status: "pending",
      appointmentType: "consultation",
      ...extra,
    });
  }

  test("404 when the booking does not exist", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/accept`)
      .set("x-test-user-id", artistId);
    expect(res.status).toBe(404);
  });

  test("403 when a non-artist tries to accept", async () => {
    const b = await pending();
    const res = await request(server)
      .post(`/bookings/${b._id}/accept`)
      .set("x-test-user-id", clientId);
    expect(res.status).toBe(403);
  });

  test("400 when accepting a non-pending booking", async () => {
    const b = await pending({ status: "accepted" });
    const res = await request(server)
      .post(`/bookings/${b._id}/accept`)
      .set("x-test-user-id", artistId);
    expect(res.status).toBe(400);
    expect(res.body.currentStatus).toBe("accepted");
  });

  test("the artist accepts a pending appointment", async () => {
    const b = await pending();
    const res = await request(server)
      .post(`/bookings/${b._id}/accept`)
      .set("x-test-user-id", artistId);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");
    expect(res.body.confirmedAt).toBeDefined();
  });

  test("403 when a stranger tries to deny", async () => {
    const b = await pending();
    const res = await request(server)
      .post(`/bookings/${b._id}/deny`)
      .set("x-test-user-id", "stranger");
    expect(res.status).toBe(403);
  });

  test("the artist denies a pending appointment", async () => {
    const b = await pending();
    const res = await request(server)
      .post(`/bookings/${b._id}/deny`)
      .set("x-test-user-id", artistId)
      .send({ reason: "Fully booked" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("denied");
    expect(res.body.cancelledBy).toBe("artist");
    expect(res.body.cancellationReason).toBe("Fully booked");
  });

  test("a client denial sets a booking cooldown", async () => {
    const b = await pending();
    const res = await request(server)
      .post(`/bookings/${b._id}/deny`)
      .set("x-test-user-id", clientId);
    expect(res.status).toBe(200);
    expect(res.body.cancelledBy).toBe("client");
    const cooldown = await BookingCooldown.findOne({
      userId: clientId,
      artistId,
    });
    expect(cooldown).not.toBeNull();
    expect(cooldown.bookingId.toString()).toBe(b._id.toString());
  });
});

conditionalDescribe("Booking Controller - resolveArtistNoShow (admin)", () => {
  const artistId = "ns-artist";
  const clientId = "ns-client";
  const adminId = "ns-admin";
  let prevAdminEnv;

  async function reportedBooking() {
    return Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 86400000),
      endAt: new Date(Date.now() - 86400000 + 3600000),
      status: "accepted",
      artistNoShowStatus: "reported",
      artistNoShowReportedAt: new Date(),
    });
  }

  beforeEach(() => {
    prevAdminEnv = process.env.ADMIN_CLERK_IDS;
    process.env.ADMIN_CLERK_IDS = adminId;
  });

  afterEach(() => {
    if (prevAdminEnv === undefined) delete process.env.ADMIN_CLERK_IDS;
    else process.env.ADMIN_CLERK_IDS = prevAdminEnv;
  });

  test("403 for a non-admin actor", async () => {
    const b = await reportedBooking();
    const res = await request(server)
      .post(`/bookings/${b._id}/no-show-disputes/resolve`)
      .set("x-test-user-id", clientId)
      .send({ refund: true });
    expect(res.status).toBe(403);
  });

  test("404 when the booking does not exist", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/no-show-disputes/resolve`)
      .set("x-test-user-id", adminId)
      .send({ refund: true });
    expect(res.status).toBe(404);
  });

  test("400 when there is no open report", async () => {
    const b = await Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 86400000),
      endAt: new Date(Date.now() - 86400000 + 3600000),
      status: "completed",
    });
    const res = await request(server)
      .post(`/bookings/${b._id}/no-show-disputes/resolve`)
      .set("x-test-user-id", adminId)
      .send({ refund: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("no_open_report");
  });

  test("an admin refund cancels the booking and refunds the deposit", async () => {
    const b = await reportedBooking();
    const res = await request(server)
      .post(`/bookings/${b._id}/no-show-disputes/resolve`)
      .set("x-test-user-id", adminId)
      .send({ refund: true });
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowStatus).toBe("refunded");
    expect(res.body.status).toBe("cancelled");
    expect(res.body.cancelledBy).toBe("system");
  });

  test("an admin dismissal marks the report dismissed without cancelling", async () => {
    const b = await reportedBooking();
    const res = await request(server)
      .post(`/bookings/${b._id}/no-show-disputes/resolve`)
      .set("x-test-user-id", adminId)
      .send({ refund: false });
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowStatus).toBe("dismissed");
    expect(res.body.status).toBe("accepted");
  });
});

conditionalDescribe("Booking Controller - listArtistNoShowDisputes (admin)", () => {
  const adminId = "dispute-admin";
  const artistId = "dispute-artist";
  const clientId = "dispute-client";
  let prevAdminEnv;

  beforeEach(() => {
    prevAdminEnv = process.env.ADMIN_CLERK_IDS;
    process.env.ADMIN_CLERK_IDS = adminId;
  });

  afterEach(() => {
    if (prevAdminEnv === undefined) delete process.env.ADMIN_CLERK_IDS;
    else process.env.ADMIN_CLERK_IDS = prevAdminEnv;
  });

  test("403 for a non-admin actor", async () => {
    const res = await request(server)
      .get("/bookings/no-show-disputes")
      .set("x-test-user-id", clientId);
    expect(res.status).toBe(403);
  });

  test("returns reported/disputed bookings enriched with client and artist", async () => {
    await mongoose.model("artist").create({ clerkId: artistId, email: "da@x.com", username: "DisputeArtist", handle: "@dispute-artist", role: "artist" });
    await mongoose.model("client").create({ clerkId: clientId, email: "dc@x.com", username: "DisputeClient", handle: "@dispute-client", role: "client" });

    await Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 86400000),
      endAt: new Date(Date.now() - 86400000 + 3600000),
      status: "accepted",
      artistNoShowStatus: "reported",
      artistNoShowReportedAt: new Date(),
    });
    await Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 2 * 86400000),
      endAt: new Date(Date.now() - 2 * 86400000 + 3600000),
      status: "accepted",
      artistNoShowStatus: "disputed",
      artistNoShowReportedAt: new Date(Date.now() - 1000),
    });
    await Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 3 * 86400000),
      endAt: new Date(Date.now() - 3 * 86400000 + 3600000),
      status: "completed",
    });

    const res = await request(server)
      .get("/bookings/no-show-disputes")
      .set("x-test-user-id", adminId);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].client.username).toBe("DisputeClient");
    expect(res.body.items[0].artist.username).toBe("DisputeArtist");
    expect(["reported", "disputed"]).toContain(res.body.items[0].artistNoShowStatus);
  });

  test("returns null client/artist when the users are missing", async () => {
    await Booking.create({
      artistId: "ghost-artist",
      clientId: "ghost-client",
      startAt: new Date(Date.now() - 86400000),
      endAt: new Date(Date.now() - 86400000 + 3600000),
      status: "accepted",
      artistNoShowStatus: "reported",
      artistNoShowReportedAt: new Date(),
    });

    const res = await request(server)
      .get("/bookings/no-show-disputes")
      .set("x-test-user-id", adminId);

    expect(res.status).toBe(200);
    expect(res.body.items[0].client).toBeNull();
    expect(res.body.items[0].artist).toBeNull();
  });
});

conditionalDescribe("Booking Controller - check-in", () => {
  const artistId = "ci-artist";
  const clientId = "ci-client";

  async function seed(over = {}) {
    return Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 30 * 60 * 1000),
      endAt: new Date(Date.now() + 30 * 60 * 1000),
      status: "accepted",
      appointmentType: "tattoo_session",
      ...over,
    });
  }

  test("404 for a missing booking", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/check-in`)
      .set("x-test-user-id", clientId);
    expect(res.status).toBe(404);
  });

  test("403 for a non-party", async () => {
    const b = await seed();
    const res = await request(server).post(`/bookings/${b._id}/check-in`).set("x-test-user-id", "stranger");
    expect(res.status).toBe(403);
  });

  test("400 invalid_status for a completed booking", async () => {
    const b = await seed({ status: "completed" });
    const res = await request(server).post(`/bookings/${b._id}/check-in`).set("x-test-user-id", clientId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_status");
  });

  test("400 too_early when more than an hour before start", async () => {
    const b = await seed({
      startAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });
    const res = await request(server).post(`/bookings/${b._id}/check-in`).set("x-test-user-id", clientId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("too_early");
  });

  test("400 window_closed long after the start time", async () => {
    const b = await seed({
      startAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      endAt: new Date(Date.now() - 47 * 60 * 60 * 1000),
    });
    const res = await request(server).post(`/bookings/${b._id}/check-in`).set("x-test-user-id", clientId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("window_closed");
  });

  test("client checks in with geo coordinates", async () => {
    const b = await seed();
    const res = await request(server)
      .post(`/bookings/${b._id}/check-in`)
      .set("x-test-user-id", clientId)
      .send({ lat: 40.7, lng: -73.9 });
    expect(res.status).toBe(200);
    const updated = await Booking.findById(b._id);
    expect(updated.clientCheckedInAt).toBeTruthy();
    expect(updated.clientCheckInGeo.lat).toBe(40.7);
  });

  test("artist checks in", async () => {
    const b = await seed();
    const res = await request(server).post(`/bookings/${b._id}/check-in`).set("x-test-user-id", artistId);
    expect(res.status).toBe(200);
    const updated = await Booking.findById(b._id);
    expect(updated.artistCheckedInAt).toBeTruthy();
  });
});

conditionalDescribe("Booking Controller - artist no-show report/respond", () => {
  const artistId = "ns-artist";
  const clientId = "ns-client";

  async function pastBooking(over = {}) {
    return Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() - 60 * 60 * 1000),
      status: "accepted",
      appointmentType: "tattoo_session",
      ...over,
    });
  }

  test("404 reporting a missing booking", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/artist-no-show`)
      .set("x-test-user-id", clientId);
    expect(res.status).toBe(404);
  });

  test("403 when a non-client reports the artist no-show", async () => {
    const b = await pastBooking();
    const res = await request(server).post(`/bookings/${b._id}/artist-no-show`).set("x-test-user-id", artistId);
    expect(res.status).toBe(403);
  });

  test("400 too_early reporting before the start time", async () => {
    const b = await pastBooking({
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    const res = await request(server).post(`/bookings/${b._id}/artist-no-show`).set("x-test-user-id", clientId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("too_early");
  });

  test("400 invalid_status reporting a completed booking", async () => {
    const b = await pastBooking({ status: "completed" });
    const res = await request(server).post(`/bookings/${b._id}/artist-no-show`).set("x-test-user-id", clientId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_status");
  });

  test("client reports the no-show and the booking is flagged", async () => {
    const b = await pastBooking();
    const res = await request(server)
      .post(`/bookings/${b._id}/artist-no-show`)
      .set("x-test-user-id", clientId)
      .send({ reason: "Artist never came" });
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowStatus).toBe("reported");
    const updated = await Booking.findById(b._id);
    expect(updated.artistNoShowReason).toBe("Artist never came");
    expect(updated.artistNoShowReportedAt).toBeTruthy();
  });

  test("a duplicate report is a no-op and returns the existing booking", async () => {
    const b = await pastBooking({ artistNoShowReportedAt: new Date(), artistNoShowStatus: "reported" });
    const res = await request(server).post(`/bookings/${b._id}/artist-no-show`).set("x-test-user-id", clientId);
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowStatus).toBe("reported");
  });

  test("403 when a non-artist responds to a report", async () => {
    const b = await pastBooking({ artistNoShowStatus: "reported", artistNoShowReportedAt: new Date() });
    const res = await request(server)
      .post(`/bookings/${b._id}/artist-no-show/respond`)
      .set("x-test-user-id", clientId)
      .send({ accept: true });
    expect(res.status).toBe(403);
  });

  test("400 no_open_report when responding without an open report", async () => {
    const b = await pastBooking();
    const res = await request(server)
      .post(`/bookings/${b._id}/artist-no-show/respond`)
      .set("x-test-user-id", artistId)
      .send({ accept: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("no_open_report");
  });

  test("artist accepts the report: booking cancelled, deposit refunded", async () => {
    const b = await pastBooking({ artistNoShowStatus: "reported", artistNoShowReportedAt: new Date(), depositPaidCents: 1000 });
    const res = await request(server)
      .post(`/bookings/${b._id}/artist-no-show/respond`)
      .set("x-test-user-id", artistId)
      .send({ accept: true });
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowStatus).toBe("refunded");
    expect(res.body.status).toBe("cancelled");
    expect(res.body.cancelledBy).toBe("artist");
  });

  test("artist disputes the report with a note", async () => {
    const b = await pastBooking({ artistNoShowStatus: "reported", artistNoShowReportedAt: new Date() });
    const res = await request(server)
      .post(`/bookings/${b._id}/artist-no-show/respond`)
      .set("x-test-user-id", artistId)
      .send({ accept: false, note: "I was there on time" });
    expect(res.status).toBe(200);
    expect(res.body.artistNoShowStatus).toBe("disputed");
    const updated = await Booking.findById(b._id);
    expect(updated.artistNoShowArtistNote).toBe("I was there on time");
  });
});

conditionalDescribe("Booking Controller - completeBooking", () => {
  const artistId = "cb-artist";
  const clientId = "cb-client";

  async function seed(over = {}) {
    return Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() - 60 * 60 * 1000),
      status: "accepted",
      appointmentType: "tattoo_session",
      priceCents: 20000,
      depositPaidCents: 20000,
      ...over,
    });
  }

  test("404 for a missing booking", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/complete`)
      .set("x-test-user-id", artistId);
    expect(res.status).toBe(404);
  });

  test("403 when a non-artist tries to complete", async () => {
    const b = await seed();
    const res = await request(server).post(`/bookings/${b._id}/complete`).set("x-test-user-id", clientId);
    expect(res.status).toBe(403);
  });

  test("returns the booking unchanged if already completed", async () => {
    const b = await seed({ status: "completed", completedAt: new Date() });
    const res = await request(server).post(`/bookings/${b._id}/complete`).set("x-test-user-id", artistId);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });

  test("409 for a cancelled booking", async () => {
    const b = await seed({ status: "cancelled" });
    const res = await request(server).post(`/bookings/${b._id}/complete`).set("x-test-user-id", artistId);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("invalid_status");
  });

  test("400 verification_required when both parties have not confirmed", async () => {
    const b = await seed();
    const res = await request(server).post(`/bookings/${b._id}/complete`).set("x-test-user-id", artistId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("verification_required");
  });

  test("completes when both parties are verified", async () => {
    const b = await seed({ clientVerifiedAt: new Date(), artistVerifiedAt: new Date() });
    const res = await request(server).post(`/bookings/${b._id}/complete`).set("x-test-user-id", artistId);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
    const updated = await Booking.findById(b._id);
    expect(updated.completedAt).toBeTruthy();
  });
});

conditionalDescribe("Booking Controller - verify completes when both codes match", () => {
  const artistId = "vc-artist";
  const clientId = "vc-client";

  test("both verifications mark the booking completed", async () => {
    const b = await Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(),
      status: "accepted",
      appointmentType: "tattoo_session",
      priceCents: 20000,
      depositPaidCents: 20000,
      clientCode: "CCODE1",
      artistCode: "ACODE1",
      clientVerifiedAt: new Date(),
      codeExpiresAt: new Date(Date.now() + 60000),
    });

    const res = await request(server)
      .post(`/bookings/${b._id}/verify`)
      .set("x-test-user-id", artistId)
      .send({ role: "artist", code: "acode1" });

    expect(res.status).toBe(200);
    const updated = await Booking.findById(b._id);
    expect(updated.artistVerifiedAt).toBeTruthy();
    expect(updated.status).toBe("completed");
    expect(updated.completedAt).toBeTruthy();
  });

  test("verify 404 for a missing booking", async () => {
    const res = await request(server)
      .post(`/bookings/${new mongoose.Types.ObjectId()}/verify`)
      .set("x-test-user-id", artistId)
      .send({ role: "artist", code: "x" });
    expect(res.status).toBe(404);
  });

  test("verify 400 on a cancelled booking", async () => {
    const b = await Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(),
      status: "cancelled",
      appointmentType: "tattoo_session",
      clientCode: "CCODE1",
      codeExpiresAt: new Date(Date.now() + 60000),
    });
    const res = await request(server)
      .post(`/bookings/${b._id}/verify`)
      .set("x-test-user-id", clientId)
      .send({ role: "client", code: "CCODE1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("booking_cancelled");
  });
});

conditionalDescribe("Booking Controller - updateBookingTime success", () => {
  const artistId = "ut-artist";
  const clientId = "ut-client";

  test("404 for a missing booking", async () => {
    const res = await request(server)
      .patch(`/bookings/${new mongoose.Types.ObjectId()}/time`)
      .set("x-test-user-id", artistId)
      .send({ startISO: new Date(Date.now() + 86400000).toISOString(), endISO: new Date(Date.now() + 90000000).toISOString() });
    expect(res.status).toBe(404);
  });

  test("400 when the booking is cancelled", async () => {
    const b = await Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() + 3 * 86400000),
      endAt: new Date(Date.now() + 3 * 86400000 + 3600000),
      status: "cancelled",
      appointmentType: "consultation",
    });
    const res = await request(server)
      .patch(`/bookings/${b._id}/time`)
      .set("x-test-user-id", artistId)
      .send({ startISO: new Date(Date.now() + 86400000).toISOString(), endISO: new Date(Date.now() + 90000000).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("booking_cancelled");
  });

  test("moves the time within default availability", async () => {
    const b = await Booking.create({
      artistId,
      clientId,
      startAt: new Date(Date.now() + 3 * 86400000),
      endAt: new Date(Date.now() + 3 * 86400000 + 3600000),
      status: "accepted",
      appointmentType: "consultation",
    });

    const target = new Date(Date.now() + 5 * 86400000);
    target.setUTCHours(16, 0, 0, 0);
    const start = new Date(target);
    const end = new Date(target.getTime() + 60 * 60 * 1000);

    const res = await request(server)
      .patch(`/bookings/${b._id}/time`)
      .set("x-test-user-id", artistId)
      .send({ startISO: start.toISOString(), endISO: end.toISOString() });

    expect([200, 409]).toContain(res.status);
    if (res.status === 200) {
      const updated = await Booking.findById(b._id);
      expect(new Date(updated.startAt).getTime()).toBe(start.getTime());
    } else {
      expect(["outside_availability", "conflict"]).toContain(res.body.error);
    }
  });
});
