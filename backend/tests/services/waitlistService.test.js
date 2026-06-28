import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockWaitlist = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
};
const mockClient = {
  find: jest.fn(),
};
const mockMessage = {
  create: jest.fn(),
};
const mockTierForCount = jest.fn();
const mockGetIO = jest.fn();
const mockUserRoom = jest.fn((id) => `user:${id}`);

jest.unstable_mockModule("../../models/Waitlist.js", () => ({
  default: mockWaitlist,
}));
jest.unstable_mockModule("../../models/Client.js", () => ({
  default: mockClient,
}));
jest.unstable_mockModule("../../models/Message.js", () => ({
  default: mockMessage,
}));
jest.unstable_mockModule("../../services/rewardsService.js", () => ({
  tierForCount: mockTierForCount,
}));
jest.unstable_mockModule("../../services/socketService.js", () => ({
  getIO: mockGetIO,
  userRoom: mockUserRoom,
}));

const {
  sortWaitlistByPriority,
  joinWaitlist,
  leaveWaitlist,
  getMyWaitlist,
  getArtistWaitlist,
  notifyWaitlistForArtist,
} = await import("../../services/waitlistService.js");

function clientFindChain(result) {
  return {
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(result),
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTierForCount.mockReturnValue({ key: "bronze", label: "Bronze" });
  mockUserRoom.mockImplementation((id) => `user:${id}`);
});

describe("sortWaitlistByPriority", () => {
  test("higher tier comes first", () => {
    const sorted = sortWaitlistByPriority([
      { _id: "a", priorityRank: 1, createdAt: "2026-01-01" },
      { _id: "b", priorityRank: 3, createdAt: "2026-01-02" },
      { _id: "c", priorityRank: 0, createdAt: "2026-01-01" },
    ]);
    expect(sorted.map((e) => e._id)).toEqual(["b", "a", "c"]);
  });

  test("same tier falls back to earliest join (FIFO)", () => {
    const sorted = sortWaitlistByPriority([
      { _id: "late", priorityRank: 2, createdAt: "2026-03-10" },
      { _id: "early", priorityRank: 2, createdAt: "2026-03-01" },
    ]);
    expect(sorted.map((e) => e._id)).toEqual(["early", "late"]);
  });

  test("does not mutate the input array", () => {
    const input = [
      { _id: "a", priorityRank: 0, createdAt: "2026-01-02" },
      { _id: "b", priorityRank: 1, createdAt: "2026-01-01" },
    ];
    sortWaitlistByPriority(input);
    expect(input.map((e) => e._id)).toEqual(["a", "b"]);
  });

  test("treats missing priorityRank as 0", () => {
    const sorted = sortWaitlistByPriority([
      { _id: "a", createdAt: "2026-01-02" },
      { _id: "b", priorityRank: 1, createdAt: "2026-01-01" },
    ]);
    expect(sorted.map((e) => e._id)).toEqual(["b", "a"]);
  });
});

describe("joinWaitlist", () => {
  test("throws 400 when artistId missing", async () => {
    await expect(joinWaitlist("c1", {})).rejects.toMatchObject({
      message: "artistId required",
      status: 400,
    });
    expect(mockWaitlist.findOne).not.toHaveBeenCalled();
  });

  test("returns existing entry when one is active/notified", async () => {
    const existing = { _id: "w1", artistId: "a1", clientId: "c1" };
    mockWaitlist.findOne.mockResolvedValue(existing);

    const result = await joinWaitlist("c1", { artistId: "a1" });

    expect(result).toBe(existing);
    expect(mockWaitlist.findOne).toHaveBeenCalledWith({
      artistId: "a1",
      clientId: "c1",
      status: { $in: ["active", "notified"] },
    });
    expect(mockWaitlist.create).not.toHaveBeenCalled();
  });

  test("creates a new entry with parsed dates and note", async () => {
    mockWaitlist.findOne.mockResolvedValue(null);
    const created = { _id: "w2" };
    mockWaitlist.create.mockResolvedValue(created);

    const result = await joinWaitlist("c1", {
      artistId: "a1",
      fromISO: "2026-07-01",
      toISO: "2026-07-10",
      note: "back piece",
    });

    expect(result).toBe(created);
    expect(mockWaitlist.create).toHaveBeenCalledWith({
      artistId: "a1",
      clientId: "c1",
      fromDate: new Date("2026-07-01"),
      toDate: new Date("2026-07-10"),
      note: "back piece",
    });
  });

  test("creates entry with undefined dates and empty note when omitted", async () => {
    mockWaitlist.findOne.mockResolvedValue(null);
    mockWaitlist.create.mockResolvedValue({ _id: "w3" });

    await joinWaitlist("c1", { artistId: "a1" });

    expect(mockWaitlist.create).toHaveBeenCalledWith({
      artistId: "a1",
      clientId: "c1",
      fromDate: undefined,
      toDate: undefined,
      note: "",
    });
  });
});

