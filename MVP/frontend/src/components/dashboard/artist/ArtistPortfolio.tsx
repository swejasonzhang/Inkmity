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
    onClose?: () => void;
};

const ArtistPortfolio: React.FC<PortfolioProps> = ({ artist, onNext, onGoToStep }) => {
    const prefersReducedMotion = useReducedMotion();
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

    const ImageGrid: React.FC<{ images: string[]; imgAltPrefix: string; startOffset?: number }> = ({
        images,
        imgAltPrefix,
        startOffset = 0,
    }) => (
        <div className="w-full flex justify-center">
            <div
                className="mx-auto grid justify-items-center gap-4
        max-w-[calc(4*20rem+3*1rem)]
        grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]"
            >
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
                            <div
                                className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium shadow-sm backdrop-blur-sm border"
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

    return (
        <div className="w-full mt-5" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
                    <div className="py-3 sm:py-4">
                        <div
                            className="mx-auto w-full max-w-3xl
              flex items-center justify-evenly
              gap-4 sm:gap-6 py-2 sm:py-3 px-2 sm:px-3"
                        >
                            <div className="justify-self-end">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    {[0, 1, 2].map((i) => (
                                        <button
                                            key={i}
                                            onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                                            aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                                            className={`h-2.5 w-6 rounded-full transition-all ${i === 0 ? "bg-foreground/90" : "bg-foreground/30 hover:bg-foreground/60"
                                                }`}
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

                            <div className="justify-self-center">
                                <motion.div
                                    initial={{ y: 0, opacity: 0.95 }}
                                    animate={prefersReducedMotion ? {} : { y: [0, 4, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                    className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium shadow-sm"
                                    style={{
                                        background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                                        color: "color-mix(in oklab, var(--fg) 90%, transparent)",
                                        border: `1px solid var(--border)`,
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
                                        border: `1px solid var(--border)`,
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

            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-8 sm:py-10 space-y-10">
                <section className="w-full">
                    <div
                        className="mx-auto max-w-4xl rounded-2xl border shadow-sm p-6 sm:p-8 text-center bg-gradient-to-b from-transparent to-black/[.02]"
                        style={{
                            borderColor: "var(--border)",
                            background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                        }}
                    >
                        <h3 className="text-xl font-semibold tracking-tight">About {artist.username}</h3>
                        <Separator className="my-4 opacity-60" />
                        <p className="mx-auto max-w-2xl text-sm sm:text-base leading-7" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
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

            {/* Fullscreen Zoom + Magnifier */}
            {zoomIndex !== null && allImages[zoomIndex] && (
                <FullscreenZoom
                    src={allImages[zoomIndex]}
                    count={`${zoomIndex + 1} / ${allImages.length}`}
                    onPrev={goPrev}
                    onNext={goNext}
                    onClose={closeZoom}
                    prefersReducedMotion={!!prefersReducedMotion}
                />
            )}
        </div>
    );
};

export default ArtistPortfolio;

/** =================== Fullscreen Zoom with Magnifier =================== */

const FullscreenZoom: React.FC<{
    src: string;
    count: string;
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
    prefersReducedMotion: boolean;
}> = ({ src, count, onPrev, onNext, onClose, prefersReducedMotion }) => {
    const imgWrapRef = useRef<HTMLDivElement | null>(null);
    const [lensOn, setLensOn] = useState(false);
    const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(2.2); // magnification
    const lensSize = useResponsiveLensSize();

    const updatePos = (clientX: number, clientY: number) => {
        const wrap = imgWrapRef.current;
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        setLensPos({ x, y });
    };

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setLensOn(true);
        updatePos(e.clientX, e.clientY);
    };

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        if (!lensOn) return;
        updatePos(e.clientX, e.clientY);
    };

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        setLensOn(false);
    };

    const toggleLens = () => setLensOn((v) => !v);

    return (
        <div
            className="fixed inset-0 z-[1300] flex items-center justify-center"
            style={{
                background: "color-mix(in oklab, var(--bg) 85%, black 15%)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Zoomed artwork"
            onClick={onClose}
        >
            <div className="absolute inset-0 backdrop-blur-sm" aria-hidden />

            <div
                className="relative w-screen h-screen flex items-center justify-center px-2 sm:px-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Prev / Next beside image */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPrev}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full"
                    aria-label="Previous image"
                >
                    <ChevronLeft className="h-7 w-7" />
                </Button>

                <div
                    ref={imgWrapRef}
                    className="relative max-w-[98vw] max-h-[96vh] w-screen h-screen flex items-center justify-center"
                    style={{ overflow: "hidden" }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={() => setLensOn(false)}
                >
                    <motion.img
                        key={src}
                        src={src}
                        alt="Zoomed artwork"
                        className="w-screen h-screen object-contain select-none"
                        draggable={false}
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.985 }}
                        animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    />

                    {/* Magnifier lens */}
                    {lensOn && (
                        <div
                            className="pointer-events-none absolute rounded-full border shadow-xl"
                            style={{
                                width: lensSize,
                                height: lensSize,
                                left: lensPos.x - lensSize / 2,
                                top: lensPos.y - lensSize / 2,
                                borderColor: "var(--border)",
                                boxShadow: "0 8px 24px rgba(0,0,0,.35)",
                                backgroundImage: `url("${src}")`,
                                backgroundRepeat: "no-repeat",
                                backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
                                backgroundPosition: `${-(lensPos.x * (zoom - 1))}px ${-(lensPos.y * (zoom - 1))}px`,
                                backdropFilter: "none",
                            }}
                        />
                    )}

                    {/* Lens controls (mobile-friendly) */}
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/70 backdrop-blur rounded-full border px-2 py-1"
                        style={{ borderColor: "var(--border)", color: "var(--fg)" }}>
                        <Button size="sm" variant="ghost" onClick={toggleLens} className="h-7 px-3 rounded-full">
                            {lensOn ? "Hide Lens" : "Show Lens"}
                        </Button>
                        <input
                            type="range"
                            min={1.4}
                            max={3.5}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="h-1.5 w-28 accent-current"
                            aria-label="Magnification"
                        />
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onNext}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full"
                    aria-label="Next image"
                >
                    <ChevronRight className="h-7 w-7" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full"
                    aria-label="Close image"
                >
                    <X className="h-5 w-5" />
                </Button>

                <div
                    className="absolute left-1/2 -translate-x-1/2 top-3 sm:top-4 rounded-full px-3 py-1 text-xs font-medium shadow-sm border"
                    style={{
                        background: "color-mix(in oklab, var(--elevated) 88%, transparent)",
                        borderColor: "var(--border)",
                        color: "var(--fg)",
                    }}
                >
                    {count}
                </div>
            </div>
        </div>
    );
};

function useResponsiveLensSize() {
    const [size, setSize] = useState(220);
    useEffect(() => {
        const onResize = () => {
            const w = window.innerWidth;
            if (w < 480) setSize(160);
            else if (w < 768) setSize(190);
            else setSize(220);
        };
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return size;
}