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