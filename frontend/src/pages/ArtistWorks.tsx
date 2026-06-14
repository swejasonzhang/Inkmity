import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Images, CalendarDays, Star, MapPin, Clock } from "lucide-react";
import Header from "@/components/header/Header";
import { useTheme } from "@/hooks/useTheme";
import { fetchArtistByHandle, fetchArtistById } from "@/api";
import ArtistPortfolio, { type ArtistWithGroups } from "@/components/dashboard/client/ArtistPortfolio";
import ArtistBooking from "@/components/dashboard/client/ArtistBooking";
import ArtistReviews from "@/components/dashboard/client/ArtistReviews";
import VerifiedBadge from "@/components/dashboard/shared/VerifiedBadge";
import { displayNameFromUsername, titleCase } from "@/lib/format";

type AnyArtist = Record<string, any>;
type Tab = 0 | 1 | 2;

export default function ArtistWorks() {
    const { handle = "" } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useTheme();

    const stateArtist = (location.state as { artist?: AnyArtist; tab?: Tab } | null)?.artist ?? null;
    const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? 0;
    const [artist, setArtist] = useState<AnyArtist | null>(stateArtist);
    const [loading, setLoading] = useState<boolean>(!stateArtist);
    const [tab, setTab] = useState<Tab>(initialTab);

    const shellBg = theme === "light" ? "#ffffff" : "#0b0b0b";
    const shellFg = theme === "light" ? "#111111" : "#f5f5f5";

    useEffect(() => {
        let active = true;
        const ac = new AbortController();
        (async () => {
            try {
                const h = String(artist?.handle || handle || "").replace(/^@/, "").trim();
                let full: AnyArtist | null = null;
                if (h) full = (await fetchArtistByHandle(h, ac.signal)) as AnyArtist;
                else if (artist?._id && /^[a-f0-9]{24}$/i.test(artist._id))
                    full = (await fetchArtistById(artist._id, ac.signal)) as AnyArtist;
                if (active && full) {
                    setArtist((prev) => ({
                        ...(prev ?? {}),
                        ...full,
                        avatarUrl: full!.avatar?.url ?? full!.avatarUrl ?? prev?.avatarUrl,
                    }));
                }
            } catch {
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
            ac.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handle]);

    const displayHandle = String(artist?.handle || handle).replace(/^@/, "");

    const mapped: ArtistWithGroups = useMemo(
        () => ({
            _id: String(artist?._id ?? ""),
            clerkId: String(artist?.clerkId ?? ""),
            handle: artist?.handle,
            username: displayNameFromUsername(artist?.username) || displayHandle,
            bio: artist?.bio,
            portfolioImages: (artist?.portfolioImages ?? []).filter(Boolean),
            pastWorks: (artist?.pastWorks ?? []).filter(Boolean),
            healedWorks: (artist?.healedWorks ?? []).filter(Boolean),
            sketches: (artist?.sketches ?? []).filter(Boolean),
            avatarUrl: artist?.avatarUrl || artist?.profileImage || artist?.avatar?.url,
            coverImage: artist?.coverImage,
            styles: artist?.styles,
            location: artist?.location,
            yearsExperience: artist?.yearsExperience,
            rating: artist?.rating,
            reviewsCount: artist?.reviewsCount,
        }),
        [artist, displayHandle]
    );

    const styles: string[] = Array.isArray(mapped.styles)
        ? mapped.styles
        : typeof mapped.styles === "string"
            ? [mapped.styles]
            : [];
    const rating = Number(mapped.rating ?? 0);
    const years = Number(mapped.yearsExperience ?? 0);

    const tabs: { key: Tab; label: string; Icon: ComponentType<{ className?: string }> }[] = [
        { key: 0, label: "Portfolio", Icon: Images },
        { key: 1, label: "Booking & Message", Icon: CalendarDays },
        { key: 2, label: "Reviews", Icon: Star },
    ];

    return (
        <div id="dashboard-scope" className="ink-scope min-h-dvh flex flex-col" style={{ background: shellBg, color: shellFg }}>
            <Header />
            <main className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "clamp(14px, 2.5vw, 36px)" }}>
                <div className="mx-auto w-full max-w-6xl">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full border px-3 py-1.5 mb-4 transition hover:brightness-110"
                        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 92%, transparent)", color: "var(--fg)" }}
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>

                    {loading && !artist ? (
                        <p className="text-center text-subtle py-12">Loading…</p>
                    ) : !artist ? (
                        <p className="text-center text-subtle py-12">Artist not found.</p>
                    ) : (
                        <>
                            <header className="rounded-3xl border bg-card p-5 sm:p-6 mb-5" style={{ borderColor: "var(--border)" }}>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <span className="grid place-items-center h-16 w-16 shrink-0 rounded-2xl border border-app bg-elevated overflow-hidden text-xl font-bold">
                                        {mapped.avatarUrl ? (
                                            <img src={mapped.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                            (mapped.username?.[0] || "A").toUpperCase()
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-app">{mapped.username}</h1>
                                            {artist?.verified && <VerifiedBadge size={20} label className="shrink-0" />}
                                        </div>
                                        <p className="text-subtle text-sm mt-0.5">@{displayHandle}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                                            {rating > 0 && (
                                                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {rating.toFixed(1)}{mapped.reviewsCount ? ` (${mapped.reviewsCount})` : ""}</span>
                                            )}
                                            {mapped.location && (
                                                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {mapped.location}</span>
                                            )}
                                            {years > 0 && (
                                                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {years} yrs experience</span>
                                            )}
                                        </div>
                                        {styles.length > 0 && (
                                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                {styles.slice(0, 6).map((s) => (
                                                    <span key={s} className="rounded-full border border-app/50 bg-elevated px-2 py-0.5 text-[11px] text-subtle">{titleCase(s)}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex sm:flex-col gap-2 sm:self-stretch sm:justify-center">
                                        <button
                                            onClick={() => setTab(1)}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold bg-[color:var(--fg)] text-[color:var(--bg)] transition hover:opacity-90 active:scale-[0.99]"
                                        >
                                            <CalendarDays className="h-4 w-4" /> Book now
                                        </button>
                                    </div>
                                </div>
                            </header>

                            <div className="mb-5 flex flex-wrap items-center gap-2">
                                {tabs.map(({ key, label, Icon }) => {
                                    const active = tab === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setTab(key)}
                                            aria-pressed={active}
                                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition ${
                                                active
                                                    ? "bg-neutral-700 text-white border-transparent"
                                                    : "border-app/40 bg-elevated text-subtle hover:text-app"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            {tab === 0 && <ArtistPortfolio artist={mapped} compact />}
                            {tab === 1 && (
                                <ArtistBooking
                                    artist={mapped}
                                    onBack={() => setTab(0)}
                                    onGoToStep={(s) => setTab(s)}
                                    onMessage={async (a) => {
                                        try { if (a.clerkId) sessionStorage.setItem("inkmity_reopen_conversation", a.clerkId); } catch { }
                                        navigate("/artists");
                                    }}
                                />
                            )}
                            {tab === 2 && <ArtistReviews artist={mapped} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
