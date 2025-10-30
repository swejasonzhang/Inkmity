import Availability from "../models/Availability.js";
import Booking from "../models/Booking.js";
import { DateTime, Interval } from "luxon";

const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_SLOT_MINUTES = 60;
const DEFAULT_OPEN_RANGES = [{ start: "10:00", end: "22:00" }];

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

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

function expandSlotsFromIntervals({ intervals, slotMinutes }) {
  const slots = [];
  for (const iv of intervals) {
    let cursor = iv.start;
    while (cursor.plus({ minutes: slotMinutes }) <= iv.end) {
      const end = cursor.plus({ minutes: slotMinutes });
      slots.push({ start: cursor, end });
      cursor = end;
    }
  }
  return slots;
}

function intervalsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

export async function getAvailability(req, res) {
  const { artistId } = req.params;
  const doc = await Availability.findOne({ artistId });
  if (!doc) {
    return res.json({
      artistId,
      timezone: DEFAULT_TIMEZONE,
      slotMinutes: DEFAULT_SLOT_MINUTES,
      weekly: { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] },
      exceptions: {},
    });
  }
  res.json(doc);
}

export async function upsertAvailability(req, res) {
  try {
    const { artistId } = req.params;
    const payload = {
      artistId,
      timezone: req.body.timezone ?? DEFAULT_TIMEZONE,
      slotMinutes: req.body.slotMinutes ?? DEFAULT_SLOT_MINUTES,
      weekly: req.body.weekly ?? {
        sun: [],
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
      },
      exceptions: req.body.exceptions ?? {},
    };
    const doc = await Availability.findOneAndUpdate({ artistId }, payload, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    res.json(doc);
  } catch {
    res.status(400).json({ error: "Invalid availability payload" });
  }
}

export async function getSlotsForDate(req, res) {
  try {
    const { artistId } = req.params;
    const date = String(req.query.date || "").slice(0, 10);
    if (!artistId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: "artistId and date=YYYY-MM-DD required" });
    }

    const av = (await Availability.findOne({ artistId })) || {
      timezone: DEFAULT_TIMEZONE,
      slotMinutes: DEFAULT_SLOT_MINUTES,
      weekly: { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] },
      exceptions: {},
    };

    const tz = av.timezone || DEFAULT_TIMEZONE;
    const slotMinutes = Math.max(
      5,
      Math.min(480, Number(av.slotMinutes || DEFAULT_SLOT_MINUTES))
    );

    const weekdayIdx = DateTime.fromISO(date, { zone: tz }).weekday % 7;
    const weekdayKey = WEEKDAY_KEYS[weekdayIdx];

    const exceptionRanges = (av.exceptions && av.exceptions[date]) || [];
    const weeklyRanges = (av.weekly && av.weekly[weekdayKey]) || [];

    const effectiveRanges = exceptionRanges.length
      ? exceptionRanges
      : weeklyRanges.length
      ? weeklyRanges
      : DEFAULT_OPEN_RANGES;

    const dayIntervals = buildDayIntervals({
      dateISO: date,
      tz,
      ranges: effectiveRanges,
    });
    if (dayIntervals.length === 0) return res.json([]);

    const slots = expandSlotsFromIntervals({
      intervals: dayIntervals,
      slotMinutes,
    });

    const dayStart = DateTime.fromISO(date, { zone: tz })
      .startOf("day")
      .toUTC()
      .toJSDate();
    const dayEnd = DateTime.fromISO(date, { zone: tz })
      .endOf("day")
      .toUTC()
      .toJSDate();

    const bookings = await Booking.find({
      artistId,
      startAt: { $lt: dayEnd },
      endAt: { $gt: dayStart },
      status: { $in: ["booked", "matched", "completed"] },
    }).lean();

    const busyIntervals = bookings.map((b) =>
      Interval.fromDateTimes(
        DateTime.fromJSDate(new Date(b.startAt)),
        DateTime.fromJSDate(new Date(b.endAt))
      )
    );

    const open = slots.filter(({ start, end }) => {
      const slotIv = Interval.fromDateTimes(start.toUTC(), end.toUTC());
      for (const busy of busyIntervals) {
        if (
          intervalsOverlap(
            { start: slotIv.start.toMillis(), end: slotIv.end.toMillis() },
            { start: busy.start.toMillis(), end: busy.end.toMillis() }
          )
        )
          return false;
      }
      return true;
    });

    const payload = open.map(({ start, end }) => ({
      startISO: start.toISO(),
      endISO: end.toISO(),
    }));

    res.json(payload);
  } catch {
    res.status(500).json({ error: "slots_failed" });
  }
}