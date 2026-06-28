import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import "../../models/Client.js";
import "../../models/Artist.js";
import Billing from "../../models/Billing.js";
import Booking from "../../models/Booking.js";
import {
  getDashboardData,
  getArtistAnalytics,
} from "../../controllers/dashboardController.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

const noAuth = (req, res, next) => {
  req.user = {};
  req.auth = {};
  next();
};

app.get("/dashboard", mockAuth, getDashboardData);
app.get("/analytics", mockAuth, getArtistAnalytics);
app.get("/analytics-noauth", noAuth, getArtistAnalytics);

const conditionalDescribe = process.env.DATABASE_AVAILABLE === 'true' ? describe : describe.skip;

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

conditionalDescribe("Dashboard Controller - getDashboardData", () => {
  test("should return user and featured artists", async () => {
    const userId = "test-user-id";

    await mongoose.model("client").create({
      clerkId: userId,
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    await mongoose.model("artist").create([
      {
        clerkId: "artist-1",
        email: "artist1@example.com",
        username: "Artist 1",
        handle: "@artist1",
        role: "artist",
        rating: 4.8,
      },
      {
        clerkId: "artist-2",
        email: "artist2@example.com",
        username: "Artist 2",
        handle: "@artist2",
        role: "artist",
        rating: 4.5,
      },
      {
        clerkId: "artist-3",
        email: "artist3@example.com",
        username: "Artist 3",
        handle: "@artist3",
        role: "artist",
        rating: 4.9,
      },
    ]);

    const response = await request(server)
      .get("/dashboard")
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.clerkId).toBe(userId);
    expect(response.body.featuredArtists).toBeDefined();
    expect(Array.isArray(response.body.featuredArtists)).toBe(true);
    expect(response.body.featuredArtists.length).toBeLessThanOrEqual(5);
  });

  test("should return featured artists sorted by rating", async () => {
    const userId = "test-user-2";

    await mongoose.model("client").create({
      clerkId: userId,
      email: "test2@example.com",
      username: "testuser2",
      handle: "@testuser2",
      role: "client",
    });

    await mongoose.model("artist").create([
      {
        clerkId: "artist-low",
        email: "low@example.com",
        username: "Low Rating",
        handle: "@lowrating",
        role: "artist",
        rating: 3.5,
      },
      {
        clerkId: "artist-high",
        email: "high@example.com",
        username: "High Rating",
        handle: "@highrating",
        role: "artist",
        rating: 4.9,
      },
      {
        clerkId: "artist-mid",
        email: "mid@example.com",
        username: "Mid Rating",
        handle: "@midrating",
        role: "artist",
        rating: 4.0,
      },
    ]);

    const response = await request(server)
      .get("/dashboard")
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.featuredArtists.length).toBeGreaterThan(0);

    const ratings = response.body.featuredArtists.map((a) => a.rating);
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i - 1]).toBeGreaterThanOrEqual(ratings[i]);
    }
  });

  test("should return 404 when user not found", async () => {
    const response = await request(server)
      .get("/dashboard")
      .set("x-test-user-id", "nonexistent-user-id");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("User not found");
  });

  test("should limit featured artists to 5", async () => {
    const userId = "test-user-3";

    await mongoose.model("client").create({
      clerkId: userId,
      email: "test3@example.com",
      username: "testuser3",
      handle: "@testuser3",
      role: "client",
    });

    const artists = Array.from({ length: 10 }, (_, i) => ({
      clerkId: `artist-${i}`,
      email: `artist${i}@example.com`,
      username: `Artist ${i}`,
      handle: `@artist${i}`,
      role: "artist",
      rating: 4.0 + i * 0.1,
    }));

    await mongoose.model("artist").insertMany(artists);

    const response = await request(server)
      .get("/dashboard")
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.featuredArtists.length).toBeLessThanOrEqual(5);
  });

  test("should return 500 when a DB error occurs", async () => {
    const spy = jest
      .spyOn(mongoose.model("User"), "findOne")
      .mockImplementationOnce(() => {
        throw new Error("boom");
      });

    const response = await request(server)
      .get("/dashboard")
      .set("x-test-user-id", "any-user");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Error fetching dashboard data");

    spy.mockRestore();
  });
});

