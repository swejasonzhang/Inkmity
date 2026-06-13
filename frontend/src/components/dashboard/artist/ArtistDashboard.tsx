import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from "react";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { X, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import LazyReveal from "@/components/ui/LazyReveal";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { API_URL, getAppointments } from "@/api";
import { useMessaging } from "@/hooks/useMessaging";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
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

  const loadAppointments = useCallback(async (silent = false) => {
    try {
      const token = await getToken();
      const data = await getAppointments(undefined, token ?? undefined);
      setAppointments((data as AppointmentWithUsers[]) ?? []);
    } catch {
      setAppointments([]);
    } finally {
      if (!silent) setApptLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useBookingRealtime(() => loadAppointments(true));

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
          appointmentType: a.appointmentType,
          priceCents: a.priceCents,
          depositPaidCents: a.depositPaidCents,
          note: a.note,
          sessionNumber: a.sessionNumber,
          projectName: (a as any).projectName,
          projectSessions: (a as any).projectSessions,
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

  const calendarSkeleton = <CalendarView loading bookings={[]} />;
  const overviewSkeleton = <ArtistOverview loading appointments={[]} />;
  const chunkFallback = <div className="h-full w-full ink-shimmer rounded-xl sm:rounded-2xl" />;

  return (
    <div>
      <div className="h-dvh bg-app text-app flex flex-col overflow-hidden">
        <style>{`
          #middle-content::-webkit-scrollbar { display: none; }
          .artist-dashboard-pager { -ms-overflow-style: none; scrollbar-width: none; }
          .artist-dashboard-pager::-webkit-scrollbar { display: none; }
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
          <div className="artist-dashboard-pager flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-y-contain snap-y snap-mandatory md:grid md:overflow-hidden md:grid-cols-1 md:grid-rows-[1.9fr_1fr] lg:grid-rows-1 lg:grid-cols-[1.6fr_1fr]" style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
            <div className="snap-start snap-always h-full flex-shrink-0 py-1.5 md:contents">
            <Card className="rounded-xl sm:rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-0 h-full">
              <CardHeader className="border-b border-app flex-shrink-0" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                <CardTitle className="w-full text-center font-extrabold" style={{ fontSize: 'clamp(1rem, 1.3vmin + 0.7vw, 1.5rem)' }}>
                  {isArtist ? "Bookings Calendar" : "Read-only Calendar"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                <div className="h-full" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                  <Suspense fallback={chunkFallback}>
                    <LazyReveal className="h-full" group="artist-dashboard" loading={apptLoading} skeleton={calendarSkeleton}>
                      <CalendarView bookings={calendarBookings} />
                    </LazyReveal>
                  </Suspense>
                </div>
              </CardContent>
            </Card>
            </div>
            <div className="snap-start snap-always h-full flex-shrink-0 py-1.5 md:contents">
            <Card className="rounded-xl sm:rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-0 h-full">
              <CardHeader className="border-b border-app flex-shrink-0" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                <CardTitle className="w-full text-center font-extrabold" style={{ fontSize: 'clamp(1rem, 1.3vmin + 0.7vw, 1.5rem)' }}>Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-hidden md:overflow-y-auto md:overscroll-contain">
                <div className="h-full analytics-content" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                  <Suspense fallback={chunkFallback}>
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
          </div>
        </main>
        {
}
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