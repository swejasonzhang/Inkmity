import Booking from "../models/Booking.js";
import ArtistPolicy from "../models/ArtistPolicy.js";
import Message from "../models/Message.js";
import Availability from "../models/Availability.js";
import { dayBoundsUTC } from "../utils/date.js";
import { refundBilling } from "./billingController.js";
import { DateTime, Interval } from "luxon";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { asyncHandler } from "../middleware/errorHandler.js";

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

export const getBookingsForDay = asyncHandler(async (req, res) => {
  const { artistId, date } = req.query;
  if (!artistId || !date) {
    return res.status(400).json({ error: "artistId and date are required" });
  }
  
  const { start, end } = dayBoundsUTC(String(date));
  const docs = await Booking.find({
    artistId,
    startAt: { $lt: end },
    endAt: { $gt: start },
    status: { $in: ["pending", "confirmed", "in-progress", "completed"] },
  }).sort({ startAt: 1 });
  
  res.json(docs);
});

export const getBooking = asyncHandler(async (req, res) => {
  const doc = await Booking.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "not_found" });
  }
  res.json(doc);
});

export const getBookingsForArtist = asyncHandler(async (req, res) => {
  const userId = getActorId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  const { artistId, status, startDate, endDate } = req.query;
  const targetArtistId = artistId || userId;
  
  const query = { artistId: targetArtistId };
  
  if (status) {
    query.status = status;
  } else {
    query.status = { $in: ["pending", "confirmed", "in-progress", "completed"] };
  }
  
  if (startDate || endDate) {
    query.startAt = {};
    if (startDate) {
      query.startAt.$gte = new Date(String(startDate));
    }
    if (endDate) {
      query.startAt.$lte = new Date(String(endDate));
    }
  }
  
  const docs = await Booking.find(query)
    .sort({ startAt: 1 })
    .lean();
  
  res.json(docs);
});

export const getBookingsForClient = asyncHandler(async (req, res) => {
  const userId = getActorId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  const { clientId, status, startDate, endDate } = req.query;
  const targetClientId = clientId || userId;
  
  const query = { clientId: targetClientId };
  
  if (status) {
    query.status = status;
  } else {
    query.status = { $in: ["pending", "confirmed", "in-progress", "completed", "cancelled", "no-show"] };
  }
  
  if (startDate || endDate) {
    query.startAt = {};
    if (startDate) {
      query.startAt.$gte = new Date(String(startDate));
    }
    if (endDate) {
      query.startAt.$lte = new Date(String(endDate));
    }
  }
  
  const docs = await Booking.find(query)
    .sort({ startAt: -1 })
    .lean();
  
  res.json(docs);
});

