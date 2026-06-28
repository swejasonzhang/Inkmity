import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockMessage = {
  exists: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  ackForPair: jest.fn(),
};
const mockUser = { findOne: jest.fn(), find: jest.fn() };
const mockBooking = { find: jest.fn() };
const mockDeletedConv = { find: jest.fn(), findOneAndUpdate: jest.fn() };
const mockPermission = { find: jest.fn() };
const mockGetIO = jest.fn();
const mockGetOnlineUsers = jest.fn();

jest.unstable_mockModule("../../models/Message.js", () => ({ default: mockMessage }));
jest.unstable_mockModule("../../models/UserBase.js", () => ({ default: mockUser }));
jest.unstable_mockModule("../../models/Booking.js", () => ({ default: mockBooking }));
jest.unstable_mockModule("../../models/DeletedConversation.js", () => ({ default: mockDeletedConv }));
jest.unstable_mockModule("../../models/ClientBookingPermission.js", () => ({ default: mockPermission }));
jest.unstable_mockModule("../../services/socketService.js", () => ({
  getIO: mockGetIO,
  userRoom: (id) => `user:${id}`,
  threadRoom: (k) => `thread:${k}`,
  getOnlineUsers: mockGetOnlineUsers,
}));

const C = await import("../../controllers/messageController.js");

