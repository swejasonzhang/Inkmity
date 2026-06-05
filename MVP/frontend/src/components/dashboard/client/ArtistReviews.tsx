import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { API_URL } from "@/api";
import type { ArtistWithGroups } from "./ArtistPortfolio";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Pagination from "@/components/dashboard/shared/Pagination";
import { Star, X } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

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
                            color: filled || half ? "var(--fg)" : "color-mix(in srgb, var(--fg) 35%, transparent)",
                            fill: filled ? "var(--fg)" : half ? "color-mix(in srgb, var(--fg) 70%, transparent)" : "transparent",
                            stroke: "currentColor"
                        }}
                    />
                );
            })}
        </div>
    );
});
Stars.displayName = "Stars";

const joinUrl = (base: string, path: string) => `${base.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;

const PER_PAGE = 6;

const mapReview = (raw: any): Review => {
    const author = raw?.authorName || raw?.reviewerName || raw?.reviewer?.username || raw?.reviewer?.email || "Client";
    return {
        _id: String(raw?._id ?? (raw?.createdAt ?? "") + (raw?.rating ?? "") + (raw?.authorName ?? "")),
        authorName: String(author),
        rating: Number(raw?.rating ?? 0),
        createdAt: raw?.createdAt ?? new Date().toISOString(),
        title: raw?.title || undefined,
        body: String(raw?.comment ?? raw?.body ?? ""),
        photos: Array.isArray(raw?.photos) ? raw.photos : undefined
    };
};

const ReviewCard: React.FC<{ r: Review; onZoom: (src: string) => void }> = React.memo(({ r, onZoom }) => {
    return (
        <Card className="w-full h-full flex flex-col shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
            <CardHeader className="text-left">
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{r.title || "Untitled review"}</span>
                    <span className="ml-2 whitespace-nowrap inline-flex items-center gap-1">
                        <Stars value={r.rating} />
                    </span>
                </CardTitle>
                <div className="text-xs mt-1" style={{ color: "color-mix(in srgb, var(--fg) 60%, transparent)" }}>
                    by {r.authorName} • {fmtDate(r.createdAt)}
                </div>
            </CardHeader>
            <CardContent className="text-left space-y-3">
                <p className="text-sm leading-relaxed" style={{ color: "color-mix(in srgb, var(--fg) 88%, transparent)" }}>{r.body}</p>
                {r.photos && r.photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {r.photos.slice(0, 6).map((src, idx) => (
                            <button
                                key={`${r._id}-photo-${idx}`}
                                onClick={() => onZoom(src)}
                                className="aspect-square rounded-md overflow-hidden border touch-manipulation"
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

const ReviewCardSkeleton: React.FC = () => (
    <Card className="w-full h-full flex flex-col shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
        <CardHeader className="text-left">
            <div className="flex items-center justify-between gap-2">
                <span className="ink-shimmer h-4 w-1/2 rounded" />
                <span className="ink-shimmer h-4 w-20 rounded-full" />
            </div>
            <span className="ink-shimmer h-3 w-2/3 rounded mt-2" />
        </CardHeader>
        <CardContent className="space-y-2">
            <span className="ink-shimmer block h-3 w-full rounded" />
            <span className="ink-shimmer block h-3 w-5/6 rounded" />
            <span className="ink-shimmer block h-3 w-3/4 rounded" />
        </CardContent>
    </Card>
);

export default function ArtistReviews({ artist, reviews = [], averageRating }: ReviewsProps) {
    const { getToken } = useAuth();
    const [sort, setSort] = useState<"recent" | "high" | "low">("recent");
    const [zoomSrc, setZoomSrc] = useState<string | null>(null);
    const [remoteReviews, setRemoteReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadErr, setLoadErr] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [minElapsed, setMinElapsed] = useState<boolean>(false);
    const cacheRef = useRef<Map<string, Review[]>>(new Map());
    const abortRef = useRef<AbortController | null>(null);
    const [isSorting, startTransition] = useTransition();

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setZoomSrc(null);
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => setMinElapsed(true), 2000);
        return () => window.clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!zoomSrc) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [zoomSrc]);

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
            setPage(1);
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
                const url = joinUrl(API_URL, `/users/artists/${artist._id}`);
                const res = await fetch(url, {
                    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    signal: controller.signal,
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
                    setPage(1);
                }
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
    const totalPages = Math.max(1, Math.ceil(deferredSorted.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageItems = deferredSorted.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
    const pending = !reviews.length && (loading || !minElapsed);

    const avgDisplay = useMemo(() => {
        if (typeof averageRating === "number") return averageRating;
        if (!effectiveReviews.length) return 0;
        const sum = effectiveReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        return Math.round((sum / effectiveReviews.length) * 10) / 10;
    }, [effectiveReviews, averageRating]);

    const onChangeSort = useCallback((v: "recent" | "high" | "low") => {
        startTransition(() => { setSort(v); setPage(1); });
    }, [startTransition]);

    return (
        <div className="w-full" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <div className="mx-auto max-w-screen-2xl px-1.5 sm:px-2.5 pt-[10px] pb-6 space-y-4 sm:space-y-5">
                <Card className="w-full shadow-none overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)", paddingTop: 0, paddingBottom: 0, gap: 0 }}>
                    <CardContent className="flex flex-col items-center gap-3 px-4 sm:px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-2 text-base sm:text-lg font-bold" style={{ color: "var(--fg)" }}>
                            <Star style={{ width: 18, height: 18 }} /> Client Reviews
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            {pending ? (
                                <>
                                    <span className="ink-shimmer h-4 w-24 rounded" />
                                    <span className="ink-shimmer h-4 w-16 rounded" />
                                </>
                            ) : (
                                <>
                                    <Stars value={avgDisplay} />
                                    <span className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
                                        {avgDisplay ? `${avgDisplay} / 5` : "No ratings yet"}
                                    </span>
                                    {effectiveReviews.length > 0 && (
                                        <span className="text-sm" style={{ color: "color-mix(in srgb, var(--fg) 60%, transparent)" }}>
                                            · {effectiveReviews.length} review{effectiveReviews.length === 1 ? "" : "s"}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>Sort</span>
                            <Select value={sort} onValueChange={(v) => onChangeSort(v as typeof sort)}>
                                <SelectTrigger className="w-[160px] text-sm justify-center rounded-full" style={{ background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }}>
                                    <SelectValue placeholder="Sort by" className="text-center" />
                                </SelectTrigger>
                                <SelectContent
                                    position="popper"
                                    align="center"
                                    sideOffset={4}
                                    className="z-[2000] p-1 rounded-xl"
                                    style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
                                >
                                    <SelectItem value="recent" className="text-center justify-center rounded-md">Most recent</SelectItem>
                                    <SelectItem value="high" className="text-center justify-center rounded-md">Highest rating</SelectItem>
                                    <SelectItem value="low" className="text-center justify-center rounded-md">Lowest rating</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isSorting && (
                            <div className="text-xs" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>
                                Optimizing…
                            </div>
                        )}
                    </CardContent>
                </Card>

                {loadErr && !effectiveReviews.length ? (
                    <Card className="w-full shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
                        <CardContent className="px-4 py-3 flex items-center justify-between gap-3">
                            <span className="text-sm" style={{ color: "color-mix(in srgb, var(--fg) 65%, transparent)" }}>{loadErr}</span>
                            <Button onClick={() => { setLoadErr(null); setRemoteReviews([]); }} variant="outline" className="px-3 py-1" style={{ borderColor: "var(--border)" }}>
                                Dismiss
                            </Button>
                        </CardContent>
                    </Card>
                ) : null}

                {pending ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                        {Array.from({ length: 6 }).map((_, i) => <ReviewCardSkeleton key={i} />)}
                    </div>
                ) : deferredSorted.length === 0 ? (
                    <Card className="w-full shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
                        <CardContent className="px-4 py-3">
                            <div className="text-sm" style={{ color: "color-mix(in srgb, var(--fg) 65%, transparent)" }}>No reviews yet.</div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                            {pageItems.map(r => <ReviewCard key={r._id} r={r} onZoom={setZoomSrc} />)}
                        </div>
                        {totalPages > 1 && (
                            <div className="pt-2 w-full flex justify-center">
                                <Pagination
                                    currentPage={safePage}
                                    totalPages={totalPages}
                                    onPrev={() => setPage(p => Math.max(1, p - 1))}
                                    onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {zoomSrc && (
                <div
                    className="fixed inset-0 z-[1300] flex items-center justify-center p-2 sm:p-4"
                    style={{ background: "color-mix(in srgb, var(--bg) 75%, black 25%)" }}
                    onClick={() => setZoomSrc(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <button
                        className="absolute top-2 right-2 sm:top-4 sm:right-4 rounded-full p-2"
                        onClick={() => setZoomSrc(null)}
                        aria-label="Close image"
                        style={{ color: "var(--fg)" }}
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={zoomSrc}
                        alt="Review image"
                        className="max-h-[90vh] max-w-[96vw] sm:max-w-[90vw] object-contain rounded-xl border"
                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}