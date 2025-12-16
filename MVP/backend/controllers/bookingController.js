import Booking from "../models/Booking.js";
import ArtistPolicy from "../models/ArtistPolicy.js";
import Message from "../models/Message.js";
import Availability from "../models/Availability.js";
import IntakeForm from "../models/IntakeForm.js";
import Project from "../models/Project.js";
import BookingCooldown from "../models/BookingCooldown.js";
import { dayBoundsUTC } from "../utils/date.js";
import { refundBilling } from "./billingController.js";
import { DateTime, Interval } from "luxon";
import { getIO } from "../services/socketService.js";

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
    status: { $in: ["booked", "matched", "completed", "accepted", "pending"] },
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

export async function getArtistBookings(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const docs = await Booking.find({ artistId: userId })
      .sort({ startAt: -1 })
      .limit(100)
      .lean();

    const User = (await import("../models/UserBase.js")).default;

    const bookingsWithClients = await Promise.all(
      docs.map(async (booking) => {
        try {
          const user = await User.findOne({ clerkId: booking.clientId }).lean();
          if (user) {
            return {
              ...booking,
              client: {
                username: user.username || "Unknown",
                profileImage: user.avatar?.url || "",
                avatar: user.avatar || null,
              },
            };
          }
          return {
            ...booking,
            client: {
              username: "Unknown Client",
              profileImage: "",
              avatar: null,
            },
          };
        } catch (err) {
          console.error("Error fetching client for booking:", err);
          return {
            ...booking,
            client: {
              username: "Unknown Client",
              profileImage: "",
              avatar: null,
            },
          };
        }
      })
    );

    res.json(bookingsWithClients);
  } catch (error) {
    console.error("Error fetching artist bookings:", error);
    res.status(500).json({ error: "Failed to fetch artist bookings" });
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
      status: { $in: ["booked", "matched", "completed", "accepted", "pending"] },
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
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { reason } = req.body || {};
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });

    if (booking.status === "cancelled") return res.json(booking);

    const isClient = String(booking.clientId) === actorId;
    const isArtist = String(booking.artistId) === actorId;
    const isSystem = actorId === "system" || !actorId;

    if (!isClient && !isArtist && !isSystem) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const now = new Date();
    const hoursUntilAppointment =
      (new Date(booking.startAt).getTime() - now.getTime()) / (1000 * 60 * 60);
    const shouldForfeitDeposit =
      hoursUntilAppointment < 48 && booking.depositPaidCents > 0;

    booking.status = "cancelled";
    booking.cancelledAt = now;
    booking.cancelledBy = isClient ? "client" : isArtist ? "artist" : "system";
    booking.cancellationReason = reason || "";

    if (shouldForfeitDeposit) {
      booking.depositPaidCents = 0;
    }

    await booking.save();

    if (isClient) {
      const cooldownExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await BookingCooldown.findOneAndUpdate(
        { userId: String(booking.clientId), artistId: String(booking.artistId) },
        {
          userId: String(booking.clientId),
          artistId: String(booking.artistId),
          cancelledAt: now,
          expiresAt: cooldownExpiresAt,
          bookingId: booking._id,
        },
        { upsert: true, new: true }
      );
    }

    try {
      const io = getIO();
      if (io) {
        const dateStr = new Date(booking.startAt).toISOString().slice(0, 10);
        io.emit("booking:cancelled", {
          artistId: String(booking.artistId),
          date: dateStr,
          bookingId: String(booking._id),
        });
      }
    } catch {}

    try {
      if (
        !shouldForfeitDeposit &&
        isRefundEligible(booking.startAt.toISOString())
      ) {
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

    try {
      await Message.create({
        senderId: actorId,
        receiverId: isClient
          ? String(booking.artistId)
          : String(booking.clientId),
        text: `Appointment cancelled. ${
          shouldForfeitDeposit
            ? "Deposit has been forfeited due to late cancellation."
            : ""
        } ${reason ? `Reason: ${reason}` : ""}`,
        meta: {
          kind: "appointment_cancelled",
          bookingId: String(booking._id),
          depositForfeited: shouldForfeitDeposit,
        },
      });
    } catch {}

    res.json(booking);
  } catch (error) {
    console.error("Error cancelling booking:", error);
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
      status: { $in: ["booked", "matched", "completed", "accepted", "pending"] },
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

const CONSULTATION_DURATION_MINUTES = 30;
const MIN_RESCHEDULE_NOTICE_HOURS = 48;

function getAppointmentDuration(appointmentType, customDuration) {
  if (appointmentType === "consultation") {
    return customDuration || CONSULTATION_DURATION_MINUTES;
  }
  return customDuration || DEFAULT_SLOT_MINUTES;
}

export async function createConsultation(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    const artistId = String(body.artistId || "").trim();
    const startISO = String(body.startISO || "").trim();
    const durationMinutes = Math.max(
      15,
      Math.min(
        60,
        Number(body.durationMinutes || CONSULTATION_DURATION_MINUTES)
      )
    );
    const note = body.note ?? "";

    if (!artistId || !startISO) {
      return res.status(400).json({ error: "artistId and startISO required" });
    }

    const startAt = new Date(startISO);
    if (Number.isNaN(startAt.getTime())) {
      return res.status(400).json({ error: "Invalid start date" });
    }

    const av = (await Availability.findOne({ artistId })) || {
      timezone: DEFAULT_TIMEZONE,
    };
    const tz = av.timezone || DEFAULT_TIMEZONE;
    const endAt = new Date(
      DateTime.fromJSDate(startAt, { zone: tz })
        .plus({ minutes: durationMinutes })
        .toISO()
    );

    const conflict = await Booking.findOne({
      artistId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      status: { $nin: ["cancelled", "denied"] },
    });

    if (conflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    const activeCooldown = await BookingCooldown.findOne({
      userId: String(userId),
      artistId,
      expiresAt: { $gt: new Date() },
    });

    if (activeCooldown) {
      const hoursRemaining = (activeCooldown.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      return res.status(429).json({ 
        error: "cooldown_active",
        message: `You must wait ${Math.ceil(hoursRemaining)} hours before booking with this artist again after cancelling or denying an appointment.`,
        expiresAt: activeCooldown.expiresAt
      });
    }

    let policy = null;
    try {
      policy = await ArtistPolicy.findOne({ artistId });
    } catch {}

    const consultationPriceCents = Math.max(0, Number(body.priceCents || 0));
    const depositRequiredCents = computeDepositCents(
      policy,
      consultationPriceCents
    );

    let booking;
    try {
      booking = await Booking.create({
        artistId,
        clientId: String(userId),
        startAt,
        endAt,
        note,
        status: "pending",
        appointmentType: "consultation",
        priceCents: consultationPriceCents,
        depositRequiredCents,
        depositPaidCents: 0,
        sessionNumber: 1,
        clientCode: genCode(),
        artistCode: genCode(),
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
      throw e;
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error("Error creating consultation:", error);
    return res.status(500).json({ error: "Failed to create consultation" });
  }
}

export async function createTattooSession(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    const artistId = String(body.artistId || "").trim();
    const startISO = String(body.startISO || "").trim();
    const durationMinutes = Math.max(
      30,
      Math.min(480, Number(body.durationMinutes || DEFAULT_SLOT_MINUTES))
    );
    const projectId = body.projectId ? String(body.projectId).trim() : null;
    const sessionNumber = Math.max(1, Number(body.sessionNumber || 1));
    const note = body.note ?? "";
    const referenceImageIds = Array.isArray(body.referenceImageIds)
      ? body.referenceImageIds
      : [];

    if (!artistId || !startISO) {
      return res.status(400).json({ error: "artistId and startISO required" });
    }

    const startAt = new Date(startISO);
    if (Number.isNaN(startAt.getTime())) {
      return res.status(400).json({ error: "Invalid start date" });
    }

    const av = (await Availability.findOne({ artistId })) || {
      timezone: DEFAULT_TIMEZONE,
    };
    const tz = av.timezone || DEFAULT_TIMEZONE;
    const endAt = new Date(
      DateTime.fromJSDate(startAt, { zone: tz })
        .plus({ minutes: durationMinutes })
        .toISO()
    );

    const conflict = await Booking.findOne({
      artistId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      status: { $nin: ["cancelled"] },
    });

    if (conflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (
        String(project.clientId) !== userId ||
        String(project.artistId) !== artistId
      ) {
        return res.status(403).json({ error: "Project access denied" });
      }
    }

    let policy = null;
    try {
      policy = await ArtistPolicy.findOne({ artistId });
    } catch {}

    const priceCents = Math.max(0, Number(body.priceCents || 0));
    const depositRequiredCents = computeDepositCents(policy, priceCents);

    let booking;
    try {
      booking = await Booking.create({
        artistId,
        clientId: String(userId),
        startAt,
        endAt,
        note,
        status: "pending",
        appointmentType: "tattoo_session",
        projectId: projectId || undefined,
        sessionNumber,
        referenceImageIds,
        priceCents,
        depositRequiredCents,
        depositPaidCents: 0,
        clientCode: genCode(),
        artistCode: genCode(),
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
      throw e;
    }

    if (project) {
      project.completedSessions = Math.max(
        project.completedSessions || 0,
        sessionNumber
      );
      if (sessionNumber >= project.estimatedSessions) {
        project.status = "completed";
        project.completedAt = new Date();
      }
      await project.save();
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error("Error creating tattoo session:", error);
    return res.status(500).json({ error: "Failed to create tattoo session" });
  }
}

export async function rescheduleAppointment(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { startISO, endISO, reason } = req.body || {};

    if (!startISO || !endISO) {
      return res.status(400).json({ error: "startISO and endISO required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });

    const isClient = String(booking.clientId) === actorId;
    const isArtist = String(booking.artistId) === actorId;
    if (!isClient && !isArtist) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return res.status(400).json({
        error: "Cannot reschedule cancelled or completed appointment",
      });
    }

    const newStartAt = new Date(startISO);
    const now = new Date();
    const hoursUntilAppointment =
      (newStartAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hoursUntilOriginal =
      (new Date(booking.startAt).getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < MIN_RESCHEDULE_NOTICE_HOURS) {
      return res.status(400).json({
        error: "insufficient_notice",
        message: `Rescheduling requires at least ${MIN_RESCHEDULE_NOTICE_HOURS} hours notice`,
        hoursUntilAppointment: Math.round(hoursUntilAppointment * 10) / 10,
      });
    }

    const newEndAt = new Date(endISO);
    if (
      Number.isNaN(newStartAt.getTime()) ||
      Number.isNaN(newEndAt.getTime()) ||
      newEndAt <= newStartAt
    ) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      artistId: booking.artistId,
      startAt: { $lt: newEndAt },
      endAt: { $gt: newStartAt },
      status: { $nin: ["cancelled", "denied"] },
    });

    if (conflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    const shouldForfeitDeposit =
      hoursUntilOriginal < 48 && booking.depositPaidCents > 0;

    booking.rescheduledFrom = booking.startAt;
    booking.rescheduledAt = new Date();
    booking.rescheduledBy = isClient ? "client" : "artist";
    booking.rescheduleNoticeHours = hoursUntilAppointment;
    booking.startAt = newStartAt;
    booking.endAt = newEndAt;

    if (shouldForfeitDeposit) {
      booking.depositPaidCents = 0;
    }

    await booking.save();

    try {
      await Message.create({
        senderId: actorId,
        receiverId: isClient
          ? String(booking.artistId)
          : String(booking.clientId),
        text: `Appointment rescheduled to ${newStartAt.toLocaleString()}. ${
          shouldForfeitDeposit
            ? "Deposit has been forfeited due to late rescheduling."
            : ""
        } ${reason ? `Reason: ${reason}` : ""}`,
        meta: {
          kind: "appointment_rescheduled",
          bookingId: String(booking._id),
          oldStartAt: booking.rescheduledFrom?.toISOString(),
          newStartAt: newStartAt.toISOString(),
          depositForfeited: shouldForfeitDeposit,
        },
      });
    } catch {}

    res.json(booking);
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    return res.status(500).json({ error: "Failed to reschedule appointment" });
  }
}

export async function markNoShow(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { reason } = req.body || {};

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });

    const isArtist = String(booking.artistId) === actorId;
    if (!isArtist) {
      return res.status(403).json({ error: "Only artist can mark no-show" });
    }

    if (new Date(booking.startAt) > new Date()) {
      return res
        .status(400)
        .json({ error: "Cannot mark no-show for future appointments" });
    }

    if (booking.status === "no-show") {
      return res.json(booking);
    }

    const shouldForfeitDeposit = booking.depositPaidCents > 0;

    booking.status = "no-show";
    booking.noShowMarkedAt = new Date();
    booking.noShowMarkedBy = "artist";

    if (shouldForfeitDeposit) {
      booking.depositPaidCents = 0;
    }

    await booking.save();

    try {
      await Message.create({
        senderId: actorId,
        receiverId: String(booking.clientId),
        text: `No-show marked for appointment on ${new Date(
          booking.startAt
        ).toLocaleString()}. ${reason ? `Reason: ${reason}` : ""}`,
        meta: {
          kind: "no_show_marked",
          bookingId: String(booking._id),
        },
      });
    } catch {}

    res.json(booking);
  } catch (error) {
    console.error("Error marking no-show:", error);
    return res.status(500).json({ error: "Failed to mark no-show" });
  }
}

export async function submitIntakeForm(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { bookingId } = req.params;
    const body = req.body || {};

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (String(booking.clientId) !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const consent = body.consent || {};
    if (
      !consent.ageVerification ||
      !consent.healthDisclosure ||
      !consent.aftercareInstructions
    ) {
      return res.status(400).json({
        error: "Missing required consent fields",
        required: [
          "ageVerification",
          "healthDisclosure",
          "aftercareInstructions",
        ],
      });
    }

    const intakeForm = await IntakeForm.findOneAndUpdate(
      { bookingId },
      {
        bookingId,
        clientId: userId,
        artistId: booking.artistId,
        healthInfo: body.healthInfo || {},
        tattooDetails: body.tattooDetails || {},
        consent,
        emergencyContact: body.emergencyContact || {},
        additionalNotes: body.additionalNotes || "",
        submittedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || "",
      },
      { new: true, upsert: true }
    );

    booking.intakeFormId = intakeForm._id;
    await booking.save();

    res.json(intakeForm);
  } catch (error) {
    console.error("Error submitting intake form:", error);
    return res.status(500).json({ error: "Failed to submit intake form" });
  }
}

export async function getIntakeForm(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const isClient = String(booking.clientId) === userId;
    const isArtist = String(booking.artistId) === userId;
    if (!isClient && !isArtist) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const intakeForm = await IntakeForm.findOne({ bookingId });
    if (!intakeForm) {
      return res.status(404).json({ error: "Intake form not found" });
    }

    res.json(intakeForm);
  } catch (error) {
    console.error("Error fetching intake form:", error);
    return res.status(500).json({ error: "Failed to fetch intake form" });
  }
}

export async function getAppointmentDetails(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate("intakeFormId")
      .populate("projectId")
      .populate("referenceImageIds");

    if (!booking) return res.status(404).json({ error: "not_found" });

    const isClient = String(booking.clientId) === userId;
    const isArtist = String(booking.artistId) === userId;
    if (!isClient && !isArtist) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const User = (await import("../models/UserBase.js")).default;
    const [client, artist] = await Promise.all([
      User.findOne({ clerkId: booking.clientId }).lean(),
      User.findOne({ clerkId: booking.artistId }).lean(),
    ]);

    res.json({
      ...booking.toObject(),
      client: client
        ? { username: client.username, avatar: client.avatar }
        : null,
      artist: artist
        ? { username: artist.username, avatar: artist.avatar }
        : null,
    });
  } catch (error) {
    console.error("Error fetching appointment details:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch appointment details" });
  }
}

export async function acceptAppointment(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });

    const isArtist = String(booking.artistId) === userId;
    if (!isArtist) {
      return res.status(403).json({ error: "Only the artist can accept appointments" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ 
        error: "Appointment is not pending",
        currentStatus: booking.status 
      });
    }

    booking.status = "accepted";
    booking.confirmedAt = new Date();
    await booking.save();

    try {
      await Message.create({
        senderId: String(booking.artistId),
        receiverId: String(booking.clientId),
        text: `Your ${booking.appointmentType === "consultation" ? "consultation" : "appointment"} request has been accepted.`,
        meta: {
          kind: "appointment_accepted",
          bookingId: String(booking._id),
        },
      });
    } catch {}

    res.json(booking);
  } catch (error) {
    console.error("Error accepting appointment:", error);
    return res.status(500).json({ error: "Failed to accept appointment" });
  }
}

