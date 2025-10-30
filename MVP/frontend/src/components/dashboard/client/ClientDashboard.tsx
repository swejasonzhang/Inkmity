import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { X, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MessagesPanel from "@/components/dashboard/shared/messages/requestPanel";
import ChatBot from "@/components/dashboard/shared/ChatBot";
import { toast } from "react-toastify";
import CircularProgress from "@mui/material/CircularProgress";
import { displayNameFromUsername } from "@/lib/format";
import { API_URL } from "@/lib/http";
import { useDashboardData } from "@/hooks";
import { useMessaging } from "@/hooks/useMessaging";
import type { Artist as ArtistDto } from "@/api";
import { AnimatePresence, motion } from "framer-motion";

const ArtistsSection = lazy(() => import("@/components/dashboard/client/ArtistsSection"));
const ArtistModal = lazy(() => import("@/components/dashboard/client/ArtistModal"));

const PAGE_SIZE = 12;

export default function ClientDashboard() {
    const { isSignedIn, isLoaded, user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const warnedRef = useRef(false);
    const scopeRef = useRef<HTMLDivElement | null>(null);
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
    const [scopeH, setScopeH] = useState(0);

    useEffect(() => {
        if (!scopeRef.current) return;
        const el = scopeRef.current;
        const ro = new ResizeObserver(() => setScopeH(el.clientHeight));
        setScopeH(el.clientHeight);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const authFetch = useCallback(
        async (url: string, options: RequestInit = {}) => {
            const full = url.startsWith("http") ? url : `${API_URL}${url}`;
            const token = await getToken();
            const headers = new Headers(options.headers || {});
            if (token) headers.set("Authorization", `Bearer ${token}`);
            if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
            return fetch(full, { ...options, headers, credentials: "include" });
        },
        [getToken]
    );

    const { unreadState, pendingRequestIds, pendingRequestsCount } = useMessaging(user?.id ?? "", authFetch);

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn && !warnedRef.current) {
            warnedRef.current = true;
            toast.error("You aren't logged in. Please log in.", { position: "top-center", theme: "dark" });
            navigate("/login", { replace: true });
        }
    }, [isLoaded, isSignedIn, navigate]);

    const { artists, loading, initialized } = useDashboardData();

    const [selectedArtist, setSelectedArtist] = useState<ArtistDto | null>(null);
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState<number>(0);

    useEffect(() => {
        setTotal(artists.length);
    }, [artists.length]);

    const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
    const handlePageChange = (next: number) => {
        if (next < 1 || next > totalPages) return;
        setPage(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const modalArtist = useMemo(() => {
        if (!selectedArtist) return null;
        const imgs: string[] = ((selectedArtist as any).portfolioImages as string[] | undefined)?.filter(Boolean) ?? [];
        const pastWorks: string[] = (selectedArtist as any).pastWorks?.filter(Boolean) ?? imgs;
        const healedWorks: string[] = (selectedArtist as any).healedWorks?.filter(Boolean) ?? [];
        const sketches: string[] = (selectedArtist as any).sketches?.filter(Boolean) ?? [];
        return {
            _id: selectedArtist._id,
            clerkId: (selectedArtist as any).clerkId,
            username: displayNameFromUsername(selectedArtist.username),
            bio: (selectedArtist as any).bio,
            pastWorks,
            healedWorks,
            sketches
        };
    }, [selectedArtist]);

    if (!isLoaded || !initialized) {
        return (
            <div className="fixed inset-0 grid place-items-center bg-app text-app">
                <CircularProgress sx={{ color: "var(--fg)" }} />
            </div>
        );
    }
    if (!user) {
        return (
            <div className="fixed inset-0 grid place-items-center bg-app text-app">
                <CircularProgress sx={{ color: "var(--fg)" }} />
            </div>
        );
    }

    const panelVariants = { hidden: { opacity: 0, scale: 0.98, y: 8 }, visible: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.98, y: 8 } };

    return (
        <div className="min-h-dvh bg-app text-app flex flex-col overflow-y-hidden">
            <Header />
            <div ref={scopeRef} className="flex-1 min-h-0 flex flex-col">
                <main className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 pt-2 sm:pt-3 px-4 sm:px-6 lg:px-8 pb-[max(env(safe-area-inset-bottom),1rem)]">
                    <Card className="flex-1 min-h-0 rounded-2xl bg-card border border-app overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex-1 min-w-0 p-4">
                                <Suspense
                                    fallback={
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {Array.from({ length: 8 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-48 w-full rounded-xl" />
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <Skeleton className="h-8 w-20 rounded" />
                                                <Skeleton className="h-8 w-20 rounded" />
                                            </div>
                                        </div>
                                    }
                                >
                                    <ArtistsSection
                                        artists={artists.map((a) => ({ ...a, username: displayNameFromUsername(a.username) }))}
                                        loading={loading}
                                        showArtists
                                        onSelectArtist={(artist: ArtistDto) => setSelectedArtist(artist)}
                                        page={page}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                </Suspense>
                            </div>
                        </CardContent>
                    </Card>
                    <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} disabled={loading} />
                </main>

                <div ref={setPortalEl} id="dashboard-portal-root" className="contents" />

                <FloatingBar
                    role="Client"
                    onAssistantOpen={() => setAssistantOpen(true)}
                    portalTarget={portalEl}
                    messagesContent={<MessagesPanel currentUserId={user.id} expandAllOnMount isArtist={false} />}
                    unreadMessagesTotal={unreadState?.unreadMessagesTotal ?? 0}
                    unreadConversationIds={Object.keys(unreadState?.unreadByConversation ?? {})}
                    pendingRequestIds={pendingRequestIds}
                    pendingRequestsCount={pendingRequestsCount}
                />

                <AnimatePresence>
                    {assistantOpen && (
                        <motion.div
                            key="assistant"
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={panelVariants}
                            transition={{ type: "spring", stiffness: 260, damping: 22 }}
                            className="fixed bottom-4 right-4 z-50"
                            style={{ transformOrigin: "bottom right" }}
                        >
                            <div
                                className="w-[88vw] max-w-[400px] bg-card border border-app shadow-2xl rounded-2xl flex flex-col overflow-hidden"
                                style={{ height: Math.max(280, Math.min(scopeH, 420)) }}
                            >
                                <div className="flex items-center justify-between px-3 py-2 border-b border-app">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Bot size={16} />
                                        <span className="text-sm">Assistant</span>
                                    </div>
                                    <button onClick={() => setAssistantOpen(false)} className="p-1.5 rounded-full hover:bg-elevated" aria-label="Close assistant">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <ChatBot />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Suspense fallback={null}>
                    {modalArtist && (
                        <ArtistModal
                            open={Boolean(selectedArtist)}
                            artist={modalArtist}
                            onClose={() => setSelectedArtist(null)}
                            onMessage={async (a) => {
                                window.dispatchEvent(new CustomEvent("ink:open-messages", { detail: { participantId: a.clerkId } }));
                            }}
                        />
                    )}
                </Suspense>
            </div>
        </div>
    );
}

function Pagination({ page, totalPages, onChange, disabled }: { page: number; totalPages: number; onChange: (p: number) => void; disabled?: boolean }) {
    const canPrev = page > 1 && !disabled;
    const canNext = page < totalPages && !disabled;
    return (
        <nav className="pt-2">
            <div className="sm:hidden flex w-full items-center justify-between">
                <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={!canPrev} onClick={() => onChange(page - 1)} aria-label="Previous page">
                    Prev
                </button>
                <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={!canNext} onClick={() => onChange(page + 1)} aria-label="Next page">
                    Next
                </button>
            </div>
        </nav>
    );
}