import Sketch from "../models/Sketch.js";
import { getActorId } from "../lib/auth.js";
import Booking from "../models/Booking.js";
import Message from "../models/Message.js";

export async function createSketch(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { bookingId, imageUrls, note } = req.body || {};
    const urls = (Array.isArray(imageUrls) ? imageUrls : [])
      .map((u) => String(u || "").trim())
      .filter(Boolean);
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });
    if (urls.length === 0)
      return res.status(400).json({ error: "at least one image is required" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "booking_not_found" });
    if (String(booking.artistId) !== actorId)
      return res.status(403).json({ error: "Only the artist can share a sketch" });

    const sketch = await Sketch.create({
      bookingId,
      artistId: booking.artistId,
      clientId: booking.clientId,
      imageUrls: urls,
      note: note || "",
      status: "pending",
    });

    try {
      await Message.create({
        senderId: String(booking.artistId),
        receiverId: String(booking.clientId),
        text: "Your artist shared a sketch for your tattoo — review and approve it or request changes.",
        meta: { kind: "sketch_shared", bookingId: String(bookingId), sketchId: String(sketch._id) },
      });
    } catch {}

    res.status(201).json(sketch);
  } catch (err) {
    console.error("createSketch error:", err);
    res.status(500).json({ error: "Failed to share sketch" });
  }
}

export async function listSketches(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { bookingId } = req.query || {};
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "booking_not_found" });
    if (String(booking.clientId) !== actorId && String(booking.artistId) !== actorId)
      return res.status(403).json({ error: "Forbidden" });

    const sketches = await Sketch.find({ bookingId }).sort({ createdAt: -1 }).lean();
    res.json(sketches);
  } catch (err) {
    console.error("listSketches error:", err);
    res.status(500).json({ error: "Failed to fetch sketches" });
  }
}

export async function respondToSketch(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const action = String(req.body?.action || "").toLowerCase();
    if (!["approve", "request_changes"].includes(action))
      return res.status(400).json({ error: "action must be approve or request_changes" });

    const sketch = await Sketch.findById(id);
    if (!sketch) return res.status(404).json({ error: "not_found" });
    if (String(sketch.clientId) !== actorId)
      return res.status(403).json({ error: "Only the client can respond to a sketch" });

    sketch.status = action === "approve" ? "approved" : "changes_requested";
    sketch.clientNote = req.body?.note || "";
    sketch.respondedAt = new Date();
    await sketch.save();

    try {
      await Message.create({
        senderId: String(sketch.clientId),
        receiverId: String(sketch.artistId),
        text:
          action === "approve"
            ? "Your client approved the sketch."
            : `Your client requested changes to the sketch.${sketch.clientNote ? ` Note: ${sketch.clientNote}` : ""}`,
        meta: {
          kind: "sketch_response",
          bookingId: String(sketch.bookingId),
          sketchId: String(sketch._id),
          status: sketch.status,
        },
      });
    } catch {}

    res.json(sketch);
  } catch (err) {
    console.error("respondToSketch error:", err);
    res.status(500).json({ error: "Failed to respond to sketch" });
  }
}
