import Message from "../models/Message.js";

export const sendMessage = async (req, res) => {
  try {
    const { sender, recipient, text } = req.body;
    const message = await Message.create({ sender, recipient, text });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { userId, otherUserId } = req.query;
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId },
      ],
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};