import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, DollarSign, ShieldCheck, AlertCircle, Inbox, CalendarDays, type LucideIcon } from "lucide-react";
import { getNotifications, type NotificationItem } from "@/api";
import { connectSocket, getSocket } from "@/lib/socket";

const APPT_KINDS = ["request", "final_price", "verification", "balance", "booking", "appointment"];
const linkFor = (kind: string | null) =>
  kind && APPT_KINDS.some((k) => kind.includes(k)) ? "/appointments" : "/dashboard";

const REALTIME_EVENTS = [
  "message:new",
  "unread:update",
  "conversation:pending",
  "conversation:accepted",
  "conversation:removed",
  "booking:updated",
  "booking:cancelled",
  "booking:denied",
];

function iconFor(kind: string | null): LucideIcon {
  if (!kind) return MessageSquare;
  if (kind.includes("price")) return DollarSign;
  if (kind.includes("verification") || kind.includes("code")) return ShieldCheck;
  if (kind.includes("balance") || kind.includes("failed")) return AlertCircle;
  if (kind.includes("booking") || kind.includes("appointment")) return CalendarDays;
  if (kind.includes("request")) return Inbox;
  return MessageSquare;
}

function labelFor(kind: string | null) {
  switch (kind) {
    case "final_price_set": return "Final price set";
    case "verification_code": return "Completion code";
    case "balance_capture_failed": return "Payment needs attention";
    case "booking_request": return "Appointment request";
    case "request": return "New request";
    case null:
    case "message": return "New message";
    default: return "Update";
  }
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationBell({ className = "" }: { className?: string }) {
  const { getToken } = useAuth();
  const { user, isSignedIn } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    setFetching(true);
    try {
      const token = await getToken();
      const { items } = await getNotifications(token ?? undefined);
      setItems(items || []);
    } catch {
      /* keep previous items on transient failure */
    } finally {
      setFetching(false);
    }
  }, [getToken]);

  // Initial load + live refresh on the relevant socket events.
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;
    void refetch();
    const socket = getSocket();
    const ping = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void refetch(), 250);
    };
    const attach = () => REALTIME_EVENTS.forEach((e) => socket.on(e, ping));
    if (socket.connected) attach();
    socket.on("connect", attach);
    if (!socket.connected) void connectSocket(getToken, user.id);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.off("connect", attach);
      REALTIME_EVENTS.forEach((e) => socket.off(e, ping));
    };
  }, [isSignedIn, user?.id, getToken, refetch]);

  // Fetch fresh whenever the panel opens.
  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = items.length;
  const go = (kind: string | null) => {
    setOpen(false);
    navigate(linkFor(kind));
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg border border-app bg-elevated text-app hover:bg-card transition-colors flex-shrink-0"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-[color:var(--fg)] text-[color:var(--bg)] text-[10px] font-bold leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-app bg-card shadow-2xl z-[2147483600] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-app flex items-center justify-between">
            <span className="text-sm font-bold text-app">Notifications</span>
            {count > 0 && <span className="text-[11px] text-subtle">{count} new</span>}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {fetching && items.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-subtle">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-5 w-5 mx-auto mb-2 text-subtle" />
                <p className="text-xs text-subtle">You&apos;re all caught up.</p>
              </div>
            ) : (
              items.map((it) => {
                const Icon = iconFor(it.kind);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => go(it.kind)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-elevated transition-colors border-b border-app/40 last:border-b-0"
                  >
                    <span className="inline-grid place-items-center h-8 w-8 rounded-lg border border-app bg-elevated text-app shrink-0">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-app truncate">{labelFor(it.kind)}</span>
                        <span className="text-[10px] text-subtle shrink-0">{timeAgo(it.createdAt)}</span>
                      </span>
                      <span className="block text-[11px] text-subtle leading-snug line-clamp-2 mt-0.5">
                        <span className="text-app/80">{it.name}:</span> {it.text}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/dashboard");
            }}
            className="w-full px-4 py-2.5 text-xs font-semibold text-app border-t border-app hover:bg-elevated transition-colors"
          >
            View all
          </button>
        </div>
      )}
    </div>
  );
}
