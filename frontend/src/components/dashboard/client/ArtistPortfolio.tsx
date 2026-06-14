import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize2, MapPin, Clock, Star, Images } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import FullscreenZoom from "./FullscreenZoom";
import { titleCase } from "@/lib/format";

const SECTION_INITIAL = 5;

const WorkSection: React.FC<{
    title: string;
    images: string[];
    label: string;
    imgAltPrefix: string;
    onOpen: (images: string[], index: number, label: string) => void;
    headingLevel?: "h3" | "h4";
    initial?: number;
}> = ({ title, images, label, imgAltPrefix, onOpen, headingLevel = "h3", initial = SECTION_INITIAL }) => {
    const [showAll, setShowAll] = useState(false);
    if (!images.length) return null;
    const shown = showAll ? images : images.slice(0, initial);
    const Heading = headingLevel;
    return (
        <section className="w-full">
            <header className="mb-2 sm:mb-3 flex items-end justify-between gap-3">
                <Heading className="text-base sm:text-lg font-semibold portfolio-section-title">{title}</Heading>
                <span className="text-xs portfolio-section-count whitespace-nowrap">{images.length} image{images.length === 1 ? "" : "s"}</span>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {shown.map((src, i) => (
                    <button
                        key={`${src}-${i}`}
                        onClick={() => onOpen(images, i, label)}
                        className="group relative aspect-square rounded-2xl border overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--elevated)" }}
                        aria-label={`Open ${imgAltPrefix} ${i + 1}`}
                    >
                        <img
                            src={src}
                            alt={`${imgAltPrefix} ${i + 1}`}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading={i < 4 ? "eager" : "lazy"}
                            decoding="async"
                            referrerPolicy="no-referrer"
                        />
                        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                            <div className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium backdrop-blur-sm border" style={{ backgroundColor: "color-mix(in srgb, var(--elevated) 80%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}>
                                <Maximize2 className="h-3 w-3" /> View
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            {images.length > initial && (
                <div className="mt-3 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowAll((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-elevated"
                        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                    >
                        {showAll ? "Show less" : `View all ${images.length}`}
                    </button>
                </div>
            )}
        </section>
    );
};

export type ArtistWithGroups = {
    _id: string;
    clerkId: string;
    handle?: string;
    username: string;
    bio?: string;
    portfolioImages?: string[];
    pastWorks?: string[];
    healedWorks?: string[];
    sketches?: string[];
    avatarUrl?: string;
    coverImage?: string;
    styles?: string[] | string;
    location?: string;
    yearsExperience?: number;
    rating?: number;
    reviewsCount?: number;
};

export type PortfolioProps = {
    artist: ArtistWithGroups;
    compact?: boolean;
};

const ArtistPortfolio: React.FC<PortfolioProps> = ({ artist, compact = false }) => {
    const navigate = useNavigate();
    const recent = useMemo(() => (artist?.portfolioImages ?? []).filter(Boolean), [artist]);
    const past = useMemo(() => (artist?.pastWorks ?? []).filter(Boolean), [artist]);
    const healed = useMemo(() => (artist?.healedWorks ?? []).filter(Boolean), [artist]);
    const sketches = useMemo(() => (artist?.sketches ?? []).filter(Boolean), [artist]);
    const initials = useMemo(() => (artist?.username?.[0]?.toUpperCase?.() ?? "?"), [artist]);
    const [zoom, setZoom] = useState<null | { items: string[]; index: number; label: string }>(null);
    const [bgOk, setBgOk] = useState(Boolean(artist.coverImage));

    const stylesClean = useMemo(() => {
        const raw = artist?.styles ?? [];
        const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[;,/]+/) : [];
        return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 4);
    }, [artist]);
    const totalWorks = recent.length + past.length + healed.length + sketches.length;
    const ratingValue = typeof artist.rating === "number" ? artist.rating : Number(artist.rating ?? 0);
    const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;
    const years = typeof artist.yearsExperience === "number" && artist.yearsExperience >= 0
        ? `${artist.yearsExperience} yr${artist.yearsExperience === 1 ? "" : "s"} exp`
        : "";
    const loc = (artist.location || "").trim();

    const allImages = useMemo(() => [...recent, ...past, ...healed, ...sketches], [recent, past, healed, sketches]);
    const categories = useMemo(() => {
        const cats: { key: string; label: string; images: string[] }[] = [
            { key: "all", label: "All works", images: allImages },
        ];
        if (recent.length) cats.push({ key: "recent", label: "Recent", images: recent });
        stylesClean.forEach((style, si) => {
            const imgs = past.filter((_, i) => i % stylesClean.length === si);
            if (imgs.length) cats.push({ key: `style-${si}`, label: titleCase(style), images: imgs });
        });
        if (healed.length) cats.push({ key: "healed", label: "Healed", images: healed });
        if (sketches.length) cats.push({ key: "sketches", label: "Sketches & Ideas", images: sketches });
        return cats;
    }, [allImages, recent, past, healed, sketches, stylesClean]);
    const [filterKey, setFilterKey] = useState("all");
    const activeCat = categories.find((c) => c.key === filterKey) ?? categories[0];

    const InfoChip: React.FC<{ icon?: React.ComponentType<{ className?: string }>; text: string }> = ({ icon: Icon, text }) => (
        <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap capitalize"
            style={{
                borderColor: "var(--border)",
                background: "linear-gradient(135deg, color-mix(in srgb, var(--elevated) 95%, var(--fg) 5%), color-mix(in srgb, var(--elevated) 85%, var(--fg) 15%))",
                color: "var(--fg)",
            }}
        >
            {Icon ? <Icon className="h-3.5 w-3.5 opacity-70" /> : null}
            {text}
        </span>
    );

    const openZoom = (items: string[], index: number, label: string) => setZoom({ items, index, label });
    const closeZoom = () => setZoom(null);
    const goPrev = () => setZoom(z => (z ? { ...z, index: (z.index + z.items.length - 1) % z.items.length } : z));
    const goNext = () => setZoom(z => (z ? { ...z, index: (z.index + 1) % z.items.length } : z));

    const bioText = (artist.bio || "").trim() || `Nice to meet you, I'm ${artist.username || "this artist"}, let's talk about your next tattoo.`;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") return closeZoom();
            if (zoom) {
                if (e.key === "ArrowLeft") return goPrev();
                if (e.key === "ArrowRight") return goNext();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [zoom]);

    return (
        <div className="w-full" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <div className="mx-auto max-w-screen-2xl px-1.5 sm:px-2.5 pt-[10px] pb-6 space-y-4 sm:space-y-5">
                {!compact && (
                <section className="w-full">
                    <Card className="w-full shadow-none overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)", paddingTop: 0, paddingBottom: 0, gap: 0 }}>
                        <div className="relative w-full overflow-hidden" style={{ background: "var(--elevated)" }}>
                            {bgOk && artist.coverImage ? (
                                <img
                                    src={artist.coverImage}
                                    alt={`${artist.username} cover`}
                                    className="absolute inset-0 h-full w-full object-cover object-center"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={() => setBgOk(false)}
                                />
                            ) : (
                                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--bg) 82%, var(--fg) 18%), color-mix(in srgb, var(--bg) 70%, var(--fg) 30%))" }} />
                            )}
                            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--card) 18%, transparent) 0%, transparent 30%, color-mix(in srgb, var(--card) 80%, transparent) 72%, var(--card) 100%)" }} />

                            <div className="relative px-3 sm:px-4 pb-3 pt-[clamp(2.75rem,9vh,5rem)] flex flex-col items-center text-center">
                                {artist.avatarUrl ? (
                                    <img
                                        src={artist.avatarUrl}
                                        alt={`${artist.username} profile picture`}
                                        className="h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20 rounded-full object-cover ring-4"
                                        style={{ ['--tw-ring-color' as any]: "var(--card)", boxShadow: "0 10px 26px -10px rgba(0,0,0,0.5)" }}
                                        loading="eager"
                                        decoding="async"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div
                                        className="h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20 rounded-full grid place-items-center ring-4 text-2xl font-semibold"
                                        style={{ ['--tw-ring-color' as any]: "var(--card)", backgroundColor: "color-mix(in srgb, var(--elevated) 92%, transparent)", color: "var(--fg)", boxShadow: "0 10px 26px -10px rgba(0,0,0,0.5)" }}
                                        aria-label={`${artist.username} profile placeholder`}
                                    >
                                        {initials}
                                    </div>
                                )}
                                <h2 className="mt-1.5 text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: "var(--fg)" }}>{artist.username}</h2>

                                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                                    {hasRating && <InfoChip icon={Star} text={`${ratingValue.toFixed(1)}${artist.reviewsCount ? ` (${artist.reviewsCount})` : ""}`} />}
                                    {loc && <InfoChip icon={MapPin} text={loc} />}
                                    {years && <InfoChip icon={Clock} text={years} />}
                                    {totalWorks > 0 && <InfoChip icon={Images} text={`${totalWorks} works`} />}
                                    {stylesClean.map((s) => <InfoChip key={s} text={s} />)}
                                </div>
                            </div>
                        </div>

                        <Separator className="w-full" style={{ background: "color-mix(in srgb, var(--fg) 12%, transparent)" }} />
                        <p className="mx-auto max-w-2xl text-sm leading-6 text-center px-3 sm:px-6 py-2" style={{ color: "color-mix(in srgb, var(--fg) 82%, transparent)" }}>
                            {bioText}
                        </p>
                    </Card>
                </section>
                )}

                {!compact && artist.handle && totalWorks > 0 && (
                    <section className="w-full flex justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                const b = document.body.style;
                                b.position = ""; b.top = ""; b.width = ""; b.overflow = ""; b.touchAction = "";
                                document.documentElement.style.overscrollBehavior = "";
                                b.overscrollBehavior = "";
                                navigate(`/artist/${(artist.handle || "").replace(/^@/, "")}`, { state: { artist } });
                            }}
                            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:brightness-110 active:scale-[0.99] shadow-sm"
                            style={{ background: "var(--fg)", color: "var(--bg)" }}
                        >
                            <Images className="h-4 w-4" /> View all {totalWorks} works
                        </button>
                    </section>
                )}

                {compact ? (
                    <section className="w-full">
                        {categories.length > 1 && (
                            <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-center gap-1.5">
                                {categories.map((c) => {
                                    const active = c.key === activeCat?.key;
                                    return (
                                        <button
                                            key={c.key}
                                            type="button"
                                            onClick={() => setFilterKey(c.key)}
                                            aria-pressed={active}
                                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium border transition ${active ? "bg-[color:var(--fg)] text-[color:var(--bg)] border-transparent" : "hover:bg-elevated"}`}
                                            style={active ? undefined : { borderColor: "var(--border)", color: "var(--fg)" }}
                                        >
                                            {c.label}
                                            <span className="opacity-60">{c.images.length}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {activeCat && activeCat.images.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {activeCat.images.map((src, i) => (
                                    <button
                                        key={`${src}-${i}`}
                                        onClick={() => openZoom(activeCat.images, i, activeCat.label)}
                                        className="group relative aspect-square rounded-2xl border overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        style={{ borderColor: "var(--border)", backgroundColor: "var(--elevated)" }}
                                        aria-label={`Open ${activeCat.label} ${i + 1}`}
                                    >
                                        <img
                                            src={src}
                                            alt={`${activeCat.label} ${i + 1}`}
                                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            loading={i < 8 ? "eager" : "lazy"}
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                                            <div className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium backdrop-blur-sm border" style={{ backgroundColor: "color-mix(in srgb, var(--elevated) 80%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}>
                                                <Maximize2 className="h-3 w-3" /> View
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-sm portfolio-section-count py-8">No images in this category yet.</p>
                        )}
                    </section>
                ) : (
                    <>
                        <WorkSection title="Recent Works" images={recent} imgAltPrefix="Recent work" label="Recent Works" onOpen={openZoom} initial={4} />

                        {stylesClean.length > 0 && past.length > 0 && (
                            <section className="w-full">
                                <header className="mb-2 sm:mb-3 flex items-end justify-between">
                                    <h3 className="text-base sm:text-lg font-semibold portfolio-section-title">By style</h3>
                                    <span className="text-xs portfolio-section-count">{stylesClean.length} style{stylesClean.length === 1 ? "" : "s"}</span>
                                </header>
                                <div className="space-y-4 sm:space-y-5">
                                    {stylesClean.map((style, si) => {
                                        const imgs = past.filter((_, i) => i % stylesClean.length === si);
                                        if (!imgs.length) return null;
                                        const label = titleCase(style);
                                        return (
                                            <WorkSection key={style} title={label} images={imgs} imgAltPrefix={`${label} work`} label={label} onOpen={openZoom} headingLevel="h4" />
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <WorkSection title="Healed Works" images={healed} imgAltPrefix="Healed work" label="Healed Works" onOpen={openZoom} />
                        <WorkSection title="Sketches & Ideas" images={sketches} imgAltPrefix="Sketch" label="Sketches & Ideas" onOpen={openZoom} />
                    </>
                )}
            </div>

            {zoom && <FullscreenZoom src={zoom.items[zoom.index]} count={`${zoom.label}: ${zoom.index + 1} / ${zoom.items.length}`} onPrev={goPrev} onNext={goNext} onClose={closeZoom} />}
        </div>
    );
};

export default ArtistPortfolio;