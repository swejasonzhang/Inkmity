import { useEffect, useState, type ComponentType } from "react";
import { useAuth } from "@clerk/clerk-react";
import { BarChart3, BadgeCheck, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getArtistAnalytics, type ArtistAnalytics } from "@/api";

type StatItem = {
  label: string;
  value: number | string;
  Icon: ComponentType<{ className?: string }>;
};

type Props = {
  stats?: StatItem[];
  loading?: boolean;
};

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

export default function ArtistInsights({ stats = [], loading = false }: Props) {
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

  const completionPct = data ? Math.round((data.bookings.completionRate || 0) * 100) : 0;
  const insightCells = data
    ? [
        { label: "Paid out", value: fmtMoney(data.earnings.paidOutCents) },
        {
          label: "Completion",
          value:
            data.bookings.completed + data.bookings.noShow > 0
              ? `${completionPct}%`
              : "—",
        },
        { label: "Rating", value: data.rating > 0 ? `${data.rating.toFixed(1)}★` : "—" },
      ]
    : [];

  return (
    <div className="rounded-xl border border-app bg-card overflow-hidden flex flex-col flex-shrink-0 sm:flex-1 sm:min-h-0">
      <div className="px-2 sm:px-3 py-1.5 border-b border-app flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-muted" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Insights
          </span>
        </div>
        {data && (
          <div className="flex items-center gap-1.5">
            {data.tier.verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-app px-1.5 py-0.5 text-xs font-semibold text-app">
                <BadgeCheck className="h-3 w-3" />
                {data.tier.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-app px-1.5 py-0.5 text-xs font-semibold text-app">
              <Zap className="h-3 w-3" />
              {payoutLabel[data.payoutSpeed] || "Standard payouts"}
            </span>
          </div>
        )}
      </div>

      <div className="sm:flex-1 sm:flex sm:flex-col sm:min-h-0">
        {insightCells.length > 0 && (
          <div className="grid grid-cols-3 gap-px sm:flex-1 auto-rows-fr" style={{ background: "var(--border)" }}>
            {insightCells.map((c) => (
              <div
                key={c.label}
                className="bg-card px-1 py-1.5 sm:py-3 flex flex-col items-center justify-center text-center min-w-0"
              >
                <div className="text-lg font-bold text-app leading-none">{c.value}</div>
                <div className="mt-0.5 text-xs text-muted leading-tight">{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats.length > 0 && (
          <div
            className="grid grid-cols-3 sm:grid-cols-6 gap-px border-t border-app sm:flex-1 auto-rows-fr"
            style={{ background: "var(--border)" }}
          >
            {stats.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="bg-card px-1 py-1.5 sm:py-3 flex flex-col items-center justify-center text-center gap-0.5 min-w-0"
              >
                <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
                {loading ? (
                  <Skeleton className="h-5 w-6" />
                ) : (
                  <div className="text-lg font-bold text-app leading-none">{value}</div>
                )}
                <span className="text-xs text-muted leading-tight">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
