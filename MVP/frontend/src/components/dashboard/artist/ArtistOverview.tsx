import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Hourglass,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Wallet,
  TrendingUp,
  PiggyBank,
  Clock,
  CalendarX2,
  Sunrise,
  Coins,
} from "lucide-react";
import type { Booking } from "@/api";
import { Skeleton } from "@/components/ui/skeleton";
import PayoutSetup from "./PayoutSetup";
import ArtistInsights from "./ArtistInsights";

export type AppointmentWithUsers = Booking & {
  client?: { username: string; avatarUrl?: string } | null;
  artist?: { username: string; avatarUrl?: string } | null;
};

type Props = {
  appointments?: AppointmentWithUsers[];
  loading?: boolean;
};

const ACTIVE_STATUSES = new Set([
  "accepted",
  "confirmed",
  "booked",
  "matched",
  "in-progress",
]);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDay(date: string) {
  const d = new Date(date);
  const today = startOfDay(new Date());
  const that = startOfDay(d);
  const diff = Math.round((that.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtRelative(date: string) {
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "tomorrow" : `in ${days}d`;
}

function fmtMoney(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(dollars).toLocaleString()}`;
}

export default function ArtistOverview({ appointments, loading }: Props) {
  const data = appointments ?? [];

  const { stats, money, next, upcoming } = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const todayStart = startOfDay(now).getTime();
    const todayEnd = todayStart + 86400000;

    const upcomingList = data
      .filter(
        (a) => ACTIVE_STATUSES.has(a.status) && new Date(a.startAt).getTime() >= now.getTime()
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    const pendingCount = data.filter((a) => a.status === "pending").length;
    const thisWeekCount = upcomingList.filter(
      (a) => new Date(a.startAt).getTime() <= weekAhead.getTime()
    ).length;
    const completed = data.filter((a) => a.status === "completed");
    const noShowCount = data.filter((a) => a.status === "no-show").length;
    const todayCount = upcomingList.filter((a) => {
      const t = new Date(a.startAt).getTime();
      return t >= todayStart && t < todayEnd;
    }).length;

    const earnedThisMonth = completed
      .filter((a) => new Date(a.startAt).getTime() >= monthStart)
      .reduce((sum, a) => sum + (a.priceCents ?? 0), 0);
    const upcomingValue = upcomingList.reduce((sum, a) => sum + (a.priceCents ?? 0), 0);
    const depositsHeld = data
      .filter((a) => ACTIVE_STATUSES.has(a.status) || a.status === "pending")
      .reduce((sum, a) => sum + (a.depositPaidCents ?? 0), 0);
    const valued = completed.filter((a) => (a.priceCents ?? 0) > 0);
    const avgValue = valued.length
      ? Math.round(valued.reduce((sum, a) => sum + (a.priceCents ?? 0), 0) / valued.length)
      : 0;

    return {
      stats: [
        { label: "Today", value: todayCount, Icon: Sunrise },
        { label: "Upcoming", value: upcomingList.length, Icon: CalendarClock },
        { label: "Pending", value: pendingCount, Icon: Hourglass },
        { label: "This week", value: thisWeekCount, Icon: CalendarRange },
        { label: "Completed", value: completed.length, Icon: CheckCircle2 },
        { label: "No-shows", value: noShowCount, Icon: CalendarX2 },
      ],
      money: [
        { label: "Earned this month", value: fmtMoney(earnedThisMonth), Icon: Wallet },
        { label: "Upcoming value", value: fmtMoney(upcomingValue), Icon: TrendingUp },
        { label: "Deposits held", value: fmtMoney(depositsHeld), Icon: PiggyBank },
        { label: "Avg / booking", value: fmtMoney(avgValue), Icon: Coins },
      ],
      next: upcomingList[0] ?? null,
      upcoming: upcomingList.slice(1, 7),
    };
  }, [data]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto sm:overflow-hidden gap-2 sm:gap-2.5">
      <PayoutSetup redirectToProfile />

      <div className="rounded-xl border border-app bg-elevated px-3 py-2 flex items-center gap-3 flex-shrink-0">
        <div className="grid place-items-center h-9 w-9 rounded-full bg-card border border-app shrink-0">
          <Clock className="h-4 w-4 text-app" />
        </div>
        {loading ? (
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : next ? (
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Next up · {fmtRelative(next.startAt)}
            </div>
            <div className="text-sm font-semibold text-app truncate">
              {next.client?.username ?? "Client"}
              <span className="text-muted font-normal"> · {next.appointmentType === "consultation" ? "Consultation" : "Tattoo session"}</span>
            </div>
            <div className="text-[11px] text-muted truncate">
              {fmtDay(next.startAt)} · {fmtTime(next.startAt)} – {fmtTime(next.endAt)}
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-muted">Next up</div>
            <div className="text-sm font-medium text-app">Nothing scheduled yet</div>
          </div>
        )}
      </div>

      <ArtistInsights stats={stats} loading={loading} />

      <div className="rounded-xl border border-app bg-elevated overflow-hidden flex-shrink-0">
        <div className="px-3 sm:px-4 py-2 border-b border-app flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-muted" />
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted">
            Earnings &amp; deposits
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
          {money.map(({ label, value }) => (
            <div key={label} className="bg-elevated px-2 py-2 flex flex-col items-center text-center min-w-0">
              {loading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <div className="text-base sm:text-lg font-bold text-app leading-none">{value}</div>
              )}
              <div className="mt-1 text-[9px] sm:text-[10px] text-muted leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 md:min-h-[120px] rounded-xl border border-app bg-elevated flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-app flex-shrink-0">
          <div className="text-xs sm:text-sm font-semibold text-app">Upcoming appointments</div>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs text-muted hover:text-app transition-colors"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center p-2 sm:p-3 gap-1.5">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))
          ) : upcoming.length === 0 ? (
            <div className="text-center text-xs sm:text-sm text-muted px-4">
              No upcoming appointments
            </div>
          ) : (
            upcoming.map((a) => {
              const name = a.client?.username ?? "Client";
              return (
                <div
                  key={a._id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-app bg-card px-2.5 py-1.5"
                >
                  <span className="text-xs sm:text-sm font-medium text-app truncate">{name}</span>
                  <span className="text-[11px] text-muted shrink-0 whitespace-nowrap">
                    {fmtDay(a.startAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
