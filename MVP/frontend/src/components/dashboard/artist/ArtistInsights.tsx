import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { BarChart3, BadgeCheck, Zap } from "lucide-react";
import { getArtistAnalytics, type ArtistAnalytics } from "@/api";

const payoutLabel: Record<string, string> = {
  standard: "Standard payouts",
  two_day: "2-day payouts",
  instant: "Instant payouts",
};

function fmtMoney(cents: number) {
  const d = (cents || 0) / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(d % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(d).toLocaleString()}`;
}

export default function ArtistInsights() {
  const { getToken } = useAuth();
  const [data, setData] = useState<ArtistAnalytics | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const token = (await getToken()) ?? undefined;
        setData(await getArtistAnalytics(token, ac.signal));
      } catch {
        setData(null);
      }
    })();
    return () => ac.abort();
  }, [getToken]);

  if (!data) return null;

  const completionPct = Math.round((data.bookings.completionRate || 0) * 100);
  const cells = [
    { label: "Paid out", value: fmtMoney(data.earnings.paidOutCents) },
    {
      label: "Completion",
      value: data.bookings.completed + data.bookings.noShow > 0 ? `${completionPct}%` : "—",
    },
    { label: "Completed", value: String(data.bookings.completed) },
    {
      label: "Rating",
      value: data.rating > 0 ? `${data.rating.toFixed(1)}★` : "—",
    },
  ];

  return (
    <div className="rounded-xl border border-app bg-elevated overflow-hidden flex-shrink-0">
      <div className="px-3 sm:px-4 py-2 border-b border-app flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-muted" />
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted">
            Insights
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data.tier.verified && (
            <span className="inline-flex items-center gap-1 rounded-full border border-app px-1.5 py-0.5 text-[10px] font-semibold text-app">
              <BadgeCheck className="h-3 w-3" />
              {data.tier.label}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-app px-1.5 py-0.5 text-[10px] font-semibold text-app">
            <Zap className="h-3 w-3" />
            {payoutLabel[data.payoutSpeed] || "Standard payouts"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
        {cells.map((c) => (
          <div key={c.label} className="bg-elevated px-2 py-2.5 sm:py-3 flex flex-col items-center text-center min-w-0">
            <div className="text-lg sm:text-xl font-bold text-app leading-none">{c.value}</div>
            <div className="mt-1 text-[9px] sm:text-[10px] text-muted leading-tight">{c.label}</div>
          </div>
        ))}
      </div>
      {!data.tier.verified && (
        <div className="px-3 py-1.5 text-[10px] text-muted border-t border-app">
          Reach Established tier (10 bookings · 4.0★) to earn a verified badge and boosted ranking.
        </div>
      )}
    </div>
  );
}
