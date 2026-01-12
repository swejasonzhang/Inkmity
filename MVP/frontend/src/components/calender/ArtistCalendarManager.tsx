import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Calendar as CalendarIcon, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getSocket } from "@/lib/socket";

type TimeRange = { start: string; end: string };
type Booking = {
    _id: string;
    clientId: string;
    startAt: string;
    endAt: string;
    status: string;
    note?: string;
};

export default function ArtistCalendarManager({ artistId }: { artistId: string }) {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [blockTimeModal, setBlockTimeModal] = useState(false);
    const [timezone, setTimezone] = useState("America/New_York");
    const [exceptions, setExceptions] = useState<Record<string, TimeRange[]>>({});
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [cursor, setCursor] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const [blockStart, setBlockStart] = useState("09:00");
    const [blockEnd, setBlockEnd] = useState("17:00");

    const loadAvailability = useCallback(async () => {
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/availability/${artistId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setTimezone(data.timezone || "America/New_York");
                setExceptions(data.exceptions || {});
            }
        } catch (error) {
            console.error("Failed to load availability:", error);
        }
    }, [artistId, getToken]);

    const loadBookings = useCallback(async () => {
        try {
            const token = await getToken();
            const startOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
            
            const response = await fetch(
                `${API_URL}/bookings?artistId=${artistId}&date=${startOfMonth.toISOString().slice(0, 10)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setBookings(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to load bookings:", error);
        }
    }, [artistId, cursor, getToken]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([loadAvailability(), loadBookings()]);
            setLoading(false);
        };
        init();
    }, [loadAvailability, loadBookings]);

    useEffect(() => {
        const socket = getSocket();
        const handleBookingCreated = () => {
            loadBookings();
        };
        const handleAvailabilityUpdated = () => {
            loadAvailability();
        };
        
        socket.on("booking:created", handleBookingCreated);
        socket.on("availability:updated", handleAvailabilityUpdated);
        
        return () => {
            socket.off("booking:created", handleBookingCreated);
            socket.off("availability:updated", handleAvailabilityUpdated);
        };
    }, [loadBookings, loadAvailability]);

    const monthMeta = useMemo(() => {
        const y = cursor.getFullYear();
        const m = cursor.getMonth();
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        const firstWeekday = start.getDay();
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
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const bookingsByDay = useMemo(() => {
        const map = new Map<string, Booking[]>();
        for (const b of bookings) {
            const d = new Date(b.startAt);
            const key = dateKey(d);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(b);
        }
        return map;
    }, [bookings]);

    const blockedDays = useMemo(() => {
        return new Set(Object.keys(exceptions).filter(date => exceptions[date].length === 0));
    }, [exceptions]);

    const partiallyBlockedDays = useMemo(() => {
        return new Set(Object.keys(exceptions).filter(date => exceptions[date].length > 0));
    }, [exceptions]);

    const changeMonth = (delta: number) => {
        setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    };

    const handleBlockTime = async () => {
        if (!selectedDate) return;
        
        setSaving(true);
        try {
            const token = await getToken();
            const dateStr = dateKey(selectedDate);
            const newExceptions = { ...exceptions };
            
            if (!newExceptions[dateStr]) {
                newExceptions[dateStr] = [];
            }
            
            newExceptions[dateStr].push({ start: blockStart, end: blockEnd });
            
            const response = await fetch(`${API_URL}/availability/${artistId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    exceptions: newExceptions,
                    timezone,
                }),
            });
            
            if (response.ok) {
                setExceptions(newExceptions);
                setBlockTimeModal(false);
                setBlockStart("09:00");
                setBlockEnd("17:00");
            }
        } catch (error) {
            console.error("Failed to block time:", error);
            alert("Failed to block time. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleBlockFullDay = async () => {
        if (!selectedDate) return;
        
        setSaving(true);
        try {
            const token = await getToken();
            const dateStr = dateKey(selectedDate);
            const newExceptions = { ...exceptions };
            newExceptions[dateStr] = [];
            
            const response = await fetch(`${API_URL}/availability/${artistId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    exceptions: newExceptions,
                    timezone,
                }),
            });
            
            if (response.ok) {
                setExceptions(newExceptions);
                setModalOpen(false);
            }
        } catch (error) {
            console.error("Failed to block day:", error);
            alert("Failed to block day. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleUnblockDay = async (dateStr: string) => {
        setSaving(true);
        try {
            const token = await getToken();
            const newExceptions = { ...exceptions };
            delete newExceptions[dateStr];
            
            const response = await fetch(`${API_URL}/availability/${artistId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    exceptions: newExceptions,
                    timezone,
                }),
            });
            
            if (response.ok) {
                setExceptions(newExceptions);
            }
        } catch (error) {
            console.error("Failed to unblock:", error);
        } finally {
            setSaving(false);
        }
    };

    const openDayModal = (date: Date) => {
        setSelectedDate(date);
        setModalOpen(true);
    };

    const selectedDayBookings = useMemo(() => {
        if (!selectedDate) return [];
        return bookingsByDay.get(dateKey(selectedDate)) ?? [];
    }, [selectedDate, bookingsByDay]);

    const selectedDateStr = selectedDate ? dateKey(selectedDate) : "";
    const selectedDayBlocked = blockedDays.has(selectedDateStr);
    const selectedDayPartiallyBlocked = partiallyBlockedDays.has(selectedDateStr);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div style={{ color: "var(--fg)" }}>Loading calendar...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-4 gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold" style={{ color: "var(--fg)" }}>
                    <CalendarIcon className="inline h-6 w-6 mr-2" />
                    Booking Calendar
                </h2>
                <div className="flex items-center gap-2">
                    <Button onClick={() => changeMonth(-1)} variant="outline">
                        Previous
                    </Button>
                    <span className="px-4 py-2 font-semibold" style={{ color: "var(--fg)" }}>
                        {new Date(monthMeta.year, monthMeta.month).toLocaleDateString(undefined, {
                            month: "long",
                            year: "numeric",
                        })}
                    </span>
                    <Button onClick={() => changeMonth(1)} variant="outline">
                        Next
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium" style={{ color: "var(--fg)" }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day}>{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2 flex-1">
                {cells.map((cell, i) => {
                    const key = cell.date ? dateKey(cell.date) : null;
                    const dayBookings = key ? bookingsByDay.get(key) ?? [] : [];
                    const isBlocked = key ? blockedDays.has(key) : false;
                    const isPartiallyBlocked = key ? partiallyBlockedDays.has(key) : false;
                    const isToday = cell.date && new Date().toDateString() === cell.date.toDateString();

                    return (
                        <div
                            key={i}
                            data-calendar-cell
                            className={`rounded-lg border p-2 min-h-[100px] cursor-pointer outline-none focus:outline-none select-none ${
                                !cell.inMonth
                                    ? "opacity-40"
                                    : isBlocked
                                    ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                                    : isPartiallyBlocked
                                    ? "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
                                    : "hover:bg-white/5"
                            }`}
                            style={{ 
                                borderColor: "var(--border)", 
                                background: cell.inMonth ? "var(--card)" : undefined,
                                filter: "none !important",
                                transform: "none !important",
                                willChange: "auto",
                                backfaceVisibility: "visible",
                                WebkitFontSmoothing: "antialiased",
                                MozOsxFontSmoothing: "grayscale",
                                textRendering: "optimizeLegibility",
                                WebkitTextSizeAdjust: "100%"
                            }}
                            onClick={() => cell.date && cell.inMonth && openDayModal(cell.date)}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            tabIndex={-1}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span 
                                    className="text-sm font-medium" 
                                    style={{ 
                                        color: "var(--fg)",
                                        filter: "none !important",
                                        transform: "none !important",
                                        willChange: "auto",
                                        WebkitFontSmoothing: "antialiased",
                                        MozOsxFontSmoothing: "grayscale",
                                        textRendering: "optimizeLegibility"
                                    }}
                                >
                                    {cell.dayNum}
                                </span>
                                {isToday && (
                                    <span className="text-xs px-1 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                        Today
                                    </span>
                                )}
                            </div>
                            {isBlocked && (
                                <div className="flex items-center gap-1 text-xs text-red-300 mb-1">
                                    <Ban className="h-3 w-3" />
                                    <span>Blocked</span>
                                </div>
                            )}
                            {dayBookings.length > 0 && (
                                <div 
                                    className="text-xs" 
                                    style={{ 
                                        color: "var(--fg)",
                                        filter: "none !important",
                                        transform: "none !important",
                                        willChange: "auto",
                                        WebkitFontSmoothing: "antialiased",
                                        MozOsxFontSmoothing: "grayscale",
                                        textRendering: "optimizeLegibility"
                                    }}
                                >
                                    {dayBookings.length} booking{dayBookings.length > 1 ? "s" : ""}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedDate?.toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })}
                        </DialogTitle>
                        <DialogDescription>
                            Manage availability and view bookings for this day
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {selectedDayBlocked && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Ban className="h-5 w-5 text-red-300" />
                                        <span className="font-medium text-red-300">This day is fully blocked</span>
                                    </div>
                                    <Button
                                        onClick={() => handleUnblockDay(selectedDateStr)}
                                        disabled={saving}
                                        size="sm"
                                        variant="outline"
                                    >
                                        Unblock
                                    </Button>
                                </div>
                            </div>
                        )}

                        {!selectedDayBlocked && (
                            <>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => setBlockTimeModal(true)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        <Clock className="h-4 w-4 mr-2" />
                                        Block Time Range
                                    </Button>
                                    <Button
                                        onClick={handleBlockFullDay}
                                        disabled={saving}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Block Full Day
                                    </Button>
                                </div>

                                {selectedDayPartiallyBlocked && exceptions[selectedDateStr] && (
                                    <div className="space-y-2">
                                        <h4 className="font-medium" style={{ color: "var(--fg)" }}>
                                            Blocked Time Ranges:
                                        </h4>
                                        {exceptions[selectedDateStr].map((range, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-2 rounded border"
                                                style={{ borderColor: "var(--border)" }}
                                            >
                                                <span style={{ color: "var(--fg)" }}>
                                                    {range.start} – {range.end}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        <div className="space-y-2">
                            <h4 className="font-medium" style={{ color: "var(--fg)" }}>
                                Bookings ({selectedDayBookings.length}):
                            </h4>
                            {selectedDayBookings.length === 0 ? (
                                <p className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                                    No bookings for this day
                                </p>
                            ) : (
                                selectedDayBookings.map((booking) => (
                                    <div
                                        key={booking._id}
                                        className="p-3 rounded border"
                                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium" style={{ color: "var(--fg)" }}>
                                                    {new Date(booking.startAt).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}{" "}
                                                    –{" "}
                                                    {new Date(booking.endAt).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                                <div
                                                    className="text-sm"
                                                    style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}
                                                >
                                                    Status: {booking.status}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={blockTimeModal} onOpenChange={setBlockTimeModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Block Time Range</DialogTitle>
                        <DialogDescription>
                            Select the time range you want to block on{" "}
                            {selectedDate?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block" style={{ color: "var(--fg)" }}>
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    value={blockStart}
                                    onChange={(e) => setBlockStart(e.target.value)}
                                    className="w-full px-3 py-2 rounded border"
                                    style={{ borderColor: "var(--border)", background: "var(--elevated)", color: "var(--fg)" }}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block" style={{ color: "var(--fg)" }}>
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    value={blockEnd}
                                    onChange={(e) => setBlockEnd(e.target.value)}
                                    className="w-full px-3 py-2 rounded border"
                                    style={{ borderColor: "var(--border)", background: "var(--elevated)", color: "var(--fg)" }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setBlockTimeModal(false)} variant="outline">
                                Cancel
                            </Button>
                            <Button onClick={handleBlockTime} disabled={saving}>
                                {saving ? "Blocking..." : "Block Time"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}