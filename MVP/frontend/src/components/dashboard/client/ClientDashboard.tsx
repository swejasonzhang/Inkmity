import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import { Bot, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";
import ChatBot from "@/components/dashboard/shared/ChatBot";
import { toast } from "react-toastify";
import { displayNameFromUsername } from "@/lib/format";
import { API_URL } from "@/lib/http";
import { useDashboardData } from "@/hooks";
import { useMessaging } from "@/hooks/useMessaging";
import type { Artist as ArtistDto } from "@/api";
import { AnimatePresence, motion } from "framer-motion";
import Pagination from "@/components/dashboard/shared/Pagination";
import ArtistFilter from "@/components/dashboard/client/ArtistFilter";
import "@/styles/client-dashboard.css";

const ArtistsSection = lazy(() => import("@/components/dashboard/client/ArtistsSection"));
const ArtistModal = lazy(() => import("@/components/dashboard/client/ArtistModal"));

const PAGE_SIZE = 12;

export default function ClientDashboard() {
    const { isSignedIn, isLoaded, user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const warnedRef = useRef(false);

    const [assistantOpen, setAssistantOpen] = useState(false);
    const [page, setPage] = useState(1);

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
    const { artists, loading, initialized, error, loadFirst } = useDashboardData();

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn && !warnedRef.current) {
            warnedRef.current = true;
            toast.error("You aren't logged in. Please log in.", { position: "top-center", theme: "dark" });
            navigate("/login", { replace: true });
        }
    }, [isLoaded, isSignedIn, navigate]);

    const [selectedArtist, setSelectedArtist] = useState<ArtistDto | null>(null);

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
            if (v === "highest_rated") return [...out].sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0));
            if (v === "most_reviews") return [...out].sort((a: any, b: any) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0));
            if (v === "experience_desc") return [...out].sort((a: any, b: any) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0));
            if (v === "experience_asc") return [...out].sort((a: any, b: any) => (a.yearsExperience ?? 0) - (b.yearsExperience ?? 0));
            if (v === "newest") return [...out].sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
            return out;
        };
        return by(sort);
    }, [artists, priceFilter, locationFilter, styleFilter, availabilityFilter, experienceFilter, bookingFilter, travelFilter, sort, searchQuery]);

    const totalPages = Math.max(1, Math.ceil((filtered.length || 0) / PAGE_SIZE));

    const handlePageChange = (next: number) => {
        if (next < 1 || next > totalPages) return;
        setPage(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

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
            <div className="h-dvh md:min-h-dvh bg-app text-app flex flex-col overflow-hidden md:overflow-auto client-dashboard-root">
            <Header />
            <div className="sm:hidden" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)', marginTop: 'clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem)' }}>
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
                    setCurrentPage={setPage}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    className="mb-3"
                />
            </div>
            <main className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) 0' }}>
                {error && !initialized ? (
                    <div className="flex-1 min-h-0 w-full flex items-center justify-center" style={{ padding: 'clamp(1rem, 1.5vmin + 0.8vw, 2rem)' }}>
                        <div className="w-full max-w-2xl rounded-lg border border-red-500/30 bg-red-500/10" style={{ padding: 'clamp(1.5rem, 2vmin + 1vw, 2.5rem)' }}>
                            <div className="flex flex-col items-center text-center" style={{ gap: 'clamp(1rem, 1.5vmin + 0.8vw, 2rem)' }}>
                                <div className="w-full">
                                    <h2 className="font-semibold text-red-300 mb-2" style={{ fontSize: 'clamp(1rem, 1.3vmin + 0.7vw, 1.25rem)' }}>Error Loading Dashboard</h2>
                                    <p className="text-red-200/90" style={{ fontSize: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }}>{error}</p>
                                    {error.includes("Too many requests") && (
                                        <p className="text-red-200/70 mt-2" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>Please wait a moment and try again later.</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap justify-center" style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                                    <button
                                        onClick={() => {
                                            setPage(1);
                                            loadFirst({});
                                        }}
                                        className="font-medium rounded border border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors"
                                        style={{ padding: 'clamp(0.5rem, 0.7vmin + 0.4vw, 0.875rem) clamp(1rem, 1.5vmin + 0.8vw, 2rem)', fontSize: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }}
                                    >
                                        Retry
                                    </button>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="font-medium rounded border border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors"
                                        style={{ padding: 'clamp(0.5rem, 0.7vmin + 0.4vw, 0.875rem) clamp(1rem, 1.5vmin + 0.8vw, 2rem)', fontSize: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }}
                                    >
                                        Reload Page
                                    </button>
                                    <button
                                        onClick={() => navigate("/landing")}
                                        className="font-medium rounded border border-app bg-card text-app hover:bg-elevated transition-colors"
                                        style={{ padding: 'clamp(0.5rem, 0.7vmin + 0.4vw, 0.875rem) clamp(1rem, 1.5vmin + 0.8vw, 2rem)', fontSize: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }}
                                    >
                                        Go to Home
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {error && initialized && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 flex-shrink-0" style={{ margin: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)', padding: 'clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                                <div className="flex items-start" style={{ gap: 'clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-red-300 mb-1" style={{ fontSize: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }}>Error Loading Artists</h3>
                                        <p className="text-red-200/90" style={{ fontSize: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }}>{error}</p>
                                        {error.includes("Too many requests") && (
                                            <p className="text-red-200/70 mt-2" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>Please wait a moment and try again later.</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setPage(1);
                                            loadFirst({});
                                        }}
                                        className="font-medium rounded border border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors flex-shrink-0"
                                        style={{ padding: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 min-h-0 flex">
                            <div className="w-full h-full" style={{ padding: '0 clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                                <Suspense
                                    fallback={
                                        <div style={{ padding: 'clamp(1rem, 1.5vmin + 0.8vw, 2rem)' }} className="space-y-4">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" style={{ gap: 'clamp(0.75rem, 1vmin + 0.5vw, 1.5rem)' }}>
                                                {Array.from({ length: 8 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-48 w-full rounded-xl" />
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-center" style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                                                <Skeleton className="h-8 w-20 rounded" />
                                                <Skeleton className="h-8 w-20 rounded" />
                                            </div>
                                        </div>
                                    }
                                >
                                    <ArtistsSection
                                        artists={filtered.map(a => ({ ...a, username: displayNameFromUsername(a.username) }))}
                                        loading={loading}
                                        showArtists
                                        onSelectArtist={(artist: ArtistDto) => setSelectedArtist(artist)}
                                        page={page}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    </>
                )}
            </main>
            <div className="shrink-0" style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                <FloatingBar
                    role="Client"
                    onAssistantOpen={() => setAssistantOpen(true)}
                    messagesContent={<div className="client-dashboard-messages"><ChatWindow currentUserId={user.id} role="client" /></div>}
                    unreadMessagesTotal={unreadState?.unreadMessagesTotal ?? 0}
                    unreadConversationIds={Object.keys(unreadState?.unreadByConversation ?? {})}
                    pendingRequestIds={pendingRequestIds}
                    pendingRequestsCount={pendingRequestsCount}
                    rightContent={
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPrev={() => handlePageChange(page - 1)}
                            onNext={() => handlePageChange(page + 1)}
                        />
                    }
                />
            </div>

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
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 260, damping: 28 }}
                            className="fixed inset-x-0 bottom-0 lg:inset-auto lg:bottom-4 lg:right-4 z-50 client-dashboard-assistant"
                        >
                            <div className="w-full h-[90dvh] lg:w-[88vw] lg:h-auto lg:max-w-[400px] bg-card border-t border-app lg:border lg:rounded-2xl shadow-2xl flex flex-col overflow-hidden client-dashboard-assistant-card">
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

            <Suspense fallback={null}>
                {selectedArtist && (
                    <ArtistModal
                        open={Boolean(selectedArtist)}
                        artist={{
                            _id: selectedArtist._id,
                            clerkId: (selectedArtist as any).clerkId,
                            username: displayNameFromUsername(selectedArtist.username),
                            bio: (selectedArtist as any).bio,
                            portfolioImages: ((selectedArtist as any).portfolioImages ?? []).filter(Boolean),
                            pastWorks: ((selectedArtist as any).pastWorks ?? []).filter(Boolean),
                            healedWorks: ((selectedArtist as any).healedWorks ?? []).filter(Boolean),
                            sketches: ((selectedArtist as any).sketches ?? []).filter(Boolean),
                            avatarUrl: (selectedArtist as any).profileImage || (selectedArtist as any).avatar?.url,
                            coverImage: (selectedArtist as any).coverImage,
                            profileImage: (selectedArtist as any).profileImage || (selectedArtist as any).avatar?.url,
                            avatar: (selectedArtist as any).avatar
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