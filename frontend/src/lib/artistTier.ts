export type ArtistTier = {
  key: "rising" | "established" | "pro" | "elite";
  label: string;
  rank: number;
  verified: boolean;
};

const TIERS = [
  { key: "rising", label: "Rising", bookings: 0, minRating: 0 },
  { key: "established", label: "Established", bookings: 10, minRating: 4.0 },
  { key: "pro", label: "Pro", bookings: 50, minRating: 4.5 },
  { key: "elite", label: "Elite", bookings: 150, minRating: 4.8 },
] as const;

export function computeArtistTier(
  bookingsCount?: number,
  rating?: number
): ArtistTier {
  const b = Number(bookingsCount || 0);
  const r = Number(rating || 0);
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (b >= TIERS[i].bookings && r >= TIERS[i].minRating) idx = i;
  }
  const t = TIERS[idx];
  // Verified badge is awarded at 5 completed bookings (independent of tier).
  return { key: t.key, label: t.label, rank: idx, verified: b >= 5 };
}
