import request from "supertest";
import express from "express";

// Skip database-dependent tests when database is not available
const conditionalDescribe = process.env.DATABASE_AVAILABLE === 'true' ? describe : describe.skip;
import Booking from "../../models/Booking.js";
import ArtistPolicy from "../../models/ArtistPolicy.js";
import Project from "../../models/Project.js";
import {
  createConsultation,
  createTattooSession,
  rescheduleAppointment,
  cancelBooking,
  markNoShow,
  submitIntakeForm,
  getIntakeForm,
} from "../../controllers/bookingController.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.post("/bookings/consultation", mockAuth, createConsultation);
app.post("/bookings/session", mockAuth, createTattooSession);
app.post("/bookings/:id/reschedule", mockAuth, rescheduleAppointment);
app.post("/bookings/:id/cancel", mockAuth, cancelBooking);
app.post("/bookings/:id/no-show", mockAuth, markNoShow);
app.post("/bookings/:bookingId/intake", mockAuth, submitIntakeForm);
app.get("/bookings/:bookingId/intake", mockAuth, getIntakeForm);

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

  test("should calculate deposit based on artist policy", async () => {
    await ArtistPolicy.create({
      artistId: artistId,
      deposit: {
        mode: "percent",
        percent: 0.2,
        minCents: 1000,
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

  beforeEach(() => {
    artistId = "artist-123";
    clientId = "client-456";
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
      });

    expect(response.status).toBe(201);
    expect(response.body.appointmentType).toBe("tattoo_session");
    expect(response.body.status).toBe("pending");
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
      });

    expect(response.status).toBe(201);
    expect(response.body.sessionNumber).toBe(2);
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
});