function q(value) {
  const obj = {
    sort: () => obj,
    limit: () => obj,
    select: () => obj,
    lean: () => Promise.resolve(value),
    then: (res, rej) => Promise.resolve(value).then(res, rej),
  };
  return obj;
}
function qReject(err) {
  const obj = {
    sort: () => obj,
    limit: () => obj,
    select: () => obj,
    lean: () => Promise.reject(err),
    then: (res, rej) => Promise.reject(err).then(res, rej),
  };
  return obj;
}
const mockIo = { to: jest.fn(() => mockIo), emit: jest.fn() };
const msgDoc = (over = {}) => ({
  _id: "msg1",
  senderId: "c1",
  receiverId: "a1",
  text: "hi",
  createdAt: new Date(),
  threadKey: "c1:a1",
  meta: {},
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.get("/messages/:userId", mockAuth, C.getAllMessagesForUser);
app.post("/messages", mockAuth, C.createMessage);
app.post("/messages/delete", mockAuth, C.deleteConversationForUser);
app.post("/requests", mockAuth, C.createMessageRequest);
app.get("/requests/incoming", mockAuth, C.listIncomingRequests);
app.post("/requests/:id/accept", mockAuth, C.acceptMessageRequest);
app.post("/requests/:id/decline", mockAuth, C.declineMessageRequest);
app.get("/gate/:artistId", mockAuth, C.getGateStatus);
app.get("/unread", mockAuth, C.getUnreadState);
app.get("/notifications", mockAuth, C.getNotifications);
app.post("/read", mockAuth, C.markConversationRead);

beforeEach(() => {
  jest.clearAllMocks();
  mockMessage.exists.mockResolvedValue(null);
  mockMessage.create.mockResolvedValue(msgDoc());
  mockMessage.find.mockReturnValue(q([]));
  mockMessage.findOne.mockReturnValue(q(null));
  mockMessage.aggregate.mockResolvedValue([]);
  mockMessage.countDocuments.mockResolvedValue(0);
  mockMessage.ackForPair.mockResolvedValue(undefined);
  mockUser.findOne.mockReturnValue(q({ clerkId: "c1", username: "Cli" }));
  mockUser.find.mockReturnValue(q([]));
  mockBooking.find.mockReturnValue(q([]));
  mockDeletedConv.find.mockReturnValue(q([]));
  mockDeletedConv.findOneAndUpdate.mockResolvedValue({});
  mockPermission.find.mockReturnValue(q([]));
  mockGetIO.mockReturnValue(mockIo);
  mockGetOnlineUsers.mockReturnValue(new Set());
});

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

describe("getAllMessagesForUser", () => {
  test("403 when reading another user's inbox", async () => {
    expect((await request(server).get("/messages/u1").set("x-test-user-id", "other")).status).toBe(403);
  });
  test("builds a conversation list from messages", async () => {
    mockMessage.find.mockReturnValue(q([
      { senderId: "u1", receiverId: "p1", text: "hey", createdAt: new Date(), seen: false, delivered: true },
    ]));
    mockUser.find.mockReturnValue(q([{ clerkId: "p1", username: "Pal", handle: "@pal" }]));
    const res = await request(server).get("/messages/u1").set("x-test-user-id", "u1");
    expect(res.status).toBe(200);
    expect(res.body[0].participantId).toBe("p1");
    expect(res.body[0].username).toBe("Pal");
  });
  test("500 on failure", async () => {
    mockDeletedConv.find.mockReturnValue({ lean: () => Promise.reject(new Error("db")) });
    expect((await request(server).get("/messages/u1").set("x-test-user-id", "u1")).status).toBe(500);
  });
});

describe("createMessage", () => {
  test("400 without receiver or text", async () => {
    expect((await request(server).post("/messages").set("x-test-user-id", "c1").send({ text: "hi" })).status).toBe(400);
  });
  test("401 without a sender", async () => {
    expect((await request(server).post("/messages").send({ receiverId: "a1", text: "hi" })).status).toBe(401);
  });
  test("403 when the body senderId doesn't match auth", async () => {
    const res = await request(server).post("/messages").set("x-test-user-id", "c1").send({ receiverId: "a1", text: "hi", senderId: "evil" });
    expect(res.status).toBe(403);
  });
  test("403 when the pair hasn't accepted a request", async () => {
    const res = await request(server).post("/messages").set("x-test-user-id", "c1").send({ receiverId: "a1", text: "hi" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("not_allowed");
  });
  test("sends a message once the request is accepted and emits realtime", async () => {
    mockMessage.exists.mockResolvedValueOnce(true);
    const res = await request(server).post("/messages").set("x-test-user-id", "c1").send({ receiverId: "a1", text: "check https://x.com out" });
    expect(res.status).toBe(201);
    expect(mockMessage.create).toHaveBeenCalled();
    expect(mockIo.emit).toHaveBeenCalledWith("message:new", expect.anything());
  });
  test("500 on failure", async () => {
    mockMessage.exists.mockResolvedValueOnce(true);
    mockMessage.create.mockRejectedValue(new Error("db"));
    expect((await request(server).post("/messages").set("x-test-user-id", "c1").send({ receiverId: "a1", text: "hi" })).status).toBe(500);
  });
});

describe("deleteConversationForUser", () => {
  test("400 without ids", async () => {
    expect((await request(server).post("/messages/delete").set("x-test-user-id", "u1").send({})).status).toBe(400);
  });
  test("403 on a user mismatch", async () => {
    const res = await request(server).post("/messages/delete").set("x-test-user-id", "other").send({ userId: "u1", participantId: "p1" });
    expect(res.status).toBe(403);
  });
  test("records the deletion and posts a contact-cut system message", async () => {
    mockMessage.create.mockResolvedValue(msgDoc({ senderId: "u1", receiverId: "p1" }));
    const res = await request(server).post("/messages/delete").set("x-test-user-id", "u1").send({ userId: "u1", participantId: "p1" });
    expect(res.body.ok).toBe(true);
    expect(mockDeletedConv.findOneAndUpdate).toHaveBeenCalled();
    expect(mockMessage.create).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ kind: "contact_cut" }) }));
  });
});

