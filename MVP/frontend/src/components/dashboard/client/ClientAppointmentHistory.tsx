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
    artist?: {
        username?: string;
        profileImage?: string;
        avatar?: { url?: string };
    };
};

export default function ClientAppointmentHistory() {
    const { getToken } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/bookings/client`, {
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

    const { pendingBookings, pastBookings } = useMemo(() => {
        const pendingStatuses = new Set<Booking["status"]>([
            "pending",
            "confirmed",
            "booked",
            "matched",
            "in-progress",
        ]);

        const pending = bookings
            .filter((b) => pendingStatuses.has(b.status))
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

        const past = bookings
            .filter((b) => !pendingStatuses.has(b.status))
            .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

        return { pendingBookings: pending, pastBookings: past };
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

    const BookingRow = ({ booking }: { booking: Booking }) => (
        <div
            className="rounded-xl border p-4"
            style={{
                background: "color-mix(in oklab, var(--card) 80%, transparent)",
                borderColor: "var(--border)",
            }}
        >
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {booking.artist?.profileImage || booking.artist?.avatar?.url ? (
                        <img
                            src={booking.artist.profileImage || booking.artist.avatar?.url}
                            alt={booking.artist.username || "Artist"}
                            className="h-10 w-10 rounded-full object-cover border flex-shrink-0"
                            style={{ borderColor: "var(--border)" }}
                        />
                    ) : (
                        <div
                            className="h-10 w-10 rounded-full flex items-center justify-center border flex-shrink-0"
                            style={{
                                borderColor: "var(--border)",
                                background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                            }}
                        >
                            <User className="h-5 w-5" style={{ color: "var(--fg)" }} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate" style={{ color: "var(--fg)" }}>
                            {booking.artist?.username || "Unknown Artist"}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
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
    );

    const Empty = ({ title, subtitle }: { title: string; subtitle: string }) => (
        <div className="text-center w-full" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
            <Calendar className="h-14 w-14 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-semibold mb-1">{title}</p>
            <p className="text-sm opacity-70">{subtitle}</p>
        </div>
    );

    const Panel = ({ title, items }: { title: string; items: Booking[] }) => (
        <Card className="w-full h-full min-h-0 flex flex-col shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)", minHeight: "100%" }}>
            <CardHeader className="text-center space-y-1 px-3 sm:px-6 flex-shrink-0" style={{ minHeight: "auto" }}>
                <CardTitle className="text-base sm:text-lg break-words">
                    {title} {typeof items?.length === "number" ? `(${items.length})` : ""}
                </CardTitle>
            </CardHeader>
            <CardContent
                className={[
                    "px-4 sm:px-6 pb-6 flex-1 overflow-y-auto min-h-0",
                    items.length === 0 ? "flex items-center justify-center" : "",
                ].join(" ")}
                style={{ flex: "1 1 auto", minHeight: 0 }}
            >
                {items.length === 0 ? (
                    <Empty title={`No ${title.toLowerCase()}`} subtitle="Your bookings will appear here" />
                ) : (
                    <div className="space-y-4 w-full">
                        {items.map((b) => (
                            <BookingRow key={b._id} booking={b} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const hasAny = pendingBookings.length + pastBookings.length > 0;

    return (
        <div className="h-full w-full min-h-0 flex flex-col overflow-hidden">
            {!hasAny ? (
                <Card className="w-full h-full flex flex-col shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
                    <CardHeader className="text-center space-y-1 px-3 sm:px-6 flex-shrink-0">
                        <CardTitle className="text-base sm:text-lg break-words">Appointments</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-6 flex-1 overflow-y-auto flex items-center justify-center">
                        <Empty title="No appointments yet" subtitle="Your booking history will appear here" />
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-0 items-stretch">
                    <Panel title="Pending" items={pendingBookings} />
                    <Panel title="Past" items={pastBookings} />
                </div>
            )}
        </div>
    );
}

