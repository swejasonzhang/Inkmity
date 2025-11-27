import { lazy, Suspense, useState, useCallback } from "react";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { X, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";
import ChatBot from "@/components/dashboard/shared/ChatBot";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { API_URL } from "@/lib/http";
import { useMessaging } from "@/hooks/useMessaging";
import { AnimatePresence, motion } from "framer-motion";
import AppointmentHistory from "@/components/dashboard/artist/AppointmentHistory";

const CalendarView = lazy(() => import("@/components/dashboard/artist/CalendarView"));
const AnalyticsPanel = lazy(() => import("@/components/dashboard/artist/AnalyticsPanel"));

export default function ArtistDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { role } = useRole();
  const isArtist = role === "artist";
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

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
    <>
      <style>{`
        @media (max-width: 767px) {
          html, body {
            overflow: auto !important;
            height: auto !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
          }
        }
        @media (min-width: 768px) {
          html, body {
            overflow: hidden !important;
            height: 100vh !important;
            height: 100dvh !important;
          }
        }
        #middle-content::-webkit-scrollbar { display: none; }
        @media (max-width: 767px) {
          .booking-card::-webkit-scrollbar {
            width: 6px;
          }
          .booking-card::-webkit-scrollbar-track {
            background: transparent;
          }
          .booking-card::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
          }
          .booking-card::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        }
      `}</style>
      <div className="min-h-dvh bg-app text-app flex flex-col overflow-auto md:overflow-hidden md:h-dvh">
        <Header />
        <main className="flex-1 min-h-0 overflow-auto md:overflow-hidden flex flex-col gap-2 md:gap-4 pt-2 md:pt-3 px-3 md:px-6 pb-16 md:pb-20">
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 pb-2 md:pb-0">
            <Card className="rounded-xl md:rounded-2xl bg-card border border-app overflow-auto md:overflow-hidden flex flex-col w-full min-h-[400px] md:min-h-[400px] md:h-full">
              <CardHeader className="px-3 py-3 md:px-4 md:py-5 border-b border-app flex-shrink-0">
                <CardTitle className="w-full text-center font-extrabold text-base md:text-2xl lg:text-3xl">
                  {isArtist ? "Bookings Calendar" : "Read-only Calendar"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <div className="h-full min-h-[300px] overflow-y-auto booking-card">
                  <Suspense
                    fallback={
                      <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                        <Skeleton className="h-5 md:h-6 w-32 md:w-40" />
                        <Skeleton className="h-6 md:h-8 w-full" />
                        <div className="grid grid-cols-7 gap-1 md:gap-2">
                          {Array.from({ length: 14 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 md:h-24 w-full" />
                          ))}
                        </div>
                      </div>
                    }
                  >
                    <CalendarView artistId={user?.id} />
                  </Suspense>
                </div>
              </CardContent>
            </Card>
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-4 overflow-auto md:overflow-hidden">
              <Card className="rounded-xl md:rounded-2xl bg-card border border-app overflow-auto md:overflow-hidden flex flex-col w-full min-h-[300px] md:min-h-[300px] md:h-full">
                <CardHeader className="px-3 py-3 md:px-4 md:py-5 border-b border-app flex-shrink-0">
                  <CardTitle className="w-full text-center font-extrabold text-base md:text-2xl lg:text-3xl">Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 overflow-auto md:overflow-hidden">
                  <div className="h-full min-h-[250px] overflow-y-auto booking-card">
                    <AppointmentHistory />
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-xl md:rounded-2xl bg-card border border-app overflow-auto md:overflow-hidden flex flex-col w-full min-h-[300px] md:min-h-[300px] md:h-full">
                <CardHeader className="px-3 py-3 md:px-4 md:py-5 border-b border-app flex-shrink-0">
                  <CardTitle className="w-full text-center font-extrabold text-base md:text-2xl lg:text-3xl">Analytics</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 overflow-auto md:overflow-hidden">
                  <div className="h-full min-h-[250px] overflow-y-auto booking-card p-3 md:p-4">
                    <Suspense
                      fallback={
                        <div className="h-full min-h-[250px] flex items-center justify-center">
                          <div className="space-y-2 md:space-y-3 w-full max-w-md">
                            <Skeleton className="h-5 md:h-6 w-24 md:w-32 mx-auto" />
                            <Skeleton className="h-32 md:h-40 w-full" />
                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                              <Skeleton className="h-20 md:h-24 w-full" />
                              <Skeleton className="h-20 md:h-24 w-full" />
                            </div>
                          </div>
                        </div>
                      }
                    >
                      {isArtist ? <AnalyticsPanel /> : <div className="h-full min-h-[250px] flex items-center justify-center text-xs md:text-sm opacity-70">Analytics available to artist accounts only.</div>}
                    </Suspense>
                  </div>
                </CardContent>
              </Card>
            </div>
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

        <AnimatePresence>
          {assistantOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAssistantOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className="fixed inset-x-0 bottom-0 md:inset-auto md:bottom-0 md:left-0 z-50"
                style={{
                  left: "1.5rem",
                }}
              >
                <div className="w-full h-[90dvh] md:w-[1200px] md:h-[860px] bg-card border-t border-app md:border md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                    <div className="flex items-center gap-2 font-semibold">
                      <Bot size={18} />
                      <span>Assistant</span>
                    </div>
                    <button onClick={() => setAssistantOpen(false)} className="p-2 rounded-full hover:bg-elevated" aria-label="Close assistant">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <ChatBot />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
} 