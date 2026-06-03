import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from "react";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { X, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <div>
      <div className="h-dvh bg-app text-app flex flex-col overflow-hidden">
        <style>{`
          #middle-content::-webkit-scrollbar { display: none; }
          @media (max-width: 767px) {
            .artist-dashboard-main {
              padding-bottom: clamp(5rem, 6vmin + 3vw, 6rem) !important;
            }
            .analytics-content {
              padding-bottom: 0 !important;
            }
            .analytics-kpi-grid {
              margin-top: 1.5rem !important;
            }
          }
        `}</style>
        <Header />
        <main className="artist-dashboard-main flex-1 flex flex-col min-h-0 overflow-hidden" style={{ padding: '0 16px', paddingBottom: 'clamp(3.5rem, 4.5vmin + 2.5vw, 6rem)', gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
          <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1 flex-1 min-h-0" style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
            <Card className="rounded-xl sm:rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-0">
              <CardHeader className="border-b border-app flex-shrink-0" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                <CardTitle className="w-full text-center font-extrabold" style={{ fontSize: 'clamp(1rem, 1.3vmin + 0.7vw, 1.5rem)' }}>
                  {isArtist ? "Bookings Calendar" : "Read-only Calendar"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                <div className="h-full" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                  <Suspense
                    fallback={
                      <div style={{ padding: 'clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }} className="space-y-3">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-8 w-full" />
                        <div className="grid grid-cols-7" style={{ gap: 'clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem)' }}>
                          {Array.from({ length: 14 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-xl" />
                          ))}
                        </div>
                      </div>
                    }
                  >
                    <CalendarView bookings={calendarBookings} />
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
                  <Suspense
                    fallback={
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 xl:grid-cols-4" style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                          <Skeleton className="h-20 w-full rounded-xl" />
                          <Skeleton className="h-20 w-full rounded-xl" />
                          <Skeleton className="h-20 w-full rounded-xl" />
                          <Skeleton className="h-20 w-full rounded-xl" />
                        </div>
                        <Skeleton className="h-40 w-full rounded-xl" />
                      </div>
                    }
                  >
                    {isArtist ? <ArtistOverview appointments={appointments} loading={apptLoading} /> : <div className="text-sm opacity-70" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>Overview available to artist accounts only.</div>}
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <div ref={setPortalEl} id="dashboard-portal-root" className="contents" />
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