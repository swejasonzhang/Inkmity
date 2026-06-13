import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown, FileText, User, Clock, Tag } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { getIntakeForm, type IntakeForm } from "@/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

type Booking = {
    id: string | number;
    title: string;
    clientName?: string;
    start: string | number | Date;
    end: string | number | Date;
    status?: "confirmed" | "pending" | "cancelled" | string;
    appointmentType?: "consultation" | "tattoo_session" | string;
    priceCents?: number;
    depositPaidCents?: number;
    note?: string;
    sessionNumber?: number;
    projectName?: string | null;
    projectSessions?: number | null;
};

type CalendarViewProps = {
    bookings?: Booking[];
    onSelectBooking?: (b: Booking) => void;
    loading?: boolean;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const fmtTime = (d: Date | string | number) =>
    new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const fmtDuration = (start: Date | string | number, end: Date | string | number) => {
    const mins = Math.max(0, Math.round((+new Date(end) - +new Date(start)) / 60000));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const fmtMoney = (cents?: number) =>
    cents && cents > 0 ? `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "";

const typeLabel = (b: Booking) =>
    b.appointmentType === "consultation" ? "Consultation" : b.title || "Tattoo session";

function KV({ k, v }: { k: string; v?: string | null }) {
    if (!v) return null;
    return (
        <div className="rounded-lg border border-app bg-card/60 px-2.5 py-1.5">
            <div className="text-xs uppercase tracking-wide text-muted">{k}</div>
            <div className="text-sm font-medium text-app">{v}</div>
        </div>
    );
}

function DayAppointment({ b, accent }: { b: Booking; accent: string }) {
    const { getToken } = useAuth();
    const [open, setOpen] = useState(false);
    const [intake, setIntake] = useState<IntakeForm | null>(null);
    const [intakeState, setIntakeState] = useState<"idle" | "loading" | "done">("idle");

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next && intakeState === "idle") {
            setIntakeState("loading");
            try {
                const tok = (await getToken()) ?? undefined;
                setIntake(await getIntakeForm(String(b.id), tok));
            } catch {
                setIntake(null);
            } finally {
                setIntakeState("done");
            }
        }
    };

    const price = fmtMoney(b.priceCents);
    const deposit = fmtMoney(b.depositPaidCents);
    const sessionLabel = b.projectName
        ? `Session ${b.sessionNumber ?? 1}${b.projectSessions ? ` of ${b.projectSessions}` : ""}`
        : null;
    const td = intake?.tattooDetails;
    const wants = td?.description || b.note;
    const work = [td?.isCoverUp ? "Cover-up" : "", td?.isTouchUp ? "Touch-up" : ""].filter(Boolean).join(" · ");

    return (
        <motion.div
            layout
            className="overflow-hidden rounded-2xl border border-app bg-elevated/60 shadow-sm"
        >
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-elevated"
            >
                <span className={`h-9 w-1.5 shrink-0 rounded-full ${accent}`} aria-hidden />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-app">
                        <span className="truncate">{fmtTime(b.start)} – {fmtTime(b.end)}</span>
                        <span className="whitespace-nowrap text-xs font-normal text-muted">{fmtDuration(b.start, b.end)}</span>
                    </div>
                    <div className="truncate text-xs text-muted">
                        {b.clientName ?? "Client"} · {typeLabel(b)}
                    </div>
                    {sessionLabel && (
                        <div className="mt-1 inline-flex items-center rounded-full border border-app bg-card px-1.5 py-0.5 text-xs font-semibold text-app">
                            {sessionLabel}
                        </div>
                    )}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-app bg-card px-2 py-1 text-xs font-semibold text-app">
                    {open ? "Hide" : "Details"}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 border-t border-app/50 px-3 pb-3 pt-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {b.status && (
                                    <span className="rounded-full border border-app bg-card px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-app">
                                        {b.status}
                                    </span>
                                )}
                                {price && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-app bg-card px-2 py-0.5 text-xs font-semibold text-app">
                                        <Tag className="h-3 w-3" /> {price}
                                    </span>
                                )}
                                {deposit && (
                                    <span className="rounded-full border border-app bg-card px-2 py-0.5 text-xs text-muted">
                                        {deposit} deposit paid
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full border border-app bg-card px-2 py-0.5 text-xs text-muted">
                                    <Clock className="h-3 w-3" /> {fmtDuration(b.start, b.end)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 shrink-0 text-muted" />
                                <span className="font-semibold text-app">{b.clientName ?? "Client"}</span>
                            </div>

                            {b.projectName && (
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-muted">Project</div>
                                    <div className="text-sm text-app">
                                        {b.projectName}{sessionLabel ? ` · ${sessionLabel}` : ""}
                                    </div>
                                </div>
                            )}

                            {intakeState === "loading" ? (
                                <div className="space-y-2">
                                    <div className="ink-shimmer h-3 w-2/3 rounded" />
                                    <div className="ink-shimmer h-12 w-full rounded" />
                                </div>
                            ) : (
                                <>
                                    {wants && (
                                        <div>
                                            <div className="mb-0.5 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
                                                <FileText className="h-3.5 w-3.5" /> What they want
                                            </div>
                                            <p className="text-sm leading-relaxed text-app">{wants}</p>
                                        </div>
                                    )}

                                    {(td?.style || td?.placement || td?.size || work) && (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <KV k="Style" v={td?.style} />
                                            <KV k="Placement" v={td?.placement} />
                                            <KV k="Size" v={td?.size} />
                                            <KV k="Work" v={work || undefined} />
                                        </div>
                                    )}

                                    {intake?.additionalNotes && (
                                        <div>
                                            <div className="mb-0.5 text-xs uppercase tracking-wide text-muted">Notes</div>
                                            <p className="text-sm italic leading-relaxed text-muted">{intake.additionalNotes}</p>
                                        </div>
                                    )}

                                    {intakeState === "done" && !wants && !td?.style && !td?.placement && !td?.size && (
                                        <p className="text-xs text-muted">No extra details provided for this appointment.</p>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function CalendarView({
    bookings = [],
    loading = false,
}: CalendarViewProps) {
    const [cursor, setCursor] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const [dayModalOpen, setDayModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthMeta = useMemo(() => {
        const y = cursor.getFullYear();
        const m = cursor.getMonth();
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        const firstWeekday = (start.getDay() + 6) % 7;
        const days = end.getDate();
        return { year: y, month: m, days, firstWeekday };
    }, [cursor]);

    const cells = useMemo(() => {
        const totalCells = 42;
        return Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - monthMeta.firstWeekday + 1;
            const inMonth = dayNum >= 1 && dayNum <= monthMeta.days;
            const date = inMonth ? new Date(monthMeta.year, monthMeta.month, dayNum) : null;
            return { inMonth, dayNum: inMonth ? dayNum : null, date };
        });
    }, [monthMeta]);

    const weekRows = cells.length / 7;

    const dateKey = (d: Date) =>
        [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");

    const bookingsByDay = useMemo(() => {
        const map = new Map<string, Booking[]>();
        for (const b of bookings) {
            const d = new Date(b.start);
            if (isNaN(d.getTime())) continue;
            const key = dateKey(d);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(b);
        }
        for (const key of map.keys()) {
            map.get(key)!.sort((a, b) => +new Date(a.start) - +new Date(b.start));
        }
        return map;
    }, [bookings]);

    const isPastDay = (d: Date) => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return d < t;
    };

    const isActive = (b: Booking) => {
        const st = b.status ?? "";
        return st !== "cancelled" && st !== "no-show" && st !== "denied";
    };

    const dayPillClass = (items: Booking[]) => {
        const hasUpcoming = items.some((b) => isActive(b) && b.status !== "pending" && !isPastDay(new Date(b.start)));
        const hasPending = items.some((b) => b.status === "pending");
        if (hasUpcoming) return "bg-white text-black";
        if (hasPending) return "bg-white/60 text-black";
        return "bg-white/25 text-app";
    };

    const apptAccent = (b: Booking) => {
        if (!isActive(b)) return "bg-white/30";
        if (b.status === "pending") return "bg-white/60";
        if (isPastDay(new Date(b.start))) return "bg-white/35";
        return "bg-white";
    };

    const changeMonth = (delta: number) =>
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));

    const goToday = () => {
        const now = new Date();
        setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const openDayModal = (d: Date) => {
        setSelectedDate(d);
        setDayModalOpen(true);
    };

    const selectedDayBookings = useMemo(() => {
        if (!selectedDate) return [];
        return (bookingsByDay.get(dateKey(selectedDate)) ?? []).slice().sort(
            (a, b) => +new Date(a.start) - +new Date(b.start)
        );
    }, [selectedDate, bookingsByDay]);

    const monthBookingCount = useMemo(() => {
        let n = 0;
        for (const c of cells) {
            if (c.date) n += bookingsByDay.get(dateKey(c.date))?.length ?? 0;
        }
        return n;
    }, [cells, bookingsByDay]);

    if (loading) {
        return (
            <div className="flex flex-col h-full min-h-0 gap-2 sm:gap-3">
                <div className="flex items-center justify-between gap-2 flex-shrink-0">
                    <div className="min-w-0 space-y-1.5">
                        <div className="ink-shimmer h-4 sm:h-5 w-32 rounded" />
                        <div className="ink-shimmer h-2.5 w-24 rounded" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="ink-shimmer h-8 w-8 rounded-lg" />
                        <div className="ink-shimmer h-8 w-14 rounded-lg" />
                        <div className="ink-shimmer h-8 w-8 rounded-lg" />
                    </div>
                </div>

                <div className="grid grid-cols-7 flex-shrink-0">
                    {WEEKDAYS.map((d) => (
                        <div key={d} className="py-1 flex justify-center">
                            <span className="ink-shimmer h-2.5 w-6 rounded" />
                        </div>
                    ))}
                </div>

                <div
                    className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 min-h-0"
                    style={{ gridTemplateRows: `repeat(${weekRows}, minmax(0, 1fr))` }}
                >
                    {cells.map((_, i) => (
                        <div key={i} className="ink-shimmer rounded-lg" />
                    ))}
                </div>

                <div className="flex items-center justify-center gap-3 flex-shrink-0">
                    <span className="ink-shimmer h-2.5 w-16 rounded" />
                    <span className="ink-shimmer h-2.5 w-16 rounded" />
                    <span className="ink-shimmer h-2.5 w-12 rounded" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full min-h-0 gap-2 sm:gap-3">
                <div className="flex items-center justify-between gap-2 flex-shrink-0">
                    <div className="min-w-0 flex-1 text-center md:flex-initial md:text-left">
                        <div className="text-lg font-bold text-app leading-tight truncate">
                            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                        </div>
                        <div className="text-xs text-muted">
                            {monthBookingCount} booking{monthBookingCount === 1 ? "" : "s"} this month
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => changeMonth(-1)}
                            className="grid place-items-center h-8 w-8 rounded-lg border border-app bg-elevated text-app hover:bg-elevated/70 transition"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={goToday}
                            className="h-8 px-3 rounded-lg border border-app bg-elevated text-xs font-medium text-app hover:bg-elevated/70 transition"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => changeMonth(1)}
                            className="grid place-items-center h-8 w-8 rounded-lg border border-app bg-elevated text-app hover:bg-elevated/70 transition"
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 text-xs uppercase tracking-wide text-muted text-center flex-shrink-0">
                    {WEEKDAYS.map((d) => (
                        <div key={d} className="py-1 font-semibold">{d}</div>
                    ))}
                </div>

                <div
                    className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 min-h-0"
                    style={{ gridTemplateRows: `repeat(${weekRows}, minmax(0, 1fr))` }}
                >
                    {cells.map((c, i) => {
                        const key = c.date ? dateKey(c.date) : null;
                        const dayBookings = key ? bookingsByDay.get(key) ?? [] : [];
                        const count = dayBookings.length;
                        const isToday = c.date && new Date().toDateString() === c.date.toDateString();
                        const hasBookings = count > 0;

                        return (
                            <button
                                key={i}
                                type="button"
                                disabled={!c.inMonth}
                                onClick={() => c.date && c.inMonth && openDayModal(c.date)}
                                aria-label={c.date ? `Open bookings for ${c.date.toDateString()}` : undefined}
                                className={[
                                    "relative flex flex-col items-center justify-start rounded-lg border p-1 min-h-0 overflow-hidden transition group text-center",
                                    !c.inMonth
                                        ? "border-transparent opacity-30 cursor-default"
                                        : "border-app cursor-pointer hover:border-app hover:bg-elevated/60",
                                    isToday ? "ring-1 ring-app bg-elevated/40" : hasBookings ? "bg-elevated/30" : "bg-card",
                                ].join(" ")}
                            >
                                <span
                                    className={[
                                        "grid place-items-center text-sm font-semibold leading-none mt-1",
                                        isToday
                                            ? "h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white text-black font-bold"
                                            : "text-app",
                                    ].join(" ")}
                                >
                                    {c.dayNum ?? ""}
                                </span>

                                {hasBookings && (
                                    <span
                                        title={`${count} appointment${count === 1 ? "" : "s"}`}
                                        className={[
                                            "mt-1.5 inline-flex items-center justify-center rounded-full px-1.5 sm:px-2 py-0.5 font-bold leading-none tabular-nums",
                                            "text-xs",
                                            dayPillClass(dayBookings),
                                        ].join(" ")}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center justify-center gap-4 flex-shrink-0 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white" /> Upcoming</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/60" /> Pending</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/35" /> Past</span>
                </div>
            </div>

            <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
                <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90dvh] flex flex-col bg-card text-foreground p-4 sm:p-6" style={{ background: "var(--card)", color: "var(--fg)" }}>
                    <DialogHeader className="text-center shrink-0">
                        <DialogTitle className="text-lg text-center">
                            {selectedDate
                                ? selectedDate.toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })
                                : "Selected Day"}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-center">
                            {selectedDayBookings.length === 0 ? (
                                "No bookings on this day."
                            ) : (
                                <>
                                    {selectedDayBookings.length} appointment{selectedDayBookings.length > 1 ? "s" : ""}
                                    {" · "}
                                    <span className="font-semibold tracking-wide text-app">Scroll To See Times</span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDayBookings.length === 0 ? (
                        <div className="mt-3 flex-1 min-h-0 flex items-center justify-center py-12 text-center text-sm text-muted">
                            No appointments scheduled this day.
                        </div>
                    ) : (
                        <div className="mt-3 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                            {selectedDayBookings.map((b) => (
                                <DayAppointment key={b.id} b={b} accent={apptAccent(b)} />
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
