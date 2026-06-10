import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
};

type CalendarViewProps = {
    bookings?: Booking[];
    onSelectBooking?: (b: Booking) => void;
    loading?: boolean;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView({
    bookings = [],
    onSelectBooking = () => { },
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

    const dotColor = (status: string, startDate: Date): string => {
        if (status === "cancelled" || status === "no-show" || status === "denied") return "bg-white/35";
        if (status === "pending") return "bg-white/60";
        if (isPastDay(startDate)) return "bg-white/35";
        return "bg-white";
    };

    const changeMonth = (delta: number) =>
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));

    const goToday = () => {
        const now = new Date();
        setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const fmtTime = (d: Date | string | number) =>
        new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

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
                        <div className="text-sm sm:text-base font-bold text-app leading-tight truncate">
                            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-muted">
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

                <div className="grid grid-cols-7 text-[9px] sm:text-[10px] uppercase tracking-wide text-muted text-center flex-shrink-0">
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
                                    "relative flex flex-col items-center justify-start rounded-lg border p-1 min-h-0 transition group text-center",
                                    !c.inMonth
                                        ? "border-transparent opacity-30 cursor-default"
                                        : "border-app cursor-pointer hover:border-app hover:bg-elevated/60",
                                    isToday ? "ring-1 ring-app bg-elevated/40" : hasBookings ? "bg-elevated/30" : "bg-card",
                                ].join(" ")}
                            >
                                <span
                                    className={[
                                        "grid place-items-center text-xs sm:text-sm font-semibold leading-none mt-1",
                                        isToday
                                            ? "h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white text-black font-bold"
                                            : "text-app",
                                    ].join(" ")}
                                >
                                    {c.dayNum ?? ""}
                                </span>

                                {hasBookings && (
                                    <>
                                        <div className="mt-1.5 flex items-center justify-center gap-1 flex-wrap">
                                            {dayBookings.slice(0, 3).map((b, bi) => (
                                                <span
                                                    key={bi}
                                                    className={`h-2 w-2 rounded-full ${dotColor(b.status ?? "", new Date(b.start))}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="mt-auto hidden sm:block text-[10px] text-muted leading-none pb-1">
                                            {count} {count === 1 ? "appt" : "appts"}
                                        </span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center justify-center gap-3 flex-shrink-0 text-[9px] sm:text-[10px] text-muted">
                    <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white" /> Upcoming</span>
                    <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/60" /> Pending</span>
                    <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/35" /> Past</span>
                </div>
            </div>

            <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
                <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg bg-card text-foreground p-4 sm:p-6" style={{ background: "var(--card)", color: "var(--fg)" }}>
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-base sm:text-lg text-center">
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
                            {selectedDayBookings.length === 0
                                ? "No bookings on this day."
                                : `${selectedDayBookings.length} appointment${selectedDayBookings.length > 1 ? "s" : ""}, sorted by time`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-2 space-y-2 max-h-[55vh] overflow-y-auto">
                        {selectedDayBookings.map((b, index) => (
                            <div
                                key={b.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-app bg-elevated/50 px-3 py-2.5 hover:bg-elevated transition-colors"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs text-muted">#{index + 1}</span>
                                        <span className="text-sm font-semibold text-app">
                                            {fmtTime(b.start)} – {fmtTime(b.end)}
                                        </span>
                                        {b.status && (
                                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium border border-white/60 bg-card capitalize text-app">
                                                {b.status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted truncate">
                                        {b.title}
                                        {b.clientName ? ` • ${b.clientName}` : ""}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="text-xs px-3 py-1.5 rounded-lg border border-app hover:bg-card transition-colors flex-shrink-0"
                                    onClick={() => {
                                        onSelectBooking(b);
                                        setDayModalOpen(false);
                                    }}
                                >
                                    View
                                </button>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
