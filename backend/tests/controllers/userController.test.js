import request from "supertest";
import express from "express";

const conditionalDescribe = process.env.DATABASE_AVAILABLE === 'true' ? describe : describe.skip;
import mongoose from "mongoose";
import "../../models/UserBase.js";
import "../../models/Client.js";
import "../../models/Artist.js";
import "../../models/StudioAccount.js";
import "../../models/Studio.js";
import "../../models/Review.js";
import {
  getMe,
  updateMyAvatar,
  deleteMyAvatar,
  updateMyBio,
  getMyDefaultBio,
  updateMyVisibility,
  syncUser,
  getArtists,
  getArtistById,
  getArtistByHandle,
  checkHandleAvailability,
  saveMyPortfolio,
  getAvatarSignature,
  getReferenceSignature,
  saveMyReferences,
} from "../../controllers/userController.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

const appWithAuth = express();
appWithAuth.use(express.json());
appWithAuth.get("/users/me", mockAuth, getMe);

const appWithoutAuth = express();
appWithoutAuth.use(express.json());
appWithoutAuth.get("/users/me", getMe);

app.get("/users/me", mockAuth, getMe);
app.put("/users/me/avatar", mockAuth, updateMyAvatar);
app.delete("/users/me/avatar", mockAuth, deleteMyAvatar);
app.put("/users/me/bio", mockAuth, updateMyBio);
app.get("/users/me/bio/default", mockAuth, getMyDefaultBio);
app.put("/users/me/visibility", mockAuth, updateMyVisibility);
app.post("/users/sync", mockAuth, syncUser);
app.get("/users/artists", getArtists);
app.get("/users/artists/:id", getArtistById);
app.get("/users/artist-handle/:handle", getArtistByHandle);
app.get("/users/handle/check", checkHandleAvailability);
app.put("/users/me/portfolio", mockAuth, saveMyPortfolio);
app.get("/users/avatar-signature", mockAuth, getAvatarSignature);
app.get("/users/reference-signature", mockAuth, getReferenceSignature);
app.put("/users/me/references", mockAuth, saveMyReferences);

const appNoAuth = express();
appNoAuth.use(express.json());
appNoAuth.get("/users/me", getMe);

let server;
let serverNoAuth;
beforeAll(() => {
  server = app.listen(0);
  serverNoAuth = appNoAuth.listen(0);
});
afterAll((done) => {
  server.close(() => serverNoAuth.close(done));
});

conditionalDescribe("User Controller - getMe", () => {
  test("should return user data for authenticated user", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(server)
      .get("/users/me")
      .set("x-test-user-id", "test-user-id");

    expect(response.status).toBe(200);
    expect(response.body.clerkId).toBe("test-user-id");
    expect(response.body.username).toBe("testuser");
  });

  test("should return 401 when not authenticated", async () => {
    const response = await request(serverNoAuth).get("/users/me");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("should return 404 when user not found", async () => {
    const response = await request(server)
      .get("/users/me")
      .set("x-test-user-id", "nonexistent-user-id");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Not found");
  });
});

conditionalDescribe("User Controller - updateMyAvatar", () => {
  test("should update user avatar", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(server)
      .put("/users/me/avatar")
      .set("x-test-user-id", "test-user-id")
      .send({
        url: "https://example.com/avatar.jpg",
        publicId: "avatar-id",
        width: 200,
        height: 200,
      });

    expect(response.status).toBe(200);
    expect(response.body.avatar.url).toBe("https://example.com/avatar.jpg");
  });

  test("should return 400 when url is missing", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(server)
      .put("/users/me/avatar")
      .set("x-test-user-id", "test-user-id")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("url_required");
  });
});

conditionalDescribe("User Controller - updateMyBio", () => {
  test("should update user bio", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(server)
      .put("/users/me/bio")
      .set("x-test-user-id", "test-user-id")
      .send({ bio: "Updated bio text" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.bio).toBe("Updated bio text");
  });

  test("should clean and truncate bio", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const longBio = "a".repeat(700);
    const response = await request(server)
      .put("/users/me/bio")
      .set("x-test-user-id", "test-user-id")
      .send({ bio: longBio });

    expect(response.status).toBe(200);
    expect(response.body.bio.length).toBeLessThanOrEqual(600);
  });
});

