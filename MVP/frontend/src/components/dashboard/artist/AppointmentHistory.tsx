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
            <div className="h-full overflow-y-auto p-4 max-md:p-3 space-y-3 max-md:space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 max-md:h-20 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 max-md:p-3">
            {bookings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
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
                                className="rounded-lg border p-4 max-md:p-3"
                                style={{
                                    borderColor: "var(--border)",
                                    background: "color-mix(in oklab, var(--elevated) 50%, transparent)",
                                }}
                            >
                                <div className="flex items-start justify-between gap-4 max-md:gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center max-md:flex-col max-md:items-start gap-2 max-md:gap-1 mb-2">
                                            <div className="flex items-center gap-2 max-md:gap-1.5">
                                                <Clock className="h-4 max-md:h-3.5 w-4 max-md:w-3.5 flex-shrink-0" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                                                <span className="text-sm max-md:text-xs font-medium" style={{ color: "var(--fg)" }}>
                                                    {startDate.toLocaleDateString(undefined, {
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                            <span className="text-xs max-md:pl-5" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                                {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        {booking.note && (
                                            <p className="text-sm max-md:text-xs mb-2 max-md:line-clamp-2" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                                {booking.note}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className="px-2 py-1 max-md:py-0.5 rounded text-xs font-medium border"
                                                style={{
                                                    ...(statusColors[booking.status] ? {} : { background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }),
                                                }}
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

