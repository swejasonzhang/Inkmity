import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import User from "../../models/UserBase.js";
import "../../models/Client.js";
import "../../models/Artist.js";
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
  checkHandleAvailability,
} from "../../controllers/userController.js";

const app = express();
app.use(express.json());

const mockAuth = (req, res, next) => {
  req.user = { clerkId: req.headers["x-test-user-id"] || "test-user-id" };
  req.auth = { userId: req.headers["x-test-user-id"] || "test-user-id" };
  next();
};

// Create separate app instance for auth test
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
app.get("/users/handle/check", checkHandleAvailability);

describe("User Controller - getMe", () => {
  test("should return user data for authenticated user", async () => {
    const client = await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(app)
      .get("/users/me")
      .set("x-test-user-id", "test-user-id");

    expect(response.status).toBe(200);
    expect(response.body.clerkId).toBe("test-user-id");
    expect(response.body.username).toBe("testuser");
  });

  test("should return 401 when not authenticated", async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.get("/users/me", getMe);
    
    const response = await request(appNoAuth).get("/users/me");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("should return 404 when user not found", async () => {
    const response = await request(app)
      .get("/users/me")
      .set("x-test-user-id", "nonexistent-user-id");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Not found");
  });
});

describe("User Controller - updateMyAvatar", () => {
  test("should update user avatar", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(app)
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

    const response = await request(app)
      .put("/users/me/avatar")
      .set("x-test-user-id", "test-user-id")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("url_required");
  });
});

describe("User Controller - updateMyBio", () => {
  test("should update user bio", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(app)
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
    const response = await request(app)
      .put("/users/me/bio")
      .set("x-test-user-id", "test-user-id")
      .send({ bio: longBio });

    expect(response.status).toBe(200);
    expect(response.body.bio.length).toBeLessThanOrEqual(600);
  });
});

describe("User Controller - updateMyVisibility", () => {
  test("should update user visibility status", async () => {
    await mongoose.model("client").create({
      clerkId: "test-user-id",
      email: "test@example.com",
      username: "testuser",
      handle: "@testuser",
      role: "client",
    });

    const response = await request(app)
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

    const response = await request(app)
      .put("/users/me/visibility")
      .set("x-test-user-id", "test-user-id")
      .send({ visibility: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid visibility status");
  });
});

describe("User Controller - syncUser", () => {
  test("should create new client user", async () => {
    const response = await request(app)
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
    const response = await request(app)
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

    const response = await request(app)
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
    const response = await request(app)
      .post("/users/sync")
      .set("x-test-user-id", "test-user-id")
      .send({
        clerkId: "test-user-id",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("clerkId, email, role are required");
  });
});

describe("User Controller - getArtists", () => {
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

    const response = await request(app)
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

    const response = await request(app)
      .get("/users/artists")
      .query({ location: "New York" });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].location).toBe("New York");
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

    const response = await request(app)
      .get("/users/artists")
      .query({ search: "John" });

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0].username).toMatch(/John/i);
  });
});

describe("User Controller - getArtistById", () => {
  test("should return artist by id", async () => {
    const artist = await mongoose.model("artist").create({
      clerkId: "artist-123",
      email: "artist@example.com",
      username: "Test Artist",
      handle: "@testartist",
      role: "artist",
      location: "Test City",
    });

    const response = await request(app).get(`/users/artists/${artist._id}`);

    expect(response.status).toBe(200);
    expect(response.body._id.toString()).toBe(artist._id.toString());
    expect(response.body.username).toBe("Test Artist");
  });

  test("should return 404 when artist not found", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app).get(`/users/artists/${fakeId}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("not_found");
  });
});

describe("User Controller - checkHandleAvailability", () => {
  test("should return available when handle not taken", async () => {
    const response = await request(app)
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

    const response = await request(app)
      .get("/users/handle/check")
      .query({ h: "takenhandle" });

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(false);
  });

  test("should return 400 when handle is missing", async () => {
    const response = await request(app).get("/users/handle/check");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("handle_required");
  });
});
