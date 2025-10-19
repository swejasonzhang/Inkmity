import Message from "../models/Message.js";
import User from "../models/UserBase.js";

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
        meta: m.meta || undefined,
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
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const createMessage = async (req, res) => {
  try {
    const {
      receiverId,
      text,
      budgetCents,
      style,
      targetDateISO,
      referenceUrls,
      senderId: bodySenderId,
    } = req.body || {};
    if (!receiverId || !text)
      return res.status(400).json({ error: "missing_fields" });

    const authSenderId = String(
      req.user?.clerkId || req.auth?.userId || bodySenderId || ""
    );
    if (!authSenderId) return res.status(401).json({ error: "Unauthorized" });
    if (bodySenderId && bodySenderId !== authSenderId)
      return res.status(403).json({ error: "Forbidden" });

    const msg = await Message.create({
      senderId: authSenderId,
      receiverId: String(receiverId),
      text,
      meta: {
        budgetCents: Number.isFinite(budgetCents) ? budgetCents : undefined,
        style: style || undefined,
        targetDateISO: targetDateISO || undefined,
        referenceUrls: Array.isArray(referenceUrls) ? referenceUrls : undefined,
      },
    });

    res.status(201).json({
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      text: msg.text,
      timestamp: msg.createdAt.getTime(),
      meta: msg.meta || undefined,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create message" });
  }
};

export const deleteConversationForUser = async (req, res) => {
  try {
    const { userId, participantId } = req.body;
    if (!userId || !participantId)
      return res.status(400).json({ error: "Missing userId or participantId" });

    const authUserId = String(req.user?.clerkId || req.auth?.userId || "");
    if (authUserId && authUserId !== userId)
      return res.status(403).json({ error: "Forbidden" });

    const { deletedCount } = await Message.deleteMany({
      $or: [
        { senderId: userId, receiverId: participantId },
        { senderId: participantId, receiverId: userId },
      ],
    });

    res.status(200).json({ ok: true, deletedCount, userId, participantId });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};