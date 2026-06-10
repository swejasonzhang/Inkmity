import { Link } from "react-router-dom";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import {
    Lock,
    User,
    LogOut,
    LayoutDashboard,
    Users,
    Image as ImageIcon,
    Images,
    CalendarDays,
    Mail,
    Info,
    ChevronRight,
    type LucideIcon,
} from "lucide-react";

export type NavItem = BuildNavItem;

const NAV_ICONS: Record<string, LucideIcon> = {
    Dashboard: LayoutDashboard,
    Artists: Users,
    Portfolio: ImageIcon,
    Appointments: CalendarDays,
    Gallery: Images,
    Contact: Mail,
    About: Info,
};

const desktopBase =
    "relative inline-flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg text-[13px] lg:text-[15px] xl:text-[16px] font-extrabold uppercase tracking-wide flex-shrink-0 whitespace-nowrap transition-all duration-200";
const desktopActive = "bg-elevated border border-app text-app shadow-sm";
const desktopIdle = "border border-transparent text-app/55 hover:text-app hover:bg-elevated/50";

const mobileBase =
    "group relative w-full max-w-sm inline-flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xl font-extrabold uppercase tracking-wide transition-all duration-200 bg-black/45 backdrop-blur-sm";
const mobileActive = "bg-black/65 ring-1 ring-white/25";
const mobileIdle = "hover:bg-black/60 active:scale-[0.98]";

export function Nav({
    items,
    isActive,
    isSignedIn,
    onDisabledDashboardHover,
    onDisabledDashboardLeave,
    setMobileMenuOpen,
    handleLogout,
}: {
    items: NavItem[];
    isActive: (to: string) => boolean;
    isSignedIn: boolean;
    onDisabledDashboardHover?: React.MouseEventHandler<Element>;
    onDisabledDashboardLeave?: React.MouseEventHandler<Element>;
    setMobileMenuOpen?: (v: boolean) => void;
    handleLogout?: () => void;
}) {
    return (
        <>
            <nav className="hidden md:flex items-center justify-center gap-1.5 lg:gap-2 w-full min-w-0">
                {items.map((item) => {
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
                                <Lock size={11} className="opacity-60 flex-shrink-0" />
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
                            <span className="whitespace-nowrap">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <nav className="md:hidden flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-evenly gap-2 py-6 w-full px-6">
                {items.map((item) => {
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
                                <Lock size={16} className="opacity-50 flex-shrink-0" />
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
