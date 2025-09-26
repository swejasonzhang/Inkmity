import Message from "../models/Message.js";
import User from "../models/User.js";

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      text,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    if (!userId || !otherUserId) {
      return res.status(400).json({ error: "Missing user IDs" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 });

    const otherUser = await User.findById(otherUserId).select("username role");

    res.status(200).json({
      participantId: otherUserId,
      username: otherUser?.username || "Unknown",
      role: otherUser?.role || "Unknown",
      messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const getAllMessagesForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "Missing user ID" });

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: 1 });

    const conversationsMap = {};
    for (const msg of messages) {
      const participantId =
        msg.senderId.toString() === userId
          ? msg.receiverId.toString()
          : msg.senderId.toString();

      if (!conversationsMap[participantId])
        conversationsMap[participantId] = [];
      conversationsMap[participantId].push(msg);
    }

    const participantIds = Object.keys(conversationsMap);
    const users = await User.find({ _id: { $in: participantIds } }).select(
      "username role"
    );
    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = { username: u.username, role: u.role };
      return acc;
    }, {});

    const conversations = Object.entries(conversationsMap).map(
      ([participantId, msgs]) => ({
        participantId,
        username: userMap[participantId]?.username || "Unknown",
        role: userMap[participantId]?.role || "Unknown",
        messages: msgs,
      })
    );

    res.status(200).json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};
