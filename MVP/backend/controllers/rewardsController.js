import { getRewardsSummary } from "../services/rewardsService.js";

function getActorId(req) {
  return String(
    req.user?.clerkId || req.auth?.userId || req.user?._id || req.user?.id || ""
  ).trim();
}

// GET /rewards/me — milestone tier + current platform-fee rate for the client.
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
