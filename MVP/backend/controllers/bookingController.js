import Booking from "../models/Booking.js";
import ArtistPolicy from "../models/ArtistPolicy.js";
import Message from "../models/Message.js";
import Availability from "../models/Availability.js";
import IntakeForm from "../models/IntakeForm.js";
import Project from "../models/Project.js";
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

// Appointment-specific functions

const CONSULTATION_DURATION_MINUTES = 30; // Default 30 minutes, can be 15-60
const MIN_RESCHEDULE_NOTICE_HOURS = 48; // 48-72 hours notice required

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
    const durationMinutes = Math.max(15, Math.min(60, Number(body.durationMinutes || CONSULTATION_DURATION_MINUTES)));
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

    // Check for conflicts
    const conflict = await Booking.findOne({
      artistId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      status: { $nin: ["cancelled"] },
    });

    if (conflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    // Get artist policy for deposit calculation
    let policy = null;
    try {
      policy = await ArtistPolicy.findOne({ artistId });
    } catch {}

    // Consultations typically have lower or no deposit
    const consultationPriceCents = Math.max(0, Number(body.priceCents || 0));
    const depositRequiredCents = computeDepositCents(policy, consultationPriceCents);

    const booking = await Booking.create({
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
    const durationMinutes = Math.max(30, Math.min(480, Number(body.durationMinutes || DEFAULT_SLOT_MINUTES)));
    const projectId = body.projectId ? String(body.projectId).trim() : null;
    const sessionNumber = Math.max(1, Number(body.sessionNumber || 1));
    const note = body.note ?? "";
    const referenceImageIds = Array.isArray(body.referenceImageIds) ? body.referenceImageIds : [];

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

    // Check for conflicts
    const conflict = await Booking.findOne({
      artistId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      status: { $nin: ["cancelled"] },
    });

    if (conflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    // If projectId provided, verify it exists and belongs to client
    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (String(project.clientId) !== userId || String(project.artistId) !== artistId) {
        return res.status(403).json({ error: "Project access denied" });
      }
    }

    // Get artist policy for deposit calculation
    let policy = null;
    try {
      policy = await ArtistPolicy.findOne({ artistId });
    } catch {}

    const priceCents = Math.max(0, Number(body.priceCents || 0));
    const depositRequiredCents = computeDepositCents(policy, priceCents);

    const booking = await Booking.create({
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

    // Update project if linked
    if (project) {
      project.completedSessions = Math.max(project.completedSessions || 0, sessionNumber);
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

    // Verify authorization
    const isClient = String(booking.clientId) === actorId;
    const isArtist = String(booking.artistId) === actorId;
    if (!isClient && !isArtist) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Check if booking can be rescheduled
    if (booking.status === "cancelled" || booking.status === "completed") {
      return res.status(400).json({ error: "Cannot reschedule cancelled or completed appointment" });
    }

    // Check notice requirement (48-72 hours)
    const newStartAt = new Date(startISO);
    const now = new Date();
    const hoursUntilAppointment = (newStartAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < MIN_RESCHEDULE_NOTICE_HOURS) {
      return res.status(400).json({
        error: "insufficient_notice",
        message: `Rescheduling requires at least ${MIN_RESCHEDULE_NOTICE_HOURS} hours notice`,
        hoursUntilAppointment: Math.round(hoursUntilAppointment * 10) / 10,
      });
    }

    // Validate new time slot
    const newEndAt = new Date(endISO);
    if (Number.isNaN(newStartAt.getTime()) || Number.isNaN(newEndAt.getTime()) || newEndAt <= newStartAt) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    // Check for conflicts
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      artistId: booking.artistId,
      startAt: { $lt: newEndAt },
      endAt: { $gt: newStartAt },
      status: { $nin: ["cancelled"] },
    });

    if (conflict) {
      return res.status(409).json({ error: "Slot already booked" });
    }

    // Update booking
    booking.rescheduledFrom = booking.startAt;
    booking.rescheduledAt = new Date();
    booking.rescheduledBy = isClient ? "client" : "artist";
    booking.rescheduleNoticeHours = hoursUntilAppointment;
    booking.startAt = newStartAt;
    booking.endAt = newEndAt;

    await booking.save();

    // Send notification message
    try {
      await Message.create({
        senderId: actorId,
        receiverId: isClient ? String(booking.artistId) : String(booking.clientId),
        text: `Appointment rescheduled to ${newStartAt.toLocaleString()}. ${reason ? `Reason: ${reason}` : ""}`,
        meta: {
          kind: "appointment_rescheduled",
          bookingId: String(booking._id),
          oldStartAt: booking.rescheduledFrom?.toISOString(),
          newStartAt: newStartAt.toISOString(),
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

    // Only artist or system can mark no-show
    const isArtist = String(booking.artistId) === actorId;
    if (!isArtist) {
      return res.status(403).json({ error: "Only artist can mark no-show" });
    }

    // Can only mark no-show for past appointments
    if (new Date(booking.startAt) > new Date()) {
      return res.status(400).json({ error: "Cannot mark no-show for future appointments" });
    }

    if (booking.status === "no-show") {
      return res.json(booking);
    }

    booking.status = "no-show";
    booking.noShowMarkedAt = new Date();
    booking.noShowMarkedBy = "artist";
    await booking.save();

    // Send notification
    try {
      await Message.create({
        senderId: actorId,
        receiverId: String(booking.clientId),
        text: `No-show marked for appointment on ${new Date(booking.startAt).toLocaleString()}. ${reason ? `Reason: ${reason}` : ""}`,
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

    // Verify client owns this booking
    if (String(booking.clientId) !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Validate required consent fields
    const consent = body.consent || {};
    if (!consent.ageVerification || !consent.healthDisclosure || !consent.aftercareInstructions) {
      return res.status(400).json({
        error: "Missing required consent fields",
        required: ["ageVerification", "healthDisclosure", "aftercareInstructions"],
      });
    }

    // Create or update intake form
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

    // Link intake form to booking
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

    // Verify user has access (client or artist)
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

    // Verify user has access
    const isClient = String(booking.clientId) === userId;
    const isArtist = String(booking.artistId) === userId;
    if (!isClient && !isArtist) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Populate user info
    const User = (await import("../models/UserBase.js")).default;
    const [client, artist] = await Promise.all([
      User.findOne({ clerkId: booking.clientId }).lean(),
      User.findOne({ clerkId: booking.artistId }).lean(),
    ]);

    res.json({
      ...booking.toObject(),
      client: client ? { username: client.username, avatar: client.avatar } : null,
      artist: artist ? { username: artist.username, avatar: artist.avatar } : null,
    });
  } catch (error) {
    console.error("Error fetching appointment details:", error);
    return res.status(500).json({ error: "Failed to fetch appointment details" });
  }
}