import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Award, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getMyRewards, formatPlatformFee, type RewardsSummary } from "@/api";

type Props = {
  className?: string;
  data?: RewardsSummary | null;
};

export default function RewardsPanel({ className = "", data: dataProp }: Props) {
  const controlled = dataProp !== undefined;
  const { getToken } = useAuth();
  const [fetched, setFetched] = useState<RewardsSummary | null>(null);
  const [loading, setLoading] = useState(!controlled);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setFetched(await getMyRewards(token ?? undefined));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!controlled) load();
  }, [controlled, load]);

  const data = controlled ? dataProp : fetched;
  if ((!controlled && loading) || !data || !data.tier) return null;

  const { tier, nextTier, completedBookings, platformFee } = data;
  const fee = formatPlatformFee(platformFee);

  let progress = 100;
  if (nextTier) {
    const span = nextTier.bookingsToNextTier + completedBookings;
    progress = span > 0 ? Math.min(100, Math.round((completedBookings / span) * 100)) : 0;
  }

  return (
    <div className={`rounded-2xl border border-app bg-card px-4 py-2.5 sm:px-5 sm:py-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="h-4 w-4 text-subtle shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
            Rewards
          </span>
        </div>
        <span className="inline-flex items-center rounded-full border border-app bg-elevated px-2.5 py-0.5 text-sm font-semibold text-app">
          {tier.label}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-xs text-subtle">Platform fee</span>
        <span className="text-base font-bold text-app">{fee.short}<span className="text-xs font-normal text-subtle"> · max {fee.cap}</span></span>
      </div>

      <p className="mt-0.5 text-xs text-subtle">
        {completedBookings} completed booking{completedBookings === 1 ? "" : "s"}
      </p>

      {nextTier ? (
        <div className="mt-2">
          <Progress value={progress} className="h-1.5" />
          <p className="mt-1.5 text-xs text-subtle flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            {nextTier.bookingsToNextTier} more booking{nextTier.bookingsToNextTier === 1 ? "" : "s"} to{" "}
            <span className="text-app font-semibold">{nextTier.label}</span>
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-subtle flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0" /> You've reached the top tier — all perks unlocked.
        </p>
      )}
    </div>
  );
}
