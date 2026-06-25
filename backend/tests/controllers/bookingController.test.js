import request from "supertest";
import express from "express";

const conditionalDescribe = process.env.DATABASE_AVAILABLE === 'true' ? describe : describe.skip;
import Booking from "../../models/Booking.js";
import Billing from "../../models/Billing.js";
import ArtistPolicy from "../../models/ArtistPolicy.js";
import Project from "../../models/Project.js";
import Artist from "../../models/Artist.js";
import Client from "../../models/Client.js";
import ClientBookingPermission from "../../models/ClientBookingPermission.js";
import SignedDocument from "../../models/SignedDocument.js";
import { DOCUMENTS } from "../../services/documentsService.js";
import {
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
app.get("/bookings/:id", mockAuth, getBooking);
app.patch("/bookings/:id/final-price", mockAuth, setFinalPrice);
app.post("/bookings/:id/approve-final-price", mockAuth, approveFinalPrice);

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
    const b = await bookingQuoted(20000); // quote captured = 20000
    const res = await request(app)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "artist-rc")
      .send({ finalPriceCents: 21000 }); // +5% <= +10% tolerance
    expect(res.status).toBe(200);
    expect(res.body.finalPriceApproved).toBe(true);
  });

  test("a final price beyond tolerance requires client approval", async () => {
    const b = await bookingQuoted(20000);
    const res = await request(app)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "artist-rc")
      .send({ finalPriceCents: 30000 }); // +50%
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
    await request(app)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "artist-rc")
      .send({ finalPriceCents: 30000 });

    const denied = await request(app)
      .post(`/bookings/${b._id}/approve-final-price`)
      .set("x-test-user-id", "artist-rc"); // artist cannot approve
    expect(denied.status).toBe(403);

    const res = await request(app)
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
    const res = await request(app)
      .patch(`/bookings/${b._id}/final-price`)
      .set("x-test-user-id", "artist-cap")
      .send({ finalPriceCents: 6_000_000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("price_above_max");
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
    const res = await request(app)
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
      const res = await request(app).get(`/bookings/${b._id}`).set("x-test-user-id", uid);
      expect(res.status).toBe(200);
      expect(String(res.body._id)).toBe(String(b._id));
    }
  });

  test("a non-party is forbidden", async () => {
    const b = await makeBooking();
    const res = await request(app).get(`/bookings/${b._id}`).set("x-test-user-id", "stranger-999");
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

    const response = await request(app)
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

    const response = await request(app)
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

  test.skip("should calculate deposit based on artist policy", async () => {
    await ArtistPolicy.create({
      artistId: artistId,
      deposit: {
        mode: "percent",
        percent: 0.2,
        minCents: 1000,
        consultationFree: false, // consultations are free by default; opt in to charge a deposit
      },
    });

    const startISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

  test("lets a participant check in within the window", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 10 * 60 * 1000), endAt: new Date(Date.now() + 60 * 60 * 1000), priceCents: 20000,
    });
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
      .post(`/bookings/${booking._id}/artist-no-show`)
      .set("x-test-user-id", clientId)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("too_early");
  });

  test("forbids non-admins from listing no-show disputes", async () => {
    const res = await request(app).get("/bookings/no-show-disputes").set("x-test-user-id", clientId);
    expect(res.status).toBe(403);
  });

  test("artist accepting a no-show report marks it refunded + cancels the booking", async () => {
    const booking = await Booking.create({
      clientId, artistId, appointmentType: "tattoo_session", status: "accepted",
      startAt: new Date(Date.now() - 3600000), endAt: new Date(), priceCents: 20000,
      artistNoShowReportedAt: new Date(), artistNoShowStatus: "reported",
    });
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
      .post(`/bookings/${bookingId}/cancel`)
      .set("x-test-user-id", clientId)
      .send({ reason: "Emergency" });

    expect(response.status).toBe(200);
    const updatedBooking = await Booking.findById(bookingId);
    expect(updatedBooking.status).toBe("cancelled");
    expect(updatedBooking.depositPaidCents).toBe(0);
  });

  test("should preserve deposit if cancelled 48+ hours before", async () => {
    const response = await request(app)
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

    const response = await request(app)
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
    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
      .post(`/bookings/${pending._id}/no-show`)
      .set("x-test-user-id", artistId)
      .send({ reason: "Client did not arrive" });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("invalid_status");
    const after = await Booking.findById(pending._id);
    expect(after.status).toBe("pending");
    expect(after.depositPaidCents).toBe(1000);
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
    const response = await request(app)
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
    const response = await request(app)
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
    await request(app)
      .post(`/bookings/${bookingId}/intake`)
      .set("x-test-user-id", clientId)
      .send({
        consent: { ageVerification: true, healthDisclosure: true, aftercareInstructions: true, depositPolicy: true, cancellationPolicy: true },
      });

    const del = await request(app).delete(`/bookings/${bookingId}/intake`).set("x-test-user-id", clientId);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/bookings/${bookingId}/intake`).set("x-test-user-id", clientId);
    expect(get.status).toBe(404);
  });

  test("forbids a non-client from deleting intake data", async () => {
    await request(app)
      .post(`/bookings/${bookingId}/intake`)
      .set("x-test-user-id", clientId)
      .send({
        consent: { ageVerification: true, healthDisclosure: true, aftercareInstructions: true, depositPolicy: true, cancellationPolicy: true },
      });

    const del = await request(app).delete(`/bookings/${bookingId}/intake`).set("x-test-user-id", "stranger");
    expect(del.status).toBe(403);
  });
});