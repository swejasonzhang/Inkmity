import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import "../../models/Client.js";
import "../../models/Artist.js";
import {
  createConsultation,
  createTattooSession,
} from "../../controllers/bookingController.js";
import { getArtists } from "../../controllers/userController.js";
import { getAvailability } from "../../controllers/availabilityController.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.post("/bookings/consultation", mockAuth, createConsultation);
app.post("/bookings/session", mockAuth, createTattooSession);
app.get("/users/artists", getArtists);
app.get("/availability/:artistId", getAvailability);

describe("Load Testing - Concurrent Requests", () => {
  let artistId;
  let clientId;

  beforeEach(async () => {
    artistId = "artist-load-test";
    clientId = "client-load-test";

    await mongoose.model("artist").create({
      clerkId: artistId,
      email: "artist@example.com",
      username: "Load Test Artist",
      handle: "@loadtestartist",
      role: "artist",
    });

    await mongoose.model("client").create({
      clerkId: clientId,
      email: "client@example.com",
      username: "Load Test Client",
      handle: "@loadtestclient",
      role: "client",
    });
  });

  test("should handle 100 concurrent artist queries", async () => {
    const CONCURRENT_REQUESTS = 100;
    const startTime = Date.now();

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      request(app).get("/users/artists").query({ page: 1, pageSize: 10 })
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    expect(duration).toBeLessThan(5000);

    console.log(`✓ Handled ${CONCURRENT_REQUESTS} concurrent requests in ${duration}ms`);
    console.log(`  Average: ${(duration / CONCURRENT_REQUESTS).toFixed(2)}ms per request`);
  });

  test("should handle 50 concurrent booking creations", async () => {
    const CONCURRENT_REQUESTS = 50;
    const startTime = Date.now();

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => {
      const startISO = new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000).toISOString();
      return request(app)
        .post("/bookings/consultation")
        .set("x-test-user-id", clientId)
        .send({
          artistId,
          startISO,
          durationMinutes: 30,
          priceCents: 5000,
        });
    });

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successCount = responses.filter((r) => r.status === 201).length;
    expect(successCount).toBeGreaterThan(CONCURRENT_REQUESTS * 0.8);

    expect(duration).toBeLessThan(10000);

    console.log(`✓ Handled ${CONCURRENT_REQUESTS} concurrent bookings: ${successCount} succeeded in ${duration}ms`);
  });

  test("should handle rapid sequential requests", async () => {
    const SEQUENTIAL_REQUESTS = 200;
    const startTime = Date.now();
    const responses = [];

    for (let i = 0; i < SEQUENTIAL_REQUESTS; i++) {
      const response = await request(app)
        .get("/users/artists")
        .query({ page: 1, pageSize: 10 });
      responses.push(response);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    expect(duration).toBeLessThan(10000);

    console.log(`✓ Handled ${SEQUENTIAL_REQUESTS} sequential requests in ${duration}ms`);
    console.log(`  Average: ${(duration / SEQUENTIAL_REQUESTS).toFixed(2)}ms per request`);
  });

  test("should handle mixed load pattern", async () => {
    const READ_REQUESTS = 50;
    const WRITE_REQUESTS = 20;
    const startTime = Date.now();

    const readPromises = Array.from({ length: READ_REQUESTS }, () =>
      request(app).get("/users/artists").query({ page: 1, pageSize: 10 })
    );

    const writePromises = Array.from({ length: WRITE_REQUESTS }, (_, i) => {
      const startISO = new Date(Date.now() + (i + 10) * 24 * 60 * 60 * 1000).toISOString();
      return request(app)
        .post("/bookings/consultation")
        .set("x-test-user-id", clientId)
        .send({
          artistId,
          startISO,
          durationMinutes: 30,
          priceCents: 5000,
        });
    });

    const [readResponses, writeResponses] = await Promise.all([
      Promise.all(readPromises),
      Promise.all(writePromises),
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    readResponses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    const writeSuccessCount = writeResponses.filter((r) => r.status === 201).length;
    expect(writeSuccessCount).toBeGreaterThan(WRITE_REQUESTS * 0.8);

    expect(duration).toBeLessThan(8000);

    console.log(`✓ Mixed load: ${READ_REQUESTS} reads + ${WRITE_REQUESTS} writes in ${duration}ms`);
  });
});

describe("Performance Testing - Response Times", () => {
  beforeEach(async () => {
    await mongoose.model("artist").create([
      {
        clerkId: "artist-1",
        email: "artist1@example.com",
        username: "Artist 1",
        handle: "@artist1",
        role: "artist",
        location: "City1",
        rating: 4.5,
      },
      {
        clerkId: "artist-2",
        email: "artist2@example.com",
        username: "Artist 2",
        handle: "@artist2",
        role: "artist",
        location: "City2",
        rating: 4.8,
      },
    ]);
  });

  test("getArtists should respond within 500ms", async () => {
    const startTime = Date.now();
    const response = await request(app)
      .get("/users/artists")
      .query({ page: 1, pageSize: 10 });
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });

  test("getAvailability should respond within 300ms", async () => {
    const artistId = "artist-1";
    const startTime = Date.now();
    const response = await request(app).get(`/availability/${artistId}`);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(300);
  });
});

describe("Scalability Testing - Large Datasets", () => {
  test("should handle pagination with large result set", async () => {
    const artists = Array.from({ length: 100 }, (_, i) => ({
      clerkId: `artist-${i}`,
      email: `artist${i}@example.com`,
      username: `Artist ${i}`,
      handle: `@artist${i}`,
      role: "artist",
      location: `City${i % 10}`,
      rating: 4 + (i % 10) / 10,
    }));

    await mongoose.model("artist").insertMany(artists);

    const startTime = Date.now();
    const response = await request(app)
      .get("/users/artists")
      .query({ page: 1, pageSize: 50 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(50);
    expect(response.body.total).toBe(100);
    expect(duration).toBeLessThan(1000);

    console.log(`✓ Paginated 100 artists in ${duration}ms`);
  });
});
