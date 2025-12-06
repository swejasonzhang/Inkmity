import Booking from "../models/Booking.js";
import ArtistPolicy from "../models/ArtistPolicy.js";
import Message from "../models/Message.js";
import Availability from "../models/Availability.js";
import { dayBoundsUTC } from "../utils/date.js";
import { refundBilling } from "./billingController.js";
import { DateTime, Interval } from "luxon";

const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_SLOT_MINUTES = 30;
const DEFAULT_OPEN_RANGES = [{ start: "10:00", end: "22:00" }];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getActorId(req) {
  return String(
    req.user?.clerkId || req.auth?.userId || req.user?._id || req.user?.id || ""
  ).trim();
}

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

function isRefundEligible(startAtISO, now = new Date()) {
  const start = new Date(startAtISO).getTime();
  const diffHours = (start - now.getTime()) / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours < 72;
}

function parseHmToMinutes(hm) {
  const [h, m] = String(hm).split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function buildDayIntervals({ dateISO, tz, ranges }) {
  const day = DateTime.fromISO(dateISO, { zone: tz }).startOf("day");
  const out = [];
  for (const r of ranges) {
    const startMin = parseHmToMinutes(r.start);
    const endMin = parseHmToMinutes(r.end);
    const start = day.plus({ minutes: startMin });
    const end = day.plus({ minutes: endMin });
    if (end > start) out.push(Interval.fromDateTimes(start, end));
  }
  return out;
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

export async function getClientBookings(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const docs = await Booking.find({ clientId: userId })
      .sort({ startAt: -1 })
      .limit(100)
      .lean();
    
    const Artist = (await import("../models/Artist.js")).default;
    const User = (await import("../models/UserBase.js")).default;
    
    const bookingsWithArtists = await Promise.all(
      docs.map(async (booking) => {
        try {
          const user = await User.findOne({ clerkId: booking.artistId }).lean();
          if (user) {
            return {
              ...booking,
              artist: {
                username: user.username || "Unknown",
                profileImage: user.avatar?.url || "",
                avatar: user.avatar || null,
              },
            };
          }
          return {
            ...booking,
            artist: {
              username: "Unknown Artist",
              profileImage: "",
              avatar: null,
            },
          };
        } catch (err) {
          console.error("Error fetching artist for booking:", err);
          return {
            ...booking,
            artist: {
              username: "Unknown Artist",
              profileImage: "",
              avatar: null,
            },
          };
        }
      })
    );
    
    res.json(bookingsWithArtists);
  } catch (error) {
    console.error("Error fetching client bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
}

export async function createBooking(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const body = req.body || {};
    const artistId = String(body.artistId || "").trim();
    const startISO = String(body.startISO || "").trim();
    const endISO = body.endISO ? String(body.endISO).trim() : "";
    const note = body.note ?? "";
    const serviceId = body.serviceId ?? null;
    const priceCents = Math.max(0, Number(body.priceCents || 0));
    if (!artistId || !startISO)
      return res.status(400).json({ error: "artistId and startISO required" });
    const startAt = new Date(startISO);
    let endAt = endISO ? new Date(endISO) : null;
    if (Number.isNaN(startAt.getTime()))
      return res.status(400).json({ error: "Invalid dates" });
    if (!endAt) {
      const av = (await Availability.findOne({ artistId })) || {
        slotMinutes: DEFAULT_SLOT_MINUTES,
        timezone: DEFAULT_TIMEZONE,
      };
      const minutes = Math.max(
        5,
        Math.min(480, Number(av.slotMinutes || DEFAULT_SLOT_MINUTES))
      );
      const tz = av.timezone || DEFAULT_TIMEZONE;
      endAt = new Date(
        DateTime.fromJSDate(startAt, { zone: tz }).plus({ minutes }).toISO()
      );
    }
    if (Number.isNaN(endAt.getTime()) || endAt <= startAt)
      return res.status(400).json({ error: "end must be after start" });
    const conflict = await Booking.findOne({
      artistId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      status: { $in: ["booked", "matched", "completed"] },
    });
    if (conflict) return res.status(409).json({ error: "Slot already booked" });
    let policy = null;
    try {
      policy =
        typeof ArtistPolicy?.findOne === "function"
          ? await ArtistPolicy.findOne({ artistId })
          : null;
    } catch {
      policy = null;
    }
    const depositRequiredCents = computeDepositCents(policy, priceCents);
    let created;
    try {
      created = await Booking.create({
        artistId,
        clientId: String(userId),
        serviceId,
        startAt,
        endAt,
        note,
        status: "booked",
        priceCents,
        depositRequiredCents,
        depositPaidCents: 0,
        clientCode: genCode(),
        artistCode: genCode(),
        codeIssuedAt: null,
        codeExpiresAt: null,
        clientVerifiedAt: null,
        artistVerifiedAt: null,
        matchedAt: null,
        completedAt: null,
      });
    } catch (e) {
      if (e?.name === "ValidationError") {
        return res.status(400).json({
          error: "validation_error",
          details: Object.fromEntries(
            Object.entries(e.errors || {}).map(([k, v]) => [
              k,
              v?.message || "invalid",
            ])
          ),
        });
      }
      return res.status(400).json({
        error: "create_failed",
        message: e?.message || "Invalid payload",
      });
    }
    return res.status(201).json(created);
  } catch {
    return res.status(500).json({ error: "Failed to create booking" });
  }
}

export async function startVerification(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    if (booking.status === "cancelled")
      return res.status(400).json({ error: "booking_cancelled" });
    booking.clientCode = genCode();
    booking.artistCode = genCode();
    booking.codeIssuedAt = new Date();
    booking.codeExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
    booking.clientVerifiedAt = null;
    booking.artistVerifiedAt = null;
    booking.matchedAt = null;
    await booking.save();
    try {
      await Message.create({
        senderId: String(booking.artistId),
        receiverId: String(booking.clientId),
        text: `Your verification code: ${booking.clientCode} (valid 3 minutes)`,
        meta: {
          kind: "verification_code",
          bookingId: String(booking._id),
          role: "client",
        },
      });
      await Message.create({
        senderId: String(booking.clientId),
        receiverId: String(booking.artistId),
        text: `Your verification code: ${booking.artistCode} (valid 3 minutes)`,
        meta: {
          kind: "verification_code",
          bookingId: String(booking._id),
          role: "artist",
        },
      });
    } catch {}
    res.json({
      ok: true,
      expiresAt: booking.codeExpiresAt,
      roles: ["client", "artist"],
    });
  } catch {
    res.status(500).json({ error: "start_verification_failed" });
  }
}

export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    if (booking.status === "cancelled") return res.json(booking);
    booking.status = "cancelled";
    await booking.save();
    try {
      if (isRefundEligible(booking.startAt.toISOString())) {
        const mockRes = {
          _status: 200,
          _json: null,
          status(code) {
            this._status = code;
            return this;
          },
          json(payload) {
            this._json = payload;
            return this;
          },
        };
        req.body = { bookingId: String(booking._id) };
        await refundBilling(req, mockRes);
      }
    } catch {}
    res.json(booking);
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
    if (!doc.codeExpiresAt || new Date() > new Date(doc.codeExpiresAt))
      return res.status(400).json({ error: "code_expired" });
    if (role === "client") {
      if (doc.clientVerifiedAt) return res.json(doc);
      if (
        String(code).trim().toUpperCase() !==
        String(doc.clientCode).toUpperCase()
      )
        return res.status(400).json({ error: "bad_code" });
      doc.clientVerifiedAt = new Date();
    } else if (role === "artist") {
      if (doc.artistVerifiedAt) return res.json(doc);
      if (
        String(code).trim().toUpperCase() !==
        String(doc.artistCode).toUpperCase()
      )
        return res.status(400).json({ error: "bad_code" });
      doc.artistVerifiedAt = new Date();
    } else {
      return res.status(400).json({ error: "bad_role" });
    }
    if (doc.clientVerifiedAt && doc.artistVerifiedAt) {
      doc.matchedAt = new Date();
      doc.status = "completed";
      doc.completedAt = new Date();
    }
    await doc.save();
    res.json(doc);
  } catch {
    res.status(500).json({ error: "verify_failed" });
  }
}

