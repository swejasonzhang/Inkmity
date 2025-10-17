import { useMemo, useState } from "react";

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

    const bookingsByDay = useMemo(() => {
        const map = new Map<string, Booking[]>();
        for (const b of bookings) {
            const d = new Date(b.start);
            const key = [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, "0"),
                String(d.getDate()).padStart(2, "0"),
            ].join("-");
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(b);
        }
        return map;
    }, [bookings]);

    const monthName = new Intl.DateTimeFormat(undefined, { month: "long" }).format(cursor);

    const statusBadge: Record<string, string> = {
        confirmed: "bg-green-500/20 text-green-300 border-green-600/30",
        pending: "bg-yellow-500/20 text-yellow-300 border-yellow-600/30",
        cancelled: "bg-red-500/20 text-red-300 border-red-600/30",
    };

    const changeMonth = (delta: number) => {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    };

    return (
        <div className="flex flex-col h-full min-h-[55vh] p-3 gap-2">
            <div className="border-b border-app px-3 py-3 rounded-xl bg-card text-center">
                <div className="font-semibold text-sm">
                    {monthName} {cursor.getFullYear()}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                    <button
                        className="px-2.5 py-1.5 rounded-md border border-app bg-card hover:bg-elevated text-xs"
                        onClick={() => changeMonth(-1)}
                    >
                        Prev
                    </button>
                    <button
                        className="px-2.5 py-1.5 rounded-md border border-app bg-card hover:bg-elevated text-xs"
                        onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                    >
                        Today
                    </button>
                    <button
                        className="px-2.5 py-1.5 rounded-md border border-app bg-card hover:bg-elevated text-xs"
                        onClick={() => changeMonth(1)}
                    >
                        Next
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 text-[11px] text-muted-foreground px-2 sm:px-3 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="font-medium tracking-wide py-1.5">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1" style={{ gridAutoRows: "minmax(0,1fr)" }}>
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

                    return (
                        <div
                            key={i}
                            className={["rounded-lg border border-app bg-card p-2 flex flex-col", !c.inMonth ? "opacity-40" : ""].join(" ")}
                            style={{ minHeight: rowMinHeight }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-[11px] text-muted-foreground">{c.dayNum ?? ""}</div>
                                {isToday && <div className="text-[10px] px-1 py-0.5 rounded bg-white/10">Today</div>}
                            </div>

                            <div className="mt-2 flex flex-col gap-1">
                                {dayBookings.slice(0, 3).map((b: Booking) => (
                                    <button
                                        key={b.id}
                                        onClick={() => onSelectBooking(b)}
                                        className={[
                                            "w-full text-[11px] rounded border px-2 py-1 hover:bg-white/5 text-left",
                                            statusBadge[b.status ?? ""] ?? "border-white/10",
                                        ].join(" ")}
                                        title={`${b.title} • ${b.clientName ?? ""}`}
                                    >
                                        <div className="truncate font-medium">{b.title}</div>
                                        <div className="opacity-80 truncate">
                                            {new Date(b.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            {" – "}
                                            {new Date(b.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </button>
                                ))}
                                {dayBookings.length > 3 && (
                                    <div className="text-[10px] text-muted-foreground">+{dayBookings.length - 3} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}