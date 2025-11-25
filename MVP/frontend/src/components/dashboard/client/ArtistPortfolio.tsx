import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import FullscreenZoom from "./FullscreenZoom";

export type ArtistWithGroups = {
    _id: string;
    clerkId: string;
    username: string;
    bio?: string;
    pastWorks?: string[];
    healedWorks?: string[];
    sketches?: string[];
    avatarUrl?: string;
    coverImage?: string;
    profileImage?: string;
    avatar?: { url?: string; publicId?: string };
};

export type PortfolioProps = {
    artist: ArtistWithGroups;
};

const ArtistPortfolio: React.FC<PortfolioProps> = ({ artist }) => {
    const past = useMemo(() => (artist?.pastWorks ?? []).filter(Boolean), [artist]);
    const healed = useMemo(() => (artist?.healedWorks ?? []).filter(Boolean), [artist]);
    const sketches = useMemo(() => (artist?.sketches ?? []).filter(Boolean), [artist]);
    const initials = useMemo(() => (artist?.username || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join(""), [artist.username]);
    const [zoom, setZoom] = useState<null | { items: string[]; index: number; label: "Past Works" | "Healed Works" | "Upcoming Sketches" }>(null);
    
    const profileImageUrl = artist.profileImage || artist.avatar?.url || artist.avatarUrl || "";
    const coverImageUrl = artist.coverImage || "";
    const [avatarOk, setAvatarOk] = useState(Boolean(profileImageUrl));
    const [bgOk, setBgOk] = useState(Boolean(coverImageUrl));

    useEffect(() => {
        const newProfileImageUrl = artist.profileImage || artist.avatar?.url || artist.avatarUrl || "";
        const newCoverImageUrl = artist.coverImage || "";
        setAvatarOk(Boolean(newProfileImageUrl));
        setBgOk(Boolean(newCoverImageUrl));
    }, [artist.profileImage, artist.avatar?.url, artist.avatarUrl, artist.coverImage]);

    const openZoom = (items: string[], index: number, label: "Past Works" | "Healed Works" | "Upcoming Sketches") => setZoom({ items, index, label });
    const closeZoom = () => setZoom(null);
    const goPrev = () => setZoom(z => (z ? { ...z, index: (z.index + z.items.length - 1) % z.items.length } : z));
    const goNext = () => setZoom(z => (z ? { ...z, index: (z.index + 1) % z.items.length } : z));

    const ImageGrid: React.FC<{ images: string[]; imgAltPrefix: string; label: "Past Works" | "Healed Works" | "Upcoming Sketches" }> = ({ images, imgAltPrefix, label }) =>
        images.length ? (
            <div className="w-full hidden sm:flex justify-center">
                <div className="mx-auto grid justify-items-center gap-5 max-w-[calc(4*22rem+3*1.25rem)] grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]">
                    {images.map((src, i) => (
                        <button
                            key={`${src}-${i}`}
                            onClick={() => openZoom(images, i, label)}
                            className="group relative w-full max-w-[360px] rounded-3xl border shadow-sm overflow-hidden flex items-center justify-center ring-offset-background transition-all hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            style={{ borderColor: "var(--border)", backgroundColor: "var(--elevated)" }}
                            aria-label={`Open ${imgAltPrefix} ${i + 1}`}
                        >
                            <img
                                src={src}
                                alt={`${imgAltPrefix} ${i + 1}`}
                                className="block max-w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[0.97]"
                                loading={i < 4 ? "eager" : "lazy"}
                                fetchPriority={i < 4 ? "high" : undefined}
                                decoding="async"
                                referrerPolicy="no-referrer"
                            />
                            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                <div
                                    className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm border"
                                    style={{ backgroundColor: "color-mix(in oklab, var(--elevated) 80%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}
                                >
                                    <Maximize2 className="h-3.5 w-3.5" /> View
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        ) : (
            <p className="hidden sm:block text-sm" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                No items to show yet.
            </p>
        );

    const MobileCarousel: React.FC<{ images: string[]; imgAltPrefix: string; label: "Past Works" | "Healed Works" | "Upcoming Sketches" }> = ({ images, imgAltPrefix, label }) => {
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
                            style={{ backgroundColor: "color-mix(in oklab, var(--elevated) 80%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}
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
                                style={{ backgroundColor: i === index ? "color-mix(in oklab, var(--fg) 95%, transparent)" : "color-mix(in oklab, var(--fg) 40%, transparent)" }}
                            />
                        ))}
                    </div>
                    <div className="sm:hidden grid grid-cols-2 gap-3 mt-6">
                        <Button variant="outline" onClick={() => swipeTo("prev")} className="rounded-xl" style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}>
                            Prev
                        </Button>
                        <Button variant="outline" onClick={() => swipeTo("next")} className="rounded-xl" style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}>
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
            <div className="mx-auto max-w-screen-2xl px-3 sm:px-6 space-y-10 sm:space-y-12">
                <section className="w-full overflow-hidden rounded-3xl border" style={{ borderColor: "var(--border)" }}>
                    <div className="relative w-full h-[15rem] sm:h-[18rem] md:h-[20rem] overflow-hidden" style={{ background: "var(--elevated)" }}>
                        {bgOk && coverImageUrl ? (
                            <img
                                src={coverImageUrl}
                                alt={`${artist.username} background`}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={() => setBgOk(false)}
                            />
                        ) : (
                            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bg) 85%, var(--fg) 15%), color-mix(in oklab, var(--bg) 78%, var(--fg) 22%))" }} />
                        )}
                        <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in oklab, var(--bg) 18%, transparent) 100%)" }} />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "6rem", background: "linear-gradient(to top, color-mix(in oklab, var(--bg) 90%, transparent), transparent)" }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center gap-2">
                            <div className="relative rounded-full overflow-hidden h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 ring-2 ring-[color:var(--card)]" style={{ border: `1px solid var(--border)`, background: "var(--card)" }}>
                                {avatarOk && profileImageUrl ? (
                                    <img
                                        src={profileImageUrl}
                                        alt={`${artist.username} profile`}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={() => setAvatarOk(false)}
                                    />
                                ) : (
                                    <span className="absolute inset-0 grid place-items-center text-3xl sm:text-4xl font-semibold" style={{ color: "var(--fg)" }}>
                                        {initials}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
                
                <section className="w-full -mt-4">
                    <Card className="w-full shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
                        <CardHeader className="text-center space-y-1 px-3 sm:px-6">
                            <CardTitle className="text-base sm:text-lg break-words">About {artist.username}</CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 sm:px-9">
                            <Separator className="my-4 sm:my-5 opacity-60" />
                            <p className="mx-auto max-w-2xl text-base sm:text-lg leading-7 text-center" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                {bioText}
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <section className="w-full -mt-2">
                    <div className="mx-auto max-w-4xl text-center px-4">
                        <p className="text-lg sm:text-xl font-bold leading-relaxed" style={{ color: "color-mix(in oklab, var(--fg) 88%, transparent)" }}>
                            View the gallery below and click any image to zoom. Press and hold while zoomed for magnification.
                        </p>
                    </div>
                </section>

                <section className="w-full">
                    <header className="mb-4 sm:mb-5 flex items-end justify-between">
                        <h3 className="text-base sm:text-lg font-semibold portfolio-section-title">Past Works</h3>
                        <span className="text-xs portfolio-section-count">
                            {past.length ? `${past.length} image${past.length === 1 ? "" : "s"}` : "—"}
                        </span>
                    </header>
                    <MobileCarousel images={past} imgAltPrefix="Past work" label="Past Works" />
                    <ImageGrid images={past} imgAltPrefix="Past work" label="Past Works" />
                </section>

                {healed.length > 0 && (
                    <section className="w-full">
                        <header className="mb-4 sm:mb-5 flex items-end justify-between">
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
                        <header className="mb-4 sm:mb-5 flex items-end justify-between">
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