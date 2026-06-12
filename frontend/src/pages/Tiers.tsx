import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Award, Check, Crown, Plus, Sparkles, Star } from "lucide-react";
import Header from "@/components/header/Header";
import VideoBackground from "@/components/VideoBackground";
import RewardsPanel from "@/components/dashboard/client/RewardsPanel";
import { useRole } from "@/hooks/useRole";
import { getMe, getMyRewards, fetchArtistById, type RewardsSummary } from "@/api";

type ClientTier = { key: string; label: string; threshold: number; perks: string[] };
type ArtistTier = { key: string; label: string; bookings: number; minRating: number; perks: string[] };

// Each tier keeps everything the tier below it has — these lists are the *new*
// bonuses layered on top (the base tier is what everyone gets).
const CLIENT_TIERS: ClientTier[] = [
  { key: "bronze", label: "Bronze", threshold: 0, perks: ["Full marketplace access", "Book & message any artist", "Secure deposit & payment protection", "Standard fee: $10 + 5%, capped at $50"] },
  { key: "silver", label: "Silver", threshold: 3, perks: ["Priority booking support", "Early-bird appointment slots", "Birthday booking credit"] },
  { key: "gold", label: "Gold", threshold: 8, perks: ["Early access to new artists", "Priority waitlist placement", "Bigger loyalty credits"] },
  { key: "platinum", label: "Platinum", threshold: 15, perks: ["No $10 base fee — pay just 5%", "Concierge booking support", "Annual loyalty credit"] },
];

const ARTIST_TIERS: ArtistTier[] = [
  { key: "rising", label: "Rising", bookings: 0, minRating: 0, perks: ["Profile & portfolio tools", "Built-in booking calendar", "Standard search placement", "Standard payout schedule"] },
  { key: "established", label: "Established", bookings: 10, minRating: 4.0, perks: ["Boosted search ranking", "Verified profile badge", "Insights & analytics dashboard"] },
  { key: "pro", label: "Pro", bookings: 50, minRating: 4.5, perks: ["Priority placement", "Featured-artist eligibility", "Faster 2-day payouts"] },
  { key: "elite", label: "Elite", bookings: 150, minRating: 4.8, perks: ["Top placement", "Homepage & newsletter features", "Instant payouts"] },
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
    ? "Every artist gets the full toolkit. Climb the tiers with completed bookings and a strong rating to stack on better placement, badges, and faster payouts."
    : "Every client gets the full marketplace. Book more to stack on perks like priority support, credits, and early access — Platinum even skips the $10 base fee.";

  const tiers = useMemo(() => (isArtist ? ARTIST_TIERS : CLIENT_TIERS), [isArtist]);

  return (
    <div className="h-svh overflow-hidden flex flex-col text-app">
      <VideoBackground video />
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "clamp(12px, 3vh, 28px) clamp(12px, 4vw, 48px)" }}>
        <div className="min-h-full flex items-center justify-center">
          {/* Frosted panel separates all content from the video behind it. */}
          <div
            className="w-full max-w-6xl rounded-3xl border p-5 sm:p-7 lg:p-9 backdrop-blur-2xl"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--bg) 82%, transparent)",
              boxShadow: "0 40px 100px -50px rgba(0,0,0,0.85)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" style={pillStyle}>
                <Award className="h-3.5 w-3.5" />
                {isArtist ? "Artist tiers" : "Client rewards"}
              </span>
              <h1 className="font-bold tracking-tight text-app" style={{ fontSize: "clamp(1.6rem, 1.2vw + 1.3rem, 2.4rem)" }}>
                {isArtist ? "Artist Tiers" : "Reward Tiers"}
              </h1>
              <p className="text-subtle max-w-2xl mx-auto" style={{ fontSize: "clamp(0.875rem, 0.4vw + 0.8rem, 1rem)" }}>
                {intro}
              </p>
              <p className="max-w-2xl mx-auto rounded-xl border px-3.5 py-2 text-xs text-subtle" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                <span className="font-semibold text-app">How Inkmity makes money:</span> one simple platform fee on completed bookings — <span className="font-semibold text-app">$10 + 5% of the price, never more than $50</span> — shown before you pay. The essentials are always free; any future subscriptions are optional extras. We only earn when you book.
              </p>
              {!isArtist && ready && rewards && (
                <RewardsPanel data={rewards} className="w-full max-w-xl mx-auto mt-1 text-left" />
              )}
            </div>

            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              {tiers.map((t, i) => {
                const Icon = TIER_ICON[t.key] ?? Award;
                const isCurrent = currentKey === t.key;
                const prevLabel = i > 0 ? tiers[i - 1].label : null;
                const meta = isArtist
                  ? (t as ArtistTier).bookings === 0
                    ? "Starting tier"
                    : `${(t as ArtistTier).bookings}+ bookings${(t as ArtistTier).minRating > 0 ? ` · ${(t as ArtistTier).minRating.toFixed(1)}★+` : ""}`
                  : (t as ClientTier).threshold === 0
                    ? "Starting tier"
                    : `${(t as ClientTier).threshold}+ bookings`;
                return (
                  <div
                    key={t.key}
                    className="relative flex flex-col rounded-2xl border p-5 pt-7 transition-all"
                    style={{
                      borderColor: isCurrent ? "var(--fg)" : "var(--border)",
                      boxShadow: isCurrent ? "0 0 0 1.5px var(--fg)" : "0 14px 40px -28px rgba(0,0,0,0.7)",
                      background: isCurrent
                        ? "linear-gradient(160deg, color-mix(in srgb, var(--elevated) 75%, var(--card)), var(--card))"
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

                    <div className="flex flex-col items-center text-center">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border mb-3" style={pillStyle}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="text-app font-bold text-lg leading-none">{t.label}</h3>
                      <p className="text-subtle text-xs mt-1.5">{meta}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5 text-subtle">
                        {prevLabel ? (
                          <span className="inline-flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Everything in {prevLabel}, plus
                          </span>
                        ) : (
                          "Included for everyone"
                        )}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {t.perks.map((perk) => (
                          <li key={perk} className="flex items-start gap-2 text-sm text-app/90">
                            <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--fg)" }} />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
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
        </div>
      </main>
    </div>
  );
}
