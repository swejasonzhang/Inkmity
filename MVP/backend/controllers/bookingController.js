import Booking from "../models/Booking.js";
import ArtistPolicy from "../models/ArtistPolicy.js";
import { dayBoundsUTC } from "../utils/date.js";

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function computeDepositCents(policy, priceCents) {
  const p = policy?.deposit || {};
  const mode = p.mode || "percent";
  if (mode === "flat") return Math.max(0, Number(p.amountCents || 0));
  const percent = Math.max(0, Math.min(1, Number(p.percent || 0.2)));
  const minCents = Math.max(0, Number(p.minCents || 0));
  const maxCents = Math.max(0, Number(p.maxCents || Infinity));
  const base = Math.max(0, Number(priceCents || 0));
  const raw = Math.round(base * percent);
  return Math.min(Math.max(raw, minCents), maxCents);
}

export async function getBookingsForDay(req, res) {
  const { artistId, date } = req.query;
  if (!artistId || !date)
    return res.status(400).json({ error: "artistId and date are required" });
  const { start, end } = dayBoundsUTC(String(date));
  const docs = await Booking.find({
    artistId,
    startAt: { $lt: end },
    endAt: { $gt: start },
    status: { $in: ["booked", "matched", "completed"] },
  }).sort({ startAt: 1 });
  res.json(docs);
}

export async function getBooking(req, res) {
  const doc = await Booking.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "not_found" });
  res.json(doc);
}

export async function createBooking(req, res) {
  try {
    const userId = req.user?._id;
    const {
      artistId,
      clientId,
      startISO,
      endISO,
      note,
      serviceId,
      priceCents,
    } = req.body || {};
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!artistId || !clientId || !startISO || !endISO) {
      return res
        .status(400)
        .json({ error: "artistId, clientId, startISO, endISO required" });
    }

    const startAt = new Date(startISO);
    const endAt = new Date(endISO);
    if (isNaN(startAt) || isNaN(endAt))
      return res.status(400).json({ error: "Invalid dates" });
    if (endAt <= startAt)
      return res.status(400).json({ error: "end must be after start" });

    const conflict = await Booking.findOne({
      artistId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      status: { $in: ["booked", "matched", "completed"] },
    });
    if (conflict) return res.status(409).json({ error: "Slot already booked" });

    const policy = (await ArtistPolicy.findOne({ artistId })) || undefined;
    const depositRequiredCents = computeDepositCents(policy, priceCents);

    const created = await Booking.create({
      artistId,
      clientId,
      serviceId,
      startAt,
      endAt,
      note,
      status: "booked",
      priceCents: Math.max(0, Number(priceCents || 0)),
      depositRequiredCents,
      depositPaidCents: 0,
      clientCode: genCode(),
      artistCode: genCode(),
    });

    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Failed to create booking" });
  }
}

export async function cancelBooking(req, res) {
  try {
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not_found" });
    if (doc.status === "cancelled") return res.json(doc);
    doc.status = "cancelled";
    await doc.save();
    res.json(doc);
  } catch {
    res.status(500).json({ error: "cancel_failed" });
  }
}

export async function completeBooking(req, res) {
  try {
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not_found" });
    if (doc.status === "completed") return res.json(doc);
    doc.status = "completed";
    doc.completedAt = new Date();
    await doc.save();
    res.json(doc);
  } catch {
    res.status(500).json({ error: "complete_failed" });
  }
}

export async function verifyBookingCode(req, res) {
  try {
    const { id } = req.params;
    const { role, code } = req.body || {};
    if (!role || !code)
      return res.status(400).json({ error: "role and code required" });

    const doc = await Booking.findById(id);
    if (!doc) return res.status(404).json({ error: "not_found" });
    if (doc.status === "cancelled")
      return res.status(400).json({ error: "booking_cancelled" });

    if (role === "client") {
      if (doc.clientVerifiedAt) return res.json(doc);
      if (
        String(code).trim().toUpperCase() !==
        String(doc.clientCode).toUpperCase()
      ) {
        return res.status(400).json({ error: "bad_code" });
      }
      doc.clientVerifiedAt = new Date();
    } else if (role === "artist") {
      if (doc.artistVerifiedAt) return res.json(doc);
      if (
        String(code).trim().toUpperCase() !==
        String(doc.artistCode).toUpperCase()
      ) {
        return res.status(400).json({ error: "bad_code" });
      }
      doc.artistVerifiedAt = new Date();
    } else {
      return res.status(400).json({ error: "bad_role" });
    }

    if (doc.clientVerifiedAt && doc.artistVerifiedAt && !doc.matchedAt) {
      doc.matchedAt = new Date();
      doc.status = "matched";
    }

    await doc.save();
    res.json(doc);
  } catch {
    res.status(500).json({ error: "verify_failed" });
  }
}