describe("leaveWaitlist", () => {
  test("returns null when entry not found", async () => {
    mockWaitlist.findById.mockResolvedValue(null);
    const result = await leaveWaitlist("c1", "w1");
    expect(result).toBeNull();
  });

  test("throws 403 when clientId does not match owner", async () => {
    mockWaitlist.findById.mockResolvedValue({ clientId: "other", save: jest.fn() });
    await expect(leaveWaitlist("c1", "w1")).rejects.toMatchObject({
      message: "forbidden",
      status: 403,
    });
  });

  test("cancels and saves entry for the owner", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const entry = { clientId: "c1", status: "active", save };
    mockWaitlist.findById.mockResolvedValue(entry);

    const result = await leaveWaitlist("c1", "w1");

    expect(entry.status).toBe("cancelled");
    expect(save).toHaveBeenCalled();
    expect(result).toBe(entry);
  });
});

describe("getMyWaitlist", () => {
  test("queries active/notified entries sorted by createdAt desc", async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: "w1" }]);
    const sort = jest.fn().mockReturnValue({ lean });
    mockWaitlist.find.mockReturnValue({ sort });

    const result = await getMyWaitlist("c1");

    expect(mockWaitlist.find).toHaveBeenCalledWith({
      clientId: "c1",
      status: { $in: ["active", "notified"] },
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toEqual([{ _id: "w1" }]);
  });
});

describe("getArtistWaitlist", () => {
  test("enriches entries with tier priority and sorts them", async () => {
    const entries = [
      { _id: "w1", clientId: "c1", createdAt: "2026-01-02" },
      { _id: "w2", clientId: "c2", createdAt: "2026-01-01" },
    ];
    mockWaitlist.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(entries),
    });
    mockClient.find.mockReturnValue(
      clientFindChain([
        { clerkId: "c1", completedBookingsCount: 0, username: "u1", avatar: "av1" },
        { clerkId: "c2", completedBookingsCount: 20, username: "u2", avatar: "av2" },
      ])
    );
    mockTierForCount.mockImplementation((n) =>
      n >= 20 ? { key: "gold", label: "Gold" } : { key: "bronze", label: "Bronze" }
    );

    const result = await getArtistWaitlist("a1");

    expect(mockWaitlist.find).toHaveBeenCalledWith({
      artistId: "a1",
      status: { $in: ["active", "notified"] },
    });
    expect(result.map((e) => e._id)).toEqual(["w2", "w1"]);
    expect(result[0]).toMatchObject({
      tierLabel: "Gold",
      priorityRank: 2,
      client: { username: "u2", avatar: "av2" },
    });
    expect(result[1].client).toEqual({ username: "u1", avatar: "av1" });
  });

  test("handles no entries without querying clients", async () => {
    mockWaitlist.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    const result = await getArtistWaitlist("a1");

    expect(result).toEqual([]);
    expect(mockClient.find).not.toHaveBeenCalled();
  });

  test("sets client to null when no matching client record", async () => {
    mockWaitlist.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: "w1", clientId: "ghost", createdAt: "2026-01-01" },
      ]),
    });
    mockClient.find.mockReturnValue(clientFindChain([]));

    const result = await getArtistWaitlist("a1");

    expect(result[0].client).toBeNull();
    expect(result[0].priorityRank).toBe(0);
  });

  test("calls toObject when entry exposes it", async () => {
    const toObject = jest.fn().mockReturnValue({
      _id: "w1",
      clientId: "c1",
      createdAt: "2026-01-01",
    });
    mockWaitlist.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: "w1", clientId: "c1", createdAt: "2026-01-01", toObject }]),
    });
    mockClient.find.mockReturnValue(
      clientFindChain([{ clerkId: "c1", completedBookingsCount: 0, username: "u1", avatar: "a" }])
    );

    await getArtistWaitlist("a1");

    expect(toObject).toHaveBeenCalled();
  });
});

