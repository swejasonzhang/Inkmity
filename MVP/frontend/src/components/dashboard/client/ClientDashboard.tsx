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
    const { artists, loading, initialized } = useDashboardData();

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

    if (!isLoaded || !initialized || !user) {
        return null;
    }

    const panelVariants = {
        hidden: { opacity: 0, scale: 0.98, y: 8 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: 8 }
    };

    return (
        <div className="min-h-dvh bg-app text-app flex flex-col overflow-hidden client-dashboard-root">
            <Header />
            <div className="sm:hidden px-3 mt-2">
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
            <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 flex">
                    <div className="w-full md:my-auto my-0 px-0 md:px-3">
                        <Suspense
                            fallback={
                                <div className="p-4 space-y-4">
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
            </main>
            <div className="shrink-0 px-3">
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
                    <motion.div
                        key="assistant"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={panelVariants}
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        className="fixed bottom-4 right-4 z-50 client-dashboard-assistant"
                    >
                        <div className="w-[88vw] max-w-[400px] bg-card border border-app shadow-2xl rounded-2xl flex flex-col overflow-hidden client-dashboard-assistant-card">
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
                {selectedArtist && (
                    <ArtistModal
                        open={Boolean(selectedArtist)}
                        artist={{
                            _id: selectedArtist._id,
                            clerkId: (selectedArtist as any).clerkId,
                            username: displayNameFromUsername(selectedArtist.username),
                            bio: (selectedArtist as any).bio,
                            pastWorks: ((selectedArtist as any).pastWorks ?? (selectedArtist as any).portfolioImages ?? []).filter(Boolean),
                            healedWorks: ((selectedArtist as any).healedWorks ?? []).filter(Boolean),
                            sketches: ((selectedArtist as any).sketches ?? []).filter(Boolean)
                        }}
                        onClose={() => setSelectedArtist(null)}
                        onMessage={async a => {
                            window.dispatchEvent(new CustomEvent("ink:open-messages", { detail: { participantId: a.clerkId } }));
                        }}
                    />
                )}
            </Suspense>
        </div>
    );
}