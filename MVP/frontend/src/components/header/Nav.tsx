import { Link } from "react-router-dom";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import { Lock, User } from "lucide-react";
import { VisibilityDropdown } from "./VisibilityDropdown";

export type NavItem = BuildNavItem;

const desktopBase =
    "relative inline-flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg text-[13px] lg:text-[15px] xl:text-[16px] font-extrabold uppercase tracking-wide flex-shrink-0 whitespace-nowrap transition-all duration-200";
const desktopActive = "bg-elevated border border-app text-app shadow-sm";
const desktopIdle = "border border-transparent text-app/55 hover:text-app hover:bg-elevated/50";

const mobileBase =
    "relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-center text-[22px] md:text-[26px] font-extrabold uppercase tracking-wide whitespace-nowrap transition-all duration-200";
const mobileActive = "bg-elevated/70 border border-app text-app";
const mobileIdle = "border border-transparent text-app/75 hover:text-app";

export function Nav({
    items,
    isActive,
    isSignedIn,
    onDisabledDashboardHover,
    onDisabledDashboardLeave,
    setMobileMenuOpen,
    handleLogout,
    userVisibility,
    isOnline,
    onVisibilityChange,
}: {
    items: NavItem[];
    isActive: (to: string) => boolean;
    isSignedIn: boolean;
    onDisabledDashboardHover?: React.MouseEventHandler<Element>;
    onDisabledDashboardLeave?: React.MouseEventHandler<Element>;
    setMobileMenuOpen?: (v: boolean) => void;
    handleLogout?: () => void;
    userVisibility?: "online" | "away" | "invisible";
    isOnline?: boolean;
    onVisibilityChange?: (status: "online" | "away" | "invisible") => void;
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

            <nav className="md:hidden flex-1 overflow-y-auto flex flex-col items-center justify-center gap-3 py-6 w-full px-6">
                {items.map((item) => {
                    const active = isActive(item.to);
                    const isDisabled = item.to === "#" || item.disabled;
                    const cls = `${mobileBase} ${active ? mobileActive : mobileIdle}`;

                    if (isDisabled) {
                        const isGate = typeof item.onClick === "function";
                        if (isGate) {
                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={(e) => {
                                        item.onClick?.(e);
                                        setMobileMenuOpen?.(false);
                                    }}
                                    className={cls}
                                    aria-label={`${item.label} — sign in required`}
                                >
                                    <Lock size={18} className="opacity-70 flex-shrink-0" />
                                    <span className="whitespace-nowrap">{item.label}</span>
                                </button>
                            );
                        }
                        return (
                            <button
                                key={item.label}
                                type="button"
                                disabled
                                className={cls}
                                aria-disabled="true"
                                title="In Development"
                            >
                                <Lock size={18} className="opacity-70 flex-shrink-0" />
                                <span className="whitespace-nowrap">{item.label}</span>
                                <span className="rounded-md px-2 py-0.5 text-[12px] font-black uppercase tracking-wider bg-app/10 text-app/70">
                                    Soon
                                </span>
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
                            <span>{item.label}</span>
                        </Link>
                    );
                })}

                {isSignedIn && handleLogout && (
                    <>
                        {userVisibility !== undefined && onVisibilityChange && (
                            <div className="w-full max-w-xs px-2 py-4">
                                <div className="text-[14px] font-semibold uppercase tracking-wide text-app/70 mb-3 text-center">Status</div>
                                <VisibilityDropdown
                                    currentStatus={userVisibility}
                                    isOnline={isOnline || false}
                                    onStatusChange={(status) => onVisibilityChange(status)}
                                    triggerWidth={280}
                                />
                            </div>
                        )}
                        <div className="w-full max-w-xs h-px bg-app/20 my-2" />
                        <Link
                            to="/profile"
                            onClick={() => setMobileMenuOpen?.(false)}
                            aria-current={isActive("/profile") ? "page" : undefined}
                            className={`${mobileBase} ${isActive("/profile") ? mobileActive : mobileIdle}`}
                        >
                            <User size={20} className="flex-shrink-0" />
                            <span className="whitespace-nowrap">Profile</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                setMobileMenuOpen?.(false);
                                handleLogout();
                            }}
                            className={`${mobileBase} ${mobileIdle}`}
                        >
                            <span className="whitespace-nowrap">Logout</span>
                        </button>
                    </>
                )}
            </nav>
        </>
    );
}