describe("createMessageRequest", () => {
  test("400 when fields are missing", async () => {
    expect((await request(server).post("/requests").send({ artistId: "a1", text: "hi" })).status).toBe(400);
  });
  test("409 when already accepted", async () => {
    mockMessage.exists.mockResolvedValueOnce(true);
    const res = await request(server).post("/requests").set("x-test-user-id", "c1").send({ artistId: "a1", text: "hi" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("already_accepted");
  });
  test("403 when blocked by too many declines", async () => {
    mockMessage.countDocuments.mockResolvedValue(99);
    const res = await request(server).post("/requests").set("x-test-user-id", "c1").send({ artistId: "a1", text: "hi" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("blocked_by_declines");
  });
  test("409 when a request is already pending", async () => {
    mockMessage.exists.mockResolvedValueOnce(null).mockResolvedValueOnce(true);
    const res = await request(server).post("/requests").set("x-test-user-id", "c1").send({ artistId: "a1", text: "hi" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("already_pending");
  });
  test("creates a pending request and notifies the artist", async () => {
    mockMessage.create.mockResolvedValue(msgDoc({ type: "request" }));
    const res = await request(server).post("/requests").set("x-test-user-id", "c1").send({ artistId: "a1", text: "see https://ref.com" });
    expect(res.body.ok).toBe(true);
    expect(mockIo.emit).toHaveBeenCalledWith("conversation:pending", expect.anything());
  });
});

describe("request inbox + accept/decline", () => {
  test("lists incoming pending requests", async () => {
    mockMessage.find.mockReturnValue(q([{ _id: "r1" }]));
    const res = await request(server).get("/requests/incoming").set("x-test-user-id", "a1");
    expect(res.body.requests).toHaveLength(1);
  });
  test("404 when accepting a request that isn't yours", async () => {
    expect((await request(server).post("/requests/r1/accept").set("x-test-user-id", "a1")).status).toBe(404);
  });
  test("accepts a request and emits conversation:accepted", async () => {
    const m = msgDoc({ type: "request" });
    mockMessage.findOne.mockReturnValue(q(m));
    const res = await request(server).post("/requests/r1/accept").set("x-test-user-id", "a1");
    expect(res.body.ok).toBe(true);
    expect(m.requestStatus).toBe("accepted");
    expect(mockIo.emit).toHaveBeenCalledWith("conversation:accepted", expect.anything());
  });
  test("declines a request, sends the preset message, and reports decline count", async () => {
    const m = msgDoc({ type: "request" });
    mockMessage.findOne.mockReturnValue(q(m));
    mockMessage.countDocuments.mockResolvedValue(1);
    const res = await request(server).post("/requests/r1/decline").set("x-test-user-id", "a1");
    expect(m.requestStatus).toBe("declined");
    expect(res.body.declines).toBe(1);
    expect(mockMessage.create).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ kind: "decline_notification" }) }));
  });
});

describe("getGateStatus", () => {
  test("reports the gate state for a client/artist pair", async () => {
    mockMessage.exists.mockResolvedValue(true);
    mockMessage.findOne.mockReturnValue(q({ requestStatus: "accepted" }));
    mockMessage.countDocuments.mockResolvedValue(0);
    const res = await request(server).get("/gate/a1").set("x-test-user-id", "c1");
    expect(res.body).toMatchObject({ allowed: true, lastStatus: "accepted", blocked: false });
  });
  test("500 on failure", async () => {
    mockMessage.exists.mockRejectedValue(new Error("db"));
    expect((await request(server).get("/gate/a1").set("x-test-user-id", "c1")).status).toBe(500);
  });
});

describe("getUnreadState", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).get("/unread")).status).toBe(401);
  });
  test("returns unread conversations and pending request ids", async () => {
    mockMessage.find
      .mockReturnValueOnce(q([{ senderId: "c1" }, { senderId: "c1" }, { senderId: "c2" }]))
      .mockReturnValueOnce(q([{ _id: "r1" }]));
    const res = await request(server).get("/unread").set("x-test-user-id", "a1");
    expect(res.body.counts).toEqual({ unreadConversations: 2, pendingRequests: 1 });
  });
});

describe("getNotifications", () => {
  test("401 when unauthenticated", async () => {
    expect((await request(server).get("/notifications")).status).toBe(401);
  });
  test("aggregates unread messages, pending requests, and pending bookings", async () => {
    mockMessage.find
      .mockReturnValueOnce(q([{ _id: "m1", senderId: "c1", text: "hi", createdAt: new Date() }]))
      .mockReturnValueOnce(q([{ _id: "r1", senderId: "c2", text: "req", createdAt: new Date() }]));
    mockBooking.find.mockReturnValue(q([{ _id: "b1", clientId: "c3", appointmentType: "consultation", createdAt: new Date() }]));
    mockUser.find.mockReturnValue(q([{ clerkId: "c1", username: "Cli" }]));
    const res = await request(server).get("/notifications").set("x-test-user-id", "a1");
    expect(res.body.items).toHaveLength(3);
    expect(res.body.items.some((i) => i.kind === "booking_request")).toBe(true);
  });
});

