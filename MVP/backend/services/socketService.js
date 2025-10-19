import Message from "../models/Message.js";

let io;
const onlineUsers = new Map();

export const initSocket = (ioInstance) => {
  io = ioInstance;

  io.on("connection", (socket) => {
    socket.on("register", (clerkId) => {
      if (typeof clerkId !== "string" || !clerkId) return;
      onlineUsers.set(clerkId, socket.id);
    });

    socket.on("unregister", () => {
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(uid);
          break;
        }
      }
    });

    socket.on("send_message", async (data, ack) => {
      try {
        const { senderId, receiverId, text, meta } = data || {};
        if (!senderId || !receiverId || !text) {
          const err = { error: "missing_fields" };
          if (ack) return ack(err);
          return;
        }

        const message = await Message.create({
          senderId: String(senderId),
          receiverId: String(receiverId),
          text: String(text),
          meta: meta && typeof meta === "object" ? meta : undefined,
        });

        const payload = {
          senderId: message.senderId,
          receiverId: message.receiverId,
          text: message.text,
          timestamp: message.createdAt.getTime(),
          meta: message.meta || undefined,
        };

        const recipientSocket = onlineUsers.get(String(receiverId));
        if (recipientSocket) {
          io.to(recipientSocket).emit("receive_message", payload);
        }

        if (ack) ack({ ok: true, message: payload });
      } catch {
        if (ack) ack({ error: "save_failed" });
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