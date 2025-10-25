import Message from "../models/Message.js";

export async function ensureMessagingAllowed(req, res, next) {
  const userId = req.auth.userId;
  const { receiverId } = req.body;
  if (!userId || !receiverId)
    return res.status(400).json({ error: "Missing ids" });

  const accepted = await Message.exists({
    type: "request",
    requestStatus: "accepted",
    $or: [
      { senderId: userId, receiverId },
      { senderId: receiverId, receiverId: userId },
    ],
  });
  if (!accepted) return res.status(403).json({ error: "Not allowed yet" });
  next();
}