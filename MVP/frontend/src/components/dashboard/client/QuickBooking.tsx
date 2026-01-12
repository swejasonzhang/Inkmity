import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import BookingPicker from "../../calender/BookingPicker";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ArtistWithGroups } from "./ArtistPortfolio";

type BookingProps = {
    open: boolean;
    artist?: ArtistWithGroups;
    onBack?: () => void;
    onClose: () => void;
};

function startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return startOfDay(x);
}

function fmtShort(d: Date) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtDow(d: Date) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function QuickBooking({ open, artist, onBack, onClose }: BookingProps) {
    const today = useMemo(() => startOfDay(), []);
    const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
    const row1 = days.slice(0, 7);
    const row2 = days.slice(7, 14);

    const [date, setDate] = useState<Date | undefined>(today);
    const username = artist?.username ?? "the artist";
    const artistId = artist?.clerkId ?? null;

    if (typeof window === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100000] flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    aria-modal="true"
                    role="dialog"
                    onClick={onClose}
                >
                    <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close dialog" />
                    <motion.div
                        className="relative w-[min(1000px,95vw)] max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-2xl border"
                        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 240, damping: 22 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute top-3 right-3 h-9 w-9 rounded-full grid place-items-center border"
                            style={{ background: "var(--elevated)", borderColor: "var(--border)", color: "var(--fg)" }}
                        >
                            ×
                        </button>

                        <Card className="w-full shadow-none border-0 bg-transparent" style={{ color: "inherit" }}>
                            <CardHeader className="text-center space-y-1 px-3 sm:px-6">
                                <CardTitle className="text-base sm:text-lg break-words">Quick book with {username}</CardTitle>
                            </CardHeader>

                            <CardContent className="p-2 sm:p-5">
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-2 overflow-x-hidden">
                                        <div className="grid grid-cols-7 gap-2">
                                            {row1.map(d => {
                                                const selected = date && d.getTime() === date.getTime();
                                                return (
                                                    <button
                                                        key={`r1-${d.toISOString()}`}
                                                        type="button"
                                                        onClick={() => setDate(d)}
                                                        className={`px-2 py-2 rounded-md border text-xs sm:text-sm flex flex-col items-center justify-center ${selected ? "font-medium" : ""}`}
                                                        style={{
                                                            background: selected ? "var(--elevated)" : "transparent",
                                                            color: "var(--fg)",
                                                            borderColor: "var(--border)",
                                                        }}
                                                    >
                                                        <span className="opacity-80">{fmtDow(d)}</span>
                                                        <span>{fmtShort(d)}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="grid grid-cols-7 gap-2">
                                            {row2.map(d => {
                                                const selected = date && d.getTime() === date.getTime();
                                                return (
                                                    <button
                                                        key={`r2-${d.toISOString()}`}
                                                        type="button"
                                                        onClick={() => setDate(d)}
                                                        className={`px-2 py-2 rounded-md border text-xs sm:text-sm flex flex-col items-center justify-center ${selected ? "font-medium" : ""}`}
                                                        style={{
                                                            background: selected ? "var(--elevated)" : "transparent",
                                                            color: "var(--fg)",
                                                            borderColor: "var(--border)",
                                                        }}
                                                    >
                                                        <span className="opacity-80">{fmtDow(d)}</span>
                                                        <span>{fmtShort(d)}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <p
                                        className="mx-auto w-full max-w-[560px] text-center px-4 py-4 rounded-md border font-semibold leading-relaxed"
                                        style={{ background: "var(--elevated)", borderColor: "var(--border)", color: "var(--fg)" }}
                                    >
                                        Booking past two weeks? Use the artist’s full portfolio to book.
                                    </p>

                                    <div className="min-h-[500px] sm:min-h-[480px] rounded-md px-2 overflow-x-hidden" style={{ background: "var(--elevated)" }}>
                                        <div className="w-full max-w-[920px] mx-auto p-2 sm:p-3">
                                            {artistId && artist ? <BookingPicker artistId={artistId} date={date} artistName={artist.username} /> : <p className="text-sm opacity-80">Loading availability…</p>}
                                        </div>
                                    </div>

                                    <div className="mt-1 flex justify-end gap-2">
                                        {onBack ? (
                                            <button
                                                type="button"
                                                onClick={onBack}
                                                className="px-3 py-2 rounded-md border"
                                                style={{ background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }}
                                            >
                                                Back
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}