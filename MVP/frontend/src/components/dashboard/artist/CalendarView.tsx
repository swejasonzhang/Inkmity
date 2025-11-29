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

    const statusChip: Record<string, string> = {
        confirmed: "bg-green-500/15 text-green-300 border border-green-600/30",
        pending: "bg-yellow-500/15 text-yellow-300 border border-yellow-600/30",
        cancelled: "bg-red-500/15 text-red-300 border border-red-600/30",
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
        return bookingsByDay.get(dateKey(selectedDate)) ?? [];
    }, [selectedDate, bookingsByDay]);

    return (
        <>
            <div className="flex flex-col h-full min-h-[55vh] p-3 gap-2">
                <div className="px-3 py-3 rounded-xl bg-card">
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-sm md:text-base font-medium text-muted-foreground">
                            Click a date to view all booked slots
                        </div>
                        <div className="flex items-center justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                changeMonth(-1);
                                            }}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                goToday();
                                            }}
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
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-7 text-[11px] text-muted-foreground px-2 sm:px-3 text-center">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <div key={d} className="font-medium tracking-wide py-1.5">
                            {d}
                        </div>
                    ))}
                </div>

                <div
                    className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1"
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
                                    "rounded-lg border border-app bg-card p-2 flex flex-col relative",
                                    !c.inMonth ? "opacity-40" : "cursor-pointer hover:bg-white/5",
                                ].join(" ")}
                                style={{ minHeight: rowMinHeight }}
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
                                <div className="flex items-center justify-between">
                                    <div className="text-[11px] text-muted-foreground">{c.dayNum ?? ""}</div>
                                    <div className="flex items-center gap-1">
                                        {count > 0 && (
                                            <div
                                                className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30"
                                                title={`${count} booking${count > 1 ? "s" : ""}`}
                                            >
                                                {count}
                                            </div>
                                        )}
                                        {isToday && (
                                            <div className="text-[10px] px-1 py-0.5 rounded bg-white/10">Today</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-col gap-1">
                                    {dayBookings.slice(0, 3).map((b) => (
                                        <button
                                            key={b.id}
                                            className={[
                                                "w-full text-[11px] rounded border px-2 py-1 text-left hover:bg-white/10",
                                                statusChip[b.status ?? ""] ?? "border-white/10 text-white/90",
                                            ].join(" ")}
                                            title={`${b.title}${b.clientName ? " • " + b.clientName : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectBooking(b);
                                            }}
                                        >
                                            <div className="truncate font-medium">{b.title}</div>
                                            <div className="opacity-80 truncate">
                                                {fmtTime(b.start)} – {fmtTime(b.end)}
                                                {b.clientName ? ` • ${b.clientName}` : ""}
                                            </div>
                                        </button>
                                    ))}
                                    {dayBookings.length > 3 && (
                                        <div className="text-[10px] text-muted-foreground">
                                            +{dayBookings.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg md:text-xl">
                            {selectedDate
                                ? selectedDate.toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })
                                : "Selected Day"}
                        </DialogTitle>
                        <DialogDescription className="text-base md:text-lg">
                            Booked slots for this day
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-3 space-y-3">
                        {selectedDayBookings.length === 0 && (
                            <div className="text-base md:text-lg text-muted-foreground">
                                No bookings on this day.
                            </div>
                        )}

                        {selectedDayBookings.map((b) => (
                            <div
                                key={b.id}
                                className="flex items-center justify-between rounded-md border border-app bg-card px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <div className="text-sm md:text-base font-semibold truncate">
                                        {fmtTime(b.start)} – {fmtTime(b.end)}
                                    </div>
                                    <div className="text-xs md:text-sm text-muted-foreground truncate">
                                        {b.title}
                                        {b.clientName ? ` • ${b.clientName}` : ""}
                                    </div>
                                </div>
                                <button
                                    className="text-xs px-2 py-1 rounded border border-app hover:bg-white/5"
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
