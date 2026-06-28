import { jest, describe, test, expect, beforeEach } from "@jest/globals";

process.env.NODE_ENV = "production";
process.env.CLERK_SECRET_KEY = "sk_test_dummy";

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

const { initSocket } = await import("../../services/socketService.js");

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
