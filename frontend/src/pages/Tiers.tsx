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

const CLIENT_TIERS: ClientTier[] = [
  { key: "bronze", label: "Bronze", threshold: 0, perks: ["Full marketplace access", "Book & message any artist", "Secure deposit & payment protection", "Standard fee: $10 + 5%, capped at $50"] },
  { key: "silver", label: "Silver", threshold: 3, perks: ["Priority booking support", "Early-bird appointment slots", "Birthday booking credit"] },
  { key: "gold", label: "Gold", threshold: 8, perks: ["Early access to new artists", "Priority waitlist placement", "Bigger loyalty credits"] },
  { key: "platinum", label: "Platinum", threshold: 10, perks: ["No $10 base fee — pay just 5%", "Concierge booking support", "Annual loyalty credit"] },
];

const ARTIST_TIERS: ArtistTier[] = [
  { key: "rising", label: "Rising", bookings: 0, minRating: 0, perks: ["Profile & portfolio tools", "Built-in booking calendar", "Instant payouts — free, every tier", "Standard search placement"] },
  { key: "established", label: "Established", bookings: 10, minRating: 4.0, perks: ["Boosted search ranking", "Verified profile badge", "Insights & analytics dashboard"] },
  { key: "pro", label: "Pro", bookings: 50, minRating: 4.5, perks: ["Priority placement", "Featured-artist eligibility"] },
  { key: "elite", label: "Elite", bookings: 150, minRating: 4.8, perks: ["Top placement", "Homepage & newsletter features"] },
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
    ? "Every artist gets the full toolkit — including instant payouts, free. Climb the tiers with completed bookings and a strong rating to stack on better placement and badges."
    : "Every client gets the full marketplace. Book more to stack on perks like priority support, credits, and early access — Platinum even skips the $10 base fee.";

  const tiers = useMemo(() => (isArtist ? ARTIST_TIERS : CLIENT_TIERS), [isArtist]);

  return (
    <div className="min-h-svh sm:h-svh overflow-x-hidden sm:overflow-hidden flex flex-col text-app">
      <VideoBackground video />
      <Header />
      <main
        className="flex-1 min-h-0 overflow-y-auto sm:overflow-hidden flex items-center justify-center"
        style={{ padding: "clamp(6px, 1.4vh, 14px) clamp(10px, 4vw, 48px)" }}
      >
        <div
          className="w-full max-w-6xl sm:max-h-full rounded-3xl border backdrop-blur-2xl flex flex-col overflow-hidden"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--bg) 82%, transparent)",
            boxShadow: "0 40px 100px -50px rgba(0,0,0,0.85)",
            padding: "clamp(12px, 2.2vh, 26px) clamp(14px, 2.4vw, 34px)",
          }}
        >
          <div
            className="shrink-0 flex flex-col items-center text-center"
            style={{ gap: "clamp(3px, 0.8vh, 9px)", marginBottom: "clamp(8px, 1.6vh, 18px)" }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" style={pillStyle}>
              <Award className="h-3.5 w-3.5" />
              {isArtist ? "Artist tiers" : "Client rewards"}
            </span>
            <h1 className="font-bold tracking-tight text-app" style={{ fontSize: "clamp(1.4rem, 1vw + 1.1rem, 2.2rem)" }}>
              {isArtist ? "Artist Tiers" : "Reward Tiers"}
            </h1>
            <p className="text-subtle max-w-2xl mx-auto" style={{ fontSize: "clamp(0.8rem, 0.4vw + 0.72rem, 0.95rem)" }}>
              {intro}
            </p>
            <p
              className="max-w-2xl mx-auto rounded-xl border px-3.5 py-1.5 text-subtle"
              style={{ borderColor: "var(--border)", background: "var(--elevated)", fontSize: "clamp(0.66rem, 0.3vw + 0.6rem, 0.78rem)" }}
            >
              <span className="font-semibold text-app">How Inkmity makes money:</span> one simple platform fee on completed bookings — <span className="font-semibold text-app">$10 + 5% of the price, never more than $50</span> — shown before you pay. The essentials are always free; any future subscriptions are optional extras. We only earn when you book.
            </p>
            {!isArtist && ready && rewards && (
              <RewardsPanel data={rewards} className="w-full max-w-xl mx-auto text-left" />
            )}
          </div>

          <div
            className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-4 items-stretch content-center"
            style={{ gap: "clamp(8px, 1.4vh, 18px)" }}
          >
            {tiers.map((t, i) => {
              const Icon = TIER_ICON[t.key] ?? Award;
              const isCurrent = ready && currentKey === t.key;
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
                  className="relative flex flex-col rounded-2xl border min-h-0 transition-all"
                  style={{
                    borderColor: isCurrent ? "var(--fg)" : "var(--border)",
                    boxShadow: isCurrent ? "0 0 0 1.5px var(--fg)" : "0 14px 40px -28px rgba(0,0,0,0.7)",
                    background: isCurrent
                      ? "linear-gradient(160deg, color-mix(in srgb, var(--elevated) 75%, var(--card)), var(--card))"
                      : "var(--card)",
                    padding: "clamp(10px, 1.6vh, 18px)",
                    paddingTop: "clamp(16px, 2.1vh, 26px)",
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
                    <span
                      className="inline-flex items-center justify-center rounded-xl border"
                      style={{ ...pillStyle, width: "clamp(2rem, 3.6vh, 2.75rem)", height: "clamp(2rem, 3.6vh, 2.75rem)", marginBottom: "clamp(4px, 1vh, 12px)" }}
                    >
                      <Icon style={{ width: "clamp(1rem, 1.8vh, 1.25rem)", height: "clamp(1rem, 1.8vh, 1.25rem)" }} />
                    </span>
                    <h3 className="text-app font-bold leading-none" style={{ fontSize: "clamp(0.95rem, 0.5vh + 0.82rem, 1.125rem)" }}>{t.label}</h3>
                    <p className="text-subtle mt-1" style={{ fontSize: "clamp(0.65rem, 0.3vh + 0.6rem, 0.75rem)" }}>{meta}</p>
                  </div>

                  <div className="min-h-0" style={{ marginTop: "clamp(8px, 1.4vh, 16px)", paddingTop: "clamp(8px, 1.4vh, 16px)", borderTop: "1px solid color-mix(in srgb, var(--border) 70%, transparent)" }}>
                    <p className="font-semibold uppercase tracking-wide text-subtle" style={{ fontSize: "clamp(0.6rem, 0.25vh + 0.55rem, 0.7rem)", marginBottom: "clamp(5px, 1vh, 10px)" }}>
                      {prevLabel ? (
                        <span className="inline-flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Everything in {prevLabel}, plus
                        </span>
                      ) : (
                        "Included for everyone"
                      )}
                    </p>
                    <ul className="flex flex-col" style={{ gap: "clamp(3px, 0.8vh, 8px)" }}>
                      {t.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-1.5 text-app/90" style={{ fontSize: "clamp(0.72rem, 0.3vh + 0.66rem, 0.875rem)" }}>
                          <Check className="mt-0.5 shrink-0" style={{ color: "var(--fg)", width: "clamp(0.85rem, 1.5vh, 1rem)", height: "clamp(0.85rem, 1.5vh, 1rem)" }} />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <p
            className="shrink-0 text-subtle text-center"
            style={{ fontSize: "clamp(0.66rem, 0.3vw + 0.6rem, 0.8rem)", marginTop: "clamp(8px, 1.4vh, 16px)" }}
          >
            {isArtist
              ? "Tier placement updates automatically as your booking history and rating grow."
              : "Perks and credits unlock automatically as your booking history grows."}
          </p>
        </div>
      </main>
    </div>
  );
}
