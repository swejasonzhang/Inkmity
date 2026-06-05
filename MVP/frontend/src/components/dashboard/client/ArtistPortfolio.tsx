import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Maximize2, MapPin, Clock, Star, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import FullscreenZoom from "./FullscreenZoom";

export type ArtistWithGroups = {
    _id: string;
    clerkId: string;
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
};

const ArtistPortfolio: React.FC<PortfolioProps> = ({ artist }) => {
    const recent = useMemo(() => (artist?.portfolioImages ?? []).filter(Boolean), [artist]);
    const past = useMemo(() => (artist?.pastWorks ?? []).filter(Boolean), [artist]);
    const healed = useMemo(() => (artist?.healedWorks ?? []).filter(Boolean), [artist]);
    const sketches = useMemo(() => (artist?.sketches ?? []).filter(Boolean), [artist]);
    const initials = useMemo(() => (artist?.username?.[0]?.toUpperCase?.() ?? "?"), [artist]);
    const [zoom, setZoom] = useState<null | { items: string[]; index: number; label: "Recent Works" | "Past Works" | "Healed Works" | "Upcoming Sketches" }>(null);
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

    const InfoChip: React.FC<{ icon?: React.ComponentType<{ className?: string }>; text: string }> = ({ icon: Icon, text }) => (
        <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap"
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

    const openZoom = (items: string[], index: number, label: "Recent Works" | "Past Works" | "Healed Works" | "Upcoming Sketches") => setZoom({ items, index, label });
    const closeZoom = () => setZoom(null);
    const goPrev = () => setZoom(z => (z ? { ...z, index: (z.index + z.items.length - 1) % z.items.length } : z));
    const goNext = () => setZoom(z => (z ? { ...z, index: (z.index + 1) % z.items.length } : z));

    const ImageGrid: React.FC<{ images: string[]; imgAltPrefix: string; label: "Recent Works" | "Past Works" | "Healed Works" | "Upcoming Sketches" }> = ({ images, imgAltPrefix, label }) =>
        images.length ? (
            <div className="w-full hidden sm:block">
                <div className="grid gap-3 w-full grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
                    {images.map((src, i) => (
                        <button
                            key={`${src}-${i}`}
                            onClick={() => openZoom(images, i, label)}
                            className="group relative w-full rounded-2xl border shadow-sm overflow-hidden flex items-center justify-center ring-offset-background transition-all hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            style={{ borderColor: "var(--border)", backgroundColor: "var(--elevated)" }}
                            aria-label={`Open ${imgAltPrefix} ${i + 1}`}
                        >
                            <img
                                src={src}
                                alt={`${imgAltPrefix} ${i + 1}`}
                                className="block w-full h-auto object-contain"
                                loading={i < 4 ? "eager" : "lazy"}
                                fetchPriority={i < 4 ? "high" : undefined}
                                decoding="async"
                                referrerPolicy="no-referrer"
                            />
                            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                <div
                                    className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm border"
                                    style={{ backgroundColor: "color-mix(in srgb, var(--elevated) 80%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}
                                >
                                    <Maximize2 className="h-3.5 w-3.5" /> View
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        ) : (
            <p className="hidden sm:block text-sm" style={{ color: "color-mix(in srgb, var(--fg) 60%, transparent)" }}>
                No items to show yet.
            </p>
        );

    const MobileCarousel: React.FC<{ images: string[]; imgAltPrefix: string; label: "Recent Works" | "Past Works" | "Healed Works" | "Upcoming Sketches" }> = ({ images, imgAltPrefix, label }) => {
        const [index, setIndex] = useState(0);
        const swipeTo = (dir: "prev" | "next") => setIndex(i => (dir === "prev" ? (i + images.length - 1) % images.length : (i + 1) % images.length));
        const onDragEnd = (_: any, info: { offset: { x: number } }) => {
            const t = 50;
            if (info.offset.x < -t) swipeTo("next");
            else if (info.offset.x > t) swipeTo("prev");
        };
        if (!images.length) return null;
        const src = images[index];
        return (
            <div className="sm:hidden">
                <div className="w-full">
                    <div className="relative w-full mx-auto max-w-full rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)", backgroundColor: "var(--elevated)" }}>
                        <motion.button
                            key={src}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            dragSnapToOrigin
                            onDragEnd={onDragEnd}
                            onClick={() => openZoom(images, index, label)}
                            aria-label={`Open ${imgAltPrefix} ${index + 1}`}
                            className="block w-full"
                        >
                            <img src={src} alt={`${imgAltPrefix} ${index + 1}`} className="block max-w-full h-auto object-contain mx-auto" loading="eager" decoding="async" referrerPolicy="no-referrer" />
                        </motion.button>
                        <div
                            className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm border"
                            style={{ backgroundColor: "color-mix(in srgb, var(--elevated) 80%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}
                        >
                            <Maximize2 className="h-3.5 w-3.5" /> View
                        </div>
                    </div>
                    <div className="flex justify-center gap-2 py-4">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                aria-label={`Go to ${label} ${i + 1}`}
                                className={`h-2.5 w-6 rounded-full ${i === index ? "opacity-90" : "opacity-40"}`}
                                style={{ backgroundColor: i === index ? "color-mix(in srgb, var(--fg) 95%, transparent)" : "color-mix(in srgb, var(--fg) 40%, transparent)" }}
                            />
                        ))}
                    </div>
                    <div className="sm:hidden grid grid-cols-2 gap-3 mt-6">
                        <Button variant="outline" onClick={() => swipeTo("prev")} className="rounded-xl" style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in srgb, var(--elevated) 96%, transparent)", color: "var(--fg)" }}>
                            Prev
                        </Button>
                        <Button variant="outline" onClick={() => swipeTo("next")} className="rounded-xl" style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in srgb, var(--elevated) 96%, transparent)", color: "var(--fg)" }}>
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

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
            <div className="mx-auto max-w-screen-2xl px-1.5 sm:px-2.5 py-[10px] space-y-4 sm:space-y-5">
                <section className="w-full">
                    <Card className="w-full shadow-none overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)", paddingTop: 0, paddingBottom: 0, gap: 0 }}>
                        <div className="relative w-full" style={{ height: "clamp(4.25rem, 10vh, 6.5rem)" }}>
                            {bgOk && artist.coverImage ? (
                                <img
                                    src={artist.coverImage}
                                    alt={`${artist.username} cover`}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={() => setBgOk(false)}
                                />
                            ) : (
                                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--bg) 82%, var(--fg) 18%), color-mix(in srgb, var(--bg) 70%, var(--fg) 30%))" }} />
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: "linear-gradient(to top, var(--card), transparent)" }} />
                        </div>

                        <CardContent className="relative px-3 sm:px-4 pb-3 -mt-10 flex flex-col items-center text-center">
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

                            <Separator className="mt-2 mb-0 w-auto -mx-3 sm:-mx-4 self-stretch" style={{ background: "color-mix(in srgb, var(--fg) 12%, transparent)" }} />
                            <p className="mx-auto max-w-2xl text-sm leading-6" style={{ color: "color-mix(in srgb, var(--fg) 82%, transparent)" }}>
                                {bioText}
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <section className="w-full -mt-4">
                    <div className="mx-auto flex justify-center px-4">
                        <span
                            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm"
                            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 85%, transparent)", color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                            Tap any image to zoom · press &amp; hold to magnify
                        </span>
                    </div>
                </section>

                {recent.length > 0 && (
                    <section className="w-full">
                        <header className="mb-2 sm:mb-3 flex items-end justify-between">
                            <h3 className="text-base sm:text-lg font-semibold portfolio-section-title">Recent Works</h3>
                            <span className="text-xs portfolio-section-count">
                                {recent.length} image{recent.length === 1 ? "" : "s"}
                            </span>
                        </header>
                        <MobileCarousel images={recent} imgAltPrefix="Recent work" label="Recent Works" />
                        <ImageGrid images={recent} imgAltPrefix="Recent work" label="Recent Works" />
                    </section>
                )}

                {past.length > 0 && (
                    <section className="w-full">
                        <header className="mb-2 sm:mb-3 flex items-end justify-between">
                            <h3 className="text-base sm:text-lg font-semibold portfolio-section-title">Past Works</h3>
                            <span className="text-xs portfolio-section-count">
                                {past.length} image{past.length === 1 ? "" : "s"}
                            </span>
                        </header>
                        <MobileCarousel images={past} imgAltPrefix="Past work" label="Past Works" />
                        <ImageGrid images={past} imgAltPrefix="Past work" label="Past Works" />
                    </section>
                )}

                {healed.length > 0 && (
                    <section className="w-full">
                        <header className="mb-2 sm:mb-3 flex items-end justify-between">
                            <h3 className="text-base sm:text-lg font-semibold portfolio-section-title">Healed Works</h3>
                            <span className="text-xs portfolio-section-count">
                                {healed.length} image{healed.length === 1 ? "" : "s"}
                            </span>
                        </header>
                        <MobileCarousel images={healed} imgAltPrefix="Healed work" label="Healed Works" />
                        <ImageGrid images={healed} imgAltPrefix="Healed work" label="Healed Works" />
                    </section>
                )}

                {sketches.length > 0 && (
                    <section className="w-full">
                        <header className="mb-2 sm:mb-3 flex items-end justify-between">
                            <h3 className="text-base sm:text-lg font-semibold portfolio-section-title">Upcoming Sketches & Ideas</h3>
                            <span className="text-xs portfolio-section-count">
                                {sketches.length} image{sketches.length === 1 ? "" : "s"}
                            </span>
                        </header>
                        <MobileCarousel images={sketches} imgAltPrefix="Sketch" label="Upcoming Sketches" />
                        <ImageGrid images={sketches} imgAltPrefix="Sketch" label="Upcoming Sketches" />
                    </section>
                )}
            </div>

            {zoom && <FullscreenZoom src={zoom.items[zoom.index]} count={`${zoom.label}: ${zoom.index + 1} / ${zoom.items.length}`} onPrev={goPrev} onNext={goNext} onClose={closeZoom} />}
        </div>
    );
};

export default ArtistPortfolio;