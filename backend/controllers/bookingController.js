import Booking from "../models/Booking.js";
import { getActorId } from "../lib/auth.js";
import ArtistPolicy from "../models/ArtistPolicy.js";
import Message from "../models/Message.js";
import Availability from "../models/Availability.js";
import IntakeForm from "../models/IntakeForm.js";
import Project from "../models/Project.js";
import BookingCooldown from "../models/BookingCooldown.js";
import Client from "../models/Client.js";
import Artist from "../models/Artist.js";
import { dayBoundsUTC } from "../utils/date.js";
import { refundDepositForBooking } from "./billingController.js";
import { DateTime, Interval } from "luxon";
import { getIO, emitMessageCreated, emitBookingCreated } from "../services/socketService.js";
import { sendAppointmentCancellationEmail, sendVerificationCodeEmail } from "../services/emailService.js";
import { recordCompletedBooking } from "../services/rewardsService.js";
import { captureBookingBalance } from "../services/balanceCaptureService.js";
import { hasSignedCurrentDocument } from "../services/signatureGateService.js";
import { applyPayoutScheduleForArtist } from "../services/payoutScheduleService.js";
import { notifyWaitlistForArtist } from "../services/waitlistService.js";
import { config } from "../config/index.js";
import { randomBytes } from "crypto";

const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_SLOT_MINUTES = 30;
const DEFAULT_OPEN_RANGES = [{ start: "10:00", end: "22:00" }];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

async function notify(fields) {
  const message = await Message.create(fields);
  try { emitMessageCreated(message); } catch {}
  return message;
}

const SCHEDULE_COOLDOWN_HOURS = 2;

