import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Calendar, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Booking = {
    _id: string;
    artistId: string;
    clientId: string;
    startAt: string;
    endAt: string;
    status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show" | "booked" | "matched";
    note?: string;
    client?: {
        username?: string;
        profileImage?: string;
        avatar?: { url?: string };
    };
};

export default function ArtistAppointmentHistory() {
    const { getToken } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/bookings/artist`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) throw new Error("Failed to load bookings");
            const data = await response.json();
            setBookings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load bookings:", error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const sortedBookings = useMemo(() => {
        return [...bookings].sort((a, b) => {
            const dateA = new Date(a.startAt).getTime();
            const dateB = new Date(b.startAt).getTime();
            return dateB - dateA;
        });
    }, [bookings]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { 
            weekday: "short", 
            month: "short", 
            day: "numeric", 
            year: "numeric" 
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString(undefined, { 
            hour: "2-digit", 
            minute: "2-digit" 
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
            case "booked":
            case "matched":
                return "bg-green-500/20 text-green-500 border-green-500/30";
            case "pending":
                return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
            case "completed":
                return "bg-blue-500/20 text-blue-500 border-blue-500/30";
            case "cancelled":
            case "no-show":
                return "bg-red-500/20 text-red-500 border-red-500/30";
            default:
                return "bg-gray-500/20 text-gray-500 border-gray-500/30";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                    Loading appointments...
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            <Card className="w-full h-full flex flex-col shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
                <CardHeader className="text-center space-y-1 px-3 sm:px-6 flex-shrink-0">
                    <CardTitle className="text-base sm:text-lg break-words">Appointment History</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-6 flex-1 overflow-y-auto flex items-center justify-center">
                    {sortedBookings.length === 0 ? (
                        <div className="text-center w-full" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-xl font-semibold mb-2">No appointments yet</p>
                            <p className="text-sm opacity-70">Your booking history will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4 w-full">
                            {sortedBookings.map((booking) => (
                                <div
                                    key={booking._id}
                                    className="rounded-xl border p-4"
                                    style={{ 
                                        background: "color-mix(in oklab, var(--card) 80%, transparent)",
                                        borderColor: "var(--border)"
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {booking.client?.profileImage || booking.client?.avatar?.url ? (
                                                <img
                                                    src={booking.client.profileImage || booking.client.avatar?.url}
                                                    alt={booking.client.username || "Client"}
                                                    className="h-10 w-10 rounded-full object-cover border flex-shrink-0"
                                                    style={{ borderColor: "var(--border)" }}
                                                />
                                            ) : (
                                                <div
                                                    className="h-10 w-10 rounded-full flex items-center justify-center border flex-shrink-0"
                                                    style={{ 
                                                        borderColor: "var(--border)",
                                                        background: "color-mix(in oklab, var(--elevated) 92%, transparent)"
                                                    }}
                                                >
                                                    <User className="h-5 w-5" style={{ color: "var(--fg)" }} />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm truncate" style={{ color: "var(--fg)" }}>
                                                    {booking.client?.username || "Unknown Client"}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}
                                                    >
                                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace("-", " ")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                                            <span style={{ color: "var(--fg)" }}>{formatDate(booking.startAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                                            <span style={{ color: "var(--fg)" }}>
                                                {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                                            </span>
                                        </div>
                                        {booking.note && (
                                            <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                                                <p className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                                    {booking.note}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

