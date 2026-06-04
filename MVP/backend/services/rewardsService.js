import Client from "../models/Client.js";
import { config } from "../config/index.js";

// Tiers are ordered ascending by `bookings` threshold in config.
function sortedTiers() {
  return [...config.rewards.tiers].sort((a, b) => a.bookings - b.bookings);
}

// Resolve the tier object for a given completed-booking count.
export function tierForCount(count) {
  const tiers = sortedTiers();
  let current = tiers[0];
  for (const t of tiers) {
    if (count >= t.bookings) current = t;
    else break;
  }
  return current;
}

// The next tier above the current one (or null if already at the top).
export function nextTierForCount(count) {
  const tiers = sortedTiers();
  for (const t of tiers) {
    if (t.bookings > count) return t;
  }
  return null;
}

// Find a client document by clerkId (booking.clientId is a clerkId string).
async function findClient(clientId) {
  if (!clientId) return null;
  return Client.findOne({ clerkId: String(clientId) });
}

// Effective platform-fee percentage for a client, after milestone discounts.
// Falls back to the configured base fee when the client can't be resolved.
export async function getEffectiveFeePct(clientId) {
  const base = config.platformFee.pct;
  try {
    const client = await findClient(clientId);
    if (!client) return base;
    const count = Number(client.completedBookingsCount || 0);
    const tier = tierForCount(count);
    // Never charge more than the configured base fee.
    return Math.min(base, tier.feePct);
  } catch {
    return base;
  }
}

// Summary used by the rewards API + dashboard panel.
export async function getRewardsSummary(clientId) {
  const base = config.platformFee.pct;
  const client = await findClient(clientId);
  const count = Number(client?.completedBookingsCount || 0);
  const tier = tierForCount(count);
  const next = nextTierForCount(count);
  return {
    completedBookings: count,
    tier: { key: tier.key, label: tier.label, feePct: Math.min(base, tier.feePct) },
    nextTier: next
      ? {
          key: next.key,
          label: next.label,
          feePct: Math.min(base, next.feePct),
          bookingsToNextTier: Math.max(0, next.bookings - count),
        }
      : null,
    currentFeePct: Math.min(base, tier.feePct),
    platformFeeMinCents: config.platformFee.minCents,
    totalFeesPaidCents: Math.round(Number(client?.totalFeesPaid || 0)),
    lifetimeDiscountUsd: Number(client?.lifetimeDiscountUsd || 0),
  };
}

// Increment a client's completed-booking count and recompute their tier.
// Idempotency is the caller's responsibility (call once per completed booking).
export async function recordCompletedBooking(clientId) {
  const client = await findClient(clientId);
  if (!client) return null;
  client.completedBookingsCount = Number(client.completedBookingsCount || 0) + 1;
  client.rewardsTier = tierForCount(client.completedBookingsCount).key;
  await client.save();
  return client;
}

// Accumulate the platform fee a client has paid (for reporting / lifetime stats).
export async function recordFeePaid(clientId, feeCents) {
  if (!feeCents || feeCents <= 0) return;
  const client = await findClient(clientId);
  if (!client) return;
  client.totalFeesPaid = Number(client.totalFeesPaid || 0) + Number(feeCents);
  client.lastRewardAt = new Date();
  await client.save();
}
