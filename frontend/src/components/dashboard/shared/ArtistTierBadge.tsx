import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { BadgeCheck, Zap, TrendingUp } from "lucide-react";
import { computeArtistTier } from "@/lib/artistTier";
import { getArtistAnalytics } from "@/api";

const TIER_META: Record<string, { bookings: number; minRating: number; placement: string; payout: string }> = {
  rising: { bookings: 0, minRating: 0, placement: "Standard placement", payout: "Instant payouts" },
  established: { bookings: 10, minRating: 4.0, placement: "Boosted placement", payout: "Instant payouts" },
  pro: { bookings: 50, minRating: 4.5, placement: "Priority placement", payout: "Instant payouts" },
  elite: { bookings: 150, minRating: 4.8, placement: "Top placement", payout: "Instant payouts" },
};
const ORDER = ["rising", "established", "pro", "elite"];

export default function ArtistTierBadge({
  bookingsCount,
  rating,
  className = "",
}: {
  bookingsCount?: number;
  rating?: number;
  className?: string;
}) {
  const { getToken } = useAuth();
  const selfFetch = bookingsCount === undefined && rating === undefined;
  const [fetched, setFetched] = useState<{ bookings?: number; rating?: number } | null>(null);
  useEffect(() => {
    if (!selfFetch) return;
    const ac = new AbortController();
    (async () => {
      try {
        const token = await getToken();
        const a = await getArtistAnalytics(token, ac.signal);
        setFetched({ bookings: a.bookingsCount, rating: a.rating });
      } catch { }
    })();
    return () => ac.abort();
  }, [selfFetch, getToken]);

  const b = selfFetch ? fetched?.bookings : bookingsCount;
  const r = selfFetch ? fetched?.rating : rating;
  const tier = useMemo(() => computeArtistTier(b, r), [b, r]);
  const meta = TIER_META[tier.key] ?? TIER_META.rising;

  if (selfFetch && !fetched) return null;
  const nextKey = ORDER[tier.rank + 1];
  const next = nextKey ? TIER_META[nextKey] : null;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${className}`}
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>Artist tier</div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold leading-tight">{tier.label}</span>
            {tier.verified && <BadgeCheck className="h-4 w-4" />}
          </div>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border shrink-0" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
          <TrendingUp className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
          <TrendingUp className="h-3 w-3 opacity-70" />{meta.placement}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
          <Zap className="h-3 w-3 opacity-70" />{meta.payout}
        </span>
      </div>

      {next && (
        <div className="mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>
          Next: reach <span className="font-semibold" style={{ color: "var(--fg)" }}>{next.bookings} bookings</span>
          {next.minRating > 0 && <> &amp; <span className="font-semibold" style={{ color: "var(--fg)" }}>{next.minRating.toFixed(1)}★</span></>} for{" "}
          <span className="font-semibold capitalize" style={{ color: "var(--fg)" }}>{ORDER[tier.rank + 1]}</span>.
        </div>
      )}
    </div>
  );
}
