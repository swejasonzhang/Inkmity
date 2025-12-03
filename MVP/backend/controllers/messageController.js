import Message from "../models/Message.js";
import User from "../models/UserBase.js";
import mongoose from "mongoose";
import { getIO, userRoom, threadRoom } from "../services/socketService.js";

const MAX_DECLINES = 99;

function toUrlList(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((r) => (typeof r === "string" ? r : r?.url))
    .filter((u) => typeof u === "string" && u.trim().length > 0)
    .map((u) => u.trim());
}

function extractUrlsFromText(text) {
  if (typeof text !== "string") return [];
  const rx = /\bhttps?:\/\/[^\s)]+/gi;
  return Array.from(
    new Set((text.match(rx) || []).map((u) => u.replace(/[),.]+$/, "")))
  );
}

async function latestRequestBetween(a, b) {
  return Message.findOne({
    type: "request",
    $or: [
      { senderId: a, receiverId: b },
      { senderId: b, receiverId: a },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
}

async function declineCount(clientId, artistId) {
  return Message.countDocuments({
    type: "request",
    requestStatus: "declined",
    senderId: clientId,
    receiverId: artistId,
  });
}

export const getAllMessagesForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const chats = await Message.find({
      type: "message",
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: 1 })
      .lean();
    const buckets = new Map();
    const unreadSet = new Set();
    for (const m of chats) {
      const pid = m.senderId === userId ? m.receiverId : m.senderId;
      if (!buckets.has(pid)) buckets.set(pid, { messages: [] });
      buckets.get(pid).messages.push({
        senderId: m.senderId,
        receiverId: m.receiverId,
        text: m.text,
        timestamp: new Date(m.createdAt).getTime(),
        meta: m.meta || undefined,
        delivered: !!m.delivered,
        seen: !!m.seen,
        deliveredAt: m.deliveredAt ? new Date(m.deliveredAt).getTime() : undefined,
        seenAt: m.seenAt ? new Date(m.seenAt).getTime() : undefined,
      });
      if (m.receiverId === userId && !m.seen) unreadSet.add(pid);
    }
    const reqs = await Message.aggregate([
      {
        $match: {
          type: "request",
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { a: "$senderId", b: "$receiverId" },
          doc: { $first: "$$ROOT" },
        },
      },
    ]);
    for (const r of reqs) {
      const doc = r.doc;
      if (doc.requestStatus !== "pending" && doc.requestStatus !== "accepted")
        continue;
      const pid = doc.senderId === userId ? doc.receiverId : doc.senderId;
      if (!buckets.has(pid)) buckets.set(pid, { messages: [] });
      const arr = buckets.get(pid).messages;
      const ts = new Date(doc.createdAt).getTime();
      const exists = arr.some(
        (m) => m.meta?.kind === "request" && m.timestamp === ts
      );
      if (!exists) {
        arr.unshift({
          senderId: doc.senderId,
          receiverId: doc.receiverId,
          text: doc.text,
          timestamp: ts,
          meta: {
            ...(doc.meta || {}),
            kind: "request",
            status: doc.requestStatus,
          },
          delivered: !!doc.delivered,
          seen: !!doc.seen,
        });
      }
    }
    const participantIds = [...buckets.keys()];
    const users = await User.find({ clerkId: { $in: participantIds } }).select(
      "clerkId username avatar"
    ).lean();
    const userMap = Object.fromEntries(
      users.map((u) => [u.clerkId, { username: u.username, avatarUrl: u.avatar?.url || undefined }])
    );
    const convs = [];
    for (const pid of participantIds) {
      const lastReq = await latestRequestBetween(userId, pid);
      let declines = 0;
      let lastStatus = null;
      let allowed = false;
      let blocked = false;
      if (lastReq) {
        lastStatus = lastReq.requestStatus || null;
        const clientId = lastReq.senderId;
        const artistId = lastReq.receiverId;
        declines = await declineCount(clientId, artistId);
        blocked = declines >= MAX_DECLINES;
        allowed = lastStatus === "accepted";
      }
      if (blocked) continue;
      convs.push({
        participantId: pid,
        username: userMap[pid]?.username || "Unknown",
        avatarUrl: userMap[pid]?.avatarUrl,
        messages: buckets.get(pid).messages,
        meta: {
          allowed,
          lastStatus,
          declines,
          blocked,
          unread: unreadSet.has(pid) ? 1 : 0,
        },
      });
    }
    convs.sort((a, b) => {
      const at = a.messages[a.messages.length - 1]?.timestamp || 0;
      const bt = b.messages[b.messages.length - 1]?.timestamp || 0;
      return at - bt;
    });
    res.status(200).json(convs);
  } catch (e) {
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
      meta,
    } = req.body || {};
    if (!receiverId || !text)
      return res.status(400).json({ error: "missing_fields" });
    const authSenderId = String(
      req.user?.clerkId || req.auth?.userId || bodySenderId || ""
    );
    if (!authSenderId) return res.status(401).json({ error: "Unauthorized" });
    if (bodySenderId && bodySenderId !== authSenderId)
      return res.status(403).json({ error: "Forbidden" });
    const accepted =
      (await Message.exists({
        type: "request",
        requestStatus: "accepted",
        senderId: authSenderId,
        receiverId: String(receiverId),
      })) ||
      (await Message.exists({
        type: "request",
        requestStatus: "accepted",
        senderId: String(receiverId),
        receiverId: authSenderId,
      }));
    if (!accepted) return res.status(403).json({ error: "not_allowed" });
    const urlsFromText = extractUrlsFromText(text);
    const now = new Date();
    const msg = await Message.create({
      senderId: authSenderId,
      receiverId: String(receiverId),
      text,
      type: "message",
      seen: false,
      delivered: true,
      deliveredAt: now,
      meta: {
        budgetCents: Number.isFinite(budgetCents) ? budgetCents : undefined,
        style: style || undefined,
        targetDateISO: targetDateISO || undefined,
        referenceUrls: Array.isArray(referenceUrls)
          ? referenceUrls
          : urlsFromText.length
          ? urlsFromText
          : undefined,
        ...(meta && typeof meta === "object" ? meta : {}),
      },
    });
    const payload = {
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      text: msg.text,
      timestamp: msg.createdAt.getTime(),
      meta: msg.meta || undefined,
      delivered: true,
      seen: false,
    };
    const io = getIO();
    if (io) {
      io.to(userRoom(msg.senderId))
        .to(userRoom(msg.receiverId))
        .to(threadRoom(msg.threadKey))
        .emit("message:new", { convoId: msg.threadKey, message: payload });
      io.to(userRoom(msg.senderId))
        .to(userRoom(msg.receiverId))
        .to(threadRoom(msg.threadKey))
        .emit("conversation:ack", {
          convoId: msg.threadKey,
          viewerId: msg.receiverId,
          participantId: msg.senderId,
          delivered: true,
          seen: false,
        });
    }
    res.status(201).json(payload);
  } catch (e) {
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
      type: "message",
      $or: [
        { senderId: userId, receiverId: participantId },
        { senderId: participantId, receiverId: userId },
      ],
    });
    res.status(200).json({ ok: true, deletedCount, userId, participantId });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};

