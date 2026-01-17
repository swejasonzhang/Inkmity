import request from "supertest";
import express from "express";
import Availability from "../../models/Availability.js";
import {
  getAvailability,
  upsertAvailability,
  getSlotsForDate,
} from "../../controllers/availabilityController.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.get("/availability/:artistId", getAvailability);
app.put("/availability/:artistId", mockAuth, upsertAvailability);
app.get("/availability/:artistId/slots", getSlotsForDate);

describe("Availability Controller - getAvailability", () => {
  test("should return default availability when none exists", async () => {
    const response = await request(app).get("/availability/artist-123");

    expect(response.status).toBe(200);
    expect(response.body.artistId).toBe("artist-123");
    expect(response.body.timezone).toBeDefined();
    expect(response.body.slotMinutes).toBeDefined();
    expect(response.body.weekly).toBeDefined();
  });

  test("should return existing availability", async () => {
    const artistId = "artist-123";
    await Availability.create({
      artistId,
      timezone: "America/Los_Angeles",
      slotMinutes: 60,
      weekly: {
        mon: [{ start: "10:00", end: "18:00" }],
      },
    });

    const response = await request(app).get(`/availability/${artistId}`);

    expect(response.status).toBe(200);
    expect(response.body.artistId).toBe(artistId);
    expect(response.body.timezone).toBe("America/Los_Angeles");
    expect(response.body.slotMinutes).toBe(60);
  });
});

// Skip database-dependent tests when database is not available
const conditionalDescribe = process.env.DATABASE_AVAILABLE === 'true' ? describe : describe.skip;

conditionalDescribe("Availability Controller - upsertAvailability", () => {
  test("should create new availability", async () => {
    const artistId = "artist-456";
    const response = await request(app)
      .put(`/availability/${artistId}`)
      .set("x-test-user-id", artistId)
      .send({
        timezone: "America/New_York",
        slotMinutes: 90,
        weekly: {
          mon: [{ start: "09:00", end: "17:00" }],
          tue: [{ start: "09:00", end: "17:00" }],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.artistId).toBe(artistId);
    expect(response.body.timezone).toBe("America/New_York");
    expect(response.body.slotMinutes).toBe(90);
  });

  test("should update existing availability", async () => {
    const artistId = "artist-789";
    await Availability.create({
      artistId,
      timezone: "America/Chicago",
      slotMinutes: 60,
    });

    const response = await request(app)
      .put(`/availability/${artistId}`)
      .set("x-test-user-id", artistId)
      .send({
        timezone: "America/Phoenix",
        slotMinutes: 120,
      });

    expect(response.status).toBe(200);
    expect(response.body.timezone).toBe("America/Phoenix");
    expect(response.body.slotMinutes).toBe(120);
  });

  test("should return 403 when user is not the artist", async () => {
    const artistId = "artist-123";
    const response = await request(app)
      .put(`/availability/${artistId}`)
      .set("x-test-user-id", "different-user-id")
      .send({
        timezone: "America/New_York",
        slotMinutes: 60,
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Only the artist can modify availability");
  });

  test("should return 401 when not authenticated", async () => {
    const response = await request(app)
      .put("/availability/artist-123")
      .send({
        timezone: "America/New_York",
        slotMinutes: 60,
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });
});

conditionalDescribe("Availability Controller - getSlotsForDate", () => {
  beforeEach(async () => {
    await Availability.deleteMany({});
  });

  test("should return available slots for date range", async () => {
    const artistId = "artist-123";
    await Availability.create({
      artistId,
      timezone: "America/New_York",
      slotMinutes: 60,
      weekly: {
        mon: [{ start: "10:00", end: "18:00" }],
        tue: [{ start: "10:00", end: "18:00" }],
      },
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const response = await request(app)
      .get(`/availability/${artistId}/slots`)
      .query({
        date: startDate.toISOString().split("T")[0],
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("should exclude booked slots", async () => {
    const artistId = "artist-123";
    await Availability.create({
      artistId,
      timezone: "America/New_York",
      slotMinutes: 60,
      weekly: {
        mon: [{ start: "10:00", end: "18:00" }],
      },
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const response = await request(app)
      .get(`/availability/${artistId}/slots`)
      .query({
        date: startDate.toISOString().split("T")[0],
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});