async function getArtistTimezone(artistId) {
  try {
    const av = await Availability.findOne({ artistId });
    return av?.timezone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function formatBookingWhen(startAt, zone) {
  try {
    return DateTime.fromJSDate(new Date(startAt), { zone: zone || DEFAULT_TIMEZONE })
      .toFormat("cccc, LLLL d, yyyy 'at' h:mm a");
  } catch {
    return new Date(startAt).toISOString();
  }
}

async function getActiveBookingCooldown(userId, artistId) {
  if (config.dev.bypassGates) return null;
  return BookingCooldown.findOne({
    userId: String(userId),
    artistId: String(artistId),
    expiresAt: { $gt: new Date() },
  });
}

function respondWithCooldown(res, cooldown) {
  const hoursRemaining =
    (cooldown.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
  return res.status(429).json({
    error: "cooldown_active",
    message: `You can request another appointment with this artist in ${Math.ceil(hoursRemaining)} hour(s).`,
    expiresAt: cooldown.expiresAt,
  });
}

async function computeDepositForfeiture(booking, now) {
  const hoursUntilAppointment =
    (new Date(booking.startAt).getTime() - now.getTime()) / (1000 * 60 * 60);
  let cancelPolicy = null;
  try {
    cancelPolicy = await ArtistPolicy.findOne({ artistId: booking.artistId });
  } catch {}
  const cutoffHours = Number(cancelPolicy?.deposit?.cutoffHours ?? 48);
  const shouldForfeitDeposit =
    hoursUntilAppointment < cutoffHours && booking.depositPaidCents > 0;
  return { hoursUntilAppointment, shouldForfeitDeposit };
}

async function sendClientCancellationEmail(booking) {
  let clientEmail = null;
  let clientName = "Valued Client";
  if (booking.clientId) {
    const client = await Client.findById(booking.clientId);
    if (client) {
      clientEmail = client.email;
      clientName = client.username || client.handle || "Valued Client";
    }
  }
  if (clientEmail) {
    await sendAppointmentCancellationEmail(booking, clientEmail, clientName);
  }
}

function emitBookingDayEvent(event, booking) {
  try {
    const io = getIO();
    if (io) {
      io.emit(event, {
        artistId: String(booking.artistId),
        date: new Date(booking.startAt).toISOString().slice(0, 10),
        bookingId: String(booking._id),
      });
    }
  } catch {}
}

async function applyClientCancelCooldown(clientId, artistId, bookingId, now = new Date()) {
  return BookingCooldown.findOneAndUpdate(
    { userId: String(clientId), artistId: String(artistId) },
    {
      userId: String(clientId),
      artistId: String(artistId),
      cancelledAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      bookingId,
    },
    { upsert: true, new: true }
  );
}

async function applyScheduleCooldown(userId, artistId, bookingId) {
  try {
    const now = new Date();
    await BookingCooldown.findOneAndUpdate(
      { userId: String(userId), artistId: String(artistId) },
      {
        userId: String(userId),
        artistId: String(artistId),
        cancelledAt: now,
        expiresAt: new Date(now.getTime() + SCHEDULE_COOLDOWN_HOURS * 60 * 60 * 1000),
        bookingId,
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("applyScheduleCooldown failed:", e?.message);
  }
}

async function notifyArtistOfBooking({ clientId, artistId, booking, tz }) {
  try {
    const zone = tz || (await getArtistTimezone(artistId));
    const typeLabel = booking.appointmentType === "consultation" ? "consultation" : "tattoo session";
    const action = booking.status === "pending" ? "request" : "booking";
    const whenStr = formatBookingWhen(booking.startAt, zone);
    await notify({
      senderId: String(clientId),
      receiverId: String(artistId),
      text: `New ${typeLabel} ${action} for ${whenStr}.`,
      meta: {
        kind: "appointment_requested",
        bookingId: String(booking._id),
        appointmentType: booking.appointmentType || "tattoo_session",
      },
    });
  } catch (e) {
    console.error("notifyArtistOfBooking failed:", e?.message);
  }
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function artistCanReceivePayments(artistId) {
  if (config.dev.bypassGates) return true;
  const artist = await Artist.findOne({ clerkId: String(artistId) });
  return Boolean(artist?.stripeConnectAccountId && artist.chargesEnabled);
}

async function incrementArtistBookings(artistId) {
  try {
    await Artist.updateOne(
      { clerkId: String(artistId) },
      { $inc: { bookingsCount: 1 } }
    );
    await applyPayoutScheduleForArtist(artistId);
  } catch (e) {
    console.error("incrementArtistBookings failed:", e.message);
  }
}

async function clientWaiverSigned(clientId) {
  if (config.dev.bypassGates) return true;
  return hasSignedCurrentDocument(clientId, "client_waiver");
}

const REQUIRED_INTAKE_CONSENT = [
  "ageVerification",
  "healthDisclosure",
  "aftercareInstructions",
  "depositPolicy",
  "cancellationPolicy",
];

function intakeConsentComplete(intake) {
  const consent = intake?.consent || {};
  return REQUIRED_INTAKE_CONSENT.every((k) => consent[k] === true);
}

async function persistIntakeForBooking(booking, intake, req) {
  const intakeForm = await IntakeForm.create({
    bookingId: booking._id,
    clientId: String(booking.clientId),
    artistId: String(booking.artistId),
    healthInfo: intake.healthInfo || {},
    tattooDetails: intake.tattooDetails || {},
    consent: intake.consent,
    emergencyContact: intake.emergencyContact || {},
    additionalNotes: intake.additionalNotes || "",
    submittedAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || "",
  });
  booking.intakeFormId = intakeForm._id;
  await booking.save();
  return intakeForm;
}

async function studioReadyForArtist(artistId) {
  if (config.dev.bypassGates) return { ok: true };
  const { getArtistStudioMembership } = await import("../services/studioService.js");
  const ctx = await getArtistStudioMembership(artistId);
  if (!ctx) return { ok: true };
  const studio = ctx.studio;
  const ready =
    studio.verificationStatus === "verified" &&
    Boolean(studio.stripeConnectAccountId && studio.chargesEnabled);
  return ready
    ? { ok: true }
    : {
        ok: false,
        message:
          "This artist's studio is still completing setup, so bookings aren't available yet.",
      };
}

export function computeDepositCents(policy, priceCents, appointmentType) {
  const p = policy?.deposit || {};
  if (appointmentType === "consultation" && (p.consultationFree ?? true)) return 0;
  const price = Math.max(0, Number(priceCents || 0));
  const mode = p.mode || "percent";
  let result;
  if (mode === "flat") {
    const base = Math.max(0, Number(p.amountCents || 0));
    result = appointmentType === "tattoo_session" ? Math.max(base, 5000) : base;
  } else {
    const percent = Math.max(0, Math.min(1, Number(p.percent || 0.2)));
    const minCents = Math.max(
      0,
      Number(p.minCents || 0),
      appointmentType === "tattoo_session" ? 5000 : 0
    );
    const maxCents = Math.max(0, Number(p.maxCents || Infinity));
    const raw = Math.round(price * percent);
    result = Math.min(Math.max(raw, minCents), maxCents);
  }
  if (price > 0) result = Math.min(result, price);
  return result;
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
  try {
    const { artistId, date } = req.query;
    if (!artistId || !date)
      return res.status(400).json({ error: "artistId and date are required" });
    const { start, end } = dayBoundsUTC(String(date));
    const docs = await Booking.find({
      artistId,
      startAt: { $lt: end },
      endAt: { $gt: start },
      status: { $in: ["booked", "matched", "completed", "accepted", "pending"] },
    })
      .select("startAt endAt status artistId")
      .sort({ startAt: 1 });
    res.json(docs);
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ error: "Invalid parameter" });
    res.status(500).json({ error: "Failed to fetch bookings for day" });
  }
}

export async function getBooking(req, res) {
  try {
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not_found" });
    const actorId = getActorId(req);
    const isParty =
      String(doc.clientId) === actorId ||
      String(doc.artistId) === actorId ||
      config.admin.clerkIds.includes(actorId);
    if (!isParty) return res.status(403).json({ error: "forbidden" });
    res.json(doc);
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ error: "Invalid booking id" });
    res.status(500).json({ error: "Failed to fetch booking" });
  }
}

async function enrichBookingsWithParty(docs, party) {
  const idKey = party === "artist" ? "artistId" : "clientId";
  const fallbackLabel = party === "artist" ? "Unknown Artist" : "Unknown Client";
  const User = (await import("../models/UserBase.js")).default;

  const ids = [...new Set(docs.map((b) => b[idKey]).filter(Boolean))];
  const users = ids.length
    ? await User.find({ clerkId: { $in: ids } })
        .select("clerkId username avatar")
        .lean()
    : [];
  const userMap = new Map(users.map((u) => [u.clerkId, u]));

  return docs.map((booking) => {
    const user = userMap.get(booking[idKey]);
    return {
      ...booking,
      [party]: user
        ? {
            username: user.username || "Unknown",
            profileImage: user.avatar?.url || "",
            avatar: user.avatar || null,
          }
        : { username: fallbackLabel, profileImage: "", avatar: null },
    };
  });
}

export async function getClientBookings(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const docs = await Booking.find({ clientId: userId })
      .sort({ startAt: -1 })
      .limit(100)
      .lean();

    res.json(await enrichBookingsWithParty(docs, "artist"));
  } catch (error) {
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

    res.json(await enrichBookingsWithParty(docs, "client"));
  } catch (error) {
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

    const activeCooldown = await getActiveBookingCooldown(userId, artistId);
    if (activeCooldown) return respondWithCooldown(res, activeCooldown);

    let policy = null;
    try {
      policy =
        typeof ArtistPolicy?.findOne === "function"
          ? await ArtistPolicy.findOne({ artistId })
          : null;
    } catch {
      policy = null;
    }

    const ClientBookingPermission = (await import("../models/ClientBookingPermission.js")).default;
    const permission = await ClientBookingPermission.findOne({
      artistId,
      clientId: String(userId),
    });

    if (!config.dev.bypassGates && (!permission || !permission.enabled)) {
      return res.status(403).json({
        error: "bookings_disabled",
        message: "Appointments are not enabled for you. Please contact the artist to enable appointments."
      });
    }

    if (!(await artistCanReceivePayments(artistId))) {
      return res.status(409).json({
        error: "artist_not_onboarded",
        message: "This artist hasn't finished payment setup yet, so bookings can't be processed.",
      });
    }

    if (!(await clientWaiverSigned(userId))) {
      return res.status(403).json({
        error: "waiver_required",
        docType: "client_waiver",
        message: "Please review and sign the consent & liability waiver before booking.",
      });
    }

    const studioReady = await studioReadyForArtist(artistId);
    if (!studioReady.ok) {
      return res.status(409).json({
        error: "studio_not_ready",
        message: studioReady.message,
      });
    }

    const depositRequiredCents = config.dev.bypassGates
      ? 0
      : computeDepositCents(policy, priceCents, "tattoo_session");
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
        cancelToken: randomBytes(32).toString("hex"),
        codeIssuedAt: null,
        codeExpiresAt: null,
        clientVerifiedAt: null,
        artistVerifiedAt: null,
        matchedAt: null,
        completedAt: null,
      });
      emitBookingCreated(created);
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
    await notifyArtistOfBooking({ clientId: userId, artistId, booking: created });
    await applyScheduleCooldown(userId, artistId, created._id);
    return res.status(201).json(created);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: "Slot already booked" });
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
      await notify({
        senderId: String(booking.artistId),
        receiverId: String(booking.clientId),
        text: `Your verification code: ${booking.clientCode} (valid 3 minutes)`,
        meta: {
          kind: "verification_code",
          bookingId: String(booking._id),
          role: "client",
        },
      });
      await notify({
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
    try {
      const User = (await import("../models/UserBase.js")).default;
      const [client, artist] = await Promise.all([
        User.findOne({ clerkId: booking.clientId }).lean(),
        User.findOne({ clerkId: booking.artistId }).lean(),
      ]);
      await Promise.all([
        client?.email &&
          sendVerificationCodeEmail(client.email, {
            code: booking.clientCode,
            role: "client",
            recipientName: client.username,
            expiresAt: booking.codeExpiresAt,
            appointmentType: booking.appointmentType,
          }),
        artist?.email &&
          sendVerificationCodeEmail(artist.email, {
            code: booking.artistCode,
            role: "artist",
            recipientName: artist.username,
            expiresAt: booking.codeExpiresAt,
            appointmentType: booking.appointmentType,
          }),
      ]);
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
    const { hoursUntilAppointment, shouldForfeitDeposit } =
      await computeDepositForfeiture(booking, now);

    booking.status = "cancelled";
    booking.cancelledAt = now;
    booking.cancelledBy = isClient ? "client" : isArtist ? "artist" : "system";
    booking.cancellationReason = reason || "";

    if (shouldForfeitDeposit) {
      booking.depositPaidCents = 0;
    }

    await booking.save();

    if (isClient) {
      await applyClientCancelCooldown(booking.clientId, booking.artistId, booking._id, now);
    }

    emitBookingDayEvent("booking:cancelled", booking);

    try {
      if (
        !shouldForfeitDeposit &&
        hoursUntilAppointment >= 0 &&
        booking.depositPaidCents > 0
      ) {
        await refundDepositForBooking(String(booking._id));
      }
    } catch (e) {
      console.error("cancelBooking deposit refund failed:", e.message);
    }

    try {
      const zone = await getArtistTimezone(booking.artistId);
      const whenStr = formatBookingWhen(booking.startAt, zone);
      const typeLabel = booking.appointmentType === "consultation" ? "consultation" : "appointment";
      await notify({
        senderId: actorId,
        receiverId: isClient
          ? String(booking.artistId)
          : String(booking.clientId),
        text: `The ${typeLabel} for ${whenStr} has been cancelled.${
          shouldForfeitDeposit ? " The deposit was forfeited due to late cancellation." : ""
        } Reason: ${reason || "none provided"}.`,
        meta: {
          kind: "appointment_cancelled",
          bookingId: String(booking._id),
          depositForfeited: shouldForfeitDeposit,
        },
      });
    } catch {}

    try {
      if (isClient) await sendClientCancellationEmail(booking);
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }

    try {
      await notifyWaitlistForArtist(booking.artistId, { dateISO: booking.startAt });
    } catch {}

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: "cancel_failed" });
  }
}

