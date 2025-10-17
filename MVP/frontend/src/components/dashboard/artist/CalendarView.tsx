import { useMemo, useState } from "react";

export default function CalendarView(props: any) {
    const bookings = props?.bookings ?? [];
    const onSelectBooking = props?.onSelectBooking ?? (() => { });

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
        const map = new Map<string, any[]>();
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

    const statusBadge: any = {
        confirmed: "bg-green-500/20 text-green-300 border-green-600/30",
        pending: "bg-yellow-500/20 text-yellow-300 border-yellow-600/30",
        cancelled: "bg-red-500/20 text-red-300 border-red-600/30",
    };

    const changeMonth = (delta: number) => {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-app px-3 py-2">
                <div className="font-semibold">
                    {monthName} {cursor.getFullYear()}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="px-2 py-1 rounded-md border border-app bg-card hover:bg-elevated"
                        onClick={() => changeMonth(-1)}
                    >
                        Prev
                    </button>
                    <button
                        className="px-2 py-1 rounded-md border border-app bg-card hover:bg-elevated"
                        onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                    >
                        Today
                    </button>
                    <button
                        className="px-2 py-1 rounded-md border border-app bg-card hover:bg-elevated"
                        onClick={() => changeMonth(1)}
                    >
                        Next
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 text-xs text-muted-foreground px-3 py-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="text-center">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-px px-3 pb-3">
                {cells.map((c, i) => {
                    const key =
                        c.date &&
                        [
                            c.date.getFullYear(),
                            String(c.date.getMonth() + 1).padStart(2, "0"),
                            String(c.date.getDate()).padStart(2, "0"),
                        ].join("-");
                    const dayBookings = key ? bookingsByDay.get(key) ?? [] : [];
                    const isToday =
                        c.date &&
                        new Date().toDateString() === c.date.toDateString();

                    return (
                        <div
                            key={i}
                            className={`min-h-[108px] rounded-lg border border-app bg-card p-2 ${!c.inMonth ? "opacity-40" : ""}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">{c.dayNum ?? ""}</div>
                                {isToday && <div className="text-[10px] px-1 rounded bg-white/10">Today</div>}
                            </div>
                            <div className="mt-2 flex flex-col gap-1">
                                {dayBookings.slice(0, 3).map((b: any) => (
                                    <button
                                        key={b.id}
                                        onClick={() => onSelectBooking(b)}
                                        className={`w-full text-left text-xs rounded-md border px-2 py-1 hover:bg-white/5 ${statusBadge[b.status] ?? "border-white/10"}`}
                                        title={`${b.title} • ${b.clientName}`}
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
                                    <div className="text-[11px] text-muted-foreground">
                                        +{dayBookings.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}