conditionalDescribe("Dashboard Controller - getArtistAnalytics", () => {
  test("should return 401 when there is no auth identity", async () => {
    const response = await request(server).get("/analytics-noauth");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("should return 403 when the user is not an artist", async () => {
    const response = await request(server)
      .get("/analytics")
      .set("x-test-user-id", "not-an-artist");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Artists only");
  });

  test("should compute analytics, tier, completion rate, and earnings", async () => {
    const artistId = "analytics-artist";

    await mongoose.model("artist").create({
      clerkId: artistId,
      email: "analytics@example.com",
      username: "Analytics Artist",
      handle: "@analyticsartist",
      role: "artist",
      rating: 4.7,
      reviewsCount: 12,
      bookingsCount: 30,
      payoutSpeed: "two_day",
    });

    const baseBooking = {
      clientId: "some-client",
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
    };
    await Booking.create([
      { ...baseBooking, artistId, status: "completed" },
      { ...baseBooking, artistId, status: "completed" },
      { ...baseBooking, artistId, status: "completed" },
      { ...baseBooking, artistId, status: "no-show" },
      { ...baseBooking, artistId, status: "cancelled" },
      { ...baseBooking, artistId, status: "pending" },
    ]);

    await Billing.create([
      {
        artistId,
        clientId: "some-client",
        status: "paid",
        transfers: [
          { kind: "artist", amountCents: 5000 },
          { kind: "studio", amountCents: 1000 },
        ],
      },
      {
        artistId,
        clientId: "some-client",
        status: "paid",
        transfers: [{ kind: "artist", amountCents: 2500 }],
      },
      {
        artistId,
        clientId: "some-client",
        status: "pending",
        transfers: [{ kind: "artist", amountCents: 9999 }],
      },
    ]);

    const response = await request(server)
      .get("/analytics")
      .set("x-test-user-id", artistId);

    expect(response.status).toBe(200);
    expect(response.body.rating).toBe(4.7);
    expect(response.body.reviewsCount).toBe(12);
    expect(response.body.bookingsCount).toBe(30);
    expect(response.body.bookings.total).toBe(6);
    expect(response.body.bookings.completed).toBe(3);
    expect(response.body.bookings.noShow).toBe(1);
    expect(response.body.bookings.cancelled).toBe(1);
    expect(response.body.bookings.completionRate).toBeCloseTo(0.75);
    expect(response.body.earnings.paidOutCents).toBe(7500);
    expect(response.body.payoutSpeed).toBe("two_day");
    expect(response.body.tier).toBeDefined();
    expect(response.body.tier.key).toBe("pro");
    expect(response.body.tier.verified).toBe(true);
  });

  test("should default completion rate to 0 with no finished bookings", async () => {
    const artistId = "no-bookings-artist";

    await mongoose.model("artist").create({
      clerkId: artistId,
      email: "nobookings@example.com",
      username: "No Bookings",
      handle: "@nobookings",
      role: "artist",
    });

    const response = await request(server)
      .get("/analytics")
      .set("x-test-user-id", artistId);

    expect(response.status).toBe(200);
    expect(response.body.bookings.total).toBe(0);
    expect(response.body.bookings.completionRate).toBe(0);
    expect(response.body.earnings.paidOutCents).toBe(0);
    expect(response.body.rating).toBe(0);
    expect(response.body.reviewsCount).toBe(0);
    expect(response.body.bookingsCount).toBe(0);
    expect(response.body.payoutSpeed).toBe("instant");
    expect(response.body.tier.key).toBe("rising");
    expect(response.body.tier.verified).toBe(false);
  });

  test("should return 500 when analytics aggregation fails", async () => {
    const artistId = "agg-fail-artist";

    await mongoose.model("artist").create({
      clerkId: artistId,
      email: "aggfail@example.com",
      username: "Agg Fail",
      handle: "@aggfail",
      role: "artist",
    });

    const spy = jest
      .spyOn(Billing, "aggregate")
      .mockImplementationOnce(() => {
        throw new Error("aggregate boom");
      });

    const response = await request(server)
      .get("/analytics")
      .set("x-test-user-id", artistId);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch analytics");

    spy.mockRestore();
  });
});