export async function cancelBookingViaLink(req, res) {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const booking = await Booking.findById(id).select("+cancelToken");
    if (!booking) return res.status(404).json({ error: "not_found" });

    if (!token || !booking.cancelToken || token !== booking.cancelToken) {
      return res.status(403).redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/appointments?error=invalid_token`);
    }

    if (booking.status === "cancelled") {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/appointments?cancelled=true`);
    }

    const now = new Date();
    const { shouldForfeitDeposit } = await computeDepositForfeiture(booking, now);

    const cancellationReason = "Cancelled via email link";
    booking.status = "cancelled";
    booking.cancelledAt = now;
    booking.cancelledBy = "client";
    booking.cancellationReason = cancellationReason;

    if (shouldForfeitDeposit) {
      booking.depositPaidCents = 0;
    }

    await booking.save();

    try {
      const zone = await getArtistTimezone(booking.artistId);
      const whenStr = formatBookingWhen(booking.startAt, zone);
      const typeLabel = booking.appointmentType === "consultation" ? "consultation" : "appointment";
      await notify({
        senderId: String(booking.clientId),
        receiverId: String(booking.artistId),
        text: `The ${typeLabel} for ${whenStr} has been cancelled.${
          shouldForfeitDeposit ? " The deposit was forfeited due to late cancellation." : ""
        } Reason: ${cancellationReason}.`,
        meta: {
          kind: "appointment_cancelled",
          bookingId: String(booking._id),
          depositForfeited: shouldForfeitDeposit,
        },
      });
    } catch {}

    try {
      await sendClientCancellationEmail(booking);
    } catch (emailError) {
      console.error("Failed to send cancellation confirmation email:", emailError);
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/appointments?cancelled=true`);

  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/appointments?error=cancel_failed`);
  }
}

