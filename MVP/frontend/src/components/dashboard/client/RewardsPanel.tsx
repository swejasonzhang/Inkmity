import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Award, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getMyRewards, type RewardsSummary } from "@/api";

function pctLabel(p: number) {
  return `${(p * 100).toFixed(p * 100 % 1 === 0 ? 0 : 1)}%`;
}

// Client-facing milestone rewards: shows current tier, the platform-fee rate it
// earns, and progress toward the next tier.
export default function RewardsPanel({ className = "" }: { className?: string }) {
  const { getToken } = useAuth();
  const [data, setData] = useState<RewardsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setData(await getMyRewards(token ?? undefined));
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) return null;

  const { tier, nextTier, completedBookings, currentFeePct } = data;

  // Progress within the current tier band toward the next threshold.
  let progress = 100;
  if (nextTier) {
    const span = nextTier.bookingsToNextTier + completedBookings; // next threshold
    progress = span > 0 ? Math.min(100, Math.round((completedBookings / span) * 100)) : 0;
  }

  return (
    <div className={`rounded-xl border border-app bg-elevated px-3 sm:px-4 py-3 flex-shrink-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="h-4 w-4 text-app shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted">
            Rewards
          </span>
        </div>
        <span className="text-xs sm:text-sm font-bold text-app">{tier.label}</span>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] sm:text-xs text-muted">Your platform fee</span>
        <span className="text-base sm:text-lg font-bold text-app">{pctLabel(currentFeePct)}</span>
      </div>

      {nextTier ? (
        <div className="mt-2">
          <Progress value={progress} className="h-1.5" />
          <p className="mt-1.5 text-[11px] text-muted flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {nextTier.bookingsToNextTier} more booking{nextTier.bookingsToNextTier === 1 ? "" : "s"} to{" "}
            {nextTier.label} ({pctLabel(nextTier.feePct)} fee)
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> You've reached the top tier — best rate unlocked.
        </p>
      )}
    </div>
  );
}
