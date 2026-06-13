import Client from "../models/Client.js";
import { config } from "../config/index.js";
import { grantCredit } from "./creditsService.js";

function sortedTiers() {
  return [...config.rewards.tiers].sort((a, b) => a.bookings - b.bookings);
}

export function tierForCount(count) {
  const tiers = sortedTiers();
  let current = tiers[0];
  for (const t of tiers) {
    if (count >= t.bookings) current = t;
    else break;
  }
  return current;
}

export function nextTierForCount(count) {
  const tiers = sortedTiers();
  for (const t of tiers) {
    if (t.bookings > count) return t;
  }
  return null;
}

async function findClient(clientId) {
  if (!clientId) return null;
  return Client.findOne({ clerkId: String(clientId) });
}

export function platformFeeForTier(tier) {
  const { baseCents, pct, capCents } = config.platformFee;
  return {
    baseCents: tier?.waivesBaseFee ? 0 : baseCents,
    pct,
    capCents,
    baseFeeWaived: !!tier?.waivesBaseFee,
  };
}

export async function getClientPlatformFee(clientId) {
  try {
    const client = await findClient(clientId);
    return platformFeeForTier(tierForCount(Number(client?.completedBookingsCount || 0)));
  } catch {
    return platformFeeForTier(null);
  }
}

export async function getRewardsSummary(clientId) {
  const client = await findClient(clientId);
  const count = Number(client?.completedBookingsCount || 0);
  const tier = tierForCount(count);
  const next = nextTierForCount(count);
  const fee = platformFeeForTier(tier);
  return {
    completedBookings: count,
    tier: { key: tier.key, label: tier.label },
    nextTier: next
      ? {
          key: next.key,
          label: next.label,
          bookingsToNextTier: Math.max(0, next.bookings - count),
        }
      : null,
    platformFee: { baseCents: fee.baseCents, pct: fee.pct, capCents: fee.capCents },
    baseFeeWaived: fee.baseFeeWaived,
    totalFeesPaidCents: Math.round(Number(client?.totalFeesPaid || 0)),
    lifetimeDiscountUsd: Number(client?.lifetimeDiscountUsd || 0),
  };
}

export async function recordCompletedBooking(clientId) {
  const client = await findClient(clientId);
  if (!client) return null;
  const prevTier = tierForCount(Number(client.completedBookingsCount || 0));
  client.completedBookingsCount = Number(client.completedBookingsCount || 0) + 1;
  const newTier = tierForCount(client.completedBookingsCount);
  client.rewardsTier = newTier.key;
  await client.save();

  if (newTier.key !== prevTier.key) {
    const tierCfg = config.rewards.tiers.find((t) => t.key === newTier.key);
    const creditCents = Number(tierCfg?.loyaltyCreditCents || 0);
    if (creditCents > 0) {
      try {
        await grantCredit(client.clerkId, creditCents, "loyalty_tier", {
          grantedBy: "system",
        });
      } catch (e) {
        console.error("loyalty credit grant failed:", e.message);
      }
    }
    const consultCents = Number(tierCfg?.consultationCreditCents || 0);
    if (consultCents > 0) {
      try {
        await grantCredit(client.clerkId, consultCents, "consultation", {
          grantedBy: "system",
        });
      } catch (e) {
        console.error("consultation credit grant failed:", e.message);
      }
    }
  }
  return client;
}

export async function recordFeePaid(clientId, feeCents) {
  if (!feeCents || feeCents <= 0) return;
  const client = await findClient(clientId);
  if (!client) return;
  client.totalFeesPaid = Number(client.totalFeesPaid || 0) + Number(feeCents);
  client.lastRewardAt = new Date();
  await client.save();
}
