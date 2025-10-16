import React, { useMemo, useState, useEffect, useRef, useCallback, useTransition, useDeferredValue } from "react";
import type { ArtistWithGroups } from "./ArtistPortfolio";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Star, X, ChevronDown } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { motion, useReducedMotion } from "framer-motion";

export type Review = {
    _id: string;
    authorName: string;
    rating: number;
    createdAt: string | Date;
    title?: string;
    body: string;
    photos?: string[];
};

type ReviewsProps = {
    artist: ArtistWithGroups;
    reviews?: Review[];
    averageRating?: number;
    onGoToStep?: (step: 0 | 1 | 2) => void;
    onBackToPortfolio?: () => void;
    onGoToBooking?: () => void;
    onClose?: () => void;
};

const fmtDate = (d: string | Date) => {
    const dateObj = typeof d === "string" ? new Date(d) : d;
    return dateObj.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const Stars: React.FC<{ value: number }> = React.memo(({ value }) => {
    const full = Math.floor(value);
    const hasHalf = value - full >= 0.5;
    return (
        <div className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => {
                const filled = i < full;
                const half = !filled && i === full && hasHalf;
                return (
                    <Star
                        key={i}
                        className="h-4 w-4"
                        style={{
                            color: filled || half ? "var(--fg)" : "color-mix(in oklab, var(--fg) 35%, transparent)",
                            fill: filled ? "var(--fg)" : half ? "color-mix(in oklab, var(--fg) 70%, transparent)" : "transparent",
                            stroke: "currentColor",
                        }}
                    />
                );
            })}
        </div>
    );
});
Stars.displayName = "Stars";

