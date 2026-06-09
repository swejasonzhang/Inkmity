import { getRewardsSummary } from "../services/rewardsService.js";
import { getAvailableCreditCents, grantCredit } from "../services/creditsService.js";
import { config } from "../config/index.js";

function getActorId(req) {
  return String(
    req.user?.clerkId || req.auth?.userId || req.user?._id || req.user?.id || ""
  ).trim();
}

export async function getMyCredits(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    const availableCents = await getAvailableCreditCents(clientId);
    res.json({ availableCents });
  } catch (err) {
    console.error("getMyCredits error:", err);
    res.status(500).json({ error: "Failed to fetch credits" });
  }
}

export async function grantCreditToClient(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    if (!config.admin.clerkIds.includes(actorId))
      return res.status(403).json({ error: "Only platform admins can grant credits" });

    const { clientId, amountCents, reason, expiresAt } = req.body || {};
    if (!clientId) return res.status(400).json({ error: "clientId required" });

    const credit = await grantCredit(clientId, amountCents, reason || "manual", {
      grantedBy: actorId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    res.status(201).json(credit);
  } catch (err) {
    console.error("grantCreditToClient error:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to grant credit" });
  }
}

export async function getMyRewards(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    const summary = await getRewardsSummary(clientId);
    res.json(summary);
  } catch (err) {
    console.error("getMyRewards error:", err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
}
