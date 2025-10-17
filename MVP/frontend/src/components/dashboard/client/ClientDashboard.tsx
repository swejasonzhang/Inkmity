import { useEffect, useRef, useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header/Header";
import ChatBot from "@/components/dashboard/shared/ChatBot";
import ChatWindow, { Message } from "@/components/dashboard/shared/ChatWindow";
import ArtistsSection from "@/components/dashboard/client/ArtistsSection";
import ArtistModal from "@/components/dashboard/client/ArtistModal";
import { toast } from "react-toastify";
import { MessageSquare, Bot, X } from "lucide-react";
import { useDashboardData, ArtistDto } from "@/hooks/useDashboardData";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { useTheme } from "@/components/header/useTheme";
import CircularProgress from "@mui/material/CircularProgress";

const PAGE_SIZE = 12;

const ClientDashboard: React.FC = () => {
    const { isSignedIn, isLoaded, user } = useUser();
    const navigate = useNavigate();
    const warnedRef = useRef(false);
    const { theme, toggleTheme, logoSrc, themeClass } = useTheme();
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn && !warnedRef.current) {
            warnedRef.current = true;
            toast.error("You aren't logged in. Please log in.", { position: "top-center", theme: "dark" });
            navigate("/login", { replace: true });
        }
    }, [isLoaded, isSignedIn, navigate]);

    const {
        artists,
        conversationList,
        collapsedConversations,
        selectedConversationId,
        loadingArtists,
        loadingConversations,
        showArtists,
        totalCount,
        initialized,
        setConversationList,
        setCollapsedConversations,
        authFetch,
        queryArtists,
    } = useDashboardData();

    const [selectedArtist, setSelectedArtist] = useState<ArtistDto | null>(null);
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState<number>(0);

    useEffect(() => {
        setTotal(totalCount);
    }, [totalCount]);

    const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

    const handlePageChange = async (next: number) => {
        if (next < 1 || next > totalPages) return;
        setPage(next);
        try {
            await queryArtists({ sort: "rating_desc" }, next, PAGE_SIZE);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err: any) {
            toast.error(err?.message || "Failed to load page.", { position: "bottom-right" });
        }
    };

    const modalArtist = useMemo(() => {
        if (!selectedArtist) return null;
        const imgs = (selectedArtist.images || []).filter(Boolean);
        const fallback = [
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23E5E7EB'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236B7280' font-size='20' font-family='sans-serif'>Mock Image 1</text></svg>`,
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23F3F4F6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-size='20' font-family='sans-serif'>Mock Image 2</text></svg>`,
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23D1D5DB'/><text x='50%' y='50%' dominant-baseline='middle' fill='%23565C68' font-size='20' font-family='sans-serif'>Mock Image 3</text></svg>`,
        ];
        const pool = imgs.length ? imgs : fallback;
        const pastWorks = pool.filter((_, i) => i % 2 === 0);
        const sketches = pool.filter((_, i) => i % 2 === 1);
        return {
            _id: selectedArtist._id,
            clerkId: (selectedArtist as any).clerkId,
            username: selectedArtist.username,
            bio: selectedArtist.bio,
            pastWorks,
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

    if (!user)
        return (
            <div className="fixed inset-0 grid place-items-center bg-app text-app">
                <CircularProgress sx={{ color: "var(--fg)" }} />
            </div>
        );

    return (
        <div className={themeClass}>
            <div className="min-h-dvh bg-app text-app flex flex-col overflow-y-hidden">
                <style>{`#middle-content::-webkit-scrollbar { display: none; }`}</style>
                <Header theme={theme} toggleTheme={toggleTheme} logoSrc={logoSrc} />
                <main className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 pt-2 sm:pt-3 px-4 sm:px-6 lg:px-8 pb-[max(env(safe-area-inset-bottom),1rem)]">
                    <div className="flex-1 min-w-0">
                        <ArtistsSection
                            artists={artists}
                            loading={loadingArtists}
                            showArtists={showArtists}
                            onSelectArtist={(artist: ArtistDto) => setSelectedArtist(artist)}
                            page={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>

                    <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} disabled={loadingArtists} />
                </main>

                <div ref={setPortalEl} id="dashboard-portal-root" className="contents" />

                <FloatingBar onAssistantOpen={() => setAssistantOpen(true)} onMessagesOpen={() => setMessagesOpen(true)} portalTarget={portalEl} />

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
                            </div>
                            <button onClick={() => setAssistantOpen(false)} className="p-2 rounded-full hover:bg-elevated" aria-label="Close assistant">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <ChatBot />
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
                            </div>
                            <button onClick={() => setMessagesOpen(false)} className="p-2 rounded-full hover:bg-elevated" aria-label="Close messages">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <ChatWindow
                                conversations={conversationList}
                                collapsedMap={collapsedConversations}
                                currentUserId={user.id}
                                loading={loadingConversations}
                                emptyText={"No conversations yet.\nTap an artist to start one!"}
                                onToggleCollapse={(participantId: string) => {
                                    setCollapsedConversations((prev) => ({
                                        ...prev,
                                        [participantId]: !prev[participantId],
                                    }));
                                }}
                                onRemoveConversation={(participantId: string) => {
                                    setConversationList((prev) => prev.filter((c) => c.participantId !== participantId));
                                    setCollapsedConversations((prev) => {
                                        const next: Record<string, boolean> = { ...prev };
                                        delete next[participantId];
                                        return next;
                                    });
                                    toast.info("Conversation hidden from dashboard", { position: "bottom-right" });
                                }}
                                expandedId={selectedConversationId}
                                authFetch={authFetch}
                            />
                        </div>
                    </div>
                </div>

                {modalArtist && (
                    <ArtistModal
                        open={Boolean(selectedArtist)}
                        artist={modalArtist}
                        onClose={() => setSelectedArtist(null)}
                        onMessage={(artist, preloadedMessage) => {
                            const participantId = artist.clerkId ?? artist._id;
                            const newMsg: Message = {
                                senderId: user!.id,
                                receiverId: participantId,
                                text: preloadedMessage,
                                timestamp: Date.now(),
                            };
                            setConversationList((prev) => {
                                const idx = prev.findIndex((c) => c.participantId === participantId);
                                if (idx >= 0) {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], messages: [...copy[idx].messages, newMsg] };
                                    return copy.sort((a, b) => {
                                        const aLast = a.messages.length ? a.messages[a.messages.length - 1].timestamp : 0;
                                        const bLast = b.messages.length ? b.messages[b.messages.length - 1].timestamp : 0;
                                        return bLast - aLast;
                                    });
                                }
                                return [{ participantId, username: artist.username, messages: [newMsg] }, ...prev];
                            });
                            setCollapsedConversations((prev) => ({ ...prev, [participantId]: false }));
                            authFetch("/messages", {
                                method: "POST",
                                body: JSON.stringify({
                                    senderId: user!.id,
                                    receiverId: participantId,
                                    text: preloadedMessage,
                                }),
                            }).catch((err: any) => {
                                toast.error(err?.message || "Failed to send message to server.", { position: "bottom-right" });
                            });
                            setMessagesOpen(true);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default ClientDashboard;

function Pagination({
    page,
    totalPages,
    onChange,
    disabled,
}: {
    page: number;
    totalPages: number;
    onChange: (p: number) => void;
    disabled?: boolean;
}) {
    const canPrev = page > 1 && !disabled;
    const canNext = page < totalPages && !disabled;

    const makeRange = () => {
        const span = 2;
        const start = Math.max(1, page - span);
        const end = Math.min(totalPages, page + span);
        const arr: number[] = [];
        for (let i = start; i <= end; i++) arr.push(i);
        if (!arr.includes(1)) arr.unshift(1);
        if (!arr.includes(totalPages)) arr.push(totalPages);
        return Array.from(new Set(arr)).sort((a, b) => a - b);
    };

    const pages = makeRange();

    return (
        <nav className="flex items-center justify-between pt-2">
            <div className="sm:hidden flex w-full items-center justify-between">
                <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={!canPrev} onClick={() => onChange(page - 1)}>
                    Prev
                </button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={!canNext} onClick={() => onChange(page + 1)}>
                    Next
                </button>
            </div>

            <div className="hidden sm:flex w-full items-center justify-between">
                <div className="text-sm opacity-80">Page {page} of {totalPages}</div>
                <div className="flex items-center gap-1">
                    <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={!canPrev} onClick={() => onChange(page - 1)} aria-label="Previous page">
                        Prev
                    </button>
                    {pages.map((p, idx) => {
                        const isActive = p === page;
                        const prev = pages[idx - 1];
                        const showEllipsis = idx > 0 && p - (prev ?? p) > 1;
                        return (
                            <span key={p} className="inline-flex">
                                {showEllipsis && <span className="px-2 select-none">…</span>}
                                <button
                                    className={["px-3 py-1 rounded border", isActive ? "bg-elevated" : "hover:bg-elevated/60", disabled ? "opacity-50" : ""].join(" ")}
                                    disabled={disabled}
                                    onClick={() => onChange(p)}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    {p}
                                </button>
                            </span>
                        );
                    })}
                    <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={!canNext} onClick={() => onChange(page + 1)} aria-label="Next page">
                        Next
                    </button>
                </div>
            </div>
        </nav>
    );
}