import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Calendar, Clock, User, DollarSign, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Booking = {
    _id: string;
    artistId: string;
    clientId: string;
    startAt: string;
    endAt: string;
    status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show" | "booked" | "matched";
    appointmentType?: "consultation" | "tattoo_session";
    note?: string;
    priceCents?: number;
    depositRequiredCents?: number;
    depositPaidCents?: number;
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

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const formatDuration = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffMins = Math.round(diffMs / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const minutes = diffMins % 60;
        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else {
            return `${minutes}m`;
        }
    };

    const getStatusColor = (status: string, isPast: boolean = false) => {
        if (isPast) {
            // Past appointments: use gray
            switch (status) {
                case "completed":
                    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
                case "cancelled":
                case "no-show":
                    return "bg-red-500/20 text-red-500 border-red-500/30";
                default:
                    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
            }
        } else {
            // Upcoming appointments: use white
            switch (status) {
                case "confirmed":
                case "booked":
                case "matched":
                    return "bg-white/20 text-white border-white/30";
                case "pending":
                    return "bg-white/20 text-white border-white/30";
                case "in-progress":
                    return "bg-white/20 text-white border-white/30";
                case "cancelled":
                case "no-show":
                    return "bg-red-500/20 text-red-500 border-red-500/30";
                default:
                    return "bg-white/20 text-white border-white/30";
            }
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

    const BookingRow = ({ booking, isPast = false }: { booking: Booking; isPast?: boolean }) => {
        const isConsultation = booking.appointmentType === "consultation";
        const isAppointment = booking.appointmentType === "tattoo_session";
        const appointmentTypeLabel = isConsultation ? "Consultation" : isAppointment ? "Appointment" : "Booking";
        
        return (
            <div
                className="rounded-xl border p-4"
                style={{
                    background: "color-mix(in oklab, var(--card) 80%, transparent)",
                    borderColor: "var(--border)",
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
                                    background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                                }}
                            >
                                <User className="h-5 w-5" style={{ color: "var(--fg)" }} />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate" style={{ color: "var(--fg)" }}>
                                {booking.client?.username || "Unknown Client"}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-medium px-2 py-0.5 rounded border" style={{ 
                                    color: isConsultation ? "rgba(255, 255, 255, 0.7)" : isAppointment ? "white" : "var(--fg)",
                                    borderColor: isConsultation ? "rgba(255, 255, 255, 0.4)" : isAppointment ? "rgba(255, 255, 255, 0.6)" : "var(--border)",
                                    background: "transparent"
                                }}>
                                    {appointmentTypeLabel}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status, isPast)}`}>
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace("-", " ")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                        <span style={{ color: "var(--fg)" }}>{formatDate(booking.startAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 flex-shrink-0" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                        <span style={{ color: "var(--fg)" }}>
                            {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                        </span>
                        <span className="text-xs ml-auto" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                            ({formatDuration(booking.startAt, booking.endAt)})
                        </span>
                    </div>
                    
                    {isAppointment && booking.priceCents !== undefined && booking.priceCents > 0 && (
                        <div className="flex items-center gap-2 text-sm pt-1">
                            <DollarSign className="h-4 w-4 flex-shrink-0" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                            <span style={{ color: "var(--fg)" }}>
                                Total: <span className="font-semibold">{formatCurrency(booking.priceCents)}</span>
                            </span>
                        </div>
                    )}
                    
                    {isAppointment && booking.depositRequiredCents !== undefined && booking.depositRequiredCents > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="h-4 w-4 flex-shrink-0" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                            <span style={{ color: "var(--fg)" }}>
                                Deposit: <span className="font-semibold">{formatCurrency(booking.depositRequiredCents)}</span>
                                {booking.depositPaidCents !== undefined && booking.depositPaidCents > 0 && (
                                    <span className="text-xs ml-1" style={{ color: booking.depositPaidCents >= booking.depositRequiredCents ? "#10b981" : "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                        ({booking.depositPaidCents >= booking.depositRequiredCents ? "Paid" : `Paid: ${formatCurrency(booking.depositPaidCents)}`})
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                    
                    {booking.note && (
                        <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                            <p className="text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                <span className="font-medium">Note: </span>{booking.note}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const Empty = ({ title, subtitle }: { title: string; subtitle: string }) => (
        <div className="text-center w-full" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
            <Calendar className="h-14 w-14 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-semibold mb-1">{title}</p>
            <p className="text-sm opacity-70">{subtitle}</p>
        </div>
    );

    const Panel = ({ title, items }: { title: string; items: Booking[] }) => {
        const isPast = title.toLowerCase() === "past";
        return (
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
                        <Empty title={`No ${title.toLowerCase()} appointments`} subtitle="Your bookings will appear here" />
                    ) : (
                        <div className="space-y-4 w-full">
                            {items.map((b) => (
                                <BookingRow key={b._id} booking={b} isPast={isPast} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

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