export async function completeBooking(req, res) {
  try {
    const actorId = getActorId(req);
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not_found" });
    const isArtist = String(doc.artistId) === actorId;
    if (!isArtist) return res.status(403).json({ error: "Only the artist can complete a booking" });
    if (doc.status === "completed") return res.json(doc);
    if (["cancelled", "denied", "no-show"].includes(doc.status)) {
      return res.status(409).json({
        error: "invalid_status",
        message: `A ${doc.status} booking cannot be completed.`,
      });
    }
    if (!config.dev.bypassGates && !(doc.clientVerifiedAt && doc.artistVerifiedAt)) {
      return res.status(400).json({
        error: "verification_required",
        message: "Both you and the client must confirm completion before it can be marked done.",
      });
    }
    doc.status = "completed";
    doc.completedAt = new Date();
    await doc.save();
    try {
      await recordCompletedBooking(doc.clientId);
    } catch (e) {
      console.error("recordCompletedBooking failed:", e.message);
    }
    await incrementArtistBookings(doc.artistId);
    res.json(doc);
  } catch {
    res.status(500).json({ error: "complete_failed" });
  }
}

export async function setFinalPrice(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const finalPriceCents = Math.max(0, Math.round(Number(req.body?.finalPriceCents || 0)));

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    if (String(booking.artistId) !== actorId)
      return res.status(403).json({ error: "Only the artist can set the final price" });
    if (["completed", "cancelled", "denied", "no-show"].includes(booking.status))
      return res.status(400).json({ error: "Cannot change price for this appointment" });
    if (finalPriceCents < Number(booking.depositPaidCents || 0))
      return res.status(400).json({
        error: "price_below_deposit",
        message: "Final price cannot be less than the deposit already paid.",
      });
    if (finalPriceCents > config.booking.maxPriceCents)
      return res.status(400).json({
        error: "price_above_max",
        message: `Final price cannot exceed $${(config.booking.maxPriceCents / 100).toLocaleString()}.`,
      });

    const quoted = Number(booking.quotedPriceCents || 0);
    const reconsentThreshold = Math.round(quoted * (1 + config.booking.finalPriceReconsentPct));
    const needsReconsent = finalPriceCents > reconsentThreshold;

    booking.priceCents = finalPriceCents;
    booking.finalPriceSetAt = new Date();
    booking.finalPriceApproved = !needsReconsent;
    booking.finalPriceApprovedAt = needsReconsent ? undefined : new Date();
    await booking.save();

    try {
      await notify({
        senderId: String(booking.artistId),
        receiverId: String(booking.clientId),
        text: needsReconsent
          ? `Your artist set the final price to $${(finalPriceCents / 100).toFixed(2)} (quoted $${(quoted / 100).toFixed(2)}). Please review and approve it before your remaining balance is charged.`
          : `Final price set to $${(finalPriceCents / 100).toFixed(2)}. Your remaining balance will be charged automatically once you both confirm completion.`,
        meta: {
          kind: needsReconsent ? "final_price_needs_approval" : "final_price_set",
          bookingId: String(booking._id),
          finalPriceCents,
          quotedPriceCents: quoted,
        },
      });
    } catch {}

    res.json(booking);
  } catch {
    res.status(500).json({ error: "set_final_price_failed" });
  }
}