describe("markConversationRead", () => {
  test("400 without a viewer/other", async () => {
    expect((await request(server).post("/read").send({})).status).toBe(400);
  });
  test("403 on a user mismatch", async () => {
    const res = await request(server).post("/read").set("x-test-user-id", "a1").send({ userId: "other", participantId: "c1" });
    expect(res.status).toBe(403);
  });
  test("acks the pair and emits read receipts", async () => {
    const res = await request(server).post("/read").set("x-test-user-id", "a1").send({ participantId: "c1" });
    expect(res.body.ok).toBe(true);
    expect(mockMessage.ackForPair).toHaveBeenCalledWith("a1", "c1");
    expect(mockIo.emit).toHaveBeenCalledWith("conversation:ack", expect.anything());
  });
  test("500 on failure", async () => {
    mockMessage.ackForPair.mockRejectedValue(new Error("db"));
    expect((await request(server).post("/read").set("x-test-user-id", "a1").send({ participantId: "c1" })).status).toBe(500);
  });
});

describe("getAllMessagesForUser — request bucketing", () => {
  test("folds pending/accepted requests into the conversation with status meta", async () => {
    mockMessage.aggregate.mockResolvedValue([
      { doc: { senderId: "u1", receiverId: "p1", text: "req", createdAt: new Date(), requestStatus: "pending", meta: {} } },
    ]);
    mockUser.find.mockReturnValue(q([{ clerkId: "p1", username: "Pal" }]));
    mockMessage.findOne.mockReturnValue(q({ requestStatus: "accepted", senderId: "u1", receiverId: "p1" }));
    mockMessage.countDocuments.mockResolvedValue(0);
    const res = await request(server).get("/messages/u1").set("x-test-user-id", "u1");
    expect(res.status).toBe(200);
    expect(res.body[0].participantId).toBe("p1");
    expect(res.body[0].meta.lastStatus).toBe("accepted");
  });
});

describe("catch -> 500 paths", () => {
  test("createMessageRequest", async () => {
    mockMessage.exists.mockRejectedValue(new Error("db"));
    expect((await request(server).post("/requests").set("x-test-user-id", "c1").send({ artistId: "a1", text: "hi" })).status).toBe(500);
  });
  test("listIncomingRequests", async () => {
    mockMessage.find.mockReturnValue(qReject(new Error("db")));
    expect((await request(server).get("/requests/incoming").set("x-test-user-id", "a1")).status).toBe(500);
  });
  test("acceptMessageRequest", async () => {
    mockMessage.findOne.mockReturnValue(qReject(new Error("db")));
    expect((await request(server).post("/requests/r1/accept").set("x-test-user-id", "a1")).status).toBe(500);
  });
  test("declineMessageRequest", async () => {
    mockMessage.findOne.mockReturnValue(qReject(new Error("db")));
    expect((await request(server).post("/requests/r1/decline").set("x-test-user-id", "a1")).status).toBe(500);
  });
  test("getUnreadState", async () => {
    mockMessage.find.mockReturnValue(qReject(new Error("db")));
    expect((await request(server).get("/unread").set("x-test-user-id", "a1")).status).toBe(500);
  });
  test("getNotifications", async () => {
    mockMessage.find.mockReturnValue(qReject(new Error("db")));
    expect((await request(server).get("/notifications").set("x-test-user-id", "a1")).status).toBe(500);
  });
  test("deleteConversationForUser", async () => {
    mockDeletedConv.findOneAndUpdate.mockRejectedValue(new Error("db"));
    const res = await request(server).post("/messages/delete").set("x-test-user-id", "u1").send({ userId: "u1", participantId: "p1" });
    expect(res.status).toBe(500);
  });
});
