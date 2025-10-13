import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, X, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export type ArtistWithGroups = {
    _id: string;
    clerkId?: string;
    username: string;
    bio?: string;
    pastWorks: string[];
    sketches?: string[];
};

export type PortfolioProps = {
    artist: ArtistWithGroups;
    onNext?: () => void;
    onGoToStep?: (step: 0 | 1 | 2) => void;
    onClose?: () => void; // used for closing the whole sheet/wizard if desired
};

const sr = (text: string) => (
    <span className="sr-only">{text}</span>
);

const ArtistPortfolio: React.FC<PortfolioProps> = ({ artist, onNext, onGoToStep, onClose }) => {
    const prefersReducedMotion = useReducedMotion();

    // --- Modal zoom state ---
    const [zoomIndex, setZoomIndex] = useState<number | null>(null);
    const allImages = useMemo(() => {
        const works = artist?.pastWorks ?? [];
        const sketches = artist?.sketches ?? [];
        return [...works, ...sketches];
    }, [artist]);

    const openZoom = (index: number) => setZoomIndex(index);
    const closeZoom = () => setZoomIndex(null);
    const goPrev = () => setZoomIndex((i) => (i === null ? i : (i + allImages.length - 1) % allImages.length));
    const goNext = () => setZoomIndex((i) => (i === null ? i : (i + 1) % allImages.length));

    // --- Global key handling (Esc + arrows when modal is open) ---
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") return closeZoom();
            if (zoomIndex !== null) {
                if (e.key === "ArrowLeft") return goPrev();
                if (e.key === "ArrowRight") return goNext();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [zoomIndex]);

    // --- ImageGrid subcomponent ---
    const ImageGrid: React.FC<{ images: string[]; imgAltPrefix: string; startOffset?: number }> = ({ images, imgAltPrefix, startOffset = 0 }) => (
        <div className="w-full flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 place-items-center w-full">
                {images.map((src, i) => (
                    <button
                        key={`${src}-${i}`}
                        onClick={() => openZoom(startOffset + i)}
                        className="group relative w-full max-w-[320px] aspect-[4/3] rounded-2xl border shadow-sm overflow-hidden flex items-center justify-center ring-offset-background transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                        aria-label={`Open ${imgAltPrefix} ${i + 1}`}
                    >
                        <img
                            src={src}
                            alt={`${imgAltPrefix} ${i + 1}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading={i < 4 ? "eager" : "lazy"}
                            fetchPriority={i < 4 ? "high" : undefined}
                            decoding="async"
                            referrerPolicy="no-referrer"
                        />
                        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                            <div className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium shadow-sm backdrop-blur-sm border"
                                style={{ background: "color-mix(in oklab, var(--elevated) 80%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}>
                                <Maximize2 className="h-3.5 w-3.5" /> View
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <div className="sticky top-0 z-20 border-b backdrop-blur supports-[backdrop-filter]:bg-background/70" style={{ borderColor: "var(--border)" }}>
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2">
                            {[0, 1, 2].map((i) => (
                                <button
                                    key={i}
                                    onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                                    aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                                    className={`h-2.5 w-6 rounded-full transition-all ${i === 0 ? "bg-foreground/90" : "bg-foreground/30 hover:bg-foreground/60"}`}
                                    style={{ background: i === 0 ? "color-mix(in oklab, var(--fg) 95%, transparent)" : "color-mix(in oklab, var(--fg) 40%, transparent)" }}
                                />
                            ))}
                        </div>

                        <motion.div
                            initial={{ y: 0, opacity: 0.95 }}
                            animate={prefersReducedMotion ? {} : { y: [0, 4, 0] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                            className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm"
                            style={{ background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "color-mix(in oklab, var(--fg) 90%, transparent)", border: `1px solid var(--border)` }}
                        >
                            <ChevronDown className="h-4 w-4" />
                            <span>Scroll to explore the portfolio</span>
                        </motion.div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={onNext}
                                className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm"
                                style={{ background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)", border: `1px solid var(--border)` }}
                                variant="outline"
                            >
                                Next: Booking & Message
                            </Button>
                            {onClose && (
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                                    <X className="h-5 w-5" />{sr("Close")}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-8 sm:py-10 space-y-10">
                <section className="w-full">
                    <div className="mx-auto max-w-4xl rounded-2xl border shadow-sm p-6 sm:p-8 text-center bg-gradient-to-b from-transparent to-black/[.02]"
                        style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 92%, transparent)" }}>
                        <h3 className="text-xl font-semibold tracking-tight">About {artist.username}</h3>
                        <Separator className="my-4 opacity-60" />
                        <p className="mx-auto max-w-2xl text-sm sm:text-base leading-7"
                            style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                            {artist.bio || "No bio available."}
                        </p>
                    </div>
                </section>

                <section className="w-full">
                    <header className="mb-4 flex items-end justify-between">
                        <h3 className="text-lg font-semibold">Past Works</h3>
                        <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                            {artist.pastWorks?.length ? `${artist.pastWorks.length} image${artist.pastWorks.length === 1 ? "" : "s"}` : "—"}
                        </span>
                    </header>

                    {artist.pastWorks?.length ? (
                        <ImageGrid images={artist.pastWorks} imgAltPrefix="Past work" startOffset={0} />
                    ) : (
                        <p className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                            No past works to show yet.
                        </p>
                    )}
                </section>

                {/* Sketches */}
                {artist.sketches && artist.sketches.length > 0 && (
                    <section className="w-full">
                        <header className="mb-4 flex items-end justify-between">
                            <h3 className="text-lg font-semibold">Upcoming Sketches & Ideas</h3>
                            <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                {artist.sketches.length} image{artist.sketches.length === 1 ? "" : "s"}
                            </span>
                        </header>
                        <ImageGrid images={artist.sketches} imgAltPrefix="Sketch" startOffset={artist.pastWorks?.length ?? 0} />
                    </section>
                )}
            </div>

            {zoomIndex !== null && allImages[zoomIndex] && (
                <div
                    className="fixed inset-0 z-[1300] flex items-center justify-center p-4 md:p-6"
                    style={{ background: "color-mix(in oklab, var(--bg) 70%, black 30%)" }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Zoomed artwork"
                    onClick={closeZoom}
                >
                    <div className="absolute inset-0 backdrop-blur-sm" aria-hidden />

                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); goPrev(); }}
                            className="rounded-full"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); goNext(); }}
                            className="rounded-full"
                            aria-label="Next image"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); closeZoom(); }}
                            className="rounded-full"
                            aria-label="Close image"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <motion.img
                        key={allImages[zoomIndex]}
                        src={allImages[zoomIndex]}
                        alt="Zoomed artwork"
                        className="max-h-[90vh] max-w-[92vw] object-contain rounded-2xl border shadow-2xl"
                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                        onClick={(e) => e.stopPropagation()}
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
                        animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    />

                    <div className="absolute left-1/2 -translate-x-1/2 bottom-5 rounded-full px-3 py-1 text-xs font-medium shadow-sm border"
                        style={{ background: "color-mix(in oklab, var(--elevated) 88%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}>
                        {zoomIndex + 1} / {allImages.length}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtistPortfolio;