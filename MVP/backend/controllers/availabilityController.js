import Availability from "../models/Availability.js";

export async function getAvailability(req, res) {
  const { artistId } = req.params;
  const doc = await Availability.findOne({ artistId });
  if (!doc) {
    return res.json({
      artistId,
      timezone: "America/New_York",
      slotMinutes: 60,
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
      timezone: req.body.timezone ?? "America/New_York",
      slotMinutes: req.body.slotMinutes ?? 60,
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
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Invalid availability payload" });
  }
}