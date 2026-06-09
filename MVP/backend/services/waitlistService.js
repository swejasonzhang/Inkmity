import Waitlist from "../models/Waitlist.js";
import Client from "../models/Client.js";
import Message from "../models/Message.js";
import { tierForCount } from "./rewardsService.js";
import { getIO, userRoom } from "./socketService.js";

const TIER_ORDER = ["bronze", "silver", "gold", "platinum"];
function rankOf(tierKey) {
  const i = TIER_ORDER.indexOf(tierKey);
  return i < 0 ? 0 : i;
}

// Pure: higher tier first, then earliest join (FIFO) as the tiebreak.
export function sortWaitlistByPriority(entries) {
  return [...entries].sort(
    (a, b) =>
      (b.priorityRank || 0) - (a.priorityRank || 0) ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function matchesDate(entry, dateISO) {
  if (!dateISO) return true;
  const d = new Date(dateISO).getTime();
  if (entry.fromDate && d < new Date(entry.fromDate).getTime()) return false;
  if (entry.toDate && d > new Date(entry.toDate).getTime()) return false;
  return true;
}

async function withPriority(entries) {
  const clientIds = [...new Set(entries.map((e) => String(e.clientId)))];
  const clients = clientIds.length
    ? await Client.find({ clerkId: { $in: clientIds } })
        .select("clerkId completedBookingsCount username avatar")
        .lean()
    : [];
  const byId = new Map(clients.map((c) => [c.clerkId, c]));
  return entries.map((e) => {
    const c = byId.get(String(e.clientId));
    const tier = tierForCount(Number(c?.completedBookingsCount || 0));
    return {
      ...(e.toObject ? e.toObject() : e),
      priorityRank: rankOf(tier.key),
      tierLabel: tier.label,
      client: c ? { username: c.username, avatar: c.avatar } : null,
    };
  });
}

export async function joinWaitlist(clientId, { artistId, fromISO, toISO, note }) {
  if (!artistId) {
    const e = new Error("artistId required");
    e.status = 400;
    throw e;
  }
  const existing = await Waitlist.findOne({
    artistId: String(artistId),
    clientId: String(clientId),
    status: { $in: ["active", "notified"] },
  });
  if (existing) return existing;
  return Waitlist.create({
    artistId: String(artistId),
    clientId: String(clientId),
    fromDate: fromISO ? new Date(fromISO) : undefined,
    toDate: toISO ? new Date(toISO) : undefined,
    note: note || "",
  });
}

export async function leaveWaitlist(clientId, id) {
  const entry = await Waitlist.findById(id);
  if (!entry) return null;
  if (String(entry.clientId) !== String(clientId)) {
    const e = new Error("forbidden");
    e.status = 403;
    throw e;
  }
  entry.status = "cancelled";
  await entry.save();
  return entry;
}

export async function getMyWaitlist(clientId) {
  return Waitlist.find({
    clientId: String(clientId),
    status: { $in: ["active", "notified"] },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getArtistWaitlist(artistId) {
  const entries = await Waitlist.find({
    artistId: String(artistId),
    status: { $in: ["active", "notified"] },
  }).lean();
  return sortWaitlistByPriority(await withPriority(entries));
}

// When a slot frees up, notify the top waitlisted clients (tier-priority order).
export async function notifyWaitlistForArtist(artistId, { dateISO, limit = 3 } = {}) {
  const entries = await Waitlist.find({ artistId: String(artistId), status: "active" });
  const matching = entries.filter((e) => matchesDate(e, dateISO));
  if (!matching.length) return [];

  const ordered = sortWaitlistByPriority(await withPriority(matching));
  const top = ordered.slice(0, limit);
  const io = getIO?.();
  const notified = [];

  for (const o of top) {
    const entry = matching.find((e) => String(e._id) === String(o._id));
    if (!entry) continue;
    entry.status = "notified";
    entry.notifiedAt = new Date();
    await entry.save();
    try {
      await Message.create({
        senderId: String(artistId),
        receiverId: String(entry.clientId),
        text: "A spot just opened with an artist you're waitlisted for — book now before it's taken.",
        meta: {
          kind: "waitlist_slot_open",
          artistId: String(artistId),
          waitlistId: String(entry._id),
        },
      });
    } catch {
      /* messaging is best-effort */
    }
    try {
      if (io)
        io.to(userRoom(String(entry.clientId))).emit("waitlist:slot_open", {
          artistId: String(artistId),
          waitlistId: String(entry._id),
        });
    } catch {
      /* socket is best-effort */
    }
    notified.push(entry);
  }
  return notified;
}