export async function approveFinalPrice(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    if (String(booking.clientId) !== actorId)
      return res.status(403).json({ error: "Only the client can approve the final price" });
    if (!booking.finalPriceSetAt)
      return res.status(400).json({ error: "no_final_price" });

    if (booking.finalPriceApproved !== true) {
      booking.finalPriceApproved = true;
      booking.finalPriceApprovedAt = new Date();
      await booking.save();

      try {
        await notify({
          senderId: String(booking.clientId),
          receiverId: String(booking.artistId),
          text: `Your client approved the final price of $${(Number(booking.priceCents || 0) / 100).toFixed(2)}.`,
          meta: { kind: "final_price_approved", bookingId: String(booking._id) },
        });
      } catch {}

      if (booking.status === "completed" && !config.dev.bypassGates) {
        try {
          const result = await captureBookingBalance(booking);
          if (result && !result.ok && !result.skipped) {
            await notify({
              senderId: String(booking.artistId),
              receiverId: String(booking.clientId),
              text: "We couldn't automatically charge your remaining balance. Please complete the payment from your appointment.",
              meta: { kind: "balance_capture_failed", bookingId: String(booking._id), reason: result.reason },
            });
          }
        } catch (e) {
          console.error("captureBookingBalance (post-approval) failed:", e.message);
        }
      }
    }

    res.json(booking);
  } catch {
    res.status(500).json({ error: "approve_final_price_failed" });
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
    const actorId = getActorId(req);
    const isClient = String(doc.clientId) === actorId;
    const isArtist = String(doc.artistId) === actorId;
    if (!isClient && !isArtist) return res.status(403).json({ error: "Forbidden" });
    if (role === "client" && !isClient) return res.status(403).json({ error: "role_mismatch" });
    if (role === "artist" && !isArtist) return res.status(403).json({ error: "role_mismatch" });
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
    let justCompleted = false;
    if (doc.clientVerifiedAt && doc.artistVerifiedAt && doc.status !== "completed") {
      doc.matchedAt = new Date();
      doc.status = "completed";
      doc.completedAt = new Date();
      justCompleted = true;
    }
    await doc.save();
    if (justCompleted) {
      try {
        await recordCompletedBooking(doc.clientId);
      } catch (e) {
        console.error("recordCompletedBooking failed:", e.message);
      }
      await incrementArtistBookings(doc.artistId);
      if (!config.dev.bypassGates) {
        try {
          const result = await captureBookingBalance(doc);
          if (result && !result.ok && !result.skipped) {
            const unapproved = result.reason === "final_price_unapproved";
            await notify({
              senderId: String(doc.artistId),
              receiverId: String(doc.clientId),
              text: unapproved
                ? "Approve the final price on your appointment to complete payment of your remaining balance."
                : "We couldn't automatically charge your remaining balance. Please complete the payment from your appointment.",
              meta: {
                kind: unapproved ? "final_price_needs_approval" : "balance_capture_failed",
                bookingId: String(doc._id),
                reason: result.reason,
              },
            });
          }
        } catch (e) {
          console.error("captureBookingBalance failed:", e.message);
        }
      }
    }
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
      await notify({
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

function ageFromDob(dob) {
  if (!dob) return NaN;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

async function assertClientAdult(userId, res) {
  if (config.dev.bypassGates) return true;
  const client = await Client.findOne({ clerkId: String(userId) }).select("dob").lean();
  const age = ageFromDob(client?.dob);
  if (!Number.isFinite(age)) {
    res.status(403).json({
      error: "dob_required",
      message: "Add your date of birth to your profile to book a tattoo — you must be 18 or older.",
    });
    return false;
  }
  if (age < 18) {
    res.status(403).json({ error: "underage", message: "You must be 18 or older to book a tattoo." });
    return false;
  }
  return true;
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

    const activeCooldown = await getActiveBookingCooldown(userId, artistId);
    if (activeCooldown) return respondWithCooldown(res, activeCooldown);

    let policy = null;
    try {
      policy = await ArtistPolicy.findOne({ artistId });
    } catch {}

    const consultationPriceCents = Math.max(0, Number(body.priceCents || 0));
    const depositRequiredCents = config.dev.bypassGates
      ? 0
      : computeDepositCents(policy, consultationPriceCents, "consultation");

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
        cancelToken: randomBytes(32).toString("hex"),
      });
      emitBookingCreated(booking);
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

    await notifyArtistOfBooking({ clientId: userId, artistId, booking, tz });
    await applyScheduleCooldown(userId, artistId, booking._id);

    res.status(201).json(booking);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Slot already booked" });
    console.error("Error creating consultation:", error);
    return res.status(500).json({ error: "Failed to create consultation" });
  }
}

export async function createTattooSession(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!(await assertClientAdult(userId, res))) return;

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

    const activeCooldown = await getActiveBookingCooldown(userId, artistId);
    if (activeCooldown) return respondWithCooldown(res, activeCooldown);

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

    const ClientBookingPermission = (await import("../models/ClientBookingPermission.js")).default;
    const permission = await ClientBookingPermission.findOne({
      artistId,
      clientId: String(userId),
    });

    if (!config.dev.bypassGates && (!permission || !permission.enabled)) {
      return res.status(403).json({
        error: "bookings_disabled",
        message: "Appointments are not enabled for you. Please contact the artist to enable appointments."
      });
    }

    const maxSessions = Math.max(1, Number(permission?.maxSessions || 1));
    if (!config.dev.bypassGates && sessionNumber > maxSessions) {
      return res.status(403).json({
        error: "too_many_sessions",
        maxSessions,
        message: `This piece is approved for up to ${maxSessions} session${maxSessions === 1 ? "" : "s"}. Ask the artist to re-assess the size to book more.`,
      });
    }

    if (!(await artistCanReceivePayments(artistId))) {
      return res.status(409).json({
        error: "artist_not_onboarded",
        message: "This artist hasn't finished payment setup yet, so bookings can't be processed.",
      });
    }

    if (!(await clientWaiverSigned(userId))) {
      return res.status(403).json({
        error: "waiver_required",
        docType: "client_waiver",
        message: "Please review and sign the consent & liability waiver before booking.",
      });
    }

    const intake = body.intake;
    if (!config.dev.bypassGates && !intakeConsentComplete(intake)) {
      return res.status(400).json({
        error: "intake_required",
        message: "Please complete the intake form before booking.",
        required: REQUIRED_INTAKE_CONSENT,
      });
    }

    const studioReady = await studioReadyForArtist(artistId);
    if (!studioReady.ok) {
      return res.status(409).json({
        error: "studio_not_ready",
        message: studioReady.message,
      });
    }

    const priceCents = Math.max(0, Number(body.priceCents || 0));
    const depositRequiredCents = config.dev.bypassGates
      ? 0
      : computeDepositCents(policy, priceCents, "tattoo_session");

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
        cancelToken: randomBytes(32).toString("hex"),
      });
      emitBookingCreated(booking);
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

    if (intakeConsentComplete(intake)) {
      try {
        await persistIntakeForBooking(booking, intake, req);
      } catch (e) {
        console.error("Failed to persist intake for session:", e?.message);
      }
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

    await notifyArtistOfBooking({ clientId: userId, artistId, booking, tz });
    await applyScheduleCooldown(userId, artistId, booking._id);

    res.status(201).json(booking);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Slot already booked" });
    console.error("Error creating tattoo session:", error);
    return res.status(500).json({ error: "Failed to create tattoo session" });
  }
}

