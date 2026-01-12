import { useMemo, useState } from "react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
    PaginationLink,
} from "@/components/ui/pagination";
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
    rowMinHeight?: number;
};

export default function CalendarView({
    bookings = [],
    onSelectBooking = () => { },
    rowMinHeight = 140,
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
        const totalCells = Math.ceil((monthMeta.firstWeekday + monthMeta.days) / 7) * 7;
        return Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - monthMeta.firstWeekday + 1;
            const inMonth = dayNum >= 1 && dayNum <= monthMeta.days;
            const date = inMonth ? new Date(monthMeta.year, monthMeta.month, dayNum) : null;
            return { inMonth, dayNum: inMonth ? dayNum : null, date };
        });
    }, [monthMeta]);

    const dateKey = (d: Date) =>
        [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");

    const bookingsByDay = useMemo(() => {
        const map = new Map<string, Booking[]>();
        for (const b of bookings) {
            const d = new Date(b.start);
            const key = dateKey(d);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(b);
        }
        for (const key of map.keys()) {
            map.get(key)!.sort((a, b) => +new Date(a.start) - +new Date(b.start));
        }
        return map;
    }, [bookings]);

    const getStatusChip = (status: string, startDate: Date): string => {
        const now = new Date();
        const isPast = startDate < now;
        
        if (status === "cancelled" || status === "no-show") {
            return "bg-red-500/15 text-red-300 border border-red-600/30";
        }
        
        if (isPast) {
            // Past appointments: use gray
            return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
        } else {
            // Upcoming appointments: use white
            return "bg-white/15 text-white border border-white/30";
        }
    };

    const changeMonth = (delta: number) => {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    };

    const goToday = () => {
        const now = new Date();
        setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const fmtTime = (d: Date | string | number) =>
        new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const openDayModal = (d: Date) => {
        setSelectedDate(d);
        setDayModalOpen(true);
    };

    const selectedDayBookings = useMemo(() => {
        if (!selectedDate) return [];
        const dayKey = dateKey(selectedDate);
        const bookings = bookingsByDay.get(dayKey) ?? [];
        return [...bookings].sort((a, b) => {
            const timeA = new Date(a.start).getTime();
            const timeB = new Date(b.start).getTime();
            return timeA - timeB;
        });
    }, [selectedDate, bookingsByDay]);

    return (
        <>
            <div className="flex flex-col h-full min-h-[500px] md:min-h-[55vh] p-1.5 sm:p-2 md:p-3 gap-1.5 sm:gap-2">
                <div className="px-2 sm:px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-card">
                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                        <div className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground text-center px-2">
                            Click a date to view all booked slots
                        </div>
                        <div className="flex items-center justify-center w-full">
                            <Pagination>
                                <PaginationContent className="flex-wrap gap-4 sm:gap-6 md:gap-8">
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                changeMonth(-1);
                                            }}
                                            className="h-8 w-8 sm:h-9 sm:w-9"
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                goToday();
                                            }}
                                            className="h-8 px-3 sm:h-9 sm:px-4 text-xs sm:text-sm"
                                        >
                                            Today
                                        </PaginationLink>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                changeMonth(1);
                                            }}
                                            className="h-8 w-8 sm:h-9 sm:w-9"
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-7 text-[10px] sm:text-[11px] text-muted-foreground px-1 sm:px-2 md:px-3 text-center">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <div key={d} className="font-medium tracking-wide py-1 sm:py-1.5">
                            {d}
                        </div>
                    ))}
                </div>

                <div
                    className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 flex-1"
                    style={{ gridAutoRows: "minmax(0,1fr)" }}
                >
                    {cells.map((c, i) => {
                        const key =
                            c.date &&
                            [
                                c.date.getFullYear(),
                                String(c.date.getMonth() + 1).padStart(2, "0"),
                                String(c.date.getDate()).padStart(2, "0"),
                            ].join("-");
                        const dayBookings = key ? bookingsByDay.get(key) ?? [] : [];
                        const isToday = c.date && new Date().toDateString() === c.date.toDateString();
                        const count = dayBookings.length;

                        return (
                            <div
                                key={i}
                                className={[
                                    "rounded-md sm:rounded-lg border border-app bg-card p-1 sm:p-1.5 md:p-2 flex flex-col relative",
                                    !c.inMonth ? "opacity-40" : "cursor-pointer hover:bg-white/5",
                                ].join(" ")}
                                style={{ minHeight: `max(${rowMinHeight}px, 80px)` }}
                                onClick={() => c.date && c.inMonth && openDayModal(c.date)}
                                aria-label={c.date ? `Open bookings for ${c.date.toDateString()}` : undefined}
                                role={c.date ? "button" : undefined}
                                tabIndex={c.date ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (!c.date || !c.inMonth) return;
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openDayModal(c.date);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                                    <div className="text-[9px] sm:text-[10px] md:text-[11px] text-muted-foreground">{c.dayNum ?? ""}</div>
                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                        {count > 0 && (
                                            <div
                                                className="px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-semibold bg-red-500/25 text-red-200 border border-red-500/40 shadow-sm"
                                                title={`${count} booking${count > 1 ? "s" : ""} on this day`}
                                            >
                                                {count}
                                            </div>
                                        )}
                                        {isToday && (
                                            <div className="text-[8px] sm:text-[9px] md:text-[10px] px-0.5 sm:px-1 py-0.5 rounded bg-white/10">Today</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-1 sm:mt-1.5 md:mt-2 flex flex-col gap-0.5 sm:gap-1">
                                    {dayBookings.slice(0, 2).map((b) => (
                                        <button
                                            key={b.id}
                                            className={[
                                                "w-full text-[9px] sm:text-[10px] md:text-[11px] rounded border px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 text-left hover:bg-white/10",
                                                getStatusChip(b.status ?? "", new Date(b.start)),
                                            ].join(" ")}
                                            title={`${b.title}${b.clientName ? " • " + b.clientName : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectBooking(b);
                                            }}
                                        >
                                            <div className="truncate font-medium">{b.title}</div>
                                            <div className="opacity-80 truncate text-[8px] sm:text-[9px] md:text-[10px]">
                                                {fmtTime(b.start)} – {fmtTime(b.end)}
                                                {b.clientName ? ` • ${b.clientName}` : ""}
                                            </div>
                                        </button>
                                    ))}
                                    {dayBookings.length > 2 && (
                                        <div className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground">
                                            +{dayBookings.length - 2} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
                <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg bg-card text-foreground p-3 sm:p-4 md:p-6" style={{ background: "var(--card)", color: "var(--fg)" }}>
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-base sm:text-lg md:text-xl text-center">
                            {selectedDate
                                ? selectedDate.toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })
                                : "Selected Day"}
                        </DialogTitle>
                        <DialogDescription className="text-sm sm:text-base md:text-lg text-center">
                            Booked slots for this day
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3 flex flex-col items-center">
                        {selectedDayBookings.length === 0 && (
                            <div className="text-sm sm:text-base md:text-lg text-muted-foreground text-center py-3 sm:py-4">
                                No bookings on this day.
                            </div>
                        )}

                        {selectedDayBookings.length > 0 && (
                            <div className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 px-1 text-center">
                                {selectedDayBookings.length} appointment{selectedDayBookings.length > 1 ? "s" : ""} (sorted by time)
                            </div>
                        )}

                        <div className="w-full space-y-2 sm:space-y-3">
                            {selectedDayBookings.map((b, index) => (
                                <div
                                    key={b.id}
                                    className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between rounded-md border border-app bg-card px-2 sm:px-3 md:px-4 py-2 sm:py-3 hover:bg-white/5 transition-colors gap-2 sm:gap-0"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1 justify-center sm:justify-start">
                                            <div className="text-xs font-medium text-muted-foreground">
                                                #{index + 1}
                                            </div>
                                            <div className="text-xs sm:text-sm md:text-base font-semibold text-center sm:text-left">
                                                {fmtTime(b.start)} – {fmtTime(b.end)}
                                            </div>
                                            {b.status && (
                                                <span
                                                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium ${
                                                        getStatusChip(b.status, new Date(b.start))
                                                    }`}
                                                >
                                                    {b.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs sm:text-sm text-muted-foreground truncate text-center sm:text-left">
                                            {b.title}
                                            {b.clientName ? ` • ${b.clientName}` : ""}
                                        </div>
                                    </div>
                                    <button
                                        className="text-xs px-2 sm:px-3 py-1.5 rounded border border-app hover:bg-white/10 transition-colors flex-shrink-0 w-full sm:w-auto"
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

                        <div className="text-[10px] sm:text-xs text-muted-foreground text-center mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-app/50 w-full px-2">
                            Click on other dates to view other appointments
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}