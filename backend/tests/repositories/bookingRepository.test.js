import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockBooking = {
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
};
const mockCache = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
const mockCacheHelpers = { invalidate: jest.fn() };

jest.unstable_mockModule("../../models/Booking.js", () => ({ default: mockBooking }));
jest.unstable_mockModule("../../lib/cache.js", () => ({
  default: mockCache,
  cacheHelpers: mockCacheHelpers,
}));

const repo = (await import("../../repositories/bookingRepository.js")).default;

function q(value) {
  const obj = {
    sort: () => obj,
    limit: () => obj,
    lean: () => Promise.resolve(value),
    then: (res, rej) => Promise.resolve(value).then(res, rej),
  };
  return obj;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.get.mockReturnValue(undefined);
  mockBooking.findById.mockReturnValue(q({ _id: "b1", artistId: "a1", clientId: "c1" }));
  mockBooking.find.mockReturnValue(q([{ _id: "b1" }]));
  mockBooking.create.mockResolvedValue({ artistId: "a1", clientId: "c1", toObject: () => ({ _id: "b1", artistId: "a1", clientId: "c1" }) });
  mockBooking.findByIdAndUpdate.mockReturnValue(q({ _id: "b1", artistId: "a1", clientId: "c1" }));
  mockBooking.deleteOne.mockResolvedValue({});
  mockBooking.countDocuments.mockResolvedValue(3);
});

describe("findById", () => {
  test("returns a cached booking without hitting the DB", async () => {
    mockCache.get.mockReturnValue({ _id: "cached" });
    const res = await repo.findById("b1");
    expect(res).toEqual({ _id: "cached" });
    expect(mockBooking.findById).not.toHaveBeenCalled();
  });
  test("loads from the DB on a cache miss and caches the result", async () => {
    const res = await repo.findById("b1");
    expect(res._id).toBe("b1");
    expect(mockCache.set).toHaveBeenCalledWith("booking:id:b1", expect.anything(), expect.any(Number));
  });
  test("bypasses the cache when useCache is false", async () => {
    await repo.findById("b1", false);
    expect(mockCache.get).not.toHaveBeenCalled();
    expect(mockCache.set).not.toHaveBeenCalled();
  });
});

describe("findByArtistId / findByClientId", () => {
  test("builds a filtered query for an artist", async () => {
    await repo.findByArtistId("a1", { status: "confirmed", appointmentType: "consultation", startDate: "2026-01-01", endDate: "2026-02-01" });
    expect(mockBooking.find).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: "a1",
        status: "confirmed",
        appointmentType: "consultation",
        startAt: { $gte: expect.any(Date), $lte: expect.any(Date) },
      })
    );
  });
  test("builds a minimal query for a client with no filters", async () => {
    await repo.findByClientId("c1");
    expect(mockBooking.find).toHaveBeenCalledWith({ clientId: "c1" });
  });
});

describe("findOverlapping", () => {
  test("queries active overlaps", async () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const end = new Date("2026-01-01T11:00:00Z");
    await repo.findOverlapping("a1", start, end);
    expect(mockBooking.find).toHaveBeenCalledWith(
      expect.objectContaining({ artistId: "a1", status: { $in: ["pending", "accepted", "confirmed", "in-progress"] } })
    );
  });
  test("excludes a booking id when rescheduling", async () => {
    await repo.findOverlapping("a1", new Date(), new Date(), "skip1");
    expect(mockBooking.find).toHaveBeenCalledWith(expect.objectContaining({ _id: { $ne: "skip1" } }));
  });
});

describe("create / updateById / deleteById", () => {
  test("create invalidates artist + client caches and returns a plain object", async () => {
    const res = await repo.create({ artistId: "a1", clientId: "c1" });
    expect(res._id).toBe("b1");
    expect(mockCacheHelpers.invalidate).toHaveBeenCalledWith("booking:artist:a1:*");
    expect(mockCacheHelpers.invalidate).toHaveBeenCalledWith("booking:client:c1:*");
  });
  test("updateById invalidates the caches when a booking is updated", async () => {
    const res = await repo.updateById("b1", { status: "confirmed" });
    expect(res._id).toBe("b1");
    expect(mockCache.delete).toHaveBeenCalledWith("booking:id:b1");
  });
  test("updateById returns null when nothing matched", async () => {
    mockBooking.findByIdAndUpdate.mockReturnValue(q(null));
    expect(await repo.updateById("missing", {})).toBeNull();
    expect(mockCache.delete).not.toHaveBeenCalled();
  });
  test("deleteById removes an existing booking and reports true", async () => {
    expect(await repo.deleteById("b1")).toBe(true);
    expect(mockBooking.deleteOne).toHaveBeenCalledWith({ _id: "b1" });
  });
  test("deleteById reports false when the booking is gone", async () => {
    mockBooking.findById.mockReturnValue(q(null));
    expect(await repo.deleteById("missing")).toBe(false);
    expect(mockBooking.deleteOne).not.toHaveBeenCalled();
  });
});

describe("countByStatus / findUpcoming", () => {
  test("countByStatus returns the document count", async () => {
    expect(await repo.countByStatus("a1", "confirmed")).toBe(3);
  });
  test("findUpcoming queries future active bookings", async () => {
    await repo.findUpcoming("a1", 5);
    expect(mockBooking.find).toHaveBeenCalledWith(
      expect.objectContaining({ artistId: "a1", startAt: { $gte: expect.any(Date) } })
    );
  });
});
