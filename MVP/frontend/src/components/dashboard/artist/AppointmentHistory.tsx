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
            <div className="h-full overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 md:h-24 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto p-3 md:p-4">
            {bookings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                    <Calendar className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                    <p className="text-xs md:text-sm">No appointments yet.</p>
                </div>
            ) : (
                <div className="space-y-2 md:space-y-3">
                    {bookings.map((booking) => {
                        const startDate = new Date(booking.startAt);
                        const endDate = new Date(booking.endAt);
                        const isPast = endDate < new Date();
                        const statusColors: Record<string, string> = {
                            pending: "bg-yellow-500/15 text-yellow-300 border-yellow-600/30",
                            confirmed: "bg-green-500/15 text-green-300 border-green-600/30",
                            "in-progress": "bg-blue-500/15 text-blue-300 border-blue-600/30",
                            completed: "bg-green-500/15 text-green-300 border-green-600/30",
                            cancelled: "bg-red-500/15 text-red-300 border-red-600/30",
                            "no-show": "bg-gray-500/15 text-gray-300 border-gray-600/30",
                        };
                        
                        const statusLabels: Record<string, string> = {
                            pending: "Pending",
                            confirmed: "Confirmed",
                            "in-progress": "In Progress",
                            completed: "Completed",
                            cancelled: "Cancelled",
                            "no-show": "No Show",
                        };
                        
                        return (
                            <div
                                key={booking._id}
                                className="rounded-lg border p-3 md:p-4 w-full"
                                style={{
                                    borderColor: "var(--border)",
                                    background: "color-mix(in oklab, var(--elevated) 50%, transparent)",
                                }}
                            >
                                <div className="flex items-start justify-between gap-2 md:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center flex-col md:flex-row md:items-center gap-1 md:gap-2 mb-2">
                                            <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-auto">
                                                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                                                <span className="text-xs md:text-sm font-medium" style={{ color: "var(--fg)" }}>
                                                    {startDate.toLocaleDateString(undefined, {
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                            <span className="text-xs pl-5 md:pl-0" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                                {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        {booking.note && (
                                            <p className="text-xs md:text-sm mb-2 line-clamp-2 md:line-clamp-none" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                                {booking.note}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className={`px-2 py-0.5 md:py-1 rounded text-xs font-medium border ${statusColors[booking.status] || "bg-elevated border-border"}`}
                                                style={statusColors[booking.status] ? {} : { color: "var(--fg)" }}
                                            >
                                                {statusLabels[booking.status] || booking.status}
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

