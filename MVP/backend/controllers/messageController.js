// controllers/messageController.ts (or .js)
import Message from "../models/Message.js";
import User from "../models/User.js";

export const getAllMessagesForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: 1 });

    const conversationsMap = {};
    for (const m of messages) {
      const participantId = m.senderId === userId ? m.receiverId : m.senderId;
      if (!conversationsMap[participantId])
        conversationsMap[participantId] = [];
      conversationsMap[participantId].push({
        senderId: m.senderId,
        receiverId: m.receiverId,
        text: m.text,
        timestamp: m.createdAt.getTime(),
      });
    }

    const participantIds = Object.keys(conversationsMap);
    const users = await User.find({ clerkId: { $in: participantIds } }).select(
      "clerkId username"
    );
    const userMap = Object.fromEntries(
      users.map((u) => [u.clerkId, { username: u.username }])
    );

    const conversations = participantIds.map((pid) => ({
      participantId: pid,
      username: userMap[pid]?.username || "Unknown",
      messages: conversationsMap[pid],
    }));

    res.status(200).json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }
    // Optional: verify the sender matches the authenticated user
    if (req.auth?.userId && req.auth.userId !== senderId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const msg = await Message.create({ senderId, receiverId, text });
    res.status(201).json({
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      text: msg.text,
      timestamp: msg.createdAt.getTime(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create message" });
  }
};

export const deleteConversationForUser = async (req, res) => {
  try {
    const { userId, participantId } = req.body;
    if (!userId || !participantId) {
      return res.status(400).json({ error: "Missing userId or participantId" });
    }

    if (req.auth?.userId && req.auth.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { deletedCount } = await Message.deleteMany({
      $or: [
        { senderId: userId, receiverId: participantId },
        { senderId: participantId, receiverId: userId },
      ],
    });

    return res.status(200).json({
      ok: true,
      deletedCount,
      userId,
      participantId,
    });
  } catch (err) {
    console.error("Failed to delete conversation:", err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};
