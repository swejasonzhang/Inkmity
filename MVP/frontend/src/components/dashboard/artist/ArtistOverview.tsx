import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Hourglass,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Inbox,
  Wallet,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import type { Booking } from "@/api";
import { Skeleton } from "@/components/ui/skeleton";
import PayoutSetup from "./PayoutSetup";

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

function fmtMoney(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(dollars).toLocaleString()}`;
}

function statusChip(status: string): string {
  switch (status) {
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "cancelled":
    case "denied":
    case "no-show":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-app/60 bg-card text-app";
  }
}

export default function ArtistOverview({ appointments, loading }: Props) {
  const data = appointments ?? [];

  const { stats, money, upcoming } = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

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

    const earnedThisMonth = completed
      .filter((a) => new Date(a.startAt).getTime() >= monthStart)
      .reduce((sum, a) => sum + (a.priceCents ?? 0), 0);
    const upcomingValue = upcomingList.reduce((sum, a) => sum + (a.priceCents ?? 0), 0);
    const depositsHeld = data
      .filter((a) => ACTIVE_STATUSES.has(a.status) || a.status === "pending")
      .reduce((sum, a) => sum + (a.depositPaidCents ?? 0), 0);

    return {
      stats: [
        { label: "Upcoming", value: upcomingList.length, Icon: CalendarClock },
        { label: "Pending", value: pendingCount, Icon: Hourglass },
        { label: "This week", value: thisWeekCount, Icon: CalendarRange },
        { label: "Completed", value: completed.length, Icon: CheckCircle2 },
      ],
      money: [
        { label: "Earned this month", value: fmtMoney(earnedThisMonth), Icon: Wallet },
        { label: "Upcoming value", value: fmtMoney(upcomingValue), Icon: TrendingUp },
        { label: "Deposits held", value: fmtMoney(depositsHeld), Icon: PiggyBank },
      ],
      upcoming: upcomingList.slice(0, 6),
    };
  }, [data]);

  return (
    <div className="flex flex-col h-full gap-3 sm:gap-4">
      <PayoutSetup />
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 flex-shrink-0">
        {stats.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-app bg-elevated px-1 py-2 sm:py-2.5 flex flex-col items-center justify-center text-center gap-0.5 min-w-0"
          >
            <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
            {loading ? (
              <Skeleton className="h-6 w-6" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold text-app leading-none">{value}</div>
            )}
            <span className="text-[9px] sm:text-[10px] text-muted leading-tight">{label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-app bg-elevated overflow-hidden flex-shrink-0">
        <div className="px-3 sm:px-4 py-2 border-b border-app flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-muted" />
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted">
            Earnings &amp; deposits
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[color:var(--border)]">
          {money.map(({ label, value }) => (
            <div key={label} className="px-2 py-2.5 sm:py-3 flex flex-col items-center text-center min-w-0">
              {loading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <div className="text-lg sm:text-xl font-bold text-app leading-none">{value}</div>
              )}
              <div className="mt-1 text-[9px] sm:text-[10px] text-muted leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-app bg-elevated flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-app flex-shrink-0">
          <div className="text-xs sm:text-sm font-semibold text-app">Upcoming appointments</div>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs text-muted hover:text-app transition-colors"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          ) : upcoming.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center gap-2 px-4 py-8">
              <Inbox className="h-7 w-7 text-muted" />
              <div className="text-sm font-medium text-app">No upcoming appointments</div>
              <div className="text-[11px] sm:text-xs text-muted max-w-[260px]">
                Confirmed bookings with clients will appear here as they come in.
              </div>
            </div>
          ) : (
            upcoming.map((a) => {
              const name = a.client?.username ?? "Client";
              const isConsult = a.appointmentType === "consultation";
              return (
                <div
                  key={a._id}
                  className="flex items-center gap-3 rounded-lg border border-app bg-card px-2.5 sm:px-3 py-2.5"
                >
                  <div className="grid place-items-center h-9 w-9 shrink-0 rounded-full bg-elevated border border-app text-xs font-semibold text-app uppercase">
                    {name[0] ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-app truncate">{name}</span>
                      <span className="text-[10px] text-muted truncate">
                        {isConsult ? "Consultation" : "Tattoo session"}
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-muted truncate">
                      {fmtDay(a.startAt)} · {fmtTime(a.startAt)} – {fmtTime(a.endAt)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${statusChip(
                      a.status
                    )}`}
                  >
                    {a.status}
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