export const createBooking = asyncHandler(async (req, res) => {
  const userId = getActorId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  const body = req.body || {};
  const artistId = String(body.artistId || "").trim();
  const startISO = String(body.startISO || "").trim();
  const endISO = body.endISO ? String(body.endISO).trim() : "";
  const note = body.note ?? "";
  const serviceId = body.serviceId ?? null;
  const priceCents = Math.max(0, Number(body.priceCents || 0));
  
  if (!artistId || !startISO) {
    return res.status(400).json({ error: "artistId and startISO required" });
  }
  
  const startAt = new Date(startISO);
  let endAt = endISO ? new Date(endISO) : null;
  
  if (Number.isNaN(startAt.getTime())) {
    return res.status(400).json({ error: "Invalid dates" });
  }
  
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
  
  if (Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return res.status(400).json({ error: "end must be after start" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const conflict = await Booking.findOne({
      artistId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      status: { $in: ["pending", "confirmed", "in-progress", "completed"] },
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return res.status(409).json({ error: "Slot already booked" });
    }

    let policy = null;
    try {
      policy = await ArtistPolicy.findOne({ artistId }).session(session);
    } catch {
      policy = null;
    }

    const depositRequiredCents = computeDepositCents(policy, priceCents);
    
    const created = await Booking.create([{
      artistId,
      clientId: String(userId),
      serviceId,
      startAt,
      endAt,
      note: body.note || "",
      serviceName: body.serviceName || "",
      serviceDescription: body.serviceDescription || "",
      requirements: body.requirements || "",
      estimatedDuration: body.estimatedDuration || null,
      location: body.location || "",
      contactPhone: body.contactPhone || "",
      contactEmail: body.contactEmail || "",
      status: "pending",
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
      confirmedAt: null,
      reminderSentAt: null,
      reminderSent24h: false,
      reminderSent1h: false,
    }], { session });

    await session.commitTransaction();
    
    logger.info("Booking created successfully", {
      bookingId: created[0]._id,
      artistId,
      clientId: userId,
      startAt,
      endAt,
      requestId: req.requestId,
    });

    try {
      await Message.create({
        senderId: String(artistId),
        receiverId: String(userId),
        text: `New booking request for ${new Date(startAt).toLocaleDateString()} at ${new Date(startAt).toLocaleTimeString()}`,
        meta: {
          kind: "booking_created",
          bookingId: String(created[0]._id),
        },
      });
    } catch (error) {
      logger.warn("Failed to create booking notification message", {
        error: error.message,
        bookingId: created[0]._id,
      });
    }

    return res.status(201).json(created[0]);
  } catch (error) {
    await session.abortTransaction();
    
    if (error?.name === "ValidationError") {
      logger.warn("Booking validation error", {
        error: error.message,
        artistId,
        clientId: userId,
        requestId: req.requestId,
      });
      return res.status(400).json({
        error: "validation_error",
        details: Object.fromEntries(
          Object.entries(error.errors || {}).map(([k, v]) => [
            k,
            v?.message || "invalid",
          ])
        ),
      });
    }

    logger.error("Failed to create booking", {
      error: error.message,
      stack: error.stack,
      artistId,
      clientId: userId,
      requestId: req.requestId,
    });

    throw error;
  } finally {
    session.endSession();
  }
});

export const confirmBooking = asyncHandler(async (req, res) => {
  const userId = getActorId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  const { id } = req.params;
  const booking = await Booking.findById(id);
  
  if (!booking) {
    return res.status(404).json({ error: "not_found" });
  }
  
  if (String(booking.artistId) !== userId) {
    return res.status(403).json({ error: "Only the artist can confirm bookings" });
  }
  
  if (booking.status !== "pending") {
    return res.status(400).json({ error: `Cannot confirm booking with status: ${booking.status}` });
  }
  
  booking.status = "confirmed";
  booking.confirmedAt = new Date();
  await booking.save();
  
  try {
    await Message.create({
      senderId: String(booking.artistId),
      receiverId: String(booking.clientId),
      text: `Your booking for ${new Date(booking.startAt).toLocaleDateString()} at ${new Date(booking.startAt).toLocaleTimeString()} has been confirmed!`,
      meta: {
        kind: "booking_confirmed",
        bookingId: String(booking._id),
      },
    });
  } catch (error) {
    logger.warn("Failed to create confirmation message", {
      error: error.message,
      bookingId: booking._id,
    });
  }
  
  logger.info("Booking confirmed", {
    bookingId: booking._id,
    requestId: req.requestId,
  });
  
  res.json(booking);
});

export const startVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ error: "not_found" });
  }
  if (booking.status === "cancelled") {
    return res.status(400).json({ error: "booking_cancelled" });
  }
  
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
  } catch (error) {
    logger.warn("Failed to create verification messages", {
      error: error.message,
      bookingId: booking._id,
      requestId: req.requestId,
    });
  }
  
  logger.info("Verification codes generated", {
    bookingId: booking._id,
    requestId: req.requestId,
  });
  
  res.json({
    ok: true,
    expiresAt: booking.codeExpiresAt,
    roles: ["client", "artist"],
  });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getActorId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ error: "not_found" });
  }
  if (booking.status === "cancelled") {
    return res.json(booking);
  }
  
  const cancelledBy = String(booking.artistId) === userId ? "artist" : "client";
  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.cancelledBy = cancelledBy;
  booking.cancellationReason = req.body.reason || "";
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
  } catch (error) {
    logger.warn("Failed to process refund on cancellation", {
      error: error.message,
      bookingId: booking._id,
      requestId: req.requestId,
    });
  }
  
  try {
    await Message.create({
      senderId: String(booking.artistId),
      receiverId: String(booking.clientId),
      text: `Booking for ${new Date(booking.startAt).toLocaleDateString()} has been cancelled${req.body.reason ? `: ${req.body.reason}` : ""}`,
      meta: {
        kind: "booking_cancelled",
        bookingId: String(booking._id),
        cancelledBy,
      },
    });
  } catch (error) {
    logger.warn("Failed to create cancellation message", {
      error: error.message,
      bookingId: booking._id,
    });
  }
  
  logger.info("Booking cancelled", {
    bookingId: booking._id,
    artistId: booking.artistId,
    clientId: booking.clientId,
    cancelledBy,
    requestId: req.requestId,
  });
  
  res.json(booking);
});

