import {
  joinWaitlist,
  leaveWaitlist,
  getMyWaitlist,
  getArtistWaitlist,
} from "../services/waitlistService.js";

function getActorId(req) {
  return String(
    req.user?.clerkId || req.auth?.userId || req.user?._id || req.user?.id || ""
  ).trim();
}

export async function join(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    const entry = await joinWaitlist(clientId, req.body || {});
    res.status(201).json(entry);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Failed to join waitlist" });
  }
}

export async function leave(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    const entry = await leaveWaitlist(clientId, req.params.id);
    if (!entry) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Failed to leave waitlist" });
  }
}

export async function mine(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    res.json(await getMyWaitlist(clientId));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch waitlist" });
  }
}

export async function forArtist(req, res) {
  try {
    const artistId = getActorId(req);
    if (!artistId) return res.status(401).json({ error: "Unauthorized" });
    res.json(await getArtistWaitlist(artistId));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch waitlist" });
  }
}
