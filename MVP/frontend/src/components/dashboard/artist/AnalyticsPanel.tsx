import { useMemo } from "react";

export default function AnalyticsPanel(props: any) {
    const kpis = props?.kpis ?? [
        { label: "Revenue (30d)", value: "$12,460", sublabel: "+8.4% vs prev" },
        { label: "Bookings (30d)", value: 27, sublabel: "+3 vs prev" },
        { label: "Avg Ticket", value: "$462" },
        { label: "Conversion", value: "34%", sublabel: "+2.1pp" },
    ];

    const trend = props?.trend ?? [
        { date: "2025-03", revenue: 8200, bookings: 18, avgTicket: 455 },
        { date: "2025-04", revenue: 9100, bookings: 19, avgTicket: 479 },
        { date: "2025-05", revenue: 9800, bookings: 22, avgTicket: 445 },
        { date: "2025-06", revenue: 10400, bookings: 23, avgTicket: 452 },
        { date: "2025-07", revenue: 11200, bookings: 24, avgTicket: 467 },
        { date: "2025-08", revenue: 12460, bookings: 27, avgTicket: 462 },
    ];

    const byStatus = props?.byStatus ?? [
        { status: "confirmed", count: 22 },
        { status: "pending", count: 6 },
        { status: "cancelled", count: 2 },
    ];

    const maxRevenue = useMemo(() => {
        let m = 0;
        for (const p of trend) m = Math.max(m, p.revenue || 0);
        return m || 1;
    }, [trend]);

    const statusColors: any = {
        confirmed: "fill-green-500",
        pending: "fill-yellow-500",
        cancelled: "fill-red-500",
    };

    const statusLabels: any = {
        confirmed: "Confirmed",
        pending: "Pending",
        cancelled: "Cancelled",
    };

    return (
        <div className="w-full h-full flex flex-col gap-3 sm:gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {kpis.map((k: any, i: number) => (
                    <div
                        key={i}
                        className="rounded-xl border border-app bg-elevated px-4 py-3"
                    >
                        <div className="text-xs text-muted-foreground">{k.label}</div>
                        <div className="mt-1 text-2xl font-semibold">{k.value}</div>
                        {k.sublabel && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                                {k.sublabel}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-app bg-elevated p-4">
                <div className="flex items-baseline justify-between">
                    <div className="text-sm font-medium">Revenue (last 6 months)</div>
                    <div className="text-xs text-muted-foreground">
                        ${maxRevenue.toLocaleString()} max
                    </div>
                </div>
                <div className="mt-3">
                    <div className="flex items-end gap-3 h-36">
                        {trend.map((p: any, i: number) => {
                            const h = Math.max(4, Math.round((p.revenue / maxRevenue) * 128));
                            return (
                                <div key={i} className="flex flex-col items-center">
                                    <div
                                        className="w-8 rounded-t-md bg-gradient-to-t from-white/10 to-white/40 border border-white/10"
                                        style={{ height: `${h}px` }}
                                        title={`${p.date}: $${p.revenue.toLocaleString()}`}
                                    />
                                    <div className="mt-2 text-[10px] text-muted-foreground">
                                        {p.date.slice(5)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-card border border-app px-2 py-1">
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-medium">
                            $
                            {trend
                                .reduce((acc: number, p: any) => acc + (p.revenue || 0), 0)
                                .toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded-md bg-card border border-app px-2 py-1">
                        <div className="text-muted-foreground">Bookings</div>
                        <div className="font-medium">
                            {trend.reduce((acc: number, p: any) => acc + (p.bookings || 0), 0)}
                        </div>
                    </div>
                    <div className="rounded-md bg-card border border-app px-2 py-1">
                        <div className="text-muted-foreground">Avg Ticket</div>
                        <div className="font-medium">
                            $
                            {Math.round(
                                trend.reduce((acc: number, p: any) => acc + (p.avgTicket || 0), 0) /
                                Math.max(1, trend.length)
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-app bg-elevated p-4">
                <div className="text-sm font-medium">Bookings by status</div>
                <div className="mt-3 flex items-center gap-3">
                    {byStatus.map((s: any, i: number) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 rounded-md bg-card border border-app px-3 py-2"
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s.status]}`} />
                            <div className="text-sm">
                                <span className="text-muted-foreground mr-1">
                                    {statusLabels[s.status] ?? s.status}:
                                </span>
                                <span className="font-medium">{s.count}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}