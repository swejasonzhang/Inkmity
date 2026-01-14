// TDD tests for User Repository
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// Mock dependencies before importing
const mockUser = {
  findOne: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn(),
};

jest.unstable_mockModule("../../models/UserBase.js", () => ({
  default: mockUser,
}));

jest.unstable_mockModule("../../utils/cache.js", () => ({
  default: mockCache,
  cacheHelpers: {
    invalidate: jest.fn(),
    generateKey: jest.fn(),
  },
}));

// Import after mocking
const userRepository = await import("../../repositories/userRepository.js");

describe("User Repository - TDD", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);
    mockCache.set.mockImplementation(() => {});
    mockCache.delete.mockImplementation(() => {});
  });

  describe("findByClerkId", () => {
    test("should return cached user when available", async () => {
      const mockUserData = { clerkId: "test-123", username: "testuser" };
      mockCache.get.mockReturnValue(mockUserData);

      const result = await userRepository.default.findByClerkId("test-123");

      expect(result).toEqual(mockUserData);
      expect(mockUser.findOne).not.toHaveBeenCalled();
    });

    test("should query database when not cached", async () => {
      const mockUserData = { clerkId: "test-123", username: "testuser" };
      mockUser.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserData),
      });
      mockCache.get.mockReturnValue(null);

      const result = await userRepository.default.findByClerkId("test-123");

      expect(result).toEqual(mockUserData);
      expect(mockCache.set).toHaveBeenCalledWith(
        "user:clerkId:test-123",
        mockUserData,
        300000
      );
    });

    test("should skip cache when useCache is false", async () => {
      const mockUserData = { clerkId: "test-123", username: "testuser" };
      mockUser.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserData),
      });

      const result = await userRepository.default.findByClerkId("test-123", false);

      expect(result).toEqual(mockUserData);
      expect(mockCache.get).not.toHaveBeenCalled();
    });
  });

  describe("findArtists", () => {
    test("should return paginated artists", async () => {
      const mockArtists = [
        { _id: "1", username: "Artist1", role: "artist" },
        { _id: "2", username: "Artist2", role: "artist" },
      ];

      mockUser.countDocuments.mockResolvedValue(2);
      mockUser.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockArtists),
      });

      const result = await userRepository.default.findArtists({}, {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });

  describe("upsert", () => {
    test("should create new user", async () => {
      const userData = {
        clerkId: "test-123",
        email: "test@example.com",
        role: "client",
        username: "testuser",
        handle: "@testuser",
      };

      const mockModel = {
        findOneAndUpdate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userData),
        }),
      };

      // Mock mongoose.model
      const mongoose = await import("mongoose");
      mongoose.default.model = jest.fn().mockReturnValue(mockModel);

      const result = await userRepository.default.upsert("test-123", userData);

      expect(result).toEqual(userData);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { clerkId: "test-123" },
        { $set: userData },
        expect.objectContaining({ upsert: true })
      );
    });
  });
});
