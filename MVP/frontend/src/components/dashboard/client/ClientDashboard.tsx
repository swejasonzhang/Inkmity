import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header/Header";
import ChatBot from "@/components/dashboard/shared/ChatBot";
import ArtistsSection from "@/components/dashboard/client/ArtistsSection";
import ArtistModal from "@/components/dashboard/client/ArtistModal";
import { toast } from "react-toastify";
import { X, Bot } from "lucide-react";
import { useDashboardData } from "@/hooks";
import { useMessaging } from "@/hooks/useMessaging";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { useTheme } from "@/components/header/useTheme";
import CircularProgress from "@mui/material/CircularProgress";
import { displayNameFromUsername } from "@/lib/format";
import { API_URL } from "@/lib/http";
import type { Artist as ArtistDto } from "@/api";
import { AnimatePresence, motion } from "framer-motion";
import MessagesPanel from "@/components/dashboard/shared/messages/MessagesPanel";

const PAGE_SIZE = 12;

export default function ClientDashboard() {
    const { isSignedIn, isLoaded, user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const warnedRef = useRef(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const scopeRef = useRef<HTMLDivElement | null>(null);
    const { themeClass } = useTheme(rootRef.current);
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

    useMessaging(user?.id ?? "", authFetch);

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
        const imgs = (selectedArtist as any).images?.filter(Boolean) || [];
        const fallback = [
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23E5E7EB'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236B7280' font-size='20' font-family='sans-serif'>Mock Image 1</text></svg>`,
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23F3F4F6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-size='20' font-family='sans-serif'>Mock Image 2</text></svg>`,
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23D1D5DB'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23565C68' font-size='20' font-family='sans-serif'>Mock Image 3</text></svg>`,
        ];
        const pool = imgs.length ? imgs : fallback;

        const pastWorks = (selectedArtist as any).pastWorks?.length
            ? (selectedArtist as any).pastWorks
            : pool.filter((_: unknown, i: number) => i % 2 === 0);

        const healedWorks = (selectedArtist as any).healedWorks?.length
            ? (selectedArtist as any).healedWorks
            : pool.filter((_: unknown, i: number) => i % 3 === 2);

        const sketches = (selectedArtist as any).sketches?.length
            ? (selectedArtist as any).sketches
            : pool.filter((_: unknown, i: number) => i % 2 === 1);

        return {
            _id: selectedArtist._id,
            clerkId: (selectedArtist as any).clerkId,
            username: displayNameFromUsername(selectedArtist.username),
            bio: (selectedArtist as any).bio,
            pastWorks,
            healedWorks,
            sketches,
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
        <div ref={rootRef} className={themeClass}>
            <div className="min-h-dvh bg-app text-app flex flex-col overflow-y-hidden">
                <style>{`#middle-content::-webkit-scrollbar{display:none}`}</style>
                <Header />
                <div ref={scopeRef} className="flex-1 min-h-0 flex flex-col">
                    <main className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 pt-2 sm:pt-3 px-4 sm:px-6 lg:px-8 pb-[max(env(safe-area-inset-bottom),1rem)]">
                        <div className="flex-1 min-w-0">
                            <ArtistsSection
                                artists={artists.map((a) => ({ ...a, username: displayNameFromUsername(a.username) }))}
                                loading={loading}
                                showArtists
                                onSelectArtist={(artist: ArtistDto) => setSelectedArtist(artist)}
                                page={page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                        <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} disabled={loading} />
                    </main>

                    <div ref={setPortalEl} id="dashboard-portal-root" className="contents" />

                    <FloatingBar
                        onAssistantOpen={() => setAssistantOpen(true)}
                        portalTarget={portalEl}
                        messagesContent={
                            <MessagesPanel
                                currentUserId={user.id}
                                expandAllOnMount
                                isArtist={false}
                            />
                        }
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
                                <div className="w-[88vw] max-w-[420px] bg-card border border-app shadow-2xl rounded-2xl flex flex-col overflow-hidden" style={{ height: Math.max(320, Math.min(scopeH, 560)) }}>
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
                        )}
                    </AnimatePresence>

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
                </div>
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