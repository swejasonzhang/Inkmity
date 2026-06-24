import {
import { getActorId } from "../lib/auth.js";
  joinWaitlist,
  leaveWaitlist,
  getMyWaitlist,
  getArtistWaitlist,
} from "../services/waitlistService.js";
import { sendError } from "../lib/httpError.js";

export async function join(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    const entry = await joinWaitlist(clientId, req.body || {});
    res.status(201).json(entry);
  } catch (err) {
    sendError(res, err, "Failed to join waitlist");
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
    sendError(res, err, "Failed to leave waitlist");
  }
}

export async function mine(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    res.json(await getMyWaitlist(clientId));
  } catch (err) {
    sendError(res, err, "Failed to fetch waitlist");
  }
}

export async function forArtist(req, res) {
  try {
    const artistId = getActorId(req);
    if (!artistId) return res.status(401).json({ error: "Unauthorized" });
    res.json(await getArtistWaitlist(artistId));
  } catch (err) {
    sendError(res, err, "Failed to fetch waitlist");
  }
}
