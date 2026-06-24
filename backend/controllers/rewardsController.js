import { getRewardsSummary } from "../services/rewardsService.js";
import { getActorId } from "../lib/auth.js";
import { sendError } from "../lib/httpError.js";
import {
  getAvailableCreditCents,
  grantCredit,
  maybeGrantBirthdayCredit,
} from "../services/creditsService.js";
import { config } from "../config/index.js";

export async function getMyCredits(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    await maybeGrantBirthdayCredit(clientId);
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
    sendError(res, err, "Failed to grant credit");
  }
}

export async function getMyRewards(req, res) {
  try {
    const clientId = getActorId(req);
    if (!clientId) return res.status(401).json({ error: "Unauthorized" });
    await maybeGrantBirthdayCredit(clientId);
    const summary = await getRewardsSummary(clientId);
    res.json(summary);
  } catch (err) {
    console.error("getMyRewards error:", err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
}
