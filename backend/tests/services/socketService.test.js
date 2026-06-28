import { jest, describe, test, expect, beforeEach } from "@jest/globals";

process.env.NODE_ENV = "production";
process.env.CLERK_SECRET_KEY = "sk_test_dummy";

const flush = () => new Promise((r) => setTimeout(r, 0));

const mockVerifyToken = jest.fn();
jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: mockVerifyToken,
  requireAuth: () => (req, res, next) => next(),
  getAuth: () => ({}),
}));

const mockMessage = {
  create: jest.fn(),
  exists: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
};
const mockUser = { updateOne: jest.fn().mockResolvedValue({}) };
jest.unstable_mockModule("../../models/Message.js", () => ({ default: mockMessage }));
jest.unstable_mockModule("../../models/UserBase.js", () => ({ default: mockUser }));

const socketModule = await import("../../services/socketService.js");
const {
  initSocket,
  emitToUser,
  emitBookingUpdate,
  emitBookingCreated,
  emitArtistProfileUpdated,
  emitAvailabilityUpdated,
  emitMessageCreated,
  getIO,
  isUserOnline,
  getOnlineUsers,
  userRoom,
  threadRoom,
} = socketModule;

function chain() {
  const c = { emit: jest.fn() };
  c.to = jest.fn(() => c);
  return c;
}

function makeIo() {
  return {
    _use: null,
    _conn: null,
    use(fn) {
      this._use = fn;
    },
    on(evt, fn) {
      if (evt === "connection") this._conn = fn;
    },
    emit: jest.fn(),
    to: jest.fn(() => chain()),
  };
}

function makeSocket(token) {
  const handlers = {};
  return {
    id: "sock1",
    handshake: { auth: token === undefined ? {} : { token } },
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    on: jest.fn((evt, fn) => {
      handlers[evt] = fn;
    }),
    _handlers: handlers,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.updateOne.mockResolvedValue({});
});

