import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Award, ArrowRight } from "lucide-react";
import { getMyRewards, type RewardsSummary } from "@/api";

const pct = (p: number) => `${((p * 100) % 1 === 0 ? (p * 100).toFixed(0) : (p * 100).toFixed(1))}%`;

// Shows the client their live reward tier, the platform fee it earns them, and how
// close they are to the next tier. Self-contained — fetches its own rewards summary.
export default function ClientTierCard({ className = "" }: { className?: string }) {
  const { getToken } = useAuth();
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const token = await getToken();
        const data = await getMyRewards(token, ac.signal);
        setRewards(data);
      } catch { /* ignore */ }
    })();
    return () => ac.abort();
  }, [getToken]);

  if (!rewards) return null;

  const { tier, nextTier, currentFeePct, completedBookings, lifetimeDiscountUsd } = rewards;
  const progress =
    nextTier && nextTier.bookingsToNextTier > 0
      ? Math.max(0, Math.min(1, completedBookings / (completedBookings + nextTier.bookingsToNextTier)))
      : 1;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${className}`}
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-10 w-10 place-items-center rounded-xl border shrink-0" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
            <Award className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>Your reward tier</div>
            <div className="text-lg font-bold leading-tight truncate">{tier.label}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold leading-none">{pct(currentFeePct)}</div>
          <div className="text-[11px]" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>platform fee</div>
        </div>
      </div>

      {nextTier ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>
            <span>{completedBookings} booking{completedBookings === 1 ? "" : "s"}</span>
            <span className="inline-flex items-center gap-1">
              {nextTier.bookingsToNextTier} to {nextTier.label}
              <ArrowRight className="h-3 w-3" />
              <span className="font-semibold" style={{ color: "var(--fg)" }}>{pct(nextTier.feePct)} fee</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--elevated)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: "var(--fg)" }} />
          </div>
        </div>
      ) : (
        <div className="mt-4 text-[11px]" style={{ color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>
          Top tier reached — you're paying the lowest platform fee on Inkmity.
        </div>
      )}

      {lifetimeDiscountUsd > 0 && (
        <div className="mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>
          You've saved <span className="font-semibold" style={{ color: "var(--fg)" }}>${lifetimeDiscountUsd.toFixed(2)}</span> in fees as a loyal client.
        </div>
      )}
    </div>
  );
}