export async function denyAppointment(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { reason } = req.body || {};
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });

    const isClient = String(booking.clientId) === userId;
    const isArtist = String(booking.artistId) === userId;
    
    if (!isClient && !isArtist) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ 
        error: "Appointment is not pending",
        currentStatus: booking.status 
      });
    }

    booking.status = "denied";
    booking.cancelledAt = new Date();
    booking.cancelledBy = isClient ? "client" : "artist";
    booking.cancellationReason = reason || "";
    await booking.save();

    if (isClient) {
      const now = new Date();
      const cooldownExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await BookingCooldown.findOneAndUpdate(
        { userId: String(booking.clientId), artistId: String(booking.artistId) },
        {
          userId: String(booking.clientId),
          artistId: String(booking.artistId),
          cancelledAt: now,
          expiresAt: cooldownExpiresAt,
          bookingId: booking._id,
        },
        { upsert: true, new: true }
      );
    }

    try {
      const io = getIO();
      if (io) {
        const dateStr = new Date(booking.startAt).toISOString().slice(0, 10);
        io.emit("booking:denied", {
          artistId: String(booking.artistId),
          date: dateStr,
          bookingId: String(booking._id),
        });
      }
    } catch {}

    try {
      await Message.create({
        senderId: userId,
        receiverId: isClient ? String(booking.artistId) : String(booking.clientId),
        text: `The ${booking.appointmentType === "consultation" ? "consultation" : "appointment"} request has been denied.${reason ? ` Reason: ${reason}` : ""}`,
        meta: {
          kind: "appointment_denied",
          bookingId: String(booking._id),
          deniedBy: isClient ? "client" : "artist",
        },
      });
    } catch {}

    res.json(booking);
  } catch (error) {
    console.error("Error denying appointment:", error);
    return res.status(500).json({ error: "Failed to deny appointment" });
  }
}