export const completeBooking = asyncHandler(async (req, res) => {
  const doc = await Booking.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "not_found" });
  }
  if (doc.status === "completed") {
    return res.json(doc);
  }
  
  doc.status = "completed";
  doc.completedAt = new Date();
  await doc.save();
  
  logger.info("Booking completed", {
    bookingId: doc._id,
    artistId: doc.artistId,
    clientId: doc.clientId,
    requestId: req.requestId,
  });
  
  res.json(doc);
});

export const verifyBookingCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, code } = req.body || {};
  if (!role || !code) {
    return res.status(400).json({ error: "role and code required" });
  }
  
  const doc = await Booking.findById(id);
  if (!doc) {
    return res.status(404).json({ error: "not_found" });
  }
  if (doc.status === "cancelled") {
    return res.status(400).json({ error: "booking_cancelled" });
  }
  if (!doc.codeExpiresAt || new Date() > new Date(doc.codeExpiresAt)) {
    return res.status(400).json({ error: "code_expired" });
  }
  
  if (role === "client") {
    if (doc.clientVerifiedAt) {
      return res.json(doc);
    }
    if (String(code).trim().toUpperCase() !== String(doc.clientCode).toUpperCase()) {
      return res.status(400).json({ error: "bad_code" });
    }
    doc.clientVerifiedAt = new Date();
  } else if (role === "artist") {
    if (doc.artistVerifiedAt) {
      return res.json(doc);
    }
    if (String(code).trim().toUpperCase() !== String(doc.artistCode).toUpperCase()) {
      return res.status(400).json({ error: "bad_code" });
    }
    doc.artistVerifiedAt = new Date();
  } else {
    return res.status(400).json({ error: "bad_role" });
  }
  
  if (doc.clientVerifiedAt && doc.artistVerifiedAt) {
    doc.matchedAt = new Date();
    doc.status = "confirmed";
    doc.confirmedAt = new Date();
    
    logger.info("Booking verified and confirmed", {
      bookingId: doc._id,
      requestId: req.requestId,
    });
  } else {
    logger.info("Booking code verified", {
      bookingId: doc._id,
      role,
      requestId: req.requestId,
    });
  }
  
  await doc.save();
  res.json(doc);
});

