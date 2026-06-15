import { config } from "../config/index.js";

export function computeArtistTier(bookingsCount, rating) {
  const tiers = config.artistTiers;
  const b = Number(bookingsCount || 0);
  const r = Number(rating || 0);
  let idx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (b >= tiers[i].bookings && r >= tiers[i].minRating) idx = i;
  }
  const t = tiers[idx];
  return {
    key: t.key,
    label: t.label,
    rank: idx,
    verified: b >= 5,
    payoutSpeed: t.payoutSpeed,
  };
}

export function tierRankAggExpr() {
  const tiers = config.artistTiers;
  const branches = [];
  for (let i = tiers.length - 1; i >= 1; i--) {
    branches.push({
      case: {
        $and: [
          { $gte: [{ $ifNull: ["$bookingsCount", 0] }, tiers[i].bookings] },
          { $gte: [{ $ifNull: ["$rating", 0] }, tiers[i].minRating] },
        ],
      },
      then: i,
    });
  }
  return { $switch: { branches, default: 0 } };
}