export async function updateBookingTime(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { startISO, endISO } = req.body || {};
    if (!startISO || !endISO)
      return res.status(400).json({ error: "startISO and endISO required" });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    if (String(booking.artistId) !== actorId)
      return res.status(403).json({ error: "Only the artist can adjust time" });
    if (booking.status === "cancelled")
      return res.status(400).json({ error: "booking_cancelled" });
    const av = (await Availability.findOne({ artistId: booking.artistId })) || {
      timezone: DEFAULT_TIMEZONE,
      weekly: {
        sun: DEFAULT_OPEN_RANGES,
        mon: DEFAULT_OPEN_RANGES,
        tue: DEFAULT_OPEN_RANGES,
        wed: DEFAULT_OPEN_RANGES,
        thu: DEFAULT_OPEN_RANGES,
        fri: DEFAULT_OPEN_RANGES,
        sat: DEFAULT_OPEN_RANGES,
      },
      exceptions: {},
    };
    const tz = av.timezone || DEFAULT_TIMEZONE;
    const startAt = new Date(startISO);
    const endAt = new Date(endISO);
    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    )
      return res.status(400).json({ error: "Invalid dates" });
    const dayStr = DateTime.fromJSDate(startAt, { zone: tz }).toISODate();
    const weekdayKey =
      WEEKDAY_KEYS[DateTime.fromISO(dayStr, { zone: tz }).weekday % 7];
    const ranges =
      (av.exceptions?.[dayStr]?.length
        ? av.exceptions[dayStr]
        : av.weekly?.[weekdayKey]) || DEFAULT_OPEN_RANGES;
    const dayIntervals = buildDayIntervals({ dateISO: dayStr, tz, ranges });
    const proposed = Interval.fromDateTimes(
      DateTime.fromJSDate(startAt, { zone: tz }),
      DateTime.fromJSDate(endAt, { zone: tz })
    );
    const withinAvail = dayIntervals.some(
      (iv) => proposed.start >= iv.start && proposed.end <= iv.end
    );
    if (!withinAvail)
      return res.status(409).json({ error: "outside_availability" });
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      artistId: booking.artistId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      status: { $in: ["booked", "matched", "completed"] },
    });
    if (conflict) return res.status(409).json({ error: "conflict" });
    booking.startAt = startAt;
    booking.endAt = endAt;
    await booking.save();
    try {
      await Message.create({
        senderId: String(booking.artistId),
        receiverId: String(booking.clientId),
        text: "Booking time updated",
        meta: { kind: "booking_time_updated", bookingId: String(booking._id) },
      });
    } catch {}
    return res.json(booking);
  } catch {
    return res.status(500).json({ error: "update_time_failed" });
  }
}