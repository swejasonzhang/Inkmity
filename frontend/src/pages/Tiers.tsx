import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Award, Check, Crown, Sparkles, Star } from "lucide-react";
import Header from "@/components/header/Header";
import VideoBackground from "@/components/VideoBackground";
import RewardsPanel from "@/components/dashboard/client/RewardsPanel";
import { useRole } from "@/hooks/useRole";
import { getMe, getMyRewards, fetchArtistById, type RewardsSummary } from "@/api";

type ClientTier = { key: string; label: string; threshold: number; perks: string[] };
type ArtistTier = { key: string; label: string; bookings: number; minRating: number; perks: string[] };

const CLIENT_TIERS: ClientTier[] = [
  { key: "bronze", label: "Bronze", threshold: 0, perks: ["Full marketplace access", "Book & message any artist", "Secure deposit protection"] },
  { key: "silver", label: "Silver", threshold: 3, perks: ["Priority booking support", "Early-bird appointment slots", "Birthday booking credit"] },
  { key: "gold", label: "Gold", threshold: 8, perks: ["Early access to new artists", "Free design consultation", "Priority waitlist placement", "Exclusive flash drops"] },
  { key: "platinum", label: "Platinum", threshold: 15, perks: ["No $10 booking fee — pay just 5%", "Concierge booking assistance", "Dedicated support line", "First dibs on guest spots", "Annual loyalty credit"] },
];

const ARTIST_TIERS: ArtistTier[] = [
  { key: "rising", label: "Rising", bookings: 0, minRating: 0, perks: ["Standard search placement", "Standard payout schedule", "Profile & portfolio tools", "Built-in booking calendar"] },
  { key: "established", label: "Established", bookings: 10, minRating: 4.0, perks: ["Boosted search ranking", "Verified profile badge", "Insights & analytics dashboard", "Priority email support"] },
  { key: "pro", label: "Pro", bookings: 50, minRating: 4.5, perks: ["Priority placement", "Featured-artist eligibility", "Faster 2-day payouts", "Promoted in style categories", "Custom booking policies"] },
  { key: "elite", label: "Elite", bookings: 150, minRating: 4.8, perks: ["Top placement", "Homepage & newsletter features", "Dedicated partner support", "Instant payouts", "Early access to new features"] },
];

const TIER_ICON: Record<string, typeof Award> = {
  bronze: Award, silver: Star, gold: Sparkles, platinum: Crown,
  rising: Award, established: Star, pro: Sparkles, elite: Crown,
};

const pillStyle: React.CSSProperties = {
  borderColor: "var(--border)",
  background: "linear-gradient(135deg, color-mix(in srgb, var(--elevated) 95%, var(--fg) 5%), color-mix(in srgb, var(--elevated) 85%, var(--fg) 15%))",
  color: "var(--fg)",
};

function artistTierForStats(bookings: number, rating: number): string {
  let key = ARTIST_TIERS[0].key;
  for (const t of ARTIST_TIERS) {
    if (bookings >= t.bookings && rating >= t.minRating) key = t.key;
  }
  return key;
}

