import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, CalendarDays, Clock, Info, ArrowLeft, ChevronRight } from "lucide-react";
import BookingPicker from "../../calender/BookingPicker";
import { useScrollLock } from "@/hooks/useScrollLock";
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

function fmtDow(d: Date) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function QuickBooking({ open, artist, onBack, onClose }: BookingProps) {
    const navigate = useNavigate();
    const today = useMemo(() => startOfDay(), []);
    const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);

    const [date, setDate] = useState<Date | undefined>(today);
    const username = artist?.username ?? "the artist";
    const artistId = artist?.clerkId ?? null;

    useScrollLock(open);

    const openPortfolio = () => {
        const handle = String(artist?.handle || "").replace(/^@/, "").trim();
        if (!handle) return;
        onClose();
        navigate(`/artist/${encodeURIComponent(handle)}`, { state: { artist } });
    };
    const initial = (username || "A").trim().charAt(0).toUpperCase();

    const rangeLabel = useMemo(() => {
        const last = days[days.length - 1];
        const start = today.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const end = last.toLocaleDateString(undefined, {
            month: last.getMonth() === today.getMonth() ? undefined : "short",
            day: "numeric",
        });
        return `${start} – ${end}`;
    }, [days, today]);

    const selectedLabel = date
        ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
        : "Pick a date";

    if (typeof window === "undefined") return null;

    const DayChip = ({ d }: { d: Date }) => {
        const selected = !!date && d.getTime() === date.getTime();
        const isToday = d.getTime() === today.getTime();
        return (
            <button
                type="button"
                onClick={() => setDate(d)}
                aria-pressed={selected}
                className="group relative flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2 transition-colors duration-150 hover:ring-2 hover:ring-[color:var(--fg)]/30 focus:outline-none focus-visible:ring-2"
                style={{
                    background: selected ? "var(--fg)" : "transparent",
                    color: selected ? "var(--bg)" : "var(--fg)",
                    borderColor: selected ? "var(--fg)" : "var(--border)",
                }}
            >
                <span className="text-[9px] font-medium uppercase tracking-wide opacity-60">{fmtDow(d)}</span>
                <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                {isToday && (
                    <span
                        className="absolute bottom-1 h-1 w-1 rounded-full"
                        style={{ background: selected ? "var(--bg)" : "var(--fg)" }}
                    />
                )}
            </button>
        );
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    aria-modal="true"
                    role="dialog"
                    onClick={onClose}
                >
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-hidden />
                    <motion.div
                        className="relative w-[min(720px,100%)] max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border shadow-2xl transform-gpu"
                        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)", willChange: "transform, opacity", backfaceVisibility: "hidden" }}
                        initial={{ scale: 0.98, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, y: 10 }}
                        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                        onClick={e => e.stopPropagation()}
                    >
                        {}
                        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                            <span
                                className="grid place-items-center h-11 w-11 rounded-full text-base font-bold shrink-0"
                                style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}
                            >
                                {initial}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] uppercase tracking-wide opacity-50">Book a session</div>
                                <h2 className="text-base sm:text-lg font-bold leading-tight truncate">{username}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="grid place-items-center h-9 w-9 rounded-full border transition hover:opacity-80 shrink-0"
                                style={{ background: "var(--elevated)", borderColor: "var(--border)", color: "var(--fg)" }}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {}
                        <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-5">
                            {}
                            <section className="flex flex-col gap-2.5 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <CalendarDays className="h-4 w-4 opacity-70" />
                                        <span>Choose a date</span>
                                    </div>
                                    <span className="text-xs opacity-50">{rangeLabel}</span>
                                </div>
                                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                                    {days.map(d => (
                                        <DayChip key={d.toISOString()} d={d} />
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-start gap-2 text-[11px] leading-relaxed opacity-60">
                                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        <span>Booking further out than two weeks? Pick any date from the full portfolio.</span>
                                    </div>
                                    {artistId && (
                                        <button
                                            type="button"
                                            onClick={openPortfolio}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-90 shrink-0"
                                            style={{ background: "var(--fg)", color: "var(--bg)" }}
                                        >
                                            View full portfolio
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </section>

                            {}
                            <section className="flex flex-col gap-2.5 flex-1 min-h-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <Clock className="h-4 w-4 opacity-70" />
                                        <span>Availability</span>
                                    </div>
                                    <span className="text-xs opacity-50 truncate max-w-[55%] text-right">{selectedLabel}</span>
                                </div>
                                <div
                                    className="rounded-2xl border flex-1 min-h-0 flex flex-col p-2 sm:p-3"
                                    style={{ background: "var(--elevated)", borderColor: "var(--border)" }}
                                >
                                    {artistId && artist ? (
                                        <BookingPicker artistId={artistId} date={date} artistName={artist.username} />
                                    ) : (
                                        <div className="h-[400px] grid place-items-center text-sm opacity-60">Loading availability…</div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {}
                        {onBack && (
                            <div className="px-4 sm:px-6 py-3 border-t flex items-center" style={{ borderColor: "var(--border)" }}>
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-medium transition hover:opacity-80"
                                    style={{ background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