describe("socket handshake auth (io.use)", () => {
  test("verifies a valid token and derives the user id server-side", async () => {
    mockVerifyToken.mockResolvedValue({ sub: "user_verified" });
    const io = makeIo();
    initSocket(io);
    const socket = makeSocket("good-token");
    const next = jest.fn();

    await io._use(socket, next);

    expect(mockVerifyToken).toHaveBeenCalledWith(
      "good-token",
      expect.objectContaining({ secretKey: "sk_test_dummy" })
    );
    expect(socket.data.verifiedUserId).toBe("user_verified");
    expect(next).toHaveBeenCalledWith();
  });

  test("rejects a connection with no token in production", async () => {
    const io = makeIo();
    initSocket(io);
    const socket = makeSocket(undefined);
    const next = jest.fn();

    await io._use(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(socket.data.verifiedUserId).toBeUndefined();
  });

  test("rejects an invalid/expired token in production", async () => {
    mockVerifyToken.mockRejectedValue(new Error("expired"));
    const io = makeIo();
    initSocket(io);
    const socket = makeSocket("bad-token");
    const next = jest.fn();

    await io._use(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("socket identity cannot be spoofed", () => {
  async function connect(verifiedId) {
    mockVerifyToken.mockResolvedValue({ sub: verifiedId });
    const io = makeIo();
    initSocket(io);
    const socket = makeSocket("good-token");
    await io._use(socket, jest.fn());
    io._conn(socket);
    return { io, socket };
  }

  test("register joins the verified user's room and ignores a spoofed id", async () => {
    const { socket } = await connect("real_user");

    await socket._handlers["register"]("victim_user");

    expect(socket.join).toHaveBeenCalledWith("user:real_user");
    expect(socket.join).not.toHaveBeenCalledWith("user:victim_user");
  });

  test("send_message attributes the message to the verified sender, not the client-claimed one", async () => {
    mockMessage.exists.mockResolvedValue(true);
    mockMessage.findOne.mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(null) }) });
    mockMessage.create.mockResolvedValue({
      senderId: "real_user",
      receiverId: "artist1",
      text: "hi",
      createdAt: new Date(),
      threadKey: "t1",
      meta: undefined,
    });

    const { socket } = await connect("real_user");
    const ack = jest.fn();

    await socket._handlers["send_message"](
      { senderId: "ATTACKER_SPOOF", receiverId: "artist1", text: "hi" },
      ack
    );

    expect(mockMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: "real_user", receiverId: "artist1" })
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});

describe("room + helper formatting", () => {
  test("userRoom and threadRoom format keys", () => {
    expect(userRoom("u1")).toBe("user:u1");
    expect(threadRoom("a:b")).toBe("thread:a:b");
  });
});

async function connectVerified(verifiedId, id = "sock1") {
  mockVerifyToken.mockResolvedValue({ sub: verifiedId });
  const io = makeIo();
  initSocket(io);
  const socket = makeSocket("good-token");
  socket.id = id;
  await io._use(socket, jest.fn());
  io._conn(socket);
  return { io, socket };
}

describe("getIO / online-users tracking", () => {
  test("getIO returns the io instance after init", () => {
    const io = makeIo();
    initSocket(io);
    expect(getIO()).toBe(io);
  });

  test("register adds the user to online users and emits presence", async () => {
    const { io, socket } = await connectVerified("on_user", "sON");

    await socket._handlers["register"]("on_user");
    await flush();

    expect(isUserOnline("on_user")).toBe(true);
    expect(getOnlineUsers()).toBeInstanceOf(Set);
    expect(getOnlineUsers().has("on_user")).toBe(true);
    expect(mockUser.updateOne).toHaveBeenCalledWith(
      { clerkId: "on_user" },
      { lastActive: expect.any(Date) }
    );
    expect(io.emit).toHaveBeenCalledWith(
      "user:online",
      expect.objectContaining({ clerkId: "on_user", socketId: "sON" })
    );
    expect(io.emit).toHaveBeenCalledWith(
      "user:activity:updated",
      expect.objectContaining({ userId: "on_user" })
    );
  });

  test("register ignores when no resolvable user id", async () => {
    mockVerifyToken.mockResolvedValue({ sub: undefined });
    const io = makeIo();
    initSocket(io);
    const socket = makeSocket("good-token");
    await io._use(socket, jest.fn());
    io._conn(socket);

    await socket._handlers["register"]("anything");

    expect(socket.join).not.toHaveBeenCalled();
  });

  test("unregister removes the user and emits offline", async () => {
    const { io, socket } = await connectVerified("off_user", "sOFF");
    await socket._handlers["register"]("off_user");
    expect(isUserOnline("off_user")).toBe(true);

    socket._handlers["unregister"]();

    expect(isUserOnline("off_user")).toBe(false);
    expect(socket.leave).toHaveBeenCalledWith("user:off_user");
    expect(io.emit).toHaveBeenCalledWith("user:offline", { clerkId: "off_user" });
  });

  test("disconnect removes the user and emits offline", async () => {
    const { io, socket } = await connectVerified("dc_user", "sDC");
    await socket._handlers["register"]("dc_user");

    socket._handlers["disconnect"]();

    expect(isUserOnline("dc_user")).toBe(false);
    expect(io.emit).toHaveBeenCalledWith("user:offline", { clerkId: "dc_user" });
  });
});

describe("thread:join", () => {
  test("ignores when threadKey missing", async () => {
    const { socket } = await connectVerified("viewer", "sTJ0");
    await socket._handlers["register"]("viewer");
    await socket._handlers["thread:join"]({});
    expect(socket.join).not.toHaveBeenCalledWith(expect.stringContaining("thread:"));
  });

  test("acks the pair and emits conversation:ack + unread:update", async () => {
    mockMessage.ackForPair = jest.fn().mockResolvedValue({});
    const { io, socket } = await connectVerified("viewer", "sTJ");
    await socket._handlers["register"]("viewer");

    await socket._handlers["thread:join"]({ threadKey: "viewer:other" });

    expect(socket.join).toHaveBeenCalledWith("thread:viewer:other");
    expect(mockMessage.ackForPair).toHaveBeenCalledWith("viewer", "other");
    const emitted = io.to.mock.results.flatMap((r) => r.value.emit.mock.calls);
    expect(emitted.some(([e]) => e === "conversation:ack")).toBe(true);
    expect(emitted.some(([e]) => e === "unread:update")).toBe(true);
  });

  test("does not ack when viewer is not part of the thread", async () => {
    mockMessage.ackForPair = jest.fn().mockResolvedValue({});
    const { socket } = await connectVerified("viewer", "sTJ2");
    await socket._handlers["register"]("viewer");

    await socket._handlers["thread:join"]({ threadKey: "alice:bob" });

    expect(socket.join).toHaveBeenCalledWith("thread:alice:bob");
    expect(mockMessage.ackForPair).not.toHaveBeenCalled();
  });
});

describe("send_message validation branches", () => {
  test("returns missing_fields when receiver or text absent", async () => {
    const { socket } = await connectVerified("sender", "sSM1");
    await socket._handlers["register"]("sender");
    const ack = jest.fn();

    await socket._handlers["send_message"]({ receiverId: "", text: "" }, ack);

    expect(ack).toHaveBeenCalledWith({ error: "missing_fields" });
    expect(mockMessage.create).not.toHaveBeenCalled();
  });

  test("returns not_allowed when chat is not permitted", async () => {
    mockMessage.exists.mockResolvedValue(false);
    const { socket } = await connectVerified("sender", "sSM2");
    await socket._handlers["register"]("sender");
    const ack = jest.fn();

    await socket._handlers["send_message"](
      { receiverId: "artist", text: "hi" },
      ack
    );

    expect(ack).toHaveBeenCalledWith({ error: "not_allowed" });
  });

  test("returns save_failed when create throws", async () => {
    mockMessage.exists.mockResolvedValue(true);
    mockMessage.findOne.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve(null) }),
    });
    mockMessage.create.mockRejectedValue(new Error("db down"));
    const { socket } = await connectVerified("sender", "sSM3");
    await socket._handlers["register"]("sender");
    const ack = jest.fn();

    await socket._handlers["send_message"](
      { receiverId: "artist", text: "hi" },
      ack
    );

    expect(ack).toHaveBeenCalledWith({ error: "save_failed" });
  });

  test("blocks chat once declines hit the max", async () => {
    mockMessage.exists.mockResolvedValue(true);
    mockMessage.findOne.mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve({ senderId: "client", receiverId: "artist" }),
      }),
    });
    mockMessage.countDocuments.mockResolvedValue(99);
    const { socket } = await connectVerified("client", "sSM4");
    await socket._handlers["register"]("client");
    const ack = jest.fn();

    await socket._handlers["send_message"](
      { receiverId: "artist", text: "hi" },
      ack
    );

    expect(ack).toHaveBeenCalledWith({ error: "not_allowed" });
    expect(mockMessage.create).not.toHaveBeenCalled();
  });

  test("allows chat when declines are under the max and emits message:new", async () => {
    mockMessage.exists.mockResolvedValue(true);
    mockMessage.findOne.mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve({ senderId: "client", receiverId: "artist" }),
      }),
    });
    mockMessage.countDocuments.mockResolvedValue(0);
    mockMessage.create.mockResolvedValue({
      senderId: "client",
      receiverId: "artist",
      text: "hi",
      createdAt: new Date(),
      threadKey: "client:artist",
      meta: { foo: 1 },
    });
    const { io, socket } = await connectVerified("client", "sSM5");
    await socket._handlers["register"]("client");
    const ack = jest.fn();

    await socket._handlers["send_message"](
      { receiverId: "artist", text: "hi", meta: { foo: 1 } },
      ack
    );

    expect(mockMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: "client", meta: { foo: 1 } })
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    const emitted = io.to.mock.results.flatMap((r) => r.value.emit.mock.calls);
    expect(emitted.some(([e]) => e === "message:new")).toBe(true);
  });
});

