import Booking from "../models/Booking.js";
import { dayBoundsUTC } from "../utils/date.js";

export async function getBookingsForDay(req, res) {
  const { artistId, date } = req.query;
  if (!artistId || !date)
    return res.status(400).json({ error: "artistId and date are required" });
  const { start, end } = dayBoundsUTC(String(date));
  const docs = await Booking.find({
    artistId,
    startAt: { $lt: end },
    endAt: { $gt: start },
    status: "booked",
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
    const { artistId, clientId, startISO, endISO, note, serviceId } =
      req.body || {};
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
      status: "booked",
    });
    if (conflict) return res.status(409).json({ error: "Slot already booked" });

    const created = await Booking.create({
      artistId,
      clientId,
      serviceId,
      startAt,
      endAt,
      note,
      status: "booked",
      priceCents: 0,
      tipCents: 0,
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