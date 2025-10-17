import { useState } from "react";
import Header from "@/components/header/Header";
import { useTheme } from "@/components/header/useTheme";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { X, Bot, MessageSquare } from "lucide-react";
import CalendarView from "@/components/dashboard/artist/CalendarView";
import AnalyticsPanel from "@/components/dashboard/artist/AnalyticsPanel";

export default function ArtistDashboard() {
    const { theme, toggleTheme, logoSrc, themeClass } = useTheme();
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [messagesOpen, setMessagesOpen] = useState(false);

    return (
        <div className={themeClass}>
            <div className="min-h-dvh bg-app text-app flex flex-col overflow-y-hidden">
                <style>{`#middle-content::-webkit-scrollbar { display: none; }`}</style>
                <Header theme={theme} toggleTheme={toggleTheme} logoSrc={logoSrc} />

                <main className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 pt-2 sm:pt-3 px-4 sm:px-6 lg:px-8 pb-[max(env(safe-area-inset-bottom),1rem)]">
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <section className="lg:col-span-2 rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-[60vh]">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                                <div className="font-semibold">Bookings Calendar</div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <CalendarView />
                            </div>
                        </section>

                        <aside className="lg:col-span-1 rounded-2xl bg-card border border-app overflow-hidden min-h-[60vh]">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                                <div className="font-semibold">Analytics</div>
                            </div>
                            <div className="p-4">
                                <AnalyticsPanel />
                            </div>
                        </aside>
                    </div>
                </main>

                <div ref={setPortalEl} id="dashboard-portal-root" className="contents" />

                <FloatingBar
                    onAssistantOpen={() => setAssistantOpen(true)}
                    onMessagesOpen={() => setMessagesOpen(true)}
                    portalTarget={portalEl}
                />

                <div className={`fixed inset-0 z-50 transition-all duration-300 ${assistantOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <div
                        className={`absolute inset-0 bg-overlay transition-opacity duration-300 ${assistantOpen ? "opacity-100" : "opacity-0"}`}
                        onClick={() => setAssistantOpen(false)}
                        aria-hidden
                    />
                    <div className={`absolute inset-0 bg-card border-t border-app shadow-2xl flex flex-col transition-transform duration-300 ${assistantOpen ? "translate-y-0" : "translate-y-full"}`}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                            <div className="flex items-center gap-2 font-semibold">
                                <Bot size={18} />
                                <span>Assistant</span>
                            </div>
                            <button onClick={() => setAssistantOpen(false)} className="p-2 rounded-full hover:bg-elevated" aria-label="Close assistant">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 text-sm opacity-80">
                            Assistant panel
                        </div>
                    </div>
                </div>

                <div className={`fixed inset-0 z-50 transition-all duration-300 ${messagesOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <div
                        className={`absolute inset-0 bg-overlay transition-opacity duration-300 ${messagesOpen ? "opacity-100" : "opacity-0"}`}
                        onClick={() => setMessagesOpen(false)}
                        aria-hidden
                    />
                    <div className={`absolute inset-0 bg-card border-t border-app shadow-2xl flex flex-col transition-transform duration-300 ${messagesOpen ? "translate-y-0" : "translate-y-full"}`}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                            <div className="flex items-center gap-2 font-semibold">
                                <MessageSquare size={18} />
                                <span>Messages</span>
                            </div>
                            <button onClick={() => setMessagesOpen(false)} className="p-2 rounded-full hover:bg-elevated" aria-label="Close messages">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 text-sm opacity-80">
                            Messages panel
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}