export default function Tiers() {
  const { role, isLoaded } = useRole();
  const { getToken } = useAuth();

  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [artistTierKey, setArtistTierKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || loadedRef.current) return;
    loadedRef.current = true;
    let active = true;
    (async () => {
      try {
        const token = (await getToken()) ?? undefined;
        if (role === "artist") {
          const me = await getMe({ token });
          if (me?._id) {
            const doc = await fetchArtistById(me._id);
            if (active) setArtistTierKey(artistTierForStats(Number((doc as any)?.bookingsCount || 0), Number((doc as any)?.rating || 0)));
          }
        } else {
          const data = await getMyRewards(token);
          if (active) setRewards(data);
        }
      } catch {
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, [isLoaded, role, getToken]);

  const isArtist = role === "artist";
  const currentKey = isArtist
    ? artistTierKey ?? ARTIST_TIERS[0].key
    : rewards?.tier?.key ?? CLIENT_TIERS[0].key;

  const intro = isArtist
    ? "Grow your reputation on Inkmity. As you complete more bookings and keep your rating high, you unlock better placement, badges, and payout perks."
    : "Book more sessions to climb the tiers and unlock perks like priority support, credits, and early access. Every booking is a simple $10 + 5%, capped at $50 — and Platinum members skip the $10 base entirely.";

  const tiers = useMemo(() => (isArtist ? ARTIST_TIERS : CLIENT_TIERS), [isArtist]);

  return (
    <div className="h-svh overflow-hidden flex flex-col text-app">
      <VideoBackground />
      <Header />
      <main
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ padding: "0 clamp(16px, 4vw, 56px)" }}
      >
        <div className="min-h-full flex flex-col justify-center mx-auto w-full max-w-5xl py-6">
          <div className="flex flex-col items-center text-center gap-3 mb-fluid-lg" style={{ marginBottom: "clamp(16px, 2.5vh, 32px)" }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" style={pillStyle}>
              <Award className="h-3.5 w-3.5" />
              {isArtist ? "Artist tiers" : "Client rewards"}
            </span>
            <h1 className="font-bold tracking-tight text-app" style={{ fontSize: "clamp(1.5rem, 1.2vw + 1.2rem, 2.25rem)" }}>
              {isArtist ? "Artist Tiers" : "Reward Tiers"}
            </h1>
            <p className="text-subtle max-w-2xl mx-auto" style={{ fontSize: "clamp(0.875rem, 0.4vw + 0.8rem, 1rem)" }}>
              {intro}
            </p>
            <p className="max-w-2xl mx-auto rounded-xl border border-app bg-elevated px-3.5 py-2 text-xs text-subtle">
              <span className="font-semibold text-app">How Inkmity makes money:</span> one simple platform fee on completed bookings — <span className="font-semibold text-app">$10 + 5% of the price, never more than $50</span> — shown before you pay. The essentials are always free (including features other platforms paywall); any future subscriptions are optional extras. We only earn when you book.
            </p>
            {!isArtist && ready && rewards && (
              <RewardsPanel data={rewards} className="w-full max-w-xl mx-auto mt-2 text-left" />
            )}
          </div>

          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t) => {
              const Icon = TIER_ICON[t.key] ?? Award;
              const isCurrent = currentKey === t.key;
              return (
                <div
                  key={t.key}
                  className="relative flex flex-col items-center text-center rounded-2xl border bg-card p-5 pt-8 transition-all"
                  style={{
                    borderColor: isCurrent ? "var(--fg)" : "var(--border)",
                    boxShadow: isCurrent ? "0 0 0 2px var(--fg)" : undefined,
                    background: isCurrent
                      ? "linear-gradient(135deg, color-mix(in srgb, var(--card) 100%, transparent), color-mix(in srgb, var(--elevated) 70%, var(--card)))"
                      : "var(--card)",
                  }}
                >
                  {isCurrent && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 -top-3 inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ borderColor: "var(--fg)", background: "var(--bg)", color: "var(--fg)" }}
                    >
                      <Check className="h-3 w-3" /> Your tier
                    </span>
                  )}
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border mb-3" style={pillStyle}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-app font-bold text-lg">{t.label}</h3>
                  {isArtist ? (
                    <p className="text-subtle text-sm mt-0.5">
                      {(t as ArtistTier).bookings === 0 ? "Starting tier" : `${(t as ArtistTier).bookings}+ bookings`}
                      {(t as ArtistTier).minRating > 0 ? ` · ${(t as ArtistTier).minRating.toFixed(1)}★+` : ""}
                    </p>
                  ) : (
                    <p className="text-subtle text-sm mt-0.5">
                      {(t as ClientTier).threshold === 0 ? "Starting tier" : `${(t as ClientTier).threshold}+ bookings`}
                    </p>
                  )}
                  <ul className="mt-4 flex flex-col gap-2 text-left mx-auto w-fit">
                    {t.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm text-app/90">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-subtle" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="text-subtle mt-6 text-center" style={{ fontSize: "clamp(0.75rem, 0.3vw + 0.7rem, 0.85rem)" }}>
            {isArtist
              ? "Tier placement updates automatically as your booking history and rating grow."
              : "Perks and credits unlock automatically as your booking history grows."}
          </p>
        </div>
      </main>
    </div>
  );
}
