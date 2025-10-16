import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import FullscreenZoom from "./FullscreenZoom";

export type ArtistWithGroups = {
    _id: string;
    clerkId?: string;
    username: string;
    bio?: string;
    pastWorks: string[];
    sketches?: string[];
    avatarUrl?: string;
};

export type PortfolioProps = {
    artist: ArtistWithGroups;
    onNext?: () => void;
    onGoToStep?: (step: 0 | 1 | 2) => void;
    onClose?: () => void;
};

const ArtistPortfolio: React.FC<PortfolioProps> = ({ artist, onNext, onGoToStep }) => {
    const prefersReducedMotion = useReducedMotion();
    const past = useMemo(() => artist?.pastWorks ?? [], [artist]);
    const sketches = useMemo(() => artist?.sketches ?? [], [artist]);
    const initials = useMemo(() => (artist?.username?.[0]?.toUpperCase?.() ?? "?"), [artist]);
    const [zoom, setZoom] = useState<null | { items: string[]; index: number; label: "Past Works" | "Upcoming Sketches" }>(null);

    const openZoom = (items: string[], index: number, label: "Past Works" | "Upcoming Sketches") =>
        setZoom({ items, index, label });
    const closeZoom = () => setZoom(null);
    const goPrev = () => setZoom((z) => (z ? { ...z, index: (z.index + z.items.length - 1) % z.items.length } : z));
    const goNext = () => setZoom((z) => (z ? { ...z, index: (z.index + 1) % z.items.length } : z));

    const ImageGrid: React.FC<{ images: string[]; imgAltPrefix: string; label: "Past Works" | "Upcoming Sketches" }> = ({
        images,
        imgAltPrefix,
        label,
    }) => (
        <div className="w-full hidden sm:flex justify-center">
            <div className="mx-auto grid justify-items-center gap-5 max-w-[calc(4*22rem+3*1.25rem)] grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]">
                {images.map((src, i) => (
                    <button
                        key={`${src}-${i}`}
                        onClick={() => openZoom(images, i, label)}
                        className="group relative w-full max-w-[360px] aspect-[4/3] rounded-3xl border shadow-sm overflow-hidden flex items-center justify-center ring-offset-background transition-all hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                        aria-label={`Open ${imgAltPrefix} ${i + 1}`}
                    >
                        <img
                            src={src}
                            alt={`${imgAltPrefix} ${i + 1}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                            loading={i < 4 ? "eager" : "lazy"}
                            fetchPriority={i < 4 ? "high" : undefined}
                            decoding="async"
                            referrerPolicy="no-referrer"
                        />
                        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                            <div
                                className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm border"
                                style={{
                                    background: "color-mix(in oklab, var(--elevated) 80%, transparent)",
                                    borderColor: "var(--border)",
                                    color: "var(--fg)",
                                }}
                            >
                                <Maximize2 className="h-3.5 w-3.5" /> View
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    const MobileCarousel: React.FC<{ images: string[]; imgAltPrefix: string; label: "Past Works" | "Upcoming Sketches" }> = ({
        images,
        imgAltPrefix,
        label,
    }) => {
        const [index, setIndex] = useState(0);
        const swipeTo = (dir: "prev" | "next") => {
            setIndex((i) => {
                if (dir === "prev") return (i + images.length - 1) % images.length;
                return (i + 1) % images.length;
            });
        };
        const onDragEnd = (_: any, info: { offset: { x: number } }) => {
            const threshold = 50;
            if (info.offset.x < -threshold) swipeTo("next");
            else if (info.offset.x > threshold) swipeTo("prev");
        };
        if (!images.length) return null;
        const src = images[index];

        return (
            <div className="sm:hidden">
                <div className="w-full">
                    <div
                        className="relative w-full mx-auto max-w-full rounded-2xl overflow-hidden border"
                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                    >
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
                            <div className="w-full aspect-[4/3]">
                                <img
                                    src={src}
                                    alt={`${imgAltPrefix} ${index + 1}`}
                                    className="h-full w-full object-cover"
                                    loading="eager"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        </motion.button>
                        <div
                            className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm border"
                            style={{
                                background: "color-mix(in oklab, var(--elevated) 80%, transparent)",
                                borderColor: "var(--border)",
                                color: "var(--fg)",
                            }}
                        >
                            <Maximize2 className="h-3.5 w-3.5" /> View
                        </div>
                        <div className="absolute left-0 right-0 -bottom-8 flex justify-center gap-2 py-3">
                            {images.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setIndex(i)}
                                    aria-label={`Go to ${label} ${i + 1}`}
                                    className={`h-2.5 w-6 rounded-full ${i === index ? "opacity-90" : "opacity-40"}`}
                                    style={{
                                        background:
                                            i === index
                                                ? "color-mix(in oklab, var(--fg) 95%, transparent)"
                                                : "color-mix(in oklab, var(--fg) 40%, transparent)",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="sm:hidden grid grid-cols-2 gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => swipeTo("prev")}
                            className="rounded-xl"
                            style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => swipeTo("next")}
                            className="rounded-xl"
                            style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

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
        <div className="w-full mt-6" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
                    <div className="py-3 sm:py-4">
                        <div className="mx-auto w-full max-w-3xl grid grid-cols-3 items-stretch gap-3 sm:gap-6 h-12 sm:h-14 px-2 sm:px-3">
                            <div className="flex items-center h-full">
                                <div className="flex items-center gap-2 sm:gap-4">
                                    {[0, 1, 2].map((i) => (
                                        <button
                                            key={i}
                                            onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                                            aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                                            className="h-2.5 w-6 rounded-full transition-all"
                                            style={{
                                                background:
                                                    i === 0
                                                        ? "color-mix(in oklab, var(--fg) 95%, transparent)"
                                                        : "color-mix(in oklab, var(--fg) 40%, transparent)",
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-center h-full">
                                <motion.div
                                    initial={{ y: 0, opacity: 0.95 }}
                                    animate={prefersReducedMotion ? {} : { y: [0, 4, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                    className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium shadow-sm"
                                    style={{
                                        background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                                        color: "color-mix(in oklab, var(--fg) 90%, transparent)",
                                    }}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                    <span>Scroll to explore the portfolio</span>
                                </motion.div>
                                <div className="sm:hidden block h-6" />
                            </div>
                            <div className="flex items-center justify-end h-full">
                                <Button
                                    onClick={onNext}
                                    className="rounded-xl px-3 sm:px-4 py-2 text-sm font-medium shadow-sm border-0"
                                    style={{
                                        background: "color-mix(in oklab, var(--elevated) 96%, transparent)",
                                        color: "var(--fg)",
                                    }}
                                    variant="outline"
                                >
                                    Next: Booking &amp; Message
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-screen-2xl px-3 sm:px-6 py-8 sm:py-12 space-y-10 sm:space-y-12">
                <section className="w-full mt-1">
                    <div className="mx-auto max-w-4xl rounded-2xl border shadow-sm p-5 sm:p-9 text-center" style={{ borderColor: "var(--border)" }}>
                        <div className="flex flex-col items-center gap-4 sm:gap-5 mb-4 sm:mb-6">
                            {artist.avatarUrl ? (
                                <img
                                    src={artist.avatarUrl}
                                    alt={`${artist.username} profile picture`}
                                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border shadow"
                                    style={{ borderColor: "var(--border)" }}
                                    loading="eager"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div
                                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-full grid place-items-center border shadow text-2xl sm:text-3xl font-semibold"
                                    style={{
                                        borderColor: "var(--border)",
                                        background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                                        color: "var(--fg)",
                                    }}
                                    aria-label={`${artist.username} profile placeholder`}
                                >
                                    {initials}
                                </div>
                            )}
                            <h3 className="text-lg sm:text-xl font-semibold tracking-tight">About {artist.username}</h3>
                        </div>
                        <Separator className="my-4 sm:my-5 opacity-60" />
                        <p className="mx-auto max-w-2xl text-base sm:text-lg leading-7" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                            {artist.bio || "No bio available."}
                        </p>
                    </div>
                </section>

                <section className="w-full -mt-2">
                    <div className="mx-auto max-w-4xl text-center px-4">
                        <p
                            className="text-lg sm:text-xl font-bold leading-relaxed"
                            style={{ color: "color-mix(in oklab, var(--fg) 88%, transparent)" }}
                        >
                            View the gallery below and click any image to zoom. Press &amp; hold while zoomed for a
                            powerful “microscope” magnification.
                        </p>
                    </div>
                </section>

                <section className="w-full">
                    <header className="mb-4 sm:mb-5 flex items-end justify-between">
                        <h3 className="text-base sm:text-lg font-semibold">Past Works</h3>
                        <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                            {past.length ? `${past.length} image${past.length === 1 ? "" : "s"}` : "—"}
                        </span>
                    </header>

                    <MobileCarousel images={past} imgAltPrefix="Past work" label="Past Works" />

                    {past.length ? (
                        <ImageGrid images={past} imgAltPrefix="Past work" label="Past Works" />
                    ) : (
                        <p className="hidden sm:block text-sm" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                            No past works to show yet.
                        </p>
                    )}
                </section>

                {sketches.length > 0 && (
                    <section className="w-full">
                        <header className="mb-4 sm:mb-5 flex items-end justify-between">
                            <h3 className="text-base sm:text-lg font-semibold">Upcoming Sketches & Ideas</h3>
                            <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                {sketches.length} image{sketches.length === 1 ? "" : "s"}
                            </span>
                        </header>

                        <MobileCarousel images={sketches} imgAltPrefix="Sketch" label="Upcoming Sketches" />

                        <ImageGrid images={sketches} imgAltPrefix="Sketch" label="Upcoming Sketches" />
                    </section>
                )}
            </div>

            {zoom && (
                <FullscreenZoom
                    src={zoom.items[zoom.index]}
                    count={`${zoom.label}: ${zoom.index + 1} / ${zoom.items.length}`}
                    onPrev={goPrev}
                    onNext={goNext}
                    onClose={closeZoom}
                />
            )}
        </div>
    );
};

export default ArtistPortfolio;