export const createMessageRequest = async (req, res) => {
  try {
    const clientId = String(req.user?.clerkId || req.auth?.userId || "");
    const {
      artistId,
      text,
      referenceUrls,
      workRefs,
      meta = {},
    } = req.body || {};
    if (!clientId || !artistId || !text)
      return res.status(400).json({ error: "missing_fields" });
    const accepted = await Message.exists({
      type: "request",
      requestStatus: "accepted",
      senderId: clientId,
      receiverId: artistId,
    });
    if (accepted) return res.status(409).json({ error: "already_accepted" });
    const declines = await declineCount(clientId, artistId);
    if (declines >= MAX_DECLINES)
      return res.status(403).json({ error: "blocked_by_declines" });
    const pending = await Message.exists({
      type: "request",
      requestStatus: "pending",
      senderId: clientId,
      receiverId: artistId,
    });
    if (pending) return res.status(409).json({ error: "already_pending" });
    const Client = mongoose.model("client");
    console.log("[createMessageRequest] Fetching client with clerkId:", clientId);
    const me = await Client.findOne({ clerkId: clientId }).select("messageToArtists references").lean();
    console.log("[createMessageRequest] Client data:", me);
    if (!me) {
      console.error("[createMessageRequest] Client not found for clerkId:", clientId);
      return res.status(404).json({ error: "client_not_found" });
    }
    console.log("[createMessageRequest] Client messageToArtists:", me?.messageToArtists);
    console.log("[createMessageRequest] Request body text:", text);
    const refsFromProfile = toUrlList(me?.references);
    const refsFromBody = toUrlList(referenceUrls);
    const refsFromMeta = toUrlList(meta?.referenceUrls);
    const refsFromText = extractUrlsFromText(text);
    const mergedRefs = Array.from(
      new Set([
        ...refsFromBody,
        ...refsFromMeta,
        ...refsFromProfile,
        ...refsFromText,
      ])
    );
    const works = toUrlList(workRefs);
    const profileMessage = me?.messageToArtists ? String(me.messageToArtists).trim() : "";
    console.log("[createMessageRequest] Profile message (trimmed):", profileMessage);
    if (!profileMessage) {
      console.error("[createMessageRequest] Profile message is empty, rejecting request");
      return res.status(400).json({ error: "message_required", message: "Please set a message in your profile before sending requests." });
    }
    const finalText = profileMessage;
    console.log("[createMessageRequest] Using finalText:", finalText);
    const metaPayload = {
      ...meta,
      referenceUrls: mergedRefs,
      workRefs: works.length ? works : mergedRefs,
    };
    const reqMsg = await Message.create({
      senderId: clientId,
      receiverId: artistId,
      text: finalText,
      type: "request",
      requestStatus: "pending",
      meta: metaPayload,
      delivered: true,
      deliveredAt: new Date(),
      seen: false,
    });
    const io = getIO();
    if (io) {
      const initialMessage = {
        senderId: reqMsg.senderId,
        receiverId: reqMsg.receiverId,
        text: reqMsg.text,
        timestamp: reqMsg.createdAt.getTime(),
        meta: { ...(reqMsg.meta || {}), kind: "request", status: "pending" },
        delivered: true,
        seen: false,
      };
      io.to(userRoom(artistId)).emit("conversation:pending", {
        convoId: reqMsg.threadKey,
        from: clientId,
        to: artistId,
        requestId: String(reqMsg._id),
        text: finalText,
        createdAt: reqMsg.createdAt.toISOString(),
        message: initialMessage,
      });
      io.to(userRoom(clientId)).emit("message:new", {
        convoId: reqMsg.threadKey,
        message: initialMessage,
      });
    }
    res.json({ ok: true, requestId: reqMsg._id });
  } catch (e) {
    res.status(500).json({ error: "Failed to create request" });
  }
};

export const listIncomingRequests = async (req, res) => {
  try {
    const artistId = String(req.user?.clerkId || req.auth?.userId || "");
    const items = await Message.find({
      type: "request",
      receiverId: artistId,
      requestStatus: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ requests: items });
  } catch (e) {
    res.status(500).json({ error: "Failed to list requests" });
  }
};

export const acceptMessageRequest = async (req, res) => {
  try {
    const artistId = String(req.user?.clerkId || req.auth?.userId || "");
    const msg = await Message.findOne({
      _id: req.params.id,
      receiverId: artistId,
      type: "request",
    });
    if (!msg) return res.status(404).json({ error: "not_found" });
    msg.requestStatus = "accepted";
    await msg.save();
    const io = getIO();
    if (io) {
      io.to(userRoom(msg.senderId))
        .to(userRoom(msg.receiverId))
        .to(threadRoom(msg.threadKey))
        .emit("conversation:accepted", {
          convoId: msg.threadKey,
          clientId: msg.senderId,
          artistId: msg.receiverId,
          request: { timestamp: msg.createdAt.getTime(), status: "accepted" },
        });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to accept request" });
  }
};

export const declineMessageRequest = async (req, res) => {
  try {
    const artistId = String(req.user?.clerkId || req.auth?.userId || "");
    const msg = await Message.findOne({
      _id: req.params.id,
      receiverId: artistId,
      type: "request",
    });
    if (!msg) return res.status(404).json({ error: "not_found" });
    msg.requestStatus = "declined";
    await msg.save();
    const declines = await declineCount(msg.senderId, artistId);
    const blocked = declines >= MAX_DECLINES;
    const io = getIO();
    if (io) {
      io.to(userRoom(msg.senderId)).emit("conversation:declined", {
        convoId: msg.threadKey,
        declines,
        blocked,
        remainingRequests: Math.max(0, MAX_DECLINES - declines),
      });
      io.to(userRoom(msg.senderId))
        .to(userRoom(artistId))
        .to(threadRoom(msg.threadKey))
        .emit("conversation:removed", { convoId: msg.threadKey });
    }
    res.json({ ok: true, declines, blocked });
  } catch (e) {
    res.status(500).json({ error: "Failed to decline request" });
  }
};

export const getGateStatus = async (req, res) => {
  try {
    const clientId = String(req.user?.clerkId || req.auth?.userId || "");
    const { artistId } = req.params;
    const accepted = await Message.exists({
      type: "request",
      requestStatus: "accepted",
      senderId: clientId,
      receiverId: artistId,
    });
    const lastReq = await Message.findOne({
      type: "request",
      senderId: clientId,
      receiverId: artistId,
    })
      .sort({ createdAt: -1 })
      .lean();
    const declines = await declineCount(clientId, artistId);
    res.json({
      allowed: !!accepted,
      lastStatus: lastReq?.requestStatus || null,
      declines,
      blocked: declines >= MAX_DECLINES,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch gate status" });
  }
};

export const getUnreadState = async (req, res) => {
  try {
    const userId = String(req.user?.clerkId || req.auth?.userId || "");
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const unread = await Message.find({
      type: "message",
      receiverId: userId,
      seen: false,
    })
      .select("senderId")
      .lean();
    const unreadConversationIds = [...new Set(unread.map((m) => m.senderId))];
    const pending = await Message.find({
      type: "request",
      receiverId: userId,
      requestStatus: "pending",
    })
      .select("_id")
      .lean();
    const pendingRequestIds = pending.map((m) => String(m._id));
    res.json({
      unreadConversationIds,
      pendingRequestIds,
      counts: {
        unreadConversations: unreadConversationIds.length,
        pendingRequests: pendingRequestIds.length,
      },
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch unread state" });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const authUserId = String(req.user?.clerkId || req.auth?.userId || "");
    const { userId, participantId, conversationId } = req.body || {};
    const viewerId = authUserId || String(userId || "");
    const otherId = String(participantId || conversationId || "");
    if (!viewerId || !otherId)
      return res.status(400).json({ error: "missing_fields" });
    if (authUserId && userId && authUserId !== String(userId))
      return res.status(403).json({ error: "Forbidden" });
    await Message.ackForPair(viewerId, otherId);
    const io = getIO();
    if (io) {
      const threadKey = [viewerId, otherId].sort().join(":");
      const now = Date.now();
      io.to(userRoom(viewerId))
        .to(userRoom(otherId))
        .to(threadRoom(threadKey))
        .emit("conversation:ack", {
          convoId: threadKey,
          viewerId,
          participantId: otherId,
          delivered: true,
          seen: true,
          deliveredAt: now,
          seenAt: now,
        });
      io.to(userRoom(viewerId))
        .to(userRoom(otherId))
        .emit("unread:update", {
          userId: viewerId,
          participantId: otherId,
        });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to mark read" });
  }
};

export { latestRequestBetween, declineCount };