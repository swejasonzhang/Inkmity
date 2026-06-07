import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from "react";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { X, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LazyReveal from "@/components/ui/LazyReveal";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { API_URL, getAppointments } from "@/api";
import { useMessaging } from "@/hooks/useMessaging";
import type { AppointmentWithUsers } from "@/components/dashboard/artist/ArtistOverview";

const CalendarView = lazy(() => import("@/components/dashboard/artist/CalendarView"));
const ArtistOverview = lazy(() => import("@/components/dashboard/artist/ArtistOverview"));

export default function ArtistDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { role } = useRole();
  const isArtist = role === "artist";
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentWithUsers[]>([]);
  const [apptLoading, setApptLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const data = await getAppointments(undefined, token ?? undefined);
        if (!cancelled) setAppointments((data as AppointmentWithUsers[]) ?? []);
      } catch {
        if (!cancelled) setAppointments([]);
      } finally {
        if (!cancelled) setApptLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const calendarBookings = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "cancelled" && a.status !== "denied")
        .map((a) => ({
          id: a._id,
          title: a.appointmentType === "consultation" ? "Consultation" : "Tattoo session",
          clientName: a.client?.username,
          start: a.startAt,
          end: a.endAt,
          status: a.status,
        })),
    [appointments]
  );

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (url.startsWith("http")) {
        const token = await getToken();
        const headers = new Headers(options.headers || {});
        if (token) headers.set("Authorization", `Bearer ${token}`);
        if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
        return fetch(url, { ...options, headers, credentials: "include" });
      }
      const base = API_URL.replace(/\/+$/g, "");
      let path = url.startsWith("/") ? url : `/${url}`;
      if (base.endsWith("/api") && /^\/api(\/|$)/.test(path)) path = path.replace(/^\/api/, "");
      const full = `${base}${path}`;
      const token = await getToken();
      const headers = new Headers(options.headers || {});
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      return fetch(full, { ...options, headers, credentials: "include" });
    },
    [getToken]
  );

  const { unreadState, pendingRequestIds, pendingRequestsCount } = useMessaging(user?.id ?? "", authFetch);

  // Skeletons mirror the real components' structure/dimensions so the
  // shimmer occupies the exact space the loaded content will, with no shift.
  const calendarSkeleton = (
    <div className="h-full flex flex-col gap-2 sm:gap-3">
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <Skeleton className="h-7 w-36 rounded" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 flex-shrink-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full rounded" />
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 gap-1 sm:gap-1.5 flex-1 min-h-0">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="h-full w-full rounded-lg" />
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 flex-shrink-0">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-3 w-12 rounded" />
      </div>
    </div>
  );

  const overviewSkeleton = (
    <div className="h-full flex flex-col gap-2.5 sm:gap-3">
      {/* PayoutSetup bar */}
      <div className="rounded-xl border border-app bg-elevated px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="ink-shimmer h-4 w-4 rounded-full shrink-0" />
          <div className="ink-shimmer h-3 w-2/3 rounded" />
        </div>
        <div className="ink-shimmer h-7 w-20 rounded-md shrink-0" />
      </div>

      {/* Next-up hero */}
      <div className="rounded-xl border border-app bg-elevated px-3 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="ink-shimmer h-10 w-10 rounded-full shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="ink-shimmer h-2.5 w-24 rounded" />
          <div className="ink-shimmer h-4 w-1/2 rounded" />
          <div className="ink-shimmer h-3 w-2/3 rounded" />
        </div>
      </div>

      {/* 6 stat tiles */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 flex-shrink-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-app bg-elevated px-1 py-2 sm:py-2.5 flex flex-col items-center justify-center gap-1">
            <div className="ink-shimmer h-3.5 w-3.5 rounded-full" />
            <div className="ink-shimmer h-5 w-6 rounded" />
            <div className="ink-shimmer h-2 w-10 rounded" />
          </div>
        ))}
      </div>

      {/* Earnings & deposits card */}
      <div className="rounded-xl border border-app bg-elevated overflow-hidden flex-shrink-0">
        <div className="px-3 sm:px-4 py-2 border-b border-app flex items-center gap-1.5">
          <div className="ink-shimmer h-3.5 w-3.5 rounded-full" />
          <div className="ink-shimmer h-3 w-28 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-elevated px-2 py-2.5 sm:py-3 flex flex-col items-center gap-1.5">
              <div className="ink-shimmer h-5 w-12 rounded" />
              <div className="ink-shimmer h-2 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming appointments card */}
      <div className="flex-1 min-h-[120px] rounded-xl border border-app bg-elevated overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-app flex-shrink-0">
          <div className="ink-shimmer h-3.5 w-32 rounded" />
          <div className="ink-shimmer h-3 w-12 rounded" />
        </div>
        <div className="flex-1 min-h-0 flex flex-col justify-center p-2 sm:p-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-app bg-card px-2.5 sm:px-3 py-2.5">
              <div className="ink-shimmer h-9 w-9 rounded-full shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="ink-shimmer h-3 w-1/3 rounded" />
                <div className="ink-shimmer h-2.5 w-1/2 rounded" />
              </div>
              <div className="ink-shimmer h-4 w-14 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="h-dvh bg-app text-app flex flex-col overflow-hidden">
        <style>{`
          #middle-content::-webkit-scrollbar { display: none; }
          @media (max-width: 767px) {
            .analytics-content {
              padding-bottom: 0 !important;
            }
            .analytics-kpi-grid {
              margin-top: 1.5rem !important;
            }
          }
        `}</style>
        <Header />
        <main className="artist-dashboard-main flex-1 flex flex-col min-h-0 overflow-hidden py-1.5 sm:py-2" style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
          <div className="grid grid-cols-1 grid-rows-[1.9fr_1fr] lg:grid-rows-1 lg:grid-cols-[1.6fr_1fr] flex-1 min-h-0" style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
            <Card className="rounded-xl sm:rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-0">
              <CardHeader className="border-b border-app flex-shrink-0" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                <CardTitle className="w-full text-center font-extrabold" style={{ fontSize: 'clamp(1rem, 1.3vmin + 0.7vw, 1.5rem)' }}>
                  {isArtist ? "Bookings Calendar" : "Read-only Calendar"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                <div className="h-full" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                  <Suspense fallback={calendarSkeleton}>
                    <LazyReveal className="h-full" group="artist-dashboard" loading={apptLoading} skeleton={calendarSkeleton}>
                      <CalendarView bookings={calendarBookings} />
                    </LazyReveal>
                  </Suspense>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl sm:rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-0">
              <CardHeader className="border-b border-app flex-shrink-0" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                <CardTitle className="w-full text-center font-extrabold" style={{ fontSize: 'clamp(1rem, 1.3vmin + 0.7vw, 1.5rem)' }}>Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
                <div className="h-full analytics-content" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                  <Suspense fallback={overviewSkeleton}>
                    {isArtist ? (
                      <LazyReveal className="h-full" group="artist-dashboard" loading={apptLoading} skeleton={overviewSkeleton}>
                        <ArtistOverview appointments={appointments} loading={apptLoading} />
                      </LazyReveal>
                    ) : (
                      <div className="text-sm opacity-70" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>Overview available to artist accounts only.</div>
                    )}
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        {/* Holds the fixed floating bar AND reserves its footprint at the bottom
            of the screen, so the content above stops at the bar. */}
        <div
          ref={setPortalEl}
          id="dashboard-portal-root"
          className="shrink-0"
          style={{ height: 'calc(44px + clamp(0.625rem, 1vh + 0.5vw, 1.25rem) + env(safe-area-inset-bottom, 0px))' }}
        />
        <FloatingBar
          role={isArtist ? "Artist" : "Client"}
          onAssistantOpen={() => setAssistantOpen(true)}
          portalTarget={portalEl}
          messagesContent={<ChatWindow currentUserId={user?.id ?? ""} isArtist={isArtist} role={isArtist ? "artist" : "client"} />}
          unreadMessagesTotal={unreadState?.unreadMessagesTotal ?? 0}
          unreadConversationIds={Object.keys(unreadState?.unreadByConversation ?? {})}
          pendingRequestIds={pendingRequestIds}
          pendingRequestsCount={pendingRequestsCount}
        />
        <div className={`fixed inset-0 z-50 transition-all duration-300 ${assistantOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div
            className={`absolute inset-0 bg-overlay transition-opacity duration-300 ${assistantOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setAssistantOpen(false)}
            aria-hidden
          />
          <div
            className={`absolute inset-0 bg-card border-t border-app shadow-2xl flex flex-col transition-transform duration-300 ${assistantOpen ? "translate-y-0" : "translate-y-full"}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-app">
              <div className="flex items-center gap-2 font-semibold">
                <Bot size={18} />
                <span>Assistant</span>
              </div>
              <button onClick={() => setAssistantOpen(false)} className="p-2 rounded-full hover:bg-elevated" aria-label="Close assistant">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-4 text-sm opacity-80">Assistant panel</div>
          </div>
        </div>
      </div>
    </div>
  );
} 