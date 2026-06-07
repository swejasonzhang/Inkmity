import Studio from "../models/Studio.js";
import StudioMembership from "../models/StudioMembership.js";

function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export async function getArtistStudioMembership(artistClerkId) {
  if (!artistClerkId) return null;
  const membership = await StudioMembership.findOne({
    artistClerkId: String(artistClerkId),
    status: "active",
  }).sort({ createdAt: 1 });
  if (!membership) return null;
  const studio = await Studio.findById(membership.studioId);
  if (!studio || !studio.active) return null;
  return { membership, studio };
}

export function effectiveCommissionPct(studio, membership) {
  const override = membership?.commissionPct;
  if (override !== null && override !== undefined) return clampPct(override);
  return clampPct(studio?.defaultCommissionPct ?? 0);
}

export async function computeArtistStudioSplit(artistClerkId, payableCents) {
  const ctx = await getArtistStudioMembership(artistClerkId);
  if (!ctx) return null;
  const { studio, membership } = ctx;
  const pct = effectiveCommissionPct(studio, membership);
  const base = Math.max(0, Math.round(Number(payableCents || 0)));
  const studioCents = Math.round(base * pct);
  const artistCents = base - studioCents;
  return {
    studioId: String(studio._id),
    studioConnectAccountId: studio.stripeConnectAccountId || null,
    studioChargesEnabled: Boolean(studio.chargesEnabled),
    studioPayoutsReady: Boolean(
      studio.stripeConnectAccountId && studio.chargesEnabled
    ),
    commissionPct: pct,
    studioCents,
    artistCents,
  };
}
