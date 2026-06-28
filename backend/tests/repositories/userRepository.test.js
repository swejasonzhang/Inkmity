import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockUser = {
  findOne: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  discriminator: jest.fn(),
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
      mockUser.aggregate.mockResolvedValue(mockArtists);

      const result = await userRepository.default.findArtists({}, {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });

  describe("findByEmail", () => {
    test("normalizes the email to lowercase and trims it", async () => {
      const doc = { email: "a@b.com" };
      mockUser.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) });

      const result = await userRepository.default.findByEmail("  A@B.com  ");

      expect(result).toEqual(doc);
      expect(mockUser.findOne).toHaveBeenCalledWith({ email: "a@b.com" });
    });
  });

  describe("findByHandle", () => {
    test("prefixes a missing @ before querying", async () => {
      mockUser.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await userRepository.default.findByHandle("artsy");

      expect(mockUser.findOne).toHaveBeenCalledWith({ handle: "@artsy" });
    });

    test("leaves an existing @ untouched", async () => {
      mockUser.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await userRepository.default.findByHandle("@artsy");

      expect(mockUser.findOne).toHaveBeenCalledWith({ handle: "@artsy" });
    });
  });

  describe("findById", () => {
    test("returns the cached document when present", async () => {
      const doc = { _id: "id-1" };
      mockCache.get.mockReturnValue(doc);

      const result = await userRepository.default.findById("id-1");

      expect(result).toEqual(doc);
      expect(mockUser.findById).not.toHaveBeenCalled();
    });

    test("queries the database and caches the result on a miss", async () => {
      const doc = { _id: "id-1" };
      mockCache.get.mockReturnValue(null);
      mockUser.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) });

      const result = await userRepository.default.findById("id-1");

      expect(result).toEqual(doc);
      expect(mockCache.set).toHaveBeenCalledWith("user:id:id-1", doc, 300000);
    });

    test("does not cache when the document is not found", async () => {
      mockCache.get.mockReturnValue(null);
      mockUser.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      const result = await userRepository.default.findById("missing");

      expect(result).toBeNull();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe("updateByClerkId", () => {
    test("updates the document and invalidates its cache", async () => {
      const doc = { _id: "id-9", clerkId: "ck-9" };
      mockUser.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(doc),
      });

      const result = await userRepository.default.updateByClerkId("ck-9", { bio: "hi" });

      expect(result).toEqual(doc);
      expect(mockUser.findOneAndUpdate).toHaveBeenCalledWith(
        { clerkId: "ck-9" },
        { $set: { bio: "hi" } },
        expect.objectContaining({ new: true, runValidators: true })
      );
      expect(mockCache.delete).toHaveBeenCalledWith("user:clerkId:ck-9");
      expect(mockCache.delete).toHaveBeenCalledWith("user:id:id-9");
    });

    test("returns null without touching the cache when no document matches", async () => {
      mockUser.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await userRepository.default.updateByClerkId("ck-x", { bio: "hi" });

      expect(result).toBeNull();
      expect(mockCache.delete).not.toHaveBeenCalled();
    });
  });

  describe("findArtists - filters and sorting", () => {
    beforeEach(() => {
      mockUser.aggregate.mockResolvedValue([{ _id: "a1" }]);
      mockUser.countDocuments.mockResolvedValue(1);
    });

    test("uses a text-search aggregation when search is provided", async () => {
      await userRepository.default.findArtists({}, { search: "dragon", page: 2, pageSize: 5 });

      const pipeline = mockUser.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.$text).toEqual({ $search: "dragon" });
      expect(pipeline.some((s) => s.$sort && s.$sort.score)).toBe(true);
      expect(mockUser.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ $text: { $search: "dragon" } })
      );
    });

    test("applies location, style, booking, travel, and experience filters", async () => {
      await userRepository.default.findArtists({}, {
        location: "NYC",
        style: "traditional",
        booking: "open",
        travel: "often",
        experience: { $gte: 5 },
      });

      const match = mockUser.aggregate.mock.calls[0][0][0].$match;
      expect(match.location).toBeInstanceOf(RegExp);
      expect(match.styles).toBe("traditional");
      expect(match.bookingPreference).toBe("open");
      expect(match.travelFrequency).toBe("often");
      expect(match.yearsExperience).toEqual({ $gte: 5 });
    });

    test.each([
      ["experience_desc"],
      ["experience_asc"],
      ["newest"],
      ["rating_asc"],
      ["rating_desc"],
    ])("supports the %s sort option", async (sort) => {
      const result = await userRepository.default.findArtists({}, { sort });
      expect(result.totalPages).toBe(1);
      expect(mockUser.aggregate).toHaveBeenCalled();
    });
  });

  describe("findFeaturedArtists", () => {
    test("returns cached featured artists when present", async () => {
      const cached = [{ _id: "f1" }];
      mockCache.get.mockReturnValue(cached);

      const result = await userRepository.default.findFeaturedArtists(3);

      expect(result).toEqual(cached);
      expect(mockUser.aggregate).not.toHaveBeenCalled();
    });

    test("aggregates and caches featured artists on a miss", async () => {
      const artists = [{ _id: "f1" }, { _id: "f2" }];
      mockCache.get.mockReturnValue(null);
      mockUser.aggregate.mockResolvedValue(artists);

      const result = await userRepository.default.findFeaturedArtists(2);

      expect(result).toEqual(artists);
      expect(mockCache.set).toHaveBeenCalledWith("user:featured:2", artists, 300000);
    });
  });

  describe("isHandleAvailable", () => {
    test("returns true when no user holds the handle", async () => {
      mockUser.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      const available = await userRepository.default.isHandleAvailable("free");

      expect(available).toBe(true);
      expect(mockUser.findOne).toHaveBeenCalledWith({ handle: "@free" }, { _id: 1 });
    });

    test("returns false when the handle is taken", async () => {
      mockUser.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "x" }) });

      const available = await userRepository.default.isHandleAvailable("@taken");

      expect(available).toBe(false);
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

    test("uses the artist model for an artist role", async () => {
      const userData = { clerkId: "ar-1", role: "artist" };
      const mockModel = {
        findOneAndUpdate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userData),
        }),
      };
      const mongoose = await import("mongoose");
      const modelSpy = jest.fn().mockReturnValue(mockModel);
      mongoose.default.model = modelSpy;

      await userRepository.default.upsert("ar-1", userData);

      expect(modelSpy).toHaveBeenCalledWith("artist");
    });
  });

  describe("invalidateCache", () => {
    test("deletes clerkId, id, and featured cache entries", async () => {
      const cacheModule = await import("../../utils/cache.js");
      userRepository.default.invalidateCache("ck-1", "id-1");

      expect(mockCache.delete).toHaveBeenCalledWith("user:clerkId:ck-1");
      expect(mockCache.delete).toHaveBeenCalledWith("user:id:id-1");
      expect(cacheModule.cacheHelpers.invalidate).toHaveBeenCalledWith("user:featured:*");
    });
  });
});
