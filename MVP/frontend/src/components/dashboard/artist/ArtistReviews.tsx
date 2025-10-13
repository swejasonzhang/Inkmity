import React, { useMemo, useState, useEffect } from "react";
import type { ArtistWithGroups } from "./ArtistPortfolio";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, X } from "lucide-react";

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

const Stars: React.FC<{ value: number }> = ({ value }) => {
    const full = Math.floor(value);
    const hasHalf = value - full >= 0.5;
    const items = Array.from({ length: 5 }, (_, i) => i);
    return (
        <div className="inline-flex items-center gap-0.5">
            {items.map((i) => {
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
};

const ArtistReviews: React.FC<ReviewsProps> = ({
    artist,
    reviews = [],
    averageRating,
    onGoToStep,
    onBackToPortfolio,
    onGoToBooking,
    onClose,
}) => {
    const [sort, setSort] = useState<"recent" | "high" | "low">("recent");
    const [zoomSrc, setZoomSrc] = useState<string | null>(null);

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setZoomSrc(null);
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, []);

    const computedAvg = useMemo(() => {
        if (typeof averageRating === "number") return averageRating;
        if (!reviews.length) return 0;
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        return Math.round((sum / reviews.length) * 10) / 10;
    }, [reviews, averageRating]);

    const sorted = useMemo(() => {
        const arr = [...reviews];
        switch (sort) {
            case "high":
                return arr.sort((a, b) => b.rating - a.rating);
            case "low":
                return arr.sort((a, b) => a.rating - b.rating);
            case "recent":
            default:
                return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    }, [reviews, sort]);

    return (
        <div className="w-full px-6 py-8 sm:py-10 space-y-8 flex flex-col items-center text-center" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full p-2 hover:opacity-80"
                style={{ color: "var(--fg)" }}
            >
                <X className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                    <button
                        key={i}
                        onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                        aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                        className={`h-2.5 w-2.5 rounded-full transition-transform ${i === 2 ? "scale-110" : "opacity-50 hover:opacity-80"}`}
                        style={{ background: "var(--fg)" }}
                    />
                ))}
            </div>

            <Separator className="w-full max-w-2xl" style={{ background: "color-mix(in oklab, var(--fg) 18%, transparent)" }} />

            <div className="w-full max-w-7xl flex flex-col items-center gap-6">
                <div className="w-full flex flex-col items-center gap-2">
                    <h3 className="text-lg font-semibold">{artist.username} — Reviews</h3>
                    <div className="flex items-center gap-2">
                        <Stars value={computedAvg} />
                        <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                            {computedAvg ? `${computedAvg} / 5` : "No ratings yet"}
                        </span>
                        {reviews.length > 0 && (
                            <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                • {reviews.length} review{reviews.length === 1 ? "" : "s"}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <label className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>Sort:</label>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as typeof sort)}
                            className="text-sm rounded-md px-2 py-1 border"
                            style={{ background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }}
                        >
                            <option value="recent">Most recent</option>
                            <option value="high">Highest rating</option>
                            <option value="low">Lowest rating</option>
                        </select>
                    </div>
                </div>

                {sorted.length === 0 ? (
                    <div className="w-full max-w-2xl text-sm" style={{ color: "color-mix(in oklab, var(--fg) 65%, transparent)" }}>
                        No reviews yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                        {sorted.map((r) => (
                            <Card key={r._id} className="w-full h-full flex flex-col" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
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
                                    <p className="text-sm leading-relaxed" style={{ color: "color-mix(in oklab, var(--fg) 88%, transparent)" }}>{r.body}</p>
                                    {r.photos && r.photos.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {r.photos.slice(0, 6).map((src, idx) => (
                                                <button
                                                    key={`${r._id}-photo-${idx}`}
                                                    onClick={() => setZoomSrc(src)}
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
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                        onClick={onBackToPortfolio ?? (() => onGoToStep?.(0))}
                        className="rounded-lg px-4 py-2 text-sm font-medium"
                        variant="outline"
                        style={{ background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "var(--fg)", border: `1px solid var(--border)` }}
                    >
                        Back to Portfolio
                    </Button>
                    <Button
                        onClick={onGoToBooking ?? (() => onGoToStep?.(1))}
                        className="rounded-lg px-4 py-2 text-sm font-medium"
                        variant="outline"
                        style={{ background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "var(--fg)", border: `1px solid var(--border)` }}
                    >
                        Go to Booking
                    </Button>
                </div>
            </div>

            {zoomSrc && (
                <div
                    className="fixed inset-0 z-[1300] flex items-center justify-center p-4"
                    style={{ background: "color-mix(in oklab, var(--bg) 75%, black 25%)" }}
                    onClick={() => setZoomSrc(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <button
                        className="absolute top-4 right-4 rounded-full p-2"
                        onClick={() => setZoomSrc(null)}
                        aria-label="Close image"
                        style={{ color: "var(--fg)" }}
                    >
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