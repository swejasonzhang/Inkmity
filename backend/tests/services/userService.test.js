import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockUserRepository = {
  findByClerkId: jest.fn(),
  upsert: jest.fn(),
  updateByClerkId: jest.fn(),
  isHandleAvailable: jest.fn(),
  findArtists: jest.fn(),
  findFeaturedArtists: jest.fn(),
};

jest.unstable_mockModule("../../repositories/index.js", () => ({
  userRepository: mockUserRepository,
}));

const mockEnsureUniqueHandle = jest.fn();
const mockIsValidHandle = jest.fn();
jest.unstable_mockModule("../../lib/handle.js", () => ({
  ensureUniqueHandle: mockEnsureUniqueHandle,
  isValidHandle: mockIsValidHandle,
}));

const { userService } = await import("../../services/userService.js");

describe("User Service - TDD", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getByClerkId", () => {
    test("should return user when found", async () => {
      const mockUser = { clerkId: "test-123", username: "testuser" };
      mockUserRepository.findByClerkId.mockResolvedValue(mockUser);

      const result = await userService.getByClerkId("test-123");

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByClerkId).toHaveBeenCalledWith("test-123");
    });

    test("should return null when user not found", async () => {
      mockUserRepository.findByClerkId.mockResolvedValue(null);

      const result = await userService.getByClerkId("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("syncUser", () => {
    test("should create new client user", async () => {
      const userData = {
        email: "test@example.com",
        role: "client",
        username: "testuser",
      };

      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockEnsureUniqueHandle.mockResolvedValue("testuser");
      mockUserRepository.upsert.mockResolvedValue({ clerkId: "test-123", ...userData });

      const result = await userService.syncUser("test-123", userData);

      expect(result.clerkId).toBe("test-123");
      expect(result.role).toBe("client");
      expect(mockUserRepository.upsert).toHaveBeenCalled();
    });

    test("should throw error when required fields missing", async () => {
      const userData = { email: "test@example.com" };

      await expect(userService.syncUser("test-123", userData)).rejects.toThrow(
        "clerkId, email, role are required"
      );
    });

    test("should update existing user", async () => {
      const existingUser = {
        clerkId: "test-123",
        username: "oldname",
        role: "client",
        handle: "@oldname",
      };

      const updateData = {
        email: "test@example.com",
        role: "client",
        username: "newname",
      };

      mockUserRepository.findByClerkId.mockResolvedValue(existingUser);
      mockUserRepository.upsert.mockResolvedValue({ ...existingUser, ...updateData });

      const result = await userService.syncUser("test-123", updateData);

      expect(result.username).toBe("newname");
    });

    test("should handle invalid role and default to client", async () => {
      const userData = {
        email: "test@example.com",
        role: "invalid",
        username: "testuser",
      };

      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockEnsureUniqueHandle.mockResolvedValue("testuser");
      mockUserRepository.upsert.mockResolvedValue({ clerkId: "test-123", role: "client" });

      const result = await userService.syncUser("test-123", userData);

      expect(result.role).toBe("client");
    });
  });

  describe("updateAvatar", () => {
    test("should update user avatar", async () => {
      const avatarData = {
        url: "https://example.com/avatar.jpg",
        publicId: "avatar-id",
        width: 200,
        height: 200,
      };

      mockUserRepository.updateByClerkId.mockResolvedValue({
        clerkId: "test-123",
        avatar: avatarData,
      });

      const result = await userService.updateAvatar("test-123", avatarData);

      expect(result.avatar.url).toBe(avatarData.url);
      expect(mockUserRepository.updateByClerkId).toHaveBeenCalledWith("test-123", {
        avatar: avatarData,
      });
    });

    test("should throw error when url missing", async () => {
      await expect(userService.updateAvatar("test-123", {})).rejects.toThrow("url_required");
    });
  });

  describe("updateBio", () => {
    test("should update and clean bio", async () => {
      const bio = "  This is a test bio with    extra   spaces  ";
      const cleanedBio = "This is a test bio with extra spaces";

      mockUserRepository.updateByClerkId.mockResolvedValue({
        clerkId: "test-123",
        bio: cleanedBio,
      });

      const result = await userService.updateBio("test-123", bio);

      expect(result.bio).toBe(cleanedBio);
    });

    test("should truncate long bio", async () => {
      const longBio = "a".repeat(700);

      mockUserRepository.updateByClerkId.mockResolvedValue({
        clerkId: "test-123",
        bio: longBio.slice(0, 600),
      });

      const result = await userService.updateBio("test-123", longBio);

      expect(result.bio.length).toBeLessThanOrEqual(600);
    });
  });

  describe("updateVisibility", () => {
    test("should update visibility status", async () => {
      mockUserRepository.updateByClerkId.mockResolvedValue({
        clerkId: "test-123",
        visibility: "away",
      });

      const result = await userService.updateVisibility("test-123", "away");

      expect(result.visibility).toBe("away");
    });

    test("should throw error for invalid visibility", async () => {
      await expect(userService.updateVisibility("test-123", "invalid")).rejects.toThrow(
        "Invalid visibility status"
      );
    });
  });

  describe("checkHandleAvailability", () => {
    test("should return available when handle not taken", async () => {
      mockIsValidHandle.mockReturnValue(true);
      mockUserRepository.isHandleAvailable.mockResolvedValue(true);

      const result = await userService.checkHandleAvailability("newhandle");

      expect(result.available).toBe(true);
      expect(result.handle).toBe("@newhandle");
    });

    test("should return unavailable when handle taken", async () => {
      mockIsValidHandle.mockReturnValue(true);
      mockUserRepository.isHandleAvailable.mockResolvedValue(false);

      const result = await userService.checkHandleAvailability("takenhandle");

      expect(result.available).toBe(false);
    });

    test("should throw error when handle missing", async () => {
      await expect(userService.checkHandleAvailability("")).rejects.toThrow("handle_required");
    });

    test("reports unavailable without a DB lookup for a malformed handle", async () => {
      mockIsValidHandle.mockReturnValue(false);

      const result = await userService.checkHandleAvailability("bad!!handle");

      expect(result.available).toBe(false);
      expect(mockUserRepository.isHandleAvailable).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    test("delegates to the repository", async () => {
      const doc = { _id: "id-1" };
      mockUserRepository.findById = jest.fn().mockResolvedValue(doc);

      const result = await userService.getById("id-1");

      expect(result).toEqual(doc);
      expect(mockUserRepository.findById).toHaveBeenCalledWith("id-1");
    });
  });

  describe("syncUser - artist branch", () => {
    test("maps artist profile fields onto the upsert document", async () => {
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockEnsureUniqueHandle.mockResolvedValue("inkmaster");
      mockUserRepository.upsert.mockImplementation((_clerkId, doc) => doc);

      const result = await userService.syncUser("art-1", {
        email: "art@example.com",
        role: "artist",
        username: "Ink Master",
        profile: {
          years: 8,
          baseRate: 150,
          bookingPreference: "selective",
          travelFrequency: "often",
          shop: "Ink Co",
          shopLat: 40.7,
          shopLng: -74,
          coverImage: "cover.jpg",
          portfolioImages: ["a.jpg", "b.jpg", "c.jpg", "d.jpg"],
          restrictedPlacements: ["face", " "],
          style: "blackwork",
        },
      });

      expect(result.role).toBe("artist");
      expect(result.yearsExperience).toBe(8);
      expect(result.baseRate).toBe(150);
      expect(result.bookingPreference).toBe("selective");
      expect(result.travelFrequency).toBe("often");
      expect(result.shopLat).toBe(40.7);
      expect(result.shopLng).toBe(-74);
      expect(result.coverImage).toBe("cover.jpg");
      expect(result.portfolioImages).toHaveLength(3);
      expect(result.restrictedPlacements).toEqual(["face"]);
      expect(result.styles).toEqual(["blackwork"]);
    });
  });

  describe("deleteAvatar", () => {
    test("clears the avatar via the repository", async () => {
      mockUserRepository.updateByClerkId.mockResolvedValue({ clerkId: "test-123" });

      await userService.deleteAvatar("test-123");

      expect(mockUserRepository.updateByClerkId).toHaveBeenCalledWith("test-123", {
        avatar: undefined,
      });
    });
  });

  describe("getArtists / getFeaturedArtists", () => {
    test("getArtists forwards filters to the repository", async () => {
      const page = { items: [], total: 0 };
      mockUserRepository.findArtists.mockResolvedValue(page);

      const result = await userService.getArtists({ sort: "newest" });

      expect(result).toEqual(page);
      expect(mockUserRepository.findArtists).toHaveBeenCalledWith({}, { sort: "newest" });
    });

    test("getFeaturedArtists passes the limit through", async () => {
      const artists = [{ _id: "f1" }];
      mockUserRepository.findFeaturedArtists.mockResolvedValue(artists);

      const result = await userService.getFeaturedArtists(3);

      expect(result).toEqual(artists);
      expect(mockUserRepository.findFeaturedArtists).toHaveBeenCalledWith(3);
    });
  });
});
