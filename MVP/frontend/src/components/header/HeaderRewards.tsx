import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Award } from "lucide-react";
import { getMyRewards, type RewardsSummary } from "@/api";

function pctLabel(p: number) {
  return `${((p * 100) % 1 === 0 ? (p * 100).toFixed(0) : (p * 100).toFixed(1))}%`;
}

export default function HeaderRewards() {
  const { getToken } = useAuth();
  const [data, setData] = useState<RewardsSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setData(await getMyRewards(token ?? undefined));
    } catch {
    }
  }, [getToken]);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("rewards:refresh", onRefresh);
    return () => window.removeEventListener("rewards:refresh", onRefresh);
  }, [load]);

  if (!data) return null;

  const next = data.nextTier;
  const title = next
    ? `${data.tier.label} • ${pctLabel(data.currentFeePct)} platform fee\n${next.bookingsToNextTier} more booking(s) → ${next.label} (${pctLabel(next.feePct)})`
    : `${data.tier.label} • ${pctLabel(data.currentFeePct)} platform fee — top tier reached`;

  return (
    <div
      className="hidden md:flex items-center gap-2 rounded-full border border-app bg-card px-3 py-1.5 flex-shrink-0"
      title={title}
      aria-label={`Rewards tier ${data.tier.label}, ${pctLabel(data.currentFeePct)} platform fee`}
    >
      <Award className="h-4 w-4 text-app" />
      <div className="flex flex-col leading-none">
        <span className="text-[12px] lg:text-[13px] font-bold text-app leading-tight">
          {data.tier.label}
        </span>
        <span className="text-[9px] lg:text-[10px] opacity-60 leading-tight">
          {pctLabel(data.currentFeePct)} fee
        </span>
      </div>
    </div>
  );
}
