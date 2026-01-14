import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

// Mock @clerk/clerk-sdk-node before importing the controller
const mockGetUserList = jest.fn();
jest.unstable_mockModule("@clerk/clerk-sdk-node", () => ({
  clerkClient: {
    users: {
      getUserList: mockGetUserList,
    },
  },
}));

// Import after mocking
const { checkEmail } = await import("../../controllers/authController.js");

const app = express();
app.get("/auth/check-email", checkEmail);

describe("Auth Controller - Email Check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should check if email exists", async () => {
    mockGetUserList.mockResolvedValue([
      { id: "user-123", emailAddresses: [{ emailAddress: "test@example.com" }] },
    ]);

    const response = await request(app)
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

    const response = await request(app)
      .get("/auth/check-email")
      .query({ email: "nonexistent@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.exists).toBe(false);
  });

  test("should return 400 when email is missing", async () => {
    const response = await request(app).get("/auth/check-email");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing email");
  });

  test("should return 400 when email is empty string", async () => {
    const response = await request(app)
      .get("/auth/check-email")
      .query({ email: "" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing email");
  });

  test("should handle email case insensitivity", async () => {
    mockGetUserList.mockResolvedValue([
      { id: "user-123", emailAddresses: [{ emailAddress: "test@example.com" }] },
    ]);

    const response = await request(app)
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

    const response = await request(app)
      .get("/auth/check-email")
      .query({ email: "test@example.com" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal error");
  });
});
