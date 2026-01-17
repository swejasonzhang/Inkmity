import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import "../../models/Client.js";
import "../../models/Artist.js";
import { getDashboardData } from "../../controllers/dashboardController.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

app.get("/dashboard", mockAuth, getDashboardData);

const conditionalDescribe = process.env.DATABASE_AVAILABLE === 'true' ? describe : describe.skip;

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

    const response = await request(app)
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

    const response = await request(app)
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
    const response = await request(app)
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

    const response = await request(app)
      .get("/dashboard")
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.featuredArtists.length).toBeLessThanOrEqual(5);
  });
});