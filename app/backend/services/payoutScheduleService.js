import Artist from "../models/Artist.js";
import { stripe } from "../lib/stripe.js";
import { computeArtistTier } from "./artistTierService.js";

// Maps a tier's payout speed to a Stripe payout schedule. Note: true Instant
// Payouts (minutes, via stripe.payouts.create method:"instant") require Instant
// Payout eligibility + a debit card and are a follow-up; here "instant" uses the
// minimum allowed payout delay as the best-effort schedule.
export function payoutScheduleForSpeed(speed) {
  switch (speed) {
    case "instant":
      return { interval: "daily", delay_days: "minimum" };
    case "two_day":
      return { interval: "daily", delay_days: 2 };
    default:
      return { interval: "daily", delay_days: 7 };
  }
}

export async function applyPayoutScheduleForArtist(artistId) {
  try {
    const artist = await Artist.findOne({ clerkId: String(artistId) });
    if (!artist?.stripeConnectAccountId || !artist.chargesEnabled) return;

    const tier = computeArtistTier(artist.bookingsCount, artist.rating);
    if (artist.payoutSpeed === tier.payoutSpeed) return;

    await stripe.accounts.update(artist.stripeConnectAccountId, {
      settings: { payouts: { schedule: payoutScheduleForSpeed(tier.payoutSpeed) } },
    });

    artist.payoutSpeed = tier.payoutSpeed;
    await artist.save();
  } catch (e) {
    console.error("applyPayoutScheduleForArtist failed:", e.message);
  }
}
