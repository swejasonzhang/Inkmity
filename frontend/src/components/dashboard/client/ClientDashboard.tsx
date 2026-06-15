import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { Bot, X } from "lucide-react";
import { ArtistCardSkeleton } from "@/components/dashboard/client/ArtistCardSkeleton";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";
import ChatBot from "@/components/dashboard/shared/ChatBot";
import { toast } from "react-toastify";
import { displayNameFromUsername } from "@/lib/format";
import { API_URL } from "@/api";
import { useDashboardData } from "@/hooks";
import { useMessaging } from "@/hooks/useMessaging";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { Artist as ArtistDto } from "@/api";
import { computeArtistTier } from "@/lib/artistTier";
import { AnimatePresence, motion } from "framer-motion";
import ArtistFilter from "@/components/dashboard/client/ArtistFilter";

const ArtistsSection = lazy(() => import("@/components/dashboard/client/ArtistsSection"));
const ArtistModal = lazy(() => import("@/components/dashboard/client/ArtistModal"));

export default function ClientDashboard() {
    const { isSignedIn, isLoaded, user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const warnedRef = useRef(false);

    const [assistantOpen, setAssistantOpen] = useState(false);
    useScrollLock(assistantOpen);

    // Clicking outside the assistant closes it — and closes the conversations
    // modal too, so an outside click dismisses both when both are open.
    useEffect(() => {
        if (!assistantOpen) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            const t = e.target as HTMLElement | null;
            if (!t) return;
            if (t.closest(".client-dashboard-assistant")) return; // inside the assistant
            if (t.closest(".ink-conv-scope")) return; // inside conversations (panel or pill)
            setAssistantOpen(false);
            window.dispatchEvent(new CustomEvent("ink:close-messages"));
        };
        document.addEventListener("mousedown", onDown, true);
        document.addEventListener("touchstart", onDown, true);
        return () => {
            document.removeEventListener("mousedown", onDown, true);
            document.removeEventListener("touchstart", onDown, true);
        };
    }, [assistantOpen]);

    const [priceFilter, setPriceFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [styleFilter, setStyleFilter] = useState("all");
    const [availabilityFilter, setAvailabilityFilter] = useState("all");
    const [experienceFilter, setExperienceFilter] = useState("all");
    const [bookingFilter, setBookingFilter] = useState("all");
    const [travelFilter, setTravelFilter] = useState("all");
    const [sort, setSort] = useState("highest_rated");
    const [searchQuery, setSearchQuery] = useState("");

    const authFetch = useCallback(
        async (url: string, options: RequestInit = {}) => {
            try {
                const full = url.startsWith("http") ? url : `${API_URL}${url}`;
                const token = await getToken();
                const headers = new Headers(options.headers || {});
                if (token) headers.set("Authorization", `Bearer ${token}`);
                if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
                return await fetch(full, { ...options, headers, credentials: "include" });
            } catch (error: any) {
                return new Response(JSON.stringify({ error: error.message || "Network error" }), {
                    status: 503,
                    statusText: error.message || "Service Unavailable",
                    headers: { "Content-Type": "application/json" },
                });
            }
        },
        [getToken]
    );

    const { unreadState, pendingRequestIds, pendingRequestsCount } = useMessaging(user?.id ?? "", authFetch);
    const { artists, loading } = useDashboardData();

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn && !warnedRef.current) {
            warnedRef.current = true;
            toast.error("You aren't logged in. Please log in.", { position: "top-center", theme: "dark" });
            navigate("/login", { replace: true });
        }
    }, [isLoaded, isSignedIn, navigate]);

    const [selectedArtist, setSelectedArtist] = useState<ArtistDto | null>(() => {
        try { if (sessionStorage.getItem("inkmity_reopen_conversation")) return null; } catch { }
        const st = (typeof window !== "undefined" ? window.history.state?.usr : null) as
            | { reopenArtist?: ArtistDto }
            | null;
        return st?.reopenArtist ?? null;
    });

    const location = useLocation();
    const reopenHandledRef = useRef(false);
    useEffect(() => {
        if (reopenHandledRef.current) return;
        try {
            if (sessionStorage.getItem("inkmity_reopen_conversation")) {
                reopenHandledRef.current = true;
                window.history.replaceState({}, document.title);
                return;
            }
        } catch { }
        const st = location.state as { reopenArtistId?: string; reopenArtist?: ArtistDto } | null;
        if (!st?.reopenArtistId && !st?.reopenArtist) return;
        const fromList = st.reopenArtistId ? artists.find((a) => a._id === st.reopenArtistId) : undefined;
        const target = fromList ?? st.reopenArtist;
        if (!target && st.reopenArtistId && !artists.length) return;
        if (target) {
            setSelectedArtist(target);
            reopenHandledRef.current = true;
            window.history.replaceState({}, document.title);
        }
    }, [location.state, artists]);

    useEffect(() => {
        let id: string | null = null;
        try { id = sessionStorage.getItem("inkmity_reopen_conversation"); } catch { }
        if (!id) return;
        const t = setTimeout(() => {
            window.dispatchEvent(new CustomEvent("ink:open-messages", { detail: { participantId: id } }));
        }, 80);
        return () => clearTimeout(t);
    }, []);

    const [modalStep, setModalStep] = useState<0 | 1 | 2>(0);
    useEffect(() => {
        const onOpenArtist = (e: Event) => {
            const d = (e as CustomEvent).detail || {};
            const norm = (h: any) => String(h || "").replace(/^@/, "").toLowerCase();
            const found = artists.find((a) =>
                (a as any).clerkId === d.clerkId ||
                (norm((a as any).handle) && norm((a as any).handle) === norm(d.handle))
            );
            const target = (found ?? {
                _id: d.clerkId,
                clerkId: d.clerkId,
                handle: d.handle,
                username: d.username || "Artist",
            }) as ArtistDto;
            setModalStep(((d.step ?? 0) as 0 | 1 | 2));
            setSelectedArtist(target);
        };
        window.addEventListener("ink:open-artist-modal", onOpenArtist);
        return () => window.removeEventListener("ink:open-artist-modal", onOpenArtist);
    }, [artists]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (selectedArtist) return;
        const grid = document.querySelector<HTMLElement>("[data-artist-scroll]");
        if (!grid) return;
        const target = e.target as HTMLElement;
        if (grid.contains(target)) return;
        let node: HTMLElement | null = target;
        while (node && node !== e.currentTarget) {
            const oy = window.getComputedStyle(node).overflowY;
            if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) return;
            node = node.parentElement;
        }
        grid.scrollTop += e.deltaY;
    }, [selectedArtist]);

    const filtered = useMemo(() => {
        const txt = searchQuery.trim().toLowerCase();
        const inPrice = (a: any) => {
            if (priceFilter === "all") return true;
            const r = a?.priceRange || {};
            const min = Number(r.min ?? 0);
            const max = Number(r.max ?? Number.POSITIVE_INFINITY);
            const [loRaw, hiRaw] = priceFilter.split("-");
            const lo = loRaw.endsWith("+") ? Number(loRaw.replace("+", "")) : Number(loRaw);
            const hi = hiRaw ? Number(hiRaw) : Number.POSITIVE_INFINITY;
            return max >= lo && min <= hi;
        };
        const inLocation = (a: any) => locationFilter === "all" || (a.location || "").toLowerCase() === locationFilter.toLowerCase();
        const inStyle = (a: any) => {
            if (styleFilter === "all") return true;
            const arr = Array.isArray(a.styles) ? a.styles : typeof a.styles === "string" ? a.styles.split(/[;,/]+/) : [];
            return arr.map((s: any) => String(s).trim().toLowerCase()).includes(styleFilter.toLowerCase());
        };
        const inAvail = (a: any) => availabilityFilter === "all" || a.availabilityCode === availabilityFilter;
        const inExp = (a: any) => {
            if (experienceFilter === "all") return true;
            const y = Number(a.yearsExperience ?? -1);
            if (!Number.isFinite(y) || y < 0) return false;
            if (experienceFilter === "amateur") return y <= 2;
            if (experienceFilter === "experienced") return y >= 3 && y <= 5;
            if (experienceFilter === "professional") return y >= 6 && y <= 10;
            if (experienceFilter === "veteran") return y >= 10;
            return true;
        };
        const inBooking = (a: any) => bookingFilter === "all" || a.bookingPreference === bookingFilter;
        const inTravel = (a: any) => travelFilter === "all" || a.travelFrequency === travelFilter;
        const inSearch = (a: any) => {
            if (!txt) return true;
            const hay = [a.username, a.bio, a.location, ...(Array.isArray(a.styles) ? a.styles : [])].filter(Boolean).join(" ").toLowerCase();
            return hay.includes(txt);
        };
        const out = artists.filter(a => inPrice(a) && inLocation(a) && inStyle(a) && inAvail(a) && inExp(a) && inBooking(a) && inTravel(a) && inSearch(a));
        const by = (v: string) => {
            // Default view mirrors the backend's tier-weighted placement:
            // higher reward tiers surface first, then by rating/reviews.
            if (v === "highest_rated") return [...out].sort((a: any, b: any) =>
                (computeArtistTier(b.bookingsCount, b.rating).rank - computeArtistTier(a.bookingsCount, a.rating).rank)
                || ((b.rating ?? 0) - (a.rating ?? 0))
                || ((b.reviewsCount ?? 0) - (a.reviewsCount ?? 0)));
            if (v === "most_reviews") return [...out].sort((a: any, b: any) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0));
            if (v === "experience_desc") return [...out].sort((a: any, b: any) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0));
            if (v === "experience_asc") return [...out].sort((a: any, b: any) => (a.yearsExperience ?? 0) - (b.yearsExperience ?? 0));
            if (v === "newest") return [...out].sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
            return out;
        };
        return by(sort);
    }, [artists, priceFilter, locationFilter, styleFilter, availabilityFilter, experienceFilter, bookingFilter, travelFilter, sort, searchQuery]);

    if (!isLoaded || !user) {
        return null;
    }

    return (
        <>
            <style>{`
                @media (max-width: 767px) {
                    html, body {
                        overflow: hidden !important;
                        height: 100vh !important;
                    }
                }
            `}</style>
            <div
                className="h-dvh bg-app text-app flex flex-col overflow-hidden md:overflow-auto client-dashboard-root"
                onWheel={handleWheel}
            >
            <Header />
            <div className="hidden" style={{ marginTop: 'clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem)' }}>
                <ArtistFilter
                    priceFilter={priceFilter}
                    setPriceFilter={setPriceFilter}
                    locationFilter={locationFilter}
                    setLocationFilter={setLocationFilter}
                    styleFilter={styleFilter}
                    setStyleFilter={setStyleFilter}
                    availabilityFilter={availabilityFilter}
                    setAvailabilityFilter={setAvailabilityFilter}
                    experienceFilter={experienceFilter}
                    setExperienceFilter={setExperienceFilter}
                    bookingFilter={bookingFilter}
                    setBookingFilter={setBookingFilter}
                    travelFilter={travelFilter}
                    setTravelFilter={setTravelFilter}
                    sort={sort}
                    setSort={setSort}
                    artists={artists}
                    setCurrentPage={() => {}}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    className="mb-3"
                />
            </div>
            <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 flex">
                    <div className="w-full h-full" style={{ padding: '0' }}>
                        <Suspense
                            fallback={
                                <div className="h-full w-full">
                                    <div
                                        className="hidden md:grid md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 w-full h-full"
                                        style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)', padding: 'clamp(10px, 1.2vh + 0.4vw, 18px) 0', gridAutoRows: '1fr', alignContent: 'start' }}
                                    >
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <ArtistCardSkeleton key={i} />
                                        ))}
                                    </div>
                                    <div className="md:hidden h-full w-full grid place-items-center" style={{ padding: '6px' }}>
                                        <div className="w-full h-full max-w-md">
                                            <ArtistCardSkeleton />
                                        </div>
                                    </div>
                                </div>
                            }
                        >
                            <ArtistsSection
                                artists={filtered.map(a => ({ ...a, username: displayNameFromUsername(a.username) }))}
                                loading={loading}
                                showArtists
                                onSelectArtist={(artist: ArtistDto) => {
                                    const h = String((artist as any).handle || artist.username || "").replace(/^@/, "").trim();
                                    navigate(`/artist/${encodeURIComponent(h)}`, { state: { artist } });
                                }}
                            />
                        </Suspense>
                    </div>
                </div>
            </main>
            <FloatingBar
                role="Client"
                assistantLocked={true}
                assistantOpen={assistantOpen}
                onAssistantOpen={() => setAssistantOpen(true)}
                messagesContent={<div className="client-dashboard-messages"><ChatWindow currentUserId={user.id} role="client" /></div>}
                unreadMessagesTotal={unreadState?.unreadMessagesTotal ?? 0}
                unreadConversationIds={Object.keys(unreadState?.unreadByConversation ?? {})}
                pendingRequestIds={pendingRequestIds}
                pendingRequestsCount={pendingRequestsCount}
            />

            <AnimatePresence>
                {assistantOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAssistantOpen(false)}
                        />
                        <motion.div
                            key="assistant"
                            initial={{ opacity: 0, scale: 0.78 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.78 }}
                            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                            style={{ transformOrigin: "left bottom" }}
                            className="fixed inset-x-0 bottom-0 lg:inset-auto lg:bottom-[calc(env(safe-area-inset-bottom,0px)+0.2rem)] lg:left-[var(--ink-edge-l)] z-50 client-dashboard-assistant origin-bottom-left"
                        >
                            <div
                                role="dialog"
                                aria-modal="true"
                                aria-label="Assistant"
                                className="w-full h-[92dvh] lg:w-[560px] lg:max-w-[94vw] lg:h-[min(760px,86dvh)] bg-app border-t border-app lg:border lg:rounded-2xl shadow-2xl flex flex-col overflow-hidden client-dashboard-assistant-card"
                            >
                                <div className="flex items-center justify-between px-3 py-2 lg:px-3 lg:py-2 border-b border-app">
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
                    </>
                )}
            </AnimatePresence>

            {selectedArtist && (
                <div
                    aria-hidden
                    className="fixed inset-0 z-[1190]"
                    style={{
                        background: "color-mix(in srgb, var(--bg) 70%, transparent)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                    }}
                />
            )}

            <Suspense fallback={null}>
                {selectedArtist && (
                    <ArtistModal
                        open={Boolean(selectedArtist)}
                        initialStep={modalStep}
                        artist={{
                            _id: selectedArtist._id,
                            clerkId: (selectedArtist as any).clerkId,
                            handle: (selectedArtist as any).handle,
                            username: displayNameFromUsername(selectedArtist.username),
                            bio: (selectedArtist as any).bio,
                            portfolioImages: ((selectedArtist as any).portfolioImages ?? []).filter(Boolean),
                            pastWorks: ((selectedArtist as any).pastWorks ?? []).filter(Boolean),
                            healedWorks: ((selectedArtist as any).healedWorks ?? []).filter(Boolean),
                            sketches: ((selectedArtist as any).sketches ?? []).filter(Boolean),
                            avatarUrl: (selectedArtist as any).profileImage || (selectedArtist as any).avatar?.url || (selectedArtist as any).avatarUrl,
                            coverImage: (selectedArtist as any).coverImage,
                            styles: (selectedArtist as any).styles,
                            location: (selectedArtist as any).location,
                            yearsExperience: (selectedArtist as any).yearsExperience,
                            rating: (selectedArtist as any).rating,
                            reviewsCount: (selectedArtist as any).reviewsCount
                        }}
                        onClose={() => setSelectedArtist(null)}
                        onMessage={async a => {
                            window.dispatchEvent(new CustomEvent("ink:open-messages", { detail: { participantId: a.clerkId } }));
                        }}
                    />
                )}
            </Suspense>
        </div>
        </>
    );
}