describe("emit helpers", () => {
  let io;
  beforeEach(() => {
    io = makeIo();
    initSocket(io);
  });

  test("emitToUser routes to the user room", () => {
    emitToUser("u1", "ping", { a: 1 });
    expect(io.to).toHaveBeenCalledWith("user:u1");
    const chainObj = io.to.mock.results[0].value;
    expect(chainObj.emit).toHaveBeenCalledWith("ping", { a: 1 });
  });

  test("emitToUser is a no-op without a userId", () => {
    emitToUser("", "ping", {});
    expect(io.to).not.toHaveBeenCalled();
  });

  test("emitBookingUpdate emits booking:updated to both parties", () => {
    emitBookingUpdate(
      { _id: "b1", artistId: "a1", clientId: "c1", status: "confirmed", startAt: 1 },
      "confirmed"
    );
    expect(io.to).toHaveBeenCalledWith("user:a1");
    const chainObj = io.to.mock.results[0].value;
    expect(chainObj.emit).toHaveBeenCalledWith(
      "booking:updated",
      expect.objectContaining({ type: "confirmed", bookingId: "b1" })
    );
  });

  test("emitBookingUpdate defaults type to updated", () => {
    emitBookingUpdate({ _id: "b2", artistId: "a", clientId: "c" });
    const chainObj = io.to.mock.results[0].value;
    expect(chainObj.emit).toHaveBeenCalledWith(
      "booking:updated",
      expect.objectContaining({ type: "updated" })
    );
  });

  test("emitBookingUpdate no-op without booking", () => {
    emitBookingUpdate(null, "x");
    expect(io.to).not.toHaveBeenCalled();
  });

  test("emitBookingCreated emits booking:created", () => {
    emitBookingCreated({ _id: "b1", artistId: "a1", clientId: "c1", startAt: 5 });
    const chainObj = io.to.mock.results[0].value;
    expect(chainObj.emit).toHaveBeenCalledWith(
      "booking:created",
      expect.objectContaining({ bookingId: "b1", startAt: 5 })
    );
  });

  test("emitBookingCreated no-op without booking", () => {
    emitBookingCreated(null);
    expect(io.to).not.toHaveBeenCalled();
  });

  test("emitArtistProfileUpdated broadcasts", () => {
    emitArtistProfileUpdated("artistX");
    expect(io.emit).toHaveBeenCalledWith("artist:profile:updated", {
      clerkId: "artistX",
    });
  });

  test("emitAvailabilityUpdated broadcasts", () => {
    emitAvailabilityUpdated("artistY");
    expect(io.emit).toHaveBeenCalledWith("availability:updated", {
      artistId: "artistY",
    });
  });

  test("emitMessageCreated emits message:new and unread:update", () => {
    emitMessageCreated({
      senderId: "s1",
      receiverId: "r1",
      text: "yo",
      createdAt: new Date(),
      threadKey: "s1:r1",
      delivered: true,
      seen: false,
    });
    const emitted = io.to.mock.results.flatMap((r) => r.value.emit.mock.calls);
    expect(emitted.some(([e]) => e === "message:new")).toBe(true);
    expect(emitted.some(([e]) => e === "unread:update")).toBe(true);
  });

  test("emitMessageCreated handles a non-Date createdAt", () => {
    emitMessageCreated({
      senderId: "s2",
      receiverId: "r2",
      text: "yo",
      createdAt: undefined,
      threadKey: "s2:r2",
    });
    const emitted = io.to.mock.results.flatMap((r) => r.value.emit.mock.calls);
    const msgNew = emitted.find(([e]) => e === "message:new");
    expect(typeof msgNew[1].message.timestamp).toBe("number");
  });

  test("emitMessageCreated no-op without message", () => {
    emitMessageCreated(null);
    expect(io.to).not.toHaveBeenCalled();
  });
});

describe("emit helpers without an io instance", () => {
  test("are safe no-ops when io is falsy via guards", () => {
    const io = makeIo();
    initSocket(io);
    expect(() => emitArtistProfileUpdated()).not.toThrow();
    expect(() => emitAvailabilityUpdated()).not.toThrow();
  });
});
