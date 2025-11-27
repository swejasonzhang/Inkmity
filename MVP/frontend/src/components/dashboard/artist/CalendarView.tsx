import { useMemo, useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
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
import { getBookingsForArtist, type Booking as ApiBooking } from "@/api";

type Booking = {
    id: string | number;
    title: string;
    clientName?: string;
    start: string | number | Date;
    end: string | number | Date;
    status?: "confirmed" | "pending" | "cancelled" | "booked" | "matched" | "completed" | string;
};

type CalendarViewProps = {
    bookings?: Booking[];
    onSelectBooking?: (b: Booking) => void;
    rowMinHeight?: number;
    artistId?: string;
};

export default function CalendarView({
    bookings: propBookings,
    onSelectBooking = () => { },
    artistId,
}: CalendarViewProps) {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>(propBookings || []);
    const [loading, setLoading] = useState(!propBookings);

    useEffect(() => {
        if (propBookings) {
            setBookings(propBookings);
            return;
        }

        const fetchBookings = async () => {
            try {
                setLoading(true);
                const token = await getToken();
                const targetArtistId = artistId || user?.id;
                if (!targetArtistId) return;

                const apiBookings = await getBookingsForArtist(targetArtistId, token);
                
                // Transform API bookings to calendar format
                // Note: Client names can be enhanced later by populating in backend
                const transformed: Booking[] = apiBookings.map((b: ApiBooking) => ({
                    id: b._id,
                    title: b.note || "Appointment",
                    clientName: "Client", // Can be enhanced with client info from backend
                    start: b.startAt,
                    end: b.endAt,
                    status: b.status,
                }));
                setBookings(transformed);
            } catch (error) {
                console.error("Failed to fetch bookings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchBookings();
        }
    }, [user, artistId, getToken, propBookings]);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[55vh]">
                <div className="text-muted-foreground">Loading bookings...</div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full w-full min-h-[300px] md:min-h-[55vh] p-2 md:p-3 gap-2">
                <div className="px-2 py-2 md:px-3 md:py-3 rounded-lg md:rounded-xl bg-card flex-shrink-0">
                    <div className="flex flex-col items-center gap-1.5 md:gap-2">
                        <div className="text-xs md:text-sm lg:text-base font-medium text-muted-foreground text-center">
                            Click a date to view all booked slots
                        </div>
                        <div className="flex items-center justify-center w-full">
                            <Pagination>
                                <PaginationContent className="gap-1">
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            className="h-8 w-8 md:h-10 md:w-10"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                changeMonth(-1);
                                            }}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            className="h-8 px-3 md:h-10 md:px-4 text-xs md:text-sm"
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
                                            className="h-8 w-8 md:h-10 md:w-10"
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

                <div className="grid grid-cols-7 text-[9px] md:text-[11px] text-muted-foreground px-1 md:px-2 text-center flex-shrink-0">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <div key={d} className="font-medium tracking-wide py-1 md:py-1.5">
                            {d}
                        </div>
                    ))}
                </div>

                <div
                    className="grid grid-cols-7 gap-1 md:gap-1.5 lg:gap-2 flex-1 min-h-0"
                    style={{ gridAutoRows: "minmax(60px, 1fr)" }}
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
                                    "rounded-md md:rounded-lg border border-app bg-card p-1 md:p-2 flex flex-col relative min-h-[60px]",
                                    !c.inMonth ? "opacity-40" : "cursor-pointer active:bg-white/5 md:hover:bg-white/5",
                                ].join(" ")}
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
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-[9px] md:text-[11px] text-muted-foreground font-medium">{c.dayNum ?? ""}</div>
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                        {count > 0 && (
                                            <div
                                                className="px-1 md:px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30"
                                                title={`${count} booking${count > 1 ? "s" : ""}`}
                                            >
                                                {count}
                                            </div>
                                        )}
                                        {isToday && (
                                            <div className="text-[8px] md:text-[10px] px-1 py-0.5 rounded bg-white/10">Today</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto flex flex-col gap-0.5 md:gap-1 overflow-hidden">
                                    {dayBookings.slice(0, 2).map((b) => (
                                        <button
                                            key={b.id}
                                            className={[
                                                "w-full text-[8px] md:text-[11px] rounded border px-1 md:px-2 py-0.5 md:py-1 text-left active:bg-white/10 md:hover:bg-white/10 transition-colors",
                                                statusChip[b.status ?? ""] ?? "border-white/10 text-white/90",
                                            ].join(" ")}
                                            title={`${b.title}${b.clientName ? " • " + b.clientName : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectBooking(b);
                                            }}
                                        >
                                            <div className="truncate font-medium text-[8px] md:text-[10px]">{b.title}</div>
                                            <div className="opacity-80 truncate text-[7px] md:text-[9px]">
                                                {fmtTime(b.start)}–{fmtTime(b.end)}
                                            </div>
                                        </button>
                                    ))}
                                    {dayBookings.length > 2 && (
                                        <div className="text-[7px] md:text-[10px] text-muted-foreground">
                                            +{dayBookings.length - 2}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
                <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base md:text-lg lg:text-xl">
                            {selectedDate
                                ? selectedDate.toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })
                                : "Selected Day"}
                        </DialogTitle>
                        <DialogDescription className="text-sm md:text-base lg:text-lg">
                            Booked slots for this day
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-3 space-y-2 md:space-y-3">
                        {selectedDayBookings.length === 0 && (
                            <div className="text-sm md:text-base lg:text-lg text-muted-foreground text-center py-4">
                                No bookings on this day.
                            </div>
                        )}

                        {selectedDayBookings.map((b) => (
                            <div
                                key={b.id}
                                className="flex items-center justify-between rounded-md border border-app bg-card px-3 py-2 md:px-4 md:py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs md:text-sm lg:text-base font-semibold truncate">
                                        {fmtTime(b.start)} – {fmtTime(b.end)}
                                    </div>
                                    <div className="text-xs md:text-sm text-muted-foreground truncate">
                                        {b.title}
                                        {b.clientName ? ` • ${b.clientName}` : ""}
                                    </div>
                                </div>
                                <button
                                    className="text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 rounded border border-app active:bg-white/5 md:hover:bg-white/5 transition-colors ml-2 flex-shrink-0"
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
