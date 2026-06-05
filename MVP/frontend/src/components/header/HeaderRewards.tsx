import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Award } from "lucide-react";
import { getMyRewards, type RewardsSummary } from "@/api";

const pillStyle: React.CSSProperties = {
  borderColor: "var(--border)",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--elevated) 95%, var(--fg) 5%), color-mix(in srgb, var(--elevated) 85%, var(--fg) 15%))",
  color: "var(--fg)",
};

function pctLabel(p: number) {
  return `${((p * 100) % 1 === 0 ? (p * 100).toFixed(0) : (p * 100).toFixed(1))}%`;
}

// Keep the shimmer up for the same duration as the username shimmer in the header.
const SHIMMER_MS = 2000;

export default function HeaderRewards() {
  const { getToken } = useAuth();
  const [data, setData] = useState<RewardsSummary | null>(null);
  const [ready, setReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setData(await getMyRewards(token ?? undefined));
    } catch {
    } finally {
      setReady(true);
    }
  }, [getToken]);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("rewards:refresh", onRefresh);
    return () => window.removeEventListener("rewards:refresh", onRefresh);
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), SHIMMER_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready || !minElapsed) {
    return (
      <div className="hidden md:flex items-center gap-2 rounded-full border h-11 md:h-12 px-4 min-w-[128px] flex-shrink-0" style={pillStyle}>
        <span className="ink-shimmer h-4 w-4 rounded-full" />
        <div className="flex flex-col gap-1">
          <span className="ink-shimmer h-3 w-12 rounded" />
          <span className="ink-shimmer h-2 w-8 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const next = data.nextTier;
  const title = next
    ? `${data.tier.label} • ${pctLabel(data.currentFeePct)} platform fee\n${next.bookingsToNextTier} more booking(s) → ${next.label} (${pctLabel(next.feePct)})`
    : `${data.tier.label} • ${pctLabel(data.currentFeePct)} platform fee — top tier reached`;

  return (
    <Link
      to="/tiers"
      className="hidden md:flex items-center gap-2 rounded-full border h-11 md:h-12 px-4 min-w-[128px] flex-shrink-0 transition hover:brightness-110"
      style={pillStyle}
      title={title}
      aria-label={`Rewards tier ${data.tier.label}, ${pctLabel(data.currentFeePct)} platform fee`}
    >
      <Award className="h-4 w-4" />
      <div className="flex flex-col leading-none">
        <span className="text-[12px] lg:text-[13px] font-bold leading-tight">
          {data.tier.label}
        </span>
        <span className="text-[9px] lg:text-[10px] opacity-70 leading-tight">
          {pctLabel(data.currentFeePct)} fee
        </span>
      </div>
    </Link>
  );
}
