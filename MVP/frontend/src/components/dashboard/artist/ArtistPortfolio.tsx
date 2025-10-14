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

    const [zoom, setZoom] = useState<null | { items: string[]; index: number; label: "Past Works" | "Upcoming Sketches" }>(null);

    const openZoom = (items: string[], index: number, label: "Past Works" | "Upcoming Sketches") =>
        setZoom({ items, index, label });

    const closeZoom = () => setZoom(null);

    const goPrev = () =>
        setZoom((z) =>
            z ? { ...z, index: (z.index + z.items.length - 1) % z.items.length } : z
        );

    const goNext = () =>
        setZoom((z) => (z ? { ...z, index: (z.index + 1) % z.items.length } : z));

    const ImageGrid: React.FC<{ images: string[]; imgAltPrefix: string; label: "Past Works" | "Upcoming Sketches" }> = ({
        images,
        imgAltPrefix,
        label
    }) => (
        <div className="w-full flex justify-center">
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
                                    color: "var(--fg)"
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
                        <div className="mx-auto w-full max-w-3xl flex items-center justify-evenly gap-4 sm:gap-6 py-2 sm:py-3 px-2 sm:px-3">
                            <div className="justify-self-end">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    {[0, 1, 2].map((i) => (
                                        <button
                                            key={i}
                                            onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                                            aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                                            className={`h-2.5 w-6 rounded-full transition-all ${i === 0 ? "bg-foreground/90" : "bg-foreground/30 hover:bg-foreground/60"}`}
                                            style={{
                                                background:
                                                    i === 0
                                                        ? "color-mix(in oklab, var(--fg) 95%, transparent)"
                                                        : "color-mix(in oklab, var(--fg) 40%, transparent)"
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="justify-self-center">
                                <motion.div
                                    initial={{ y: 0, opacity: 0.95 }}
                                    animate={prefersReducedMotion ? {} : { y: [0, 4, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                    className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium shadow-sm"
                                    style={{
                                        background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                                        color: "color-mix(in oklab, var(--fg) 90%, transparent)",
                                        border: `1px solid var(--border)`
                                    }}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                    <span>Scroll to explore the portfolio</span>
                                </motion.div>
                                <div className="sm:hidden block h-6" />
                            </div>
                            <div className="justify-self-center">
                                <Button
                                    onClick={onNext}
                                    className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm"
                                    style={{
                                        background: "color-mix(in oklab, var(--elevated) 96%, transparent)",
                                        color: "var(--fg)",
                                        border: `1px solid var(--border)`
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

            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-10 sm:py-12 space-y-12">
                <section className="w-full mt-2">
                    <div
                        className="mx-auto max-w-4xl rounded-2xl border shadow-sm p-7 sm:p-9 text-center"
                    >
                        <h3 className="text-xl font-semibold tracking-tight">About {artist.username}</h3>
                        <Separator className="my-5 opacity-60" />
                        <p className="mx-auto max-w-2xl text-base sm:text-lg leading-7" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                            {artist.bio || "No bio available."}
                        </p>
                    </div>
                </section>

                <section className="w-full">
                    <header className="mb-5 flex items-end justify-between">
                        <h3 className="text-lg font-semibold">Past Works</h3>
                        <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                            {past.length ? `${past.length} image${past.length === 1 ? "" : "s"}` : "—"}
                        </span>
                    </header>
                    {past.length ? (
                        <ImageGrid images={past} imgAltPrefix="Past work" label="Past Works" />
                    ) : (
                        <p className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                            No past works to show yet.
                        </p>
                    )}
                </section>

                {sketches.length > 0 && (
                    <section className="w-full">
                        <header className="mb-5 flex items-end justify-between">
                            <h3 className="text-lg font-semibold">Upcoming Sketches & Ideas</h3>
                            <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                {sketches.length} image{sketches.length === 1 ? "" : "s"}
                            </span>
                        </header>
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