export async function createMultiSession(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!(await assertClientAdult(userId, res))) return;

    const body = req.body || {};
    const artistId = String(body.artistId || "").trim();
    const rawSessions = Array.isArray(body.sessions) ? body.sessions : [];
    const name = String(body.name || "").trim() || "Multi-session tattoo";
    const note = body.note ?? "";
    const placement = String(body.placement || "").trim();
    const priceCents = Math.max(0, Number(body.priceCents || 0));

    if (!artistId) return res.status(400).json({ error: "artistId required" });
    if (rawSessions.length < 2) {
      return res.status(400).json({ error: "At least two sessions are required" });
    }
    if (rawSessions.length > 12) {
      return res.status(400).json({ error: "Too many sessions (max 12)" });
    }

    const activeCooldown = await getActiveBookingCooldown(userId, artistId);
    if (activeCooldown) return respondWithCooldown(res, activeCooldown);

    const av = (await Availability.findOne({ artistId })) || { timezone: DEFAULT_TIMEZONE };
    const tz = av.timezone || DEFAULT_TIMEZONE;

    const parsed = [];
    for (const s of rawSessions) {
      const startISO = String(s?.startISO || "").trim();
      const durationMinutes = Math.max(30, Math.min(480, Number(s?.durationMinutes || DEFAULT_SLOT_MINUTES)));
      const startAt = new Date(startISO);
      if (!startISO || Number.isNaN(startAt.getTime())) {
        return res.status(400).json({ error: "Invalid session start" });
      }
      const endAt = new Date(
        DateTime.fromJSDate(startAt, { zone: tz }).plus({ minutes: durationMinutes }).toISO()
      );
      parsed.push({ startAt, endAt });
    }
    parsed.sort((a, b) => a.startAt - b.startAt);

    const ClientBookingPermission = (await import("../models/ClientBookingPermission.js")).default;
    const permission = await ClientBookingPermission.findOne({ artistId, clientId: String(userId) });
    if (!config.dev.bypassGates && (!permission || !permission.enabled)) {
      return res.status(403).json({
        error: "bookings_disabled",
        message: "Appointments are not enabled for you. Please contact the artist to enable appointments.",
      });
    }

    const maxSessions = Math.max(1, Number(permission?.maxSessions || 1));
    if (!config.dev.bypassGates && parsed.length > maxSessions) {
      return res.status(403).json({
        error: "too_many_sessions",
        maxSessions,
        message: `This piece is approved for up to ${maxSessions} session${maxSessions === 1 ? "" : "s"}. Please choose ${maxSessions} date${maxSessions === 1 ? "" : "s"} or fewer, or ask the artist to re-assess the size.`,
      });
    }

    if (!(await artistCanReceivePayments(artistId))) {
      return res.status(409).json({
        error: "artist_not_onboarded",
        message: "This artist hasn't finished payment setup yet, so bookings can't be processed.",
      });
    }
    if (!(await clientWaiverSigned(userId))) {
      return res.status(403).json({
        error: "waiver_required",
        docType: "client_waiver",
        message: "Please review and sign the consent & liability waiver before booking.",
      });
    }
    const intake = body.intake;
    if (!config.dev.bypassGates && !intakeConsentComplete(intake)) {
      return res.status(400).json({
        error: "intake_required",
        message: "Please complete the intake form before booking.",
        required: REQUIRED_INTAKE_CONSENT,
      });
    }
    const studioReady = await studioReadyForArtist(artistId);
    if (!studioReady.ok) {
      return res.status(409).json({ error: "studio_not_ready", message: studioReady.message });
    }

    for (const p of parsed) {
      const conflict = await Booking.findOne({
        artistId,
        startAt: { $lt: p.endAt },
        endAt: { $gt: p.startAt },
        status: { $nin: ["cancelled"] },
      });
      if (conflict) {
        return res.status(409).json({
          error: "slot_conflict",
          message: "One of the chosen times is already booked. Please adjust your sessions.",
        });
      }
    }

    let policy = null;
    try { policy = await ArtistPolicy.findOne({ artistId }); } catch {}
    const perDeposit = config.dev.bypassGates ? 0 : computeDepositCents(policy, priceCents, "tattoo_session");

    const project = await Project.create({
      artistId,
      clientId: String(userId),
      name,
      description: note,
      placement,
      estimatedSessions: parsed.length,
      totalPriceCents: priceCents,
      status: "active",
      startedAt: new Date(),
    });

    const bookings = [];
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const booking = await Booking.create({
        artistId,
        clientId: String(userId),
        startAt: p.startAt,
        endAt: p.endAt,
        note,
        status: "pending",
        appointmentType: "tattoo_session",
        projectId: project._id,
        sessionNumber: i + 1,
        priceCents,
        depositRequiredCents: perDeposit,
        depositPaidCents: 0,
        clientCode: genCode(),
        artistCode: genCode(),
        cancelToken: randomBytes(32).toString("hex"),
      });
      emitBookingCreated(booking);
      if (intakeConsentComplete(intake)) {
        try {
          await persistIntakeForBooking(booking, intake, req);
        } catch (e) {
          console.error("Failed to persist intake for multi-session:", e?.message);
        }
      }
      bookings.push(booking);
    }

    try {
      const zone = await getArtistTimezone(artistId);
      const firstWhen = bookings.length ? formatBookingWhen(bookings[0].startAt, zone) : null;
      await notify({
        senderId: String(userId),
        receiverId: artistId,
        text: `New ${parsed.length}-session tattoo project requested: "${name}"${firstWhen ? `, first session ${firstWhen}` : ""}.`,
        meta: { kind: "appointment_request", status: "pending", sessions: parsed.length },
      });
    } catch {}

    await applyScheduleCooldown(userId, artistId, bookings[0]?._id);

    res.status(201).json({ project, bookings });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Slot already booked" });
    console.error("Error creating multi-session booking:", error);
    return res.status(500).json({ error: "Failed to create multi-session booking" });
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
      await notify({
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

    try {
      await notifyWaitlistForArtist(booking.artistId, {
        dateISO: booking.rescheduledFrom,
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

    const NO_SHOW_ALLOWED = ["accepted", "confirmed", "booked", "matched", "in-progress"];
    if (!NO_SHOW_ALLOWED.includes(booking.status)) {
      return res.status(409).json({
        error: "invalid_status",
        message: `A ${booking.status} booking cannot be marked no-show.`,
      });
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
      await notify({
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
    return res.status(500).json({ error: "Failed to fetch intake form" });
  }
}

export async function deleteIntakeForm(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (String(booking.clientId) !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (booking.status === "completed") {
      return res.status(409).json({
        error: "intake_locked",
        message: "Intake forms can't be deleted after the session is completed.",
      });
    }

    await IntakeForm.deleteOne({ bookingId });
    if (booking.intakeFormId) {
      booking.intakeFormId = undefined;
      await booking.save();
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("deleteIntakeForm error:", error?.message);
    return res.status(500).json({ error: "Failed to delete intake form" });
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
    return res
      .status(500)
      .json({ error: "Failed to fetch appointment details" });
  }
}

export async function checkInBooking(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const geo = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    const isClient = String(booking.clientId) === actorId;
    const isArtist = String(booking.artistId) === actorId;
    if (!isClient && !isArtist) return res.status(403).json({ error: "Forbidden" });
    if (["cancelled", "denied", "completed"].includes(booking.status)) {
      return res.status(400).json({ error: "invalid_status" });
    }

    const start = new Date(booking.startAt).getTime();
    const now = Date.now();
    if (now < start - 60 * 60 * 1000) {
      return res.status(400).json({ error: "too_early", message: "Check-in opens an hour before your appointment." });
    }
    if (now > start + 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: "window_closed", message: "The check-in window has closed." });
    }

    if (isClient) {
      booking.clientCheckedInAt = booking.clientCheckedInAt || new Date();
      if (geo) booking.clientCheckInGeo = geo;
    } else {
      booking.artistCheckedInAt = booking.artistCheckedInAt || new Date();
      if (geo) booking.artistCheckInGeo = geo;
    }
    await booking.save();
    res.json(booking);
  } catch (error) {
    console.error("checkInBooking error:", error?.message);
    return res.status(500).json({ error: "Failed to check in" });
  }
}

export async function reportArtistNoShow(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim().slice(0, 500);

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    if (String(booking.clientId) !== actorId) {
      return res.status(403).json({ error: "Only the client can report an artist no-show" });
    }
    if (new Date(booking.startAt) > new Date()) {
      return res.status(400).json({
        error: "too_early",
        message: "You can report a no-show only after the appointment start time.",
      });
    }
    if (["completed", "cancelled", "denied"].includes(booking.status)) {
      return res.status(400).json({
        error: "invalid_status",
        message: "This appointment can't be reported as an artist no-show.",
      });
    }
    if (booking.artistNoShowReportedAt) return res.json(booking);

    booking.artistNoShowReportedAt = new Date();
    booking.artistNoShowReason = reason;
    booking.artistNoShowStatus = "reported";
    await booking.save();

    try {
      await notify({
        senderId: actorId,
        receiverId: String(booking.artistId),
        text: `The client reported that you did not show for the appointment on ${new Date(
          booking.startAt
        ).toLocaleString()}.${reason ? ` Reason: ${reason}` : ""} Our team may review this.`,
        meta: { kind: "artist_no_show_reported", bookingId: String(booking._id) },
      });
    } catch {}

    res.json(booking);
  } catch (error) {
    console.error("reportArtistNoShow error:", error?.message);
    return res.status(500).json({ error: "Failed to report artist no-show" });
  }
}

async function refundNoShowDeposit(booking) {
  if (config.dev.bypassGates) return;
  try {
    const { refundDepositForBooking } = await import("./billingController.js");
    await refundDepositForBooking(booking._id);
  } catch (e) {
    console.error("no-show deposit refund failed:", e?.message);
  }
}

export async function respondArtistNoShow(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const accept = req.body?.accept === true;
    const note = String(req.body?.note || "").trim().slice(0, 500);

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    if (String(booking.artistId) !== actorId) {
      return res.status(403).json({ error: "Only the artist can respond to this report" });
    }
    if (booking.artistNoShowStatus !== "reported") {
      return res.status(400).json({ error: "no_open_report" });
    }

    booking.artistNoShowArtistNote = note;

    if (accept) {
      booking.artistNoShowStatus = "refunded";
      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      booking.cancelledBy = "artist";
      await booking.save();
      await refundNoShowDeposit(booking);
      try {
        await notify({
          senderId: actorId,
          receiverId: String(booking.clientId),
          text: "The artist confirmed the missed appointment — your deposit is being refunded.",
          meta: { kind: "artist_no_show_refunded", bookingId: String(booking._id) },
        });
      } catch {}
    } else {
      booking.artistNoShowStatus = "disputed";
      await booking.save();
      try {
        await notify({
          senderId: actorId,
          receiverId: String(booking.clientId),
          text: `The artist disputed the no-show report${note ? `: ${note}` : ""}. Our team will review it.`,
          meta: { kind: "artist_no_show_disputed", bookingId: String(booking._id) },
        });
      } catch {}
    }

    res.json(booking);
  } catch (error) {
    console.error("respondArtistNoShow error:", error?.message);
    return res.status(500).json({ error: "Failed to respond to no-show report" });
  }
}

export async function resolveArtistNoShow(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId || !config.admin.clerkIds.includes(actorId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const refund = req.body?.refund === true;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "not_found" });
    if (!["reported", "disputed"].includes(booking.artistNoShowStatus)) {
      return res.status(400).json({ error: "no_open_report" });
    }

    if (refund) {
      booking.artistNoShowStatus = "refunded";
      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      booking.cancelledBy = "system";
      await booking.save();
      await refundNoShowDeposit(booking);
    } else {
      booking.artistNoShowStatus = "dismissed";
      await booking.save();
    }

    res.json(booking);
  } catch (error) {
    console.error("resolveArtistNoShow error:", error?.message);
    return res.status(500).json({ error: "Failed to resolve no-show report" });
  }
}

export async function listArtistNoShowDisputes(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId || !config.admin.clerkIds.includes(actorId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const bookings = await Booking.find({
      artistNoShowStatus: { $in: ["reported", "disputed"] },
    })
      .sort({ artistNoShowReportedAt: -1 })
      .limit(200)
      .lean();

    const User = (await import("../models/UserBase.js")).default;
    const items = await Promise.all(
      bookings.map(async (b) => {
        const [client, artist] = await Promise.all([
          User.findOne({ clerkId: b.clientId }).select("username handle").lean(),
          User.findOne({ clerkId: b.artistId }).select("username handle").lean(),
        ]);
        return {
          ...b,
          client: client ? { username: client.username, handle: client.handle } : null,
          artist: artist ? { username: artist.username, handle: artist.handle } : null,
        };
      })
    );
    res.json({ items });
  } catch (e) {
    console.error("listArtistNoShowDisputes error:", e.message);
    res.status(500).json({ error: "list_failed" });
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
      await notify({
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
      await applyClientCancelCooldown(booking.clientId, booking.artistId, booking._id);
    }

    emitBookingDayEvent("booking:denied", booking);

    try {
      const isConsultation = booking.appointmentType === "consultation";
      let when = "";
      if (isConsultation && booking.startAt) {
        try {
          when = ` ${new Date(booking.startAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}.`;
        } catch {}
      }
      await notify({
        senderId: userId,
        receiverId: isClient ? String(booking.artistId) : String(booking.clientId),
        text: `The ${isConsultation ? "consultation" : "appointment"} request has been denied.${when}${reason ? ` Reason: ${reason}` : ""}`,
        meta: {
          kind: "appointment_denied",
          bookingId: String(booking._id),
          deniedBy: isClient ? "client" : "artist",
        },
      });
    } catch {}

    try {
      await notifyWaitlistForArtist(booking.artistId, { dateISO: booking.startAt });
    } catch {}

    res.json(booking);
  } catch (error) {
    console.error("Error denying appointment:", error);
    return res.status(500).json({ error: "Failed to deny appointment" });
  }
}

const AUTO_COMPLETE_GRACE_HOURS = 6;

async function autoCompleteDueBookings(userId) {
  try {
    const cutoff = new Date(Date.now() - AUTO_COMPLETE_GRACE_HOURS * 60 * 60 * 1000);
    const due = await Booking.find({
      $or: [{ clientId: String(userId) }, { artistId: String(userId) }],
      status: { $in: ["accepted", "confirmed", "booked", "matched", "in-progress"] },
      endAt: { $lt: cutoff },
    });
    for (const b of due) {
      b.status = "completed";
      b.completedAt = b.completedAt || new Date();
      b.autoCompleted = true;
      await b.save();
      try { await recordCompletedBooking(b.clientId); } catch (e) { console.error("recordCompletedBooking failed:", e.message); }
      try { await incrementArtistBookings(b.artistId); } catch (e) { console.error("incrementArtistBookings failed:", e.message); }
      if (!config.dev.bypassGates) {
        try {
          const result = await captureBookingBalance(b);
          if (result && !result.ok && !result.skipped) {
            const unapproved = result.reason === "final_price_unapproved";
            await notify({
              senderId: String(b.artistId),
              receiverId: String(b.clientId),
              text: unapproved
                ? "Approve the final price on your appointment to complete payment of your remaining balance."
                : "We couldn't automatically charge your remaining balance. Please complete the payment from your appointment.",
              meta: {
                kind: unapproved ? "final_price_needs_approval" : "balance_capture_failed",
                bookingId: String(b._id),
                reason: result.reason,
              },
            });
          }
        } catch (e) {
          console.error("autoComplete captureBookingBalance failed:", e.message);
        }
      }
    }
  } catch (e) {
    console.error("autoCompleteDueBookings failed:", e.message);
  }
}

export async function getAppointments(req, res) {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await autoCompleteDueBookings(userId);

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
      bookings = await Booking.find({
        $or: [{ clientId: userId }, { artistId: userId }]
      })
        .sort({ startAt: -1 })
        .limit(100)
        .lean();
    }

    const User = (await import("../models/UserBase.js")).default;
    const Review = (await import("../models/Review.js")).default;

    const reviewed = new Set(
      (await Review.find({ bookingId: { $in: bookings.map((b) => b._id) } })
        .select("bookingId")
        .lean()).map((r) => String(r.bookingId))
    );

    const projectIds = [...new Set(bookings.map((b) => b.projectId).filter(Boolean).map(String))];
    const projects = projectIds.length
      ? await Project.find({ _id: { $in: projectIds } }).lean()
      : [];
    const projectMap = new Map(projects.map((p) => [String(p._id), p]));

    const clerkIds = [
      ...new Set(
        bookings.flatMap((b) => [b.clientId, b.artistId]).filter(Boolean)
      ),
    ];
    const users = clerkIds.length
      ? await User.find({ clerkId: { $in: clerkIds } })
          .select("clerkId username avatar")
          .lean()
      : [];
    const userMap = new Map(users.map((u) => [u.clerkId, u]));

    const appointmentsWithUsers = bookings.map((booking) => {
      const client = userMap.get(booking.clientId);
      const artist = userMap.get(booking.artistId);
      const proj = booking.projectId ? projectMap.get(String(booking.projectId)) : null;

      return {
        ...booking,
        reviewed: reviewed.has(String(booking._id)),
        projectName: proj?.name || null,
        projectSessions: proj?.estimatedSessions || null,
        client: client
          ? { username: client.username || "Unknown", avatar: client.avatar || null }
          : null,
        artist: artist
          ? { username: artist.username || "Unknown", avatar: artist.avatar || null }
          : null,
      };
    });

    res.json(appointmentsWithUsers);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch appointments" });
  }
}

export async function checkConsultationStatus(req, res) {
  try {
    const { artistId, clientId } = req.query || {};
    if (!artistId || !clientId) {
      return res.status(400).json({ error: "artistId and clientId required" });
    }

    const consultation = await Booking.findOne({
      artistId: String(artistId),
      clientId: String(clientId),
      appointmentType: "consultation",
      status: { $in: ["completed", "confirmed"] },
    })
      .sort({ completedAt: -1, createdAt: -1 })
      .lean();

    res.json({
      hasCompletedConsultation: !!consultation,
      consultationDate: consultation?.completedAt || consultation?.startAt || null,
    });
  } catch (error) {
    console.error("Error checking consultation status:", error);
    res.status(500).json({ error: "Failed to check consultation status" });
  }
}