export async function getAppointments(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { role } = req.query;
    let bookings;

    if (role === "client") {
      bookings = await Booking.find({ clientId: userId })
        .sort({ startAt: -1 })
        .limit(100)
        .lean();
    } else if (role === "artist") {
      bookings = await Booking.find({ artistId: userId })
        .sort({ startAt: -1 })
        .limit(100)
        .lean();
    } else {
      // Get both client and artist appointments
      bookings = await Booking.find({
        $or: [{ clientId: userId }, { artistId: userId }]
      })
        .sort({ startAt: -1 })
        .limit(100)
        .lean();
    }

    const User = (await import("../models/UserBase.js")).default;

    const appointmentsWithUsers = await Promise.all(
      bookings.map(async (booking) => {
        const [client, artist] = await Promise.all([
          User.findOne({ clerkId: booking.clientId }).lean(),
          User.findOne({ clerkId: booking.artistId }).lean(),
        ]);

        return {
          ...booking,
          client: client
            ? {
                username: client.username || "Unknown",
                avatar: client.avatar || null,
              }
            : null,
          artist: artist
            ? {
                username: artist.username || "Unknown",
                avatar: artist.avatar || null,
              }
            : null,
        };
      })
    );

    res.json(appointmentsWithUsers);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({ error: "Failed to fetch appointments" });
  }
}