conditionalDescribe("User Controller - updateMyVisibility", () => {
  test("should update user visibility status", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(server)
      .put("/users/me/visibility")
      .set("x-test-user-id", "test-user-id")
      .send({ visibility: "away" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.visibility).toBe("away");
  });

  test("should return 400 for invalid visibility status", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(server)
      .put("/users/me/visibility")
      .set("x-test-user-id", "test-user-id")
      .send({ visibility: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid visibility status");
  });
});

conditionalDescribe("User Controller - syncUser", () => {
  test("should create new client user", async () => {
    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "new-user-id")
      .send({
        clerkId: "new-user-id",
        email: "new@example.com",
        role: "client",
        username: "newuser",
      });

    expect(response.status).toBe(200);
    expect(response.body.clerkId).toBe("new-user-id");
    expect(response.body.role).toBe("client");
  });

  test("should create new artist user", async () => {
    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "new-artist-id")
      .send({
        clerkId: "new-artist-id",
        email: "artist@example.com",
        role: "artist",
        username: "newartist",
        profile: {
          location: "Test City",
          yearsExperience: 5,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.clerkId).toBe("new-artist-id");
    expect(response.body.role).toBe("artist");
    expect(response.body.yearsExperience).toBe(5);
  });

  test("should update existing user", async () => {
    await mongoose.model("client").create({
      clerkId: "existing-user-id",
      email: "existing@example.com",
      username: "existinguser",
      handle: "@existinguser",
      role: "client",
    });

    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "existing-user-id")
      .send({
        clerkId: "existing-user-id",
        email: "existing@example.com",
        role: "client",
        username: "updateduser",
      });

    expect(response.status).toBe(200);
    expect(response.body.username).toBe("updateduser");
  });

  test("should return 400 when required fields are missing", async () => {
    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "test-user-id")
      .send({
        clerkId: "test-user-id",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("clerkId, email, role are required");
  });

  test("generates a unique @handle and applies client budget/visibility defaults", async () => {
    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "sync-client-1")
      .send({
        clerkId: "sync-client-1",
        email: "syncclient@example.com",
        role: "client",
        username: "Sync Client",
        handle: "Sync Client!!",
        profile: {
          bio: "hello there",
          style: "Traditional",
          location: "Brooklyn",
          placement: "arm",
          size: "medium",
          referenceImages: [" ", "https://x.com/a.jpg", "https://x.com/b.jpg", "https://x.com/c.jpg", "https://x.com/d.jpg"],
        },
        visible: false,
        visibility: "away",
      });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("client");
    expect(response.body.handle).toMatch(/^@/);
    expect(response.body.visible).toBe(false);
    expect(response.body.visibility).toBe("away");
    expect(response.body.budgetMin).toBe(100);
    expect(response.body.budgetMax).toBe(200);
    expect(response.body.bio).toBe("hello there");
    expect(response.body.styles).toEqual(["Traditional"]);
    expect(response.body.placement).toBe("arm");
    expect(Array.isArray(response.body.references)).toBe(true);
    expect(response.body.references).toHaveLength(3);

    const saved = await mongoose.model("client").findOne({ clerkId: "sync-client-1" }).lean();
    expect(saved.budgetMin).toBe(100);
    expect(saved.budgetMax).toBe(200);
  });

  test("clamps client budgets to the 0-5000 range and keeps max above min", async () => {
    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "sync-client-2")
      .send({
        clerkId: "sync-client-2",
        email: "clamp@example.com",
        role: "client",
        username: "clampuser",
        profile: {
          budgetMin: 99999,
          budgetMax: 50,
          dob: "1990-01-01",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.budgetMin).toBe(5000);
    expect(response.body.budgetMax).toBeGreaterThan(response.body.budgetMin);
    expect(response.body.dob).toBeTruthy();
  });

  test("maps artist profile fields: years, baseRate, portfolio, restrictedPlacements, verification", async () => {
    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "sync-artist-1")
      .send({
        clerkId: "sync-artist-1",
        email: "syncartist@example.com",
        role: "artist",
        username: "syncartist",
        profile: {
          bio: "experienced artist",
          styles: ["Blackwork", "Fineline"],
          years: 8,
          baseRate: 150,
          baseRateMax: 400,
          shop: "Ink Shop",
          shopAddress: "123 Main St",
          shopLat: 40.7,
          shopLng: -73.9,
          coverImage: "https://x.com/cover.jpg",
          bookingPreference: "waitlist",
          travelFrequency: "often",
          portfolioImages: ["https://x.com/1.jpg", "https://x.com/2.jpg", "https://x.com/3.jpg", "https://x.com/4.jpg", "https://x.com/5.jpg"],
          restrictedPlacements: ["face", " ", "hands"],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("artist");
    expect(response.body.yearsExperience).toBe(8);
    expect(response.body.baseRate).toBe(150);
    expect(response.body.baseRateMax).toBe(400);
    expect(response.body.bookingPreference).toBe("waitlist");
    expect(response.body.travelFrequency).toBe("often");
    expect(response.body.shopLat).toBe(40.7);
    expect(response.body.shopLng).toBe(-73.9);
    expect(response.body.coverImage).toBe("https://x.com/cover.jpg");
    expect(response.body.portfolioImages).toHaveLength(4);
    expect(response.body.restrictedPlacements).toEqual(["face", "hands"]);
    expect(response.body.verified).toBe(true);
    expect(response.body.verifiedAt).toBeTruthy();
  });

  test("blocks username change during cooldown and reports availableAt", async () => {
    await mongoose.model("client").create({
      clerkId: "sync-cooldown",
      email: "cooldown@example.com",
      username: "originalname",
      handle: "@originalname",
      role: "client",
      usernameUpdatedAt: new Date(),
    });

    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "sync-cooldown")
      .send({
        clerkId: "sync-cooldown",
        email: "cooldown@example.com",
        role: "client",
        username: "brandnewname",
      });

    expect(response.status).toBe(200);
    expect(response.body.username).toBe("originalname");
    expect(response.body.usernameChange.blocked).toBe(true);
    expect(response.body.usernameChange.changed).toBe(false);
    expect(response.body.usernameChange.availableAt).toBeTruthy();
  });

  test("allows username change after cooldown has elapsed", async () => {
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
    await mongoose.model("client").create({
      clerkId: "sync-elapsed",
      email: "elapsed@example.com",
      username: "oldname",
      handle: "@oldname",
      role: "client",
      usernameUpdatedAt: old,
    });

    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "sync-elapsed")
      .send({
        clerkId: "sync-elapsed",
        email: "elapsed@example.com",
        role: "client",
        username: "freshname",
      });

    expect(response.status).toBe(200);
    expect(response.body.username).toBe("freshname");
    expect(response.body.usernameChange.changed).toBe(true);
    expect(response.body.usernameChange.blocked).toBe(false);
  });

  test("returns 409 ROLE_MISMATCH when email already registered under a different role", async () => {
    await mongoose.model("client").create({
      clerkId: "sync-mismatch",
      email: "mismatch@example.com",
      username: "mismatchuser",
      handle: "@mismatchuser",
      role: "client",
    });

    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "sync-mismatch")
      .send({
        clerkId: "sync-mismatch",
        email: "mismatch@example.com",
        role: "artist",
        username: "mismatchuser",
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("ROLE_MISMATCH");
  });

  test("creates a studio account and backing Studio document", async () => {
    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "sync-studio-1")
      .send({
        clerkId: "sync-studio-1",
        email: "studio@example.com",
        role: "studio",
        username: "studioowner",
        profile: {
          studioName: "Black Needle Studio",
          city: "Queens",
          address: "9 Art Ave",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("studio");
    expect(response.body.location).toBe("Queens");
    expect(response.body.ownedStudioId).toBeTruthy();

    const Studio = mongoose.model("Studio");
    const studioDoc = await Studio.findOne({ ownerClerkId: "sync-studio-1" }).lean();
    expect(studioDoc).toBeTruthy();
    expect(studioDoc.name).toBe("Black Needle Studio");
    expect(studioDoc.city).toBe("Queens");
  });

  test("falls back to client role for an unsafe role value", async () => {
    const response = await request(server)
      .post("/users/sync")
      .set("x-test-user-id", "sync-unsafe")
      .send({
        clerkId: "sync-unsafe",
        email: "unsafe@example.com",
        role: "superadmin",
        username: "unsafeuser",
      });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("client");
  });
});

conditionalDescribe("User Controller - getArtists", () => {
  beforeEach(async () => {
    await mongoose.model("artist").deleteMany({});
  });

  test("should return paginated list of artists", async () => {
    await mongoose.model("artist").create([
      {
        clerkId: "artist-1",
        email: "artist1@example.com",
        username: "Artist1",
        handle: "@artist1",
        role: "artist",
        location: "City1",
        rating: 4.5,
      },
      {
        clerkId: "artist-2",
        email: "artist2@example.com",
        username: "Artist2",
        handle: "@artist2",
        role: "artist",
        location: "City2",
        rating: 4.8,
      },
    ]);

    const response = await request(server)
      .get("/users/artists")
      .query({ page: 1, pageSize: 10 });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.total).toBe(2);
    expect(response.body.page).toBe(1);
  });

  test("should filter artists by location", async () => {
    await mongoose.model("artist").create([
      {
        clerkId: "artist-1",
        email: "artist1@example.com",
        username: "Artist1",
        handle: "@artist1",
        role: "artist",
        location: "New York",
        rating: 4.5,
      },
      {
        clerkId: "artist-2",
        email: "artist2@example.com",
        username: "Artist2",
        handle: "@artist2",
        role: "artist",
        location: "Los Angeles",
        rating: 4.8,
      },
    ]);

    const response = await request(server)
      .get("/users/artists")
      .query({ location: "New York" });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].location).toBe("New York");
  });

  test("treats a regex-laden location as a literal (ReDoS-safe), matching nothing", async () => {
    await mongoose.model("artist").create({
      clerkId: "artist-loc",
      email: "loc@example.com",
      username: "LocArtist",
      handle: "@loc-artist",
      role: "artist",
      location: "New York",
      rating: 4.5,
    });

    const started = Date.now();
    const response = await request(server)
      .get("/users/artists")
      .query({ location: "(a+)+$" });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(0);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  test("should search artists by text", async () => {
    await mongoose.model("artist").create([
      {
        clerkId: "artist-1",
        email: "artist1@example.com",
        username: "John Doe",
        handle: "@johndoe",
        role: "artist",
        location: "City1",
        rating: 4.5,
      },
      {
        clerkId: "artist-2",
        email: "artist2@example.com",
        username: "Jane Smith",
        handle: "@janesmith",
        role: "artist",
        location: "City2",
        rating: 4.8,
      },
    ]);

    const response = await request(server)
      .get("/users/artists")
      .query({ search: "John" });

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0].username).toMatch(/John/i);
  });

  test("boosts higher reward tiers first on the default sort", async () => {
    await mongoose.model("artist").create([
      {
        clerkId: "rising-1",
        email: "rising@example.com",
        username: "Rising Star",
        handle: "@rising",
        role: "artist",
        location: "City",
        rating: 5.0,
        reviewsCount: 3,
        bookingsCount: 2,
      },
      {
        clerkId: "pro-1",
        email: "pro@example.com",
        username: "Pro Vet",
        handle: "@pro",
        role: "artist",
        location: "City",
        rating: 4.6,
        reviewsCount: 80,
        bookingsCount: 60,
      },
    ]);

    const response = await request(server).get("/users/artists");

    expect(response.status).toBe(200);
    // Pro tier (60 bookings, 4.6) surfaces above a Rising artist with a higher
    // rating (5.0, 2 bookings) on the default placement view.
    expect(response.body.items[0].username).toBe("Pro Vet");
    expect(response.body.items[1].username).toBe("Rising Star");
  });

  test("honors an explicit sort without tier boosting", async () => {
    await mongoose.model("artist").create([
      {
        clerkId: "rising-1",
        email: "rising@example.com",
        username: "Rising Star",
        handle: "@rising",
        role: "artist",
        location: "City",
        rating: 5.0,
        bookingsCount: 2,
        yearsExperience: 12,
      },
      {
        clerkId: "pro-1",
        email: "pro@example.com",
        username: "Pro Vet",
        handle: "@pro",
        role: "artist",
        location: "City",
        rating: 4.6,
        bookingsCount: 60,
        yearsExperience: 1,
      },
    ]);

    const response = await request(server)
      .get("/users/artists")
      .query({ sort: "experience_desc" });

    expect(response.status).toBe(200);
    // Explicit sort is honored: the Rising artist (12 yrs) leads despite a
    // lower tier — no placement boost applied.
    expect(response.body.items[0].username).toBe("Rising Star");
    expect(response.body.items[1].username).toBe("Pro Vet");
  });

  test("filters by experience range, booking preference, and travel frequency", async () => {
    await mongoose.model("artist").create([
      {
        clerkId: "exp-1",
        email: "exp1@example.com",
        username: "Junior",
        handle: "@junior",
        role: "artist",
        yearsExperience: 2,
        bookingPreference: "open",
        travelFrequency: "rare",
        rating: 4,
      },
      {
        clerkId: "exp-2",
        email: "exp2@example.com",
        username: "Senior",
        handle: "@senior",
        role: "artist",
        yearsExperience: 15,
        bookingPreference: "waitlist",
        travelFrequency: "often",
        rating: 4.9,
      },
    ]);

    const ranged = await request(server)
      .get("/users/artists")
      .query({ experience: "10-20" });
    expect(ranged.status).toBe(200);
    expect(ranged.body.items.map((a) => a.username)).toEqual(["Senior"]);

    const plus = await request(server)
      .get("/users/artists")
      .query({ experience: "10+", booking: "waitlist", travel: "often" });
    expect(plus.status).toBe(200);
    expect(plus.body.items.map((a) => a.username)).toEqual(["Senior"]);
  });

  test("caches the discovery result for real viewers (served within TTL)", async () => {
    await mongoose.model("artist").create({
      clerkId: "cache-artist",
      email: "ca@example.com",
      username: "Cached",
      handle: "@cache-artist",
      role: "artist",
      rating: 5,
    });

    const first = await request(server).get("/users/artists").query({ page: 1, pageSize: 10 });
    expect(first.body.items.map((a) => a.username)).toContain("Cached");

    // Remove the artist from the DB; the cached page should still include it.
    await mongoose.model("artist").deleteMany({ clerkId: "cache-artist" });
    const second = await request(server).get("/users/artists").query({ page: 1, pageSize: 10 });
    expect(second.body.items.map((a) => a.username)).toContain("Cached");
  });
});

conditionalDescribe("User Controller - getArtistById", () => {
  test("should return artist by id", async () => {
    const artist = await mongoose.model("artist").create({
      clerkId: "artist-123",
      email: "artist@example.com",
      username: "Test Artist",
      handle: "@testartist",
      role: "artist",
      location: "Test City",
    });

    const response = await request(server).get(`/users/artists/${artist._id}`);

    expect(response.status).toBe(200);
    expect(response.body._id.toString()).toBe(artist._id.toString());
    expect(response.body.username).toBe("Test Artist");
  });

  test("should return 404 when artist not found", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(server).get(`/users/artists/${fakeId}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("not_found");
  });

  test("excludes private and financial fields from the public response", async () => {
    const artist = await mongoose.model("artist").create({
      clerkId: "artist-private",
      email: "private@example.com",
      username: "Private Artist",
      handle: "@privartist",
      role: "artist",
      stripeConnectAccountId: "acct_secret123",
      chargesEnabled: true,
      payoutsEnabled: true,
    });

    const response = await request(server).get(`/users/artists/${artist._id}`);

    expect(response.status).toBe(200);
    expect(response.body.username).toBe("Private Artist");
    expect(response.body.clerkId).toBe("artist-private");
    expect(response.body.email).toBeUndefined();
    expect(response.body.stripeConnectAccountId).toBeUndefined();
    expect(response.body.chargesEnabled).toBeUndefined();
    expect(response.body.payoutsEnabled).toBeUndefined();
  });

  test("returns 404 for a deactivated (visible:false) artist", async () => {
    const artist = await mongoose.model("artist").create({
      clerkId: "artist-deactivated",
      email: "deactivated@example.com",
      username: "Deactivated",
      handle: "@deactivated",
      role: "artist",
      visible: false,
    });

    const response = await request(server).get(`/users/artists/${artist._id}`);
    expect(response.status).toBe(404);
  });
});

conditionalDescribe("User Controller - checkHandleAvailability", () => {
  test("should return available when handle not taken", async () => {
    const response = await request(server)
      .get("/users/handle/check")
      .query({ h: "newhandle" });

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(true);
    expect(response.body.handle).toBe("@newhandle");
  });

  test("should return unavailable when handle is taken", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user",
      email: "test@example.com",
      username: "testuser",
      handle: "@takenhandle",
      role: "client",
    });

    const response = await request(server)
      .get("/users/handle/check")
      .query({ h: "takenhandle" });

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(false);
  });

  test("should return 400 when handle is missing", async () => {
    const response = await request(server).get("/users/handle/check");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("handle_required");
  });
});

conditionalDescribe("saveMyPortfolio", () => {
  test("stores per-image idea metadata, ignoring blanks and unknown urls", async () => {
    const Artist = mongoose.model("artist");
    await Artist.create({
      clerkId: "art_pf",
      email: "art_pf@example.com",
      username: "pf",
      handle: "@art_pf",
      role: "artist",
    });

    const res = await request(server)
      .put("/users/me/portfolio")
      .set("x-test-user-id", "art_pf")
      .send({
        urls: ["p1.jpg", "p2.jpg"],
        meta: [
          { url: "p1.jpg", idea: "  Dragon origami back tattoo  " },
          { url: "ghost.jpg", idea: "not in urls — ignore" },
          { url: "p2.jpg", idea: "   " },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.portfolioImages).toEqual(["p1.jpg", "p2.jpg"]);
    expect(res.body.portfolioMeta).toEqual([{ url: "p1.jpg", idea: "Dragon origami back tattoo" }]);
  });
});

conditionalDescribe("getArtists test-account visibility", () => {
  test("hides test-account artists from real viewers, shows them to test viewers", async () => {
    process.env.TEST_CLERK_IDS = "artist_hidden";
    try {
      const Artist = mongoose.model("artist");
      await Artist.create({ clerkId: "artist_hidden", email: "h@example.com", username: "Hidden", handle: "@artist_hidden", role: "artist" });
      await Artist.create({ clerkId: "artist_shown", email: "s@example.com", username: "Shown", handle: "@artist_shown", role: "artist" });

      const real = await request(server).get("/users/artists");
      const handles = real.body.items.map((i) => i.handle);
      expect(handles).toContain("@artist_shown");
      expect(handles).not.toContain("@artist_hidden");

      const asTest = await request(server).get("/users/artists").set("x-clerk-user-id", "artist_hidden");
      const handles2 = asTest.body.items.map((i) => i.handle);
      expect(handles2).toContain("@artist_hidden");
    } finally {
      delete process.env.TEST_CLERK_IDS;
    }
  });
});

conditionalDescribe("User Controller - deleteMyAvatar", () => {
  test("clears the avatar and returns ok", async () => {
    await mongoose.model("client").create({
      clerkId: "del-av",
      email: "del-av@example.com",
      username: "DelAv",
      handle: "@del-av",
      role: "client",
      avatar: { url: "https://x/y.jpg", publicId: "pid-1" },
    });

    const res = await request(server)
      .delete("/users/me/avatar")
      .set("x-test-user-id", "del-av");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const after = await mongoose.model("client").findOne({ clerkId: "del-av" }).lean();
    expect(after.avatar).toBeUndefined();
  });

  test("returns 404 when the user does not exist", async () => {
    const res = await request(server)
      .delete("/users/me/avatar")
      .set("x-test-user-id", "ghost");
    expect(res.status).toBe(404);
  });
});

conditionalDescribe("User Controller - getMyDefaultBio", () => {
  test("returns a default bio derived from the username when bio is empty", async () => {
    await mongoose.model("client").create({
      clerkId: "bio-default",
      email: "bd@example.com",
      username: "Vega",
      handle: "@bio-default",
      role: "client",
    });

    const res = await request(server)
      .get("/users/me/bio/default")
      .set("x-test-user-id", "bio-default");

    expect(res.status).toBe(200);
    expect(typeof res.body.text).toBe("string");
    expect(res.body.text).toContain("Vega");
  });

  test("returns 404 when the user is missing", async () => {
    const res = await request(server)
      .get("/users/me/bio/default")
      .set("x-test-user-id", "nobody");
    expect(res.status).toBe(404);
  });
});

conditionalDescribe("User Controller - getArtistByHandle", () => {
  test("400 when the handle is blank", async () => {
    const res = await request(server).get("/users/artist-handle/%20");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("handle_required");
  });

  test("404 when no artist matches the handle", async () => {
    const res = await request(server).get("/users/artist-handle/unknown");
    expect(res.status).toBe(404);
  });

  test("returns the artist with public profile fields for a matching handle", async () => {
    await mongoose.model("artist").create({
      clerkId: "h-artist",
      email: "ha@example.com",
      username: "Handler",
      handle: "@handler",
      role: "artist",
      avatar: { url: "https://x/a.jpg" },
    });

    const res = await request(server).get("/users/artist-handle/handler");
    expect(res.status).toBe(200);
    expect(res.body.handle).toBe("@handler");
    expect(res.body.profileImage).toBe("https://x/a.jpg");
    expect(res.body.stripeConnectAccountId).toBeUndefined();
  });

  test("404 for a deactivated (visible:false) artist", async () => {
    await mongoose.model("artist").create({
      clerkId: "h-hidden",
      email: "hh@example.com",
      username: "Hidden",
      handle: "@hidden-handle",
      role: "artist",
      visible: false,
    });
    const res = await request(server).get("/users/artist-handle/hidden-handle");
    expect(res.status).toBe(404);
  });
});

conditionalDescribe("User Controller - saveMyReferences", () => {
  test("trims, dedupes blanks, and caps references at three", async () => {
    await mongoose.model("client").create({
      clerkId: "ref-client",
      email: "rc@example.com",
      username: "RefClient",
      handle: "@ref-client",
      role: "client",
    });

    const res = await request(server)
      .put("/users/me/references")
      .set("x-test-user-id", "ref-client")
      .send({ urls: [" a.jpg ", "", "b.jpg", "c.jpg", "d.jpg"] });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.references).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });

  test("returns 404 when the client does not exist", async () => {
    const res = await request(server)
      .put("/users/me/references")
      .set("x-test-user-id", "missing-ref")
      .send({ urls: ["a.jpg"] });
    expect(res.status).toBe(404);
  });
});

conditionalDescribe("User Controller - upload signatures", () => {
  const prev = {};
  beforeAll(() => {
    prev.secret = process.env.CLOUDINARY_API_SECRET;
    prev.key = process.env.CLOUDINARY_API_KEY;
    prev.cloud = process.env.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });
  afterAll(() => {
    process.env.CLOUDINARY_API_SECRET = prev.secret;
    process.env.CLOUDINARY_API_KEY = prev.key;
    process.env.CLOUDINARY_CLOUD_NAME = prev.cloud;
  });

  test("getAvatarSignature returns a signed payload for the avatars folder", async () => {
    const res = await request(server)
      .get("/users/avatar-signature")
      .set("x-test-user-id", "any");
    expect(res.status).toBe(200);
    expect(res.body.folder).toBe("inkmity/avatars");
    expect(res.body.signature).toBeTruthy();
    expect(res.body.timestamp).toEqual(expect.any(Number));
  });

  test("getReferenceSignature returns a signed payload for the references folder", async () => {
    const res = await request(server)
      .get("/users/reference-signature")
      .set("x-test-user-id", "any");
    expect(res.status).toBe(200);
    expect(res.body.folder).toBe("inkmity/references");
    expect(res.body.signature).toBeTruthy();
  });
});

conditionalDescribe("User Controller - 404 edges", () => {
  test("updateMyVisibility returns 404 when the user does not exist", async () => {
    const res = await request(server)
      .put("/users/me/visibility")
      .set("x-test-user-id", "no-such-user")
      .send({ visibility: "away" });
    expect(res.status).toBe(404);
  });

  test("saveMyPortfolio returns 404 when the artist does not exist", async () => {
    const res = await request(server)
      .put("/users/me/portfolio")
      .set("x-test-user-id", "no-such-artist")
      .send({ urls: ["p1.jpg"] });
    expect(res.status).toBe(404);
  });

  test("updateMyBio returns 404 when the user does not exist", async () => {
    const res = await request(server)
      .put("/users/me/bio")
      .set("x-test-user-id", "no-such-bio")
      .send({ bio: "hello" });
    expect(res.status).toBe(404);
  });
});