export const rescheduleBooking = asyncHandler(async (req, res) => {
  const userId = getActorId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  const { id } = req.params;
  const { startISO, endISO, reason } = req.body || {};
  
  if (!startISO || !endISO) {
    return res.status(400).json({ error: "startISO and endISO required" });
  }
  
  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ error: "not_found" });
  }
  
  const isArtist = String(booking.artistId) === userId;
  const isClient = String(booking.clientId) === userId;
  
  if (!isArtist && !isClient) {
    return res.status(403).json({ error: "Unauthorized to reschedule this booking" });
  }
  
  if (booking.status === "cancelled" || booking.status === "completed") {
    return res.status(400).json({ error: `Cannot reschedule ${booking.status} booking` });
  }
  
  const startAt = new Date(startISO);
  const endAt = new Date(endISO);
  
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return res.status(400).json({ error: "Invalid dates" });
  }
  
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
  const dayStr = DateTime.fromJSDate(startAt, { zone: tz }).toISODate();
  const weekdayKey = WEEKDAY_KEYS[DateTime.fromISO(dayStr, { zone: tz }).weekday % 7];
  const ranges = (av.exceptions?.[dayStr]?.length
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
  
  if (!withinAvail) {
    return res.status(409).json({ error: "outside_availability" });
  }
  
  const conflict = await Booking.findOne({
    _id: { $ne: booking._id },
    artistId: booking.artistId,
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
    status: { $in: ["pending", "confirmed", "in-progress", "completed"] },
  });
  
  if (conflict) {
    return res.status(409).json({ error: "conflict" });
  }
  
  const oldStartAt = booking.startAt;
  const oldEndAt = booking.endAt;
  
  booking.startAt = startAt;
  booking.endAt = endAt;
  booking.rescheduledAt = new Date();
  booking.rescheduledFrom = oldStartAt;
  booking.rescheduledBy = isArtist ? "artist" : "client";
  await booking.save();
  
  try {
    await Message.create({
      senderId: String(booking.artistId),
      receiverId: String(booking.clientId),
      text: `Booking rescheduled to ${new Date(startAt).toLocaleDateString()} at ${new Date(startAt).toLocaleTimeString()}${reason ? `. Reason: ${reason}` : ""}`,
      meta: {
        kind: "booking_rescheduled",
        bookingId: String(booking._id),
        rescheduledBy: booking.rescheduledBy,
      },
    });
  } catch (error) {
    logger.warn("Failed to create reschedule message", {
      error: error.message,
      bookingId: booking._id,
      requestId: req.requestId,
    });
  }
  
  logger.info("Booking rescheduled", {
    bookingId: booking._id,
    oldStartAt,
    newStartAt: startAt,
    rescheduledBy: booking.rescheduledBy,
    requestId: req.requestId,
  });
  
  res.json(booking);
});

export const updateBookingTime = asyncHandler(async (req, res) => {
  const actorId = getActorId(req);
  if (!actorId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const { id } = req.params;
  const { startISO, endISO } = req.body || {};
  if (!startISO || !endISO) {
    return res.status(400).json({ error: "startISO and endISO required" });
  }
  
  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ error: "not_found" });
  }
  if (String(booking.artistId) !== actorId) {
    return res.status(403).json({ error: "Only the artist can adjust time" });
  }
  if (booking.status === "cancelled") {
    return res.status(400).json({ error: "booking_cancelled" });
  }
  
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
  
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return res.status(400).json({ error: "Invalid dates" });
  }
  
  const dayStr = DateTime.fromJSDate(startAt, { zone: tz }).toISODate();
  const weekdayKey = WEEKDAY_KEYS[DateTime.fromISO(dayStr, { zone: tz }).weekday % 7];
  const ranges = (av.exceptions?.[dayStr]?.length
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
  
  if (!withinAvail) {
    return res.status(409).json({ error: "outside_availability" });
  }
  
  const conflict = await Booking.findOne({
    _id: { $ne: booking._id },
    artistId: booking.artistId,
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
    status: { $in: ["pending", "confirmed", "in-progress", "completed"] },
  });
  
  if (conflict) {
    return res.status(409).json({ error: "conflict" });
  }
  
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
  } catch (error) {
    logger.warn("Failed to create time update message", {
      error: error.message,
      bookingId: booking._id,
      requestId: req.requestId,
    });
  }
  
  logger.info("Booking time updated", {
    bookingId: booking._id,
    newStartAt: startAt,
    newEndAt: endAt,
    requestId: req.requestId,
  });
  
  res.json(booking);
});

