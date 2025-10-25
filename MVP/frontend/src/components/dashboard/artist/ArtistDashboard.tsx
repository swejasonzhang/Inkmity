import { lazy, Suspense, useRef, useState } from "react";
import Header from "@/components/header/Header";
import { useTheme } from "@/components/header/useTheme";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { X, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MessagesPanel from "@/components/dashboard/shared/messages/MessagesPanel";
import { useUser } from "@clerk/clerk-react";

const CalendarView = lazy(() => import("@/components/dashboard/artist/CalendarView"));
const AnalyticsPanel = lazy(() => import("@/components/dashboard/artist/AnalyticsPanel"));

export default function ArtistDashboard() {
    const { user } = useUser();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const { theme, toggleTheme, themeClass } = useTheme(rootRef.current);
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
    const [assistantOpen, setAssistantOpen] = useState(false);

    return (
        <div ref={rootRef} className={themeClass}>
            <div className="min-h-dvh bg-app text-app flex flex-col overflow-y-hidden">
                <style>{`#middle-content::-webkit-scrollbar { display: none; }`}</style>
                <Header theme={theme} toggleTheme={toggleTheme} />

                <main className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 pt-2 sm:pt-3 px-4 sm:px-6 lg:px-8 pb-[max(env(safe-area-inset-bottom),1rem)]">
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-[60vh]">
                            <CardHeader className="px-4 py-5 border-b border-app">
                                <CardTitle className="w-full text-center font-extrabold text-2xl sm:text-3xl">Bookings Calendar</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto">
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

                        <Card className="rounded-2xl bg-card border border-app overflow-hidden min-h-[60vh]">
                            <CardHeader className="px-4 py-5 border-b border-app">
                                <CardTitle className="w-full text-center font-extrabold text-2xl sm:text-3xl">Analytics</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
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
                                    <AnalyticsPanel />
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                </main>

                <div ref={setPortalEl} id="dashboard-portal-root" className="contents" />

                <FloatingBar
                    onAssistantOpen={() => setAssistantOpen(true)}
                    portalTarget={portalEl}
                    messagesContent={<MessagesPanel currentUserId={user?.id ?? ""} />}
                />

                <div className={`fixed inset-0 z-50 transition-all duration-300 ${assistantOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <div
                        className={`absolute inset-0 bg-overlay transition-opacity duration-300 ${assistantOpen ? "opacity-100" : "opacity-0"}`}
                        onClick={() => setAssistantOpen(false)}
                        aria-hidden
                    />
                    <div
                        className={`absolute inset-0 bg-card border-t border-app shadow-2xl flex flex-col transition-transform duration-300 ${assistantOpen ? "translate-y-0" : "translate-y-full"
                            }`}
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
                        <div className="flex-1 overflow-y-auto p-4 text-sm opacity-80">Assistant panel</div>
                    </div>
                </div>
            </div>
        </div>
    );
}