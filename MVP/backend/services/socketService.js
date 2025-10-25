import Message from "../models/Message.js";

let io;
const onlineUsers = new Map();
const MAX_DECLINES = 3;

export const initSocket = (ioInstance) => {
  io = ioInstance;

  io.on("connection", (socket) => {
    socket.on("register", (clerkId) => {
      if (typeof clerkId !== "string" || !clerkId) return;
      onlineUsers.set(clerkId, socket.id);
      socket.join(userRoom(clerkId));
    });

    socket.on("unregister", () => {
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(uid);
          socket.leave(userRoom(uid));
          break;
        }
      }
    });

    socket.on("thread:join", ({ threadKey }) => {
      if (!threadKey) return;
      socket.join(threadRoom(threadKey));
    });

    socket.on("send_message", async (data, ack) => {
      try {
        const { senderId, receiverId, text, meta } = data || {};
        if (!senderId || !receiverId || !text)
          return ack?.({ error: "missing_fields" });

        const allowed = await isAllowedToChat(senderId, receiverId);
        if (!allowed) return ack?.({ error: "not_allowed" });

        const message = await Message.create({
          senderId: String(senderId),
          receiverId: String(receiverId),
          text: String(text),
          type: "message",
          meta: meta && typeof meta === "object" ? meta : undefined,
        });

        const payload = {
          senderId: message.senderId,
          receiverId: message.receiverId,
          text: message.text,
          timestamp: message.createdAt.getTime(),
          meta: message.meta || undefined,
        };

        io.to(userRoom(message.senderId))
          .to(userRoom(message.receiverId))
          .to(threadRoom(message.threadKey))
          .emit("message:new", {
            convoId: message.threadKey,
            message: payload,
          });

        ack?.({ ok: true, message: payload });
      } catch {
        ack?.({ error: "save_failed" });
      }
    });

    socket.on("disconnect", () => {
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(uid);
          break;
        }
      }
    });
  });
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
export const userRoom = (userId) => `user:${userId}`;
export const threadRoom = (threadKey) => `thread:${threadKey}`;

async function isAllowedToChat(a, b) {
  const accepted =
    (await Message.exists({
      type: "request",
      requestStatus: "accepted",
      senderId: a,
      receiverId: b,
    })) ||
    (await Message.exists({
      type: "request",
      requestStatus: "accepted",
      senderId: b,
      receiverId: a,
    }));
  if (!accepted) return false;

  const lastReq = await Message.findOne({
    type: "request",
    $or: [
      { senderId: a, receiverId: b },
      { senderId: b, receiverId: a },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastReq) return true;
  const clientId = lastReq.senderId;
  const artistId = lastReq.receiverId;
  const declines = await Message.countDocuments({
    type: "request",
    requestStatus: "declined",
    senderId: clientId,
    receiverId: artistId,
  });
  return declines < MAX_DECLINES;
}