import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Calendar, Clock } from "lucide-react";
import { getBookingsForArtist, type Booking } from "@/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentHistory() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBookings = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const token = await getToken();
                const artistBookings = await getBookingsForArtist(undefined, token);
                setBookings(artistBookings);
            } catch (error) {
                console.error("Failed to load bookings:", error);
            } finally {
                setLoading(false);
            }
        };
        loadBookings();
    }, [user, getToken]);

    if (loading) {
        return (
            <div className="h-full overflow-y-auto p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4">
            {bookings.length === 0 ? (
                <div className="text-center py-12" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No appointments yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bookings.map((booking) => {
                        const startDate = new Date(booking.startAt);
                        const endDate = new Date(booking.endAt);
                        const isPast = endDate < new Date();
                        const statusColors: Record<string, string> = {
                            booked: "bg-blue-500/15 text-blue-300 border-blue-600/30",
                            matched: "bg-green-500/15 text-green-300 border-green-600/30",
                            completed: "bg-green-500/15 text-green-300 border-green-600/30",
                            cancelled: "bg-red-500/15 text-red-300 border-red-600/30",
                        };
                        
                        return (
                            <div
                                key={booking._id}
                                className="rounded-lg border p-4"
                                style={{
                                    borderColor: "var(--border)",
                                    background: "color-mix(in oklab, var(--elevated) 50%, transparent)",
                                }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-4 w-4 flex-shrink-0" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                                            <span className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                                                {startDate.toLocaleDateString(undefined, {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </span>
                                            <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                                {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        {booking.note && (
                                            <p className="text-sm mb-2" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                                {booking.note}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className="px-2 py-1 rounded text-xs font-medium border"
                                                style={{
                                                    ...(statusColors[booking.status] ? {} : { background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }),
                                                }}
                                            >
                                                {booking.status === "booked" ? "Scheduled" : booking.status === "matched" ? "Confirmed" : booking.status === "completed" ? "Completed" : booking.status === "cancelled" ? "Cancelled" : booking.status}
                                            </span>
                                            {isPast && booking.status !== "cancelled" && booking.status !== "completed" && (
                                                <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                                    Past
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

