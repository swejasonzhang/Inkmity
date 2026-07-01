import Booking from "../models/Booking.js";
import Client from "../models/Client.js";
import Message from "../models/Message.js";
import { emitMessageCreated } from "./socketService.js";
import { sendReminderEmail, sendAftercareEmail, sendRebookingEmail } from "./emailService.js";
import { logger } from "../lib/logger.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const UPCOMING = ["accepted", "booked", "confirmed"];

const MAX_PER_RUN = 500;

const AFTERCARE_MAX_AGE_DAYS = 14;
const REBOOK_MAX_AGE_DAYS = 30;

async function resolveClient(clientId) {
  if (!clientId) return null;
  const c = await Client.findOne({ clerkId: String(clientId) });
  if (!c?.email) return null;
  return { email: c.email, name: c.username || c.handle || "there" };
}

async function notifyInApp({ artistId, clientId, text, meta }) {
  try {
    const msg = await Message.create({
      senderId: String(artistId),
      receiverId: String(clientId),
      text,
      meta,
    });
    try { emitMessageCreated(msg); } catch {}
  } catch (err) {
    logger.warn?.({ err: err.message, kind: meta?.kind }, "retention in-app notify failed");
  }
}

async function drain(claim, handle) {
  let count = 0;
  for (let i = 0; i < MAX_PER_RUN; i++) {
    const booking = await claim();
    if (!booking) break;
    try {
      await handle(booking);
    } catch (err) {
      logger.error({ err: err.message, bookingId: String(booking._id) }, "retention handler failed");
    }
    count++;
  }
  return count;
}

async function runBandReminders(now, { flag, lower, upper, band, text }) {
  return drain(
    () =>
      Booking.findOneAndUpdate(
        {
          status: { $in: UPCOMING },
          startAt: { $gt: new Date(now + lower), $lte: new Date(now + upper) },
          [flag]: { $ne: true },
        },
        { $set: { [flag]: true, reminderSentAt: new Date(now) } },
        { new: true, sort: { startAt: 1 } }
      ),
    async (b) => {
      const client = await resolveClient(b.clientId);
      if (client) await sendReminderEmail(b, client.email, client.name, band);
      await notifyInApp({
        artistId: b.artistId,
        clientId: b.clientId,
        text,
        meta: { kind: "appointment_reminder", bookingId: String(b._id), band },
      });
    }
  );
}

export async function runBookingReminders(now = Date.now()) {
  const day = await runBandReminders(now, {
    flag: "reminderSent24h",
    lower: HOUR,
    upper: 24 * HOUR,
    band: "24h",
    text: "Reminder: your appointment is coming up tomorrow. Tap for the details.",
  });
  const hour = await runBandReminders(now, {
    flag: "reminderSent1h",
    lower: 0,
    upper: HOUR,
    band: "1h",
    text: "Your appointment is in about an hour — see you soon!",
  });
  return day + hour;
}

export async function runAftercareSequence(now = Date.now()) {
  return drain(
    () =>
      Booking.findOneAndUpdate(
        {
          status: "completed",
          appointmentType: "tattoo_session",
          completedAt: {
            $gt: new Date(now - AFTERCARE_MAX_AGE_DAYS * DAY),
            $lte: new Date(now - 3 * DAY),
          },
          aftercareSent3d: { $ne: true },
        },
        { $set: { aftercareSent3d: true, aftercareSentAt: new Date(now) } },
        { new: true, sort: { completedAt: 1 } }
      ),
    async (b) => {
      const client = await resolveClient(b.clientId);
      if (client) await sendAftercareEmail(b, client.email, client.name);
      await notifyInApp({
        artistId: b.artistId,
        clientId: b.clientId,
        text: "How's your new tattoo healing? A few aftercare tips inside.",
        meta: { kind: "aftercare", bookingId: String(b._id) },
      });
    }
  );
}

export async function runRebookingNudges(now = Date.now()) {
  return drain(
    () =>
      Booking.findOneAndUpdate(
        {
          status: "completed",
          completedAt: {
            $gt: new Date(now - REBOOK_MAX_AGE_DAYS * DAY),
            $lte: new Date(now - 7 * DAY),
          },
          rebookNudgeSent7d: { $ne: true },
        },
        { $set: { rebookNudgeSent7d: true, rebookNudgeSentAt: new Date(now) } },
        { new: true, sort: { completedAt: 1 } }
      ),
    async (b) => {
      const client = await resolveClient(b.clientId);
      if (client) await sendRebookingEmail(b, client.email, client.name);
      await notifyInApp({
        artistId: b.artistId,
        clientId: b.clientId,
        text: "Ready for your next piece? Your artists are a tap away.",
        meta: { kind: "rebook_nudge", bookingId: String(b._id) },
      });
    }
  );
}

export async function runRetentionTick(now = Date.now()) {
  const result = { reminders: 0, aftercare: 0, rebook: 0 };
  for (const [key, fn] of [
    ["reminders", runBookingReminders],
    ["aftercare", runAftercareSequence],
    ["rebook", runRebookingNudges],
  ]) {
    try {
      result[key] = await fn(now);
    } catch (err) {
      logger.error({ err: err.message, stage: key }, "retention stage failed");
    }
  }
  return result;
}