const ENV_API = (import.meta as any)?.env?.VITE_API_URL || import.meta.env?.VITE_API_URL || "";
const PRIMARY_BASE = String(ENV_API).replace(/\/$/, "");
const API_BASES = [PRIMARY_BASE, "/api"].filter(Boolean);
const joinUrl = (base: string, path: string) => `${base.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;

const INITIAL_BATCH = 12;
const BATCH_SIZE = 12;

const mapReview = (raw: any): Review => {
    const author = raw?.authorName || raw?.reviewerName || raw?.reviewer?.username || raw?.reviewer?.email || "Client";
    return {
        _id: String(raw?._id ?? (raw?.createdAt ?? "") + (raw?.rating ?? "") + (raw?.authorName ?? "")),
        authorName: String(author),
        rating: Number(raw?.rating ?? 0),
        createdAt: raw?.createdAt ?? new Date().toISOString(),
        title: raw?.title || undefined,
        body: String(raw?.comment ?? raw?.body ?? ""),
        photos: Array.isArray(raw?.photos) ? raw.photos : undefined,
    };
};

const ReviewCard: React.FC<{
    r: Review;
    onZoom: (src: string) => void;
}> = React.memo(({ r, onZoom }) => {
    return (
        <Card className="w-full h-full flex flex-col" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
            <CardHeader className="text-left">
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{r.title || "Untitled review"}</span>
                    <span className="ml-2 whitespace-nowrap inline-flex items-center gap-1">
                        <Stars value={r.rating} />
                    </span>
                </CardTitle>
                <div className="text-xs mt-1" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                    by {r.authorName} • {fmtDate(r.createdAt)}
                </div>
            </CardHeader>
            <CardContent className="text-left space-y-3">
                <p className="text-sm leading-relaxed" style={{ color: "color-mix(in oklab, var(--fg) 88%, transparent)" }}>
                    {r.body}
                </p>
                {r.photos && r.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {r.photos.slice(0, 6).map((src, idx) => (
                            <button
                                key={`${r._id}-photo-${idx}`}
                                onClick={() => onZoom(src)}
                                className="aspect-square rounded-md overflow-hidden border"
                                style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                aria-label={`Open review photo ${idx + 1}`}
                            >
                                <img src={src} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
ReviewCard.displayName = "ReviewCard";

const ArtistReviews: React.FC<ReviewsProps> = ({
    artist,
    reviews = [],
    averageRating,
    onGoToStep,
    onBackToPortfolio,
    onGoToBooking,
}) => {
    const prefersReducedMotion = useReducedMotion();
    const { getToken } = useAuth();

    const [sort, setSort] = useState<"recent" | "high" | "low">("recent");
    const [zoomSrc, setZoomSrc] = useState<string | null>(null);
    const [remoteReviews, setRemoteReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadErr, setLoadErr] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH);

    const cacheRef = useRef<Map<string, Review[]>>(new Map());
    const abortRef = useRef<AbortController | null>(null);
    const [isSorting, startTransition] = useTransition();

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setZoomSrc(null);
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, []);

    useEffect(() => {
        let cancelled = false;

        if (reviews.length) {
            setRemoteReviews([]);
            setLoadErr(null);
            return;
        }

        const cached = cacheRef.current.get(artist._id);
        if (cached) {
            setRemoteReviews(cached);
            setVisibleCount(INITIAL_BATCH);
            setLoadErr(null);
            return;
        }

        (async () => {
            setLoading(true);
            setLoadErr(null);

            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const token = await getToken();
                let lastErr: any = null;

                for (const base of API_BASES) {
                    try {
                        const url = joinUrl(base, `/users/${artist._id}`);
                        const res = await fetch(url, {
                            headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            signal: controller.signal,
                            cache: "force-cache",
                        });
                        const ctype = res.headers.get("content-type") || "";
                        if (!res.ok) {
                            const txt = await res.text().catch(() => "");
                            throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}\n${txt.slice(0, 200)}`);
                        }
                        if (!ctype.toLowerCase().includes("application/json")) {
                            const txt = await res.text().catch(() => "");
                            throw new Error(`Non-JSON response @ ${url}\n${txt.slice(0, 200)}`);
                        }
                        const json = await res.json();
                        const list: Review[] = Array.isArray(json?.reviews) ? json.reviews.map(mapReview) : [];
                        if (!cancelled) {
                            cacheRef.current.set(artist._id, list);
                            setRemoteReviews(list);
                            setVisibleCount(INITIAL_BATCH);
                        }
                        lastErr = null;
                        break;
                    } catch (e: any) {
                        if (controller.signal.aborted) return;
                        lastErr = e;
                        continue;
                    }
                }
                if (lastErr) throw lastErr;
            } catch (e: any) {
                if (!cancelled) setLoadErr(e?.message || "Failed to load reviews");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            abortRef.current?.abort();
        };
    }, [artist._id, getToken, reviews]);

    const effectiveReviews = reviews.length ? reviews : remoteReviews;

    const computedAvg = useMemo(() => {
        if (typeof averageRating === "number") return averageRating;
        if (!effectiveReviews.length) return 0;
        const sum = effectiveReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        return Math.round((sum / effectiveReviews.length) * 10) / 10;
    }, [effectiveReviews, averageRating]);

    const sorted = useMemo(() => {
        const arr = effectiveReviews.slice(0);
        switch (sort) {
            case "high":
                arr.sort((a, b) => b.rating - a.rating);
                break;
            case "low":
                arr.sort((a, b) => a.rating - b.rating);
                break;
            case "recent":
            default:
                arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
        }
        return arr;
    }, [effectiveReviews, sort]);

    const deferredSorted = useDeferredValue(sorted);
    const sliced = useMemo(() => deferredSorted.slice(0, Math.min(deferredSorted.length, visibleCount)), [deferredSorted, visibleCount]);
    const canShowMore = sliced.length < deferredSorted.length;

    const onChangeSort = useCallback((v: "recent" | "high" | "low") => {
        startTransition(() => setSort(v));
    }, []);

    const onZoom = useCallback((src: string) => setZoomSrc(src), []);

    return (
        <div className="w-full px-6 py-6 sm:py-8 space-y-6 flex flex-col items-center" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <div className="sticky top-0 z-20 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
                                            className="h-2.5 w-6 rounded-full transition-all"
                                            style={{
                                                background: i === 2 ? "color-mix(in oklab, var(--fg) 95%, transparent)" : "color-mix(in oklab, var(--fg) 40%, transparent)",
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
                                    }}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                    <span>Scroll to browse reviews or change the sort</span>
                                </motion.div>
                                <div className="sm:hidden h-6" />
                            </div>

                            <div className="justify-self-start">
                                <div className="inline-flex items-center gap-2 sm:gap-3 flex-nowrap whitespace-nowrap">
                                    <Button
                                        onClick={onGoToBooking ?? (() => onGoToStep?.(1))}
                                        className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm border-0"
                                        style={{ background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                                        variant="outline"
                                    >
                                        Back: Booking &amp; Message
                                    </Button>

                                    <Button
                                        onClick={onBackToPortfolio ?? (() => onGoToStep?.(0))}
                                        className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm border-0"
                                        style={{ background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                                        variant="outline"
                                    >
                                        Next: Portfolio
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-7xl flex flex-col items-center gap-4">
                <div className="w-full flex flex-col items-center gap-2 text-center">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">{artist.username} — Reviews</h3>
                    <div className="flex items-center gap-2">
                        <Stars value={computedAvg} />
                        <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                            {computedAvg ? `${computedAvg} / 5` : "No ratings yet"}
                        </span>
                        {effectiveReviews.length > 0 && (
                            <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                • {effectiveReviews.length} review{effectiveReviews.length === 1 ? "" : "s"}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <label className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                            Sort:
                        </label>
                        <select
                            value={sort}
                            onChange={(e) => onChangeSort(e.target.value as typeof sort)}
                            className="text-sm rounded-md px-2 py-1 border"
                            style={{
                                background: "var(--elevated)",
                                color: "var(--fg)",
                                borderColor: "var(--border)",
                            }}
                        >
                            <option value="recent">Most recent</option>
                            <option value="high">Highest rating</option>
                            <option value="low">Lowest rating</option>
                        </select>
                    </div>
                    {isSorting && <div className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 55%, transparent)" }}>Optimizing…</div>}
                </div>

                {loadErr && !effectiveReviews.length ? (
                    <div className="w-full max-w-2xl text-sm flex items-center justify-between gap-3">
                        <span style={{ color: "color-mix(in oklab, var(--fg) 65%, transparent)" }}>{loadErr}</span>
                        <Button
                            onClick={() => {
                                setLoadErr(null);
                                setRemoteReviews([]);
                            }}
                            variant="outline"
                            className="px-3 py-1"
                            style={{ borderColor: "var(--border)" }}
                        >
                            Dismiss
                        </Button>
                    </div>
                ) : null}

                {loading && !effectiveReviews.length ? (
                    <div className="w-full max-w-2xl text-sm" style={{ color: "var(--fg)" }}>
                        Loading reviews…
                    </div>
                ) : sliced.length === 0 ? (
                    <div className="w-full max-w-2xl text-sm" style={{ color: "color-mix(in oklab, var(--fg) 65%, transparent)" }}>
                        No reviews yet.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                            {sliced.map((r) => (
                                <ReviewCard key={r._id} r={r} onZoom={onZoom} />
                            ))}
                        </div>

                        {canShowMore && (
                            <div className="pt-2">
                                <Button
                                    onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
                                    variant="outline"
                                    className="rounded-lg px-4 py-2 text-sm font-medium"
                                    style={{
                                        background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                                        color: "var(--fg)",
                                        border: `1px solid var(--border)`,
                                    }}
                                >
                                    Show more
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {zoomSrc && (
                <div
                    className="fixed inset-0 z-[1300] flex items-center justify-center p-4"
                    style={{ background: "color-mix(in oklab, var(--bg) 75%, black 25%)" }}
                    onClick={() => setZoomSrc(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <button className="absolute top-4 right-4 rounded-full p-2" onClick={() => setZoomSrc(null)} aria-label="Close image" style={{ color: "var(--fg)" }}>
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={zoomSrc}
                        alt="Review image"
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl border"
                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default ArtistReviews;