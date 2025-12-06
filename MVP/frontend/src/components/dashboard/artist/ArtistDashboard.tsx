import { lazy, Suspense, useState, useCallback } from "react";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { X, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { API_URL } from "@/lib/http";
import { useMessaging } from "@/hooks/useMessaging";

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
    <div>
      <div className="min-h-screen bg-app text-app flex flex-col overflow-y-auto md:overflow-hidden md:h-dvh">
        <style>{`#middle-content::-webkit-scrollbar { display: none; }`}</style>
        <Header />
        <main className="flex-1 flex flex-col gap-2 sm:gap-3 md:gap-4 pt-2 sm:pt-3 px-2 sm:px-4 md:px-6 lg:px-8 pb-20 sm:pb-24 md:pb-24 md:min-h-0 md:overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4 md:flex-1 md:min-h-0">
            <Card className="rounded-xl sm:rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-[400px] md:min-h-0 md:flex-1">
              <CardHeader className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-5 border-b border-app flex-shrink-0">
                <CardTitle className="w-full text-center font-extrabold text-lg sm:text-xl md:text-2xl lg:text-3xl">
                  {isArtist ? "Bookings Calendar" : "Read-only Calendar"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
                <Suspense
                  fallback={
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-8 w-full" />
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
                    </div>
                  }
                >
                  <CalendarView />
                </Suspense>
              </CardContent>
            </Card>
            <Card className="rounded-xl sm:rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-[300px] md:min-h-0 md:flex-1">
              <CardHeader className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-5 border-b border-app flex-shrink-0">
                <CardTitle className="w-full text-center font-extrabold text-lg sm:text-xl md:text-2xl lg:text-3xl">Analytics</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
                <div className="h-full p-2 sm:p-3 md:p-4">
                  <Suspense
                    fallback={
                      <div className="space-y-3">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-40 w-full" />
                        <div className="grid grid-cols-2 gap-3">
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                        </div>
                      </div>
                    }
                  >
                    {isArtist ? <AnalyticsPanel /> : <div className="text-sm opacity-70">Analytics available to artist accounts only.</div>}
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