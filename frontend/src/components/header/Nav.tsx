import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import {
    User,
    LogOut,
    LayoutDashboard,
    Users,
    Image as ImageIcon,
    Compass,
    CalendarDays,
    Mail,
    Info,
    Award,
    Store,
    ChevronRight,
    type LucideIcon,
} from "lucide-react";

export type NavItem = BuildNavItem;

const NAV_ICONS: Record<string, LucideIcon> = {
    Dashboard: LayoutDashboard,
    Artists: Users,
    Portfolio: ImageIcon,
    Studios: Store,
    Appointments: CalendarDays,
    Explore: Compass,
    Tiers: Award,
    Contact: Mail,
    About: Info,
};

const desktopBase =
    "relative flex items-center justify-center gap-1.5 min-w-[9rem] px-3 lg:px-4 py-0 rounded-lg text-[15px] lg:text-[17px] xl:text-[18px] font-semibold uppercase tracking-tight whitespace-nowrap transition-all duration-200";
const desktopActive = "text-app";
const desktopIdle = "text-app/50 hover:text-app";

const mobileBase =
    "group relative w-full max-w-sm inline-flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xl font-extrabold uppercase tracking-wide transition-all duration-200 bg-black/45 backdrop-blur-sm";
const mobileActive = "bg-black/65 ring-1 ring-white/25";
const mobileIdle = "hover:bg-black/60 active:scale-[0.98]";

function CountBadge({ count, loading, className = "" }: { count?: number; loading?: boolean; className?: string }) {
    // Only badge-bearing items (count defined) ever reserve a slot. The slot is
    // a constant width across loading / zero / number states so the nav link
    // never shifts when a count appears, changes, or disappears.
    if (count === undefined) return null;
    const slot = `inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-extrabold leading-none tabular-nums`;
    if (loading) {
        return <Skeleton aria-hidden className={`${slot} rounded-full ${className}`} />;
    }
    if (count <= 0) {
        // Invisible placeholder keeps the reserved width so nothing shifts.
        return <span aria-hidden className={`${slot} invisible ${className}`}>0</span>;
    }
    return (
        <span
            aria-label={`${count} new`}
            className={`${slot} bg-white text-black shadow-sm ${className}`}
        >
            {count > 99 ? "99+" : count}
        </span>
    );
}

export function Nav({
    items,
    isActive,
    isSignedIn,
    badgesLoading,
    onDisabledDashboardHover,
    onDisabledDashboardLeave,
    setMobileMenuOpen,
    handleLogout,
}: {
    items: NavItem[];
    isActive: (to: string) => boolean;
    isSignedIn: boolean;
    badgesLoading?: boolean;
    onDisabledDashboardHover?: React.MouseEventHandler<Element>;
    onDisabledDashboardLeave?: React.MouseEventHandler<Element>;
    setMobileMenuOpen?: (v: boolean) => void;
    handleLogout?: () => void;
}) {
    return (
        <>
            <nav className="hidden md:flex items-center justify-start gap-1 lg:gap-1.5 w-full min-w-0">
                {items.filter((i) => !i.secondary).map((item) => {
                    const active = isActive(item.to);
                    const isDisabled = item.to === "#" || item.disabled;
                    const cls = `${desktopBase} ${active ? desktopActive : desktopIdle}`;

                    if (isDisabled) {
                        return (
                            <button
                                key={item.label}
                                type="button"
                                onMouseMove={onDisabledDashboardHover}
                                onMouseLeave={onDisabledDashboardLeave}
                                onClick={item.onClick}
                                aria-label={`${item.label} — sign in required`}
                                className={`${desktopBase} ${desktopIdle}`}
                            >
                                <span className="whitespace-nowrap">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            to={item.to}
                            aria-current={active ? "page" : undefined}
                            className={cls}
                        >
                            {/* Left spacer mirrors the right badge slot so the label stays centered. */}
                            {item.count !== undefined && (
                                <span aria-hidden className="inline-flex h-5 min-w-5 px-1.5 shrink-0 invisible" />
                            )}
                            <span className="whitespace-nowrap">{item.label}</span>
                            <CountBadge count={item.count} loading={badgesLoading} className="shrink-0" />
                        </Link>
                    );
                })}
            </nav>

            <nav className="md:hidden flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-evenly gap-2 py-6 w-full px-6">
                {items.filter((i) => !i.secondary).map((item) => {
                    const active = isActive(item.to);
                    const isDisabled = item.to === "#" || item.disabled;
                    const cls = `${mobileBase} ${active ? mobileActive : mobileIdle}`;
                    const Icon = NAV_ICONS[item.label] ?? LayoutDashboard;
                    const iconOpacity = active ? "opacity-100" : "opacity-60";

                    if (isDisabled) {
                        const isGate = typeof item.onClick === "function";
                        return (
                            <button
                                key={item.label}
                                type="button"
                                disabled={!isGate}
                                onClick={isGate ? (e) => { item.onClick?.(e); setMobileMenuOpen?.(false); } : undefined}
                                className={cls}
                                aria-label={`${item.label} — sign in required`}
                                title={isGate ? undefined : "In Development"}
                            >
                                <Icon size={22} className={`flex-shrink-0 ${iconOpacity}`} />
                                <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => setMobileMenuOpen?.(false)}
                            aria-current={active ? "page" : undefined}
                            className={cls}
                        >
                            <Icon size={22} className={`flex-shrink-0 ${iconOpacity}`} />
                            <span className="flex-1 text-left">{item.label}</span>
                            <CountBadge count={item.count} loading={badgesLoading} />
                            <ChevronRight size={18} className="opacity-30 group-hover:opacity-70 transition-opacity flex-shrink-0" />
                        </Link>
                    );
                })}

                {isSignedIn && handleLogout && (
                    <>
                        <div className="w-full max-w-sm h-px bg-white/10 my-2" />
                        <Link
                            to="/profile"
                            onClick={() => setMobileMenuOpen?.(false)}
                            aria-current={isActive("/profile") ? "page" : undefined}
                            className={`${mobileBase} ${isActive("/profile") ? mobileActive : mobileIdle}`}
                        >
                            <User size={22} className={`flex-shrink-0 ${isActive("/profile") ? "opacity-100" : "opacity-60"}`} />
                            <span className="flex-1 text-left">Profile</span>
                            <ChevronRight size={18} className="opacity-30 group-hover:opacity-70 transition-opacity flex-shrink-0" />
                        </Link>
                        {items.filter((i) => i.secondary).map((item) => {
                            const Icon = NAV_ICONS[item.label] ?? Info;
                            return (
                                <Link
                                    key={item.label}
                                    to={item.to}
                                    onClick={() => setMobileMenuOpen?.(false)}
                                    aria-current={isActive(item.to) ? "page" : undefined}
                                    className={`${mobileBase} ${isActive(item.to) ? mobileActive : mobileIdle}`}
                                >
                                    <Icon size={22} className="flex-shrink-0 opacity-60" />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <ChevronRight size={18} className="opacity-30 group-hover:opacity-70 transition-opacity flex-shrink-0" />
                                </Link>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => {
                                setMobileMenuOpen?.(false);
                                handleLogout();
                            }}
                            className={`${mobileBase} ${mobileIdle} text-app`}
                        >
                            <LogOut size={22} className="flex-shrink-0 opacity-70" />
                            <span className="flex-1 text-left">Logout</span>
                        </button>
                    </>
                )}
            </nav>
        </>
    );
}
