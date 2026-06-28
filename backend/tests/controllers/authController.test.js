import { jest, describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockGetUserList = jest.fn();
const mockCreateSignInToken = jest.fn();
jest.unstable_mockModule("@clerk/express", () => ({
  clerkClient: {
    users: {
      getUserList: mockGetUserList,
    },
    signInTokens: {
      createSignInToken: mockCreateSignInToken,
    },
  },
}));

const { checkEmail, devSignInToken } = await import("../../controllers/authController.js");

const app = express();
app.use(express.json());
app.get("/auth/check-email", checkEmail);
app.post("/auth/dev-sign-in-token", devSignInToken);

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

describe("Auth Controller - Email Check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should check if email exists", async () => {
    mockGetUserList.mockResolvedValue([
      { id: "user-123", emailAddresses: [{ emailAddress: "test@example.com" }] },
    ]);

    const response = await request(server)
      .get("/auth/check-email")
      .query({ email: "test@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.exists).toBe(true);
    expect(mockGetUserList).toHaveBeenCalledWith({
      emailAddress: ["test@example.com"],
      limit: 1,
    });
  });

  test("should return false when email does not exist", async () => {
    mockGetUserList.mockResolvedValue([]);

    const response = await request(server)
      .get("/auth/check-email")
      .query({ email: "nonexistent@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.exists).toBe(false);
  });

  test("should return false when getUserList returns nullish", async () => {
    mockGetUserList.mockResolvedValue(null);

    const response = await request(server)
      .get("/auth/check-email")
      .query({ email: "test@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.exists).toBe(false);
  });

  test("should return 400 when email is missing", async () => {
    const response = await request(server).get("/auth/check-email");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing email");
  });

  test("should return 400 when email is empty string", async () => {
    const response = await request(server)
      .get("/auth/check-email")
      .query({ email: "" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing email");
  });

  test("should handle email case insensitivity", async () => {
    mockGetUserList.mockResolvedValue([
      { id: "user-123", emailAddresses: [{ emailAddress: "test@example.com" }] },
    ]);

    const response = await request(server)
      .get("/auth/check-email")
      .query({ email: "TEST@EXAMPLE.COM" });

    expect(response.status).toBe(200);
    expect(mockGetUserList).toHaveBeenCalledWith({
      emailAddress: ["test@example.com"],
      limit: 1,
    });
  });

  test("should return 500 on internal error", async () => {
    mockGetUserList.mockRejectedValue(new Error("API Error"));

    const response = await request(server)
      .get("/auth/check-email")
      .query({ email: "test@example.com" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal error");
  });
});

describe("Auth Controller - Dev Sign-In Token", () => {
  const originalSecret = process.env.CLERK_SECRET_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLERK_SECRET_KEY = "sk_test_abc123";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CLERK_SECRET_KEY;
    } else {
      process.env.CLERK_SECRET_KEY = originalSecret;
    }
  });

  test("should return 403 when not on dev/test instance", async () => {
    process.env.CLERK_SECRET_KEY = "sk_live_abc123";

    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({ role: "client" });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Disabled outside the dev/test instance");
    expect(mockGetUserList).not.toHaveBeenCalled();
  });

  test("should return 403 when CLERK_SECRET_KEY is unset", async () => {
    delete process.env.CLERK_SECRET_KEY;

    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({ role: "client" });

    expect(response.status).toBe(403);
  });

  test("should return 400 when role is invalid", async () => {
    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({ role: "admin" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("role must be 'client' or 'artist'");
  });

  test("should return 400 when role is missing", async () => {
    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("role must be 'client' or 'artist'");
  });

  test("should return 404 when test user is not seeded", async () => {
    mockGetUserList.mockResolvedValue({ data: [] });

    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({ role: "client" });

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/not seeded/);
    expect(mockGetUserList).toHaveBeenCalledWith({
      emailAddress: ["testclient@inkmity.dev"],
      limit: 1,
    });
  });

  test("should create a sign-in token for client", async () => {
    mockGetUserList.mockResolvedValue({ data: [{ id: "user-client-1" }] });
    mockCreateSignInToken.mockResolvedValue({ token: "tok_abc" });

    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({ role: "client" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBe("tok_abc");
    expect(mockGetUserList).toHaveBeenCalledWith({
      emailAddress: ["testclient@inkmity.dev"],
      limit: 1,
    });
    expect(mockCreateSignInToken).toHaveBeenCalledWith({
      userId: "user-client-1",
      expiresInSeconds: 60,
    });
  });

  test("should create a sign-in token for artist (uppercased role)", async () => {
    mockGetUserList.mockResolvedValue({ data: [{ id: "user-artist-1" }] });
    mockCreateSignInToken.mockResolvedValue({ token: "tok_artist" });

    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({ role: "ARTIST" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBe("tok_artist");
    expect(mockGetUserList).toHaveBeenCalledWith({
      emailAddress: ["testartist@inkmity.dev"],
      limit: 1,
    });
  });

  test("should return 500 with error message when token creation fails", async () => {
    mockGetUserList.mockResolvedValue({ data: [{ id: "user-client-1" }] });
    mockCreateSignInToken.mockRejectedValue(new Error("token boom"));

    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({ role: "client" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("token boom");
  });

  test("should return 500 with fallback message when error has no message", async () => {
    mockGetUserList.mockRejectedValue({});

    const response = await request(server)
      .post("/auth/dev-sign-in-token")
      .send({ role: "client" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to create sign-in token");
  });
});