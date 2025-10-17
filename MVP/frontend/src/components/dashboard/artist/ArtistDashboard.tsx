import CalendarView from "@/components/dashboard/artist/CalendarView";
import AnalyticsPanel from "@/components/dashboard/artist/AnalyticsPanel";

export default function ArtistDashboard() {
    return (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="lg:col-span-2 rounded-2xl bg-card border border-app overflow-hidden flex flex-col min-h-[60vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                    <div className="font-semibold">Bookings Calendar</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <CalendarView />
                </div>
            </section>

            <aside className="lg:col-span-1 rounded-2xl bg-card border border-app overflow-hidden min-h-[60vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                    <div className="font-semibold">Analytics</div>
                </div>
                <div className="p-4">
                    <AnalyticsPanel />
                </div>
            </aside>
        </div>
    );
}
