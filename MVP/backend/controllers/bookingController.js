import Booking from "../models/Booking.js";
import { dayBoundsUTC } from "../utils/date.js";

export async function getBookingsForDay(req, res) {
  const { artistId, date } = req.query;
  if (!artistId || !date)
    return res.status(400).json({ error: "artistId and date are required" });

  const { start, end } = dayBoundsUTC(String(date));
  const docs = await Booking.find({
    artistId,
    start: { $lt: end },
    end: { $gt: start },
    status: "booked",
  }).sort({ start: 1 });
  res.json(docs);
}

export async function createBooking(req, res) {
  try {
    const userId = req.user?._id;
    const { artistId, startISO, endISO, note } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!artistId || !startISO || !endISO) {
      return res
        .status(400)
        .json({ error: "artistId, startISO, endISO required" });
    }

    const start = new Date(startISO);
    const end = new Date(endISO);
    if (
      !(start instanceof Date) ||
      isNaN(start) ||
      !(end instanceof Date) ||
      isNaN(end)
    ) {
      return res.status(400).json({ error: "Invalid dates" });
    }
    if (end <= start)
      return res.status(400).json({ error: "end must be after start" });

    const conflict = await Booking.findOne({
      artistId,
      start: { $lt: end },
      end: { $gt: start },
      status: "booked",
    });
    if (conflict) return res.status(409).json({ error: "Slot already booked" });

    const created = await Booking.create({
      artistId,
      userId,
      start,
      end,
      note,
      status: "booked",
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create booking" });
  }
}