describe("notifyWaitlistForArtist", () => {
  function makeEntry(id, clientId, extra = {}) {
    return {
      _id: id,
      clientId,
      createdAt: "2026-01-01",
      status: "active",
      save: jest.fn().mockResolvedValue(undefined),
      ...extra,
    };
  }

  test("returns [] when no active entries", async () => {
    mockWaitlist.find.mockResolvedValue([]);
    const result = await notifyWaitlistForArtist("a1");
    expect(result).toEqual([]);
    expect(mockMessage.create).not.toHaveBeenCalled();
  });

  test("returns [] when none match the date window", async () => {
    const entry = makeEntry("w1", "c1", {
      fromDate: "2026-08-01",
      toDate: "2026-08-10",
    });
    mockWaitlist.find.mockResolvedValue([entry]);

    const result = await notifyWaitlistForArtist("a1", { dateISO: "2026-07-01" });

    expect(result).toEqual([]);
    expect(entry.save).not.toHaveBeenCalled();
  });

  test("notifies matching entries, sends message and socket emit, marks notified", async () => {
    const e1 = makeEntry("w1", "c1");
    const e2 = makeEntry("w2", "c2");
    mockWaitlist.find.mockResolvedValue([e1, e2]);
    mockClient.find.mockReturnValue(clientFindChain([]));
    mockMessage.create.mockResolvedValue({});
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    mockGetIO.mockReturnValue({ to });

    const result = await notifyWaitlistForArtist("a1", { dateISO: "2026-07-05", limit: 5 });

    expect(result).toHaveLength(2);
    expect(e1.status).toBe("notified");
    expect(e1.notifiedAt).toBeInstanceOf(Date);
    expect(e1.save).toHaveBeenCalled();
    expect(mockMessage.create).toHaveBeenCalledTimes(2);
    expect(mockMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        senderId: "a1",
        receiverId: "c1",
        meta: expect.objectContaining({
          kind: "waitlist_slot_open",
          artistId: "a1",
          waitlistId: "w1",
        }),
      })
    );
    expect(to).toHaveBeenCalledWith("user:c1");
    expect(emit).toHaveBeenCalledWith("waitlist:slot_open", {
      artistId: "a1",
      waitlistId: "w1",
    });
  });

  test("respects the limit and only notifies the top entries", async () => {
    const entries = [
      makeEntry("w1", "c1"),
      makeEntry("w2", "c2"),
      makeEntry("w3", "c3"),
    ];
    mockWaitlist.find.mockResolvedValue(entries);
    mockClient.find.mockReturnValue(clientFindChain([]));
    mockMessage.create.mockResolvedValue({});
    mockGetIO.mockReturnValue(null);

    const result = await notifyWaitlistForArtist("a1", { limit: 1 });

    expect(result).toHaveLength(1);
    const saved = entries.filter((e) => e.save.mock.calls.length > 0);
    expect(saved).toHaveLength(1);
  });

  test("still notifies when Message.create throws", async () => {
    const e1 = makeEntry("w1", "c1");
    mockWaitlist.find.mockResolvedValue([e1]);
    mockClient.find.mockReturnValue(clientFindChain([]));
    mockMessage.create.mockRejectedValue(new Error("db down"));
    mockGetIO.mockReturnValue(null);

    const result = await notifyWaitlistForArtist("a1");

    expect(result).toHaveLength(1);
    expect(e1.save).toHaveBeenCalled();
  });

  test("swallows socket emit errors", async () => {
    const e1 = makeEntry("w1", "c1");
    mockWaitlist.find.mockResolvedValue([e1]);
    mockClient.find.mockReturnValue(clientFindChain([]));
    mockMessage.create.mockResolvedValue({});
    const to = jest.fn(() => {
      throw new Error("emit fail");
    });
    mockGetIO.mockReturnValue({ to });

    const result = await notifyWaitlistForArtist("a1");

    expect(result).toHaveLength(1);
  });

  test("works when getIO is undefined", async () => {
    const e1 = makeEntry("w1", "c1");
    mockWaitlist.find.mockResolvedValue([e1]);
    mockClient.find.mockReturnValue(clientFindChain([]));
    mockMessage.create.mockResolvedValue({});
    mockGetIO.mockReturnValue(undefined);

    const result = await notifyWaitlistForArtist("a1");

    expect(result).toHaveLength(1);
  });
});
