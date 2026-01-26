import { Link } from "react-router-dom";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import { InkBar } from "./InkBar";
import { InkAccentMobile } from "./InkBar";
import { Lock, User } from "lucide-react";
import { VisibilityDropdown } from "./VisibilityDropdown";

export type NavItem = BuildNavItem;

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
            <nav className="hidden sm:flex items-center justify-center gap-2 md:gap-4 lg:gap-6 xl:gap-8 w-full">
                {items.map((item) => {
                    const active = isActive(item.to);
                    const base =
                        "relative group inline-flex items-center gap-1 md:gap-2 px-1 md:px-2 lg:px-3 py-2 text-[14px] md:text-[16px] lg:text-[18px] font-extrabold uppercase tracking-wide text-app/90 hover:text-app flex-shrink-0 whitespace-nowrap";
                    const isDisabled = item.to === "#" || item.disabled;

                    if (isDisabled) {
                        return (
                            <button
                                key={item.label}
                                type="button"
                                disabled
                                onMouseEnter={onDisabledDashboardHover}
                                onMouseLeave={onDisabledDashboardLeave}
                                onClick={item.onClick}
                                className={base}
                                aria-disabled="true"
                                title="In Development"
                            >
                                <Lock size={14} className="opacity-80 flex-shrink-0" />
                                <span className="whitespace-nowrap">{item.label}</span>
                                <span className="rounded px-1 py-0.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-elevated border border-app text-app flex-shrink-0 whitespace-nowrap">
                                    In Dev
                                </span>
                                <InkBar active={active} />
                            </button>
                        );
                    }

                    return (
                        <Link key={item.label} to={item.to} className={base}>
                            <span className="truncate min-w-0">{item.label}</span>
                            <InkBar active={active} />
                        </Link>
                    );
                })}
            </nav>

            <nav className="sm:hidden flex-1 overflow-y-auto flex flex-col items-center justify-center gap-4 py-6">
                {items.map((item) => {
                    const active = isActive(item.to);
                    const base =
                        "relative inline-flex items-center justify-center gap-3 px-8 py-5 text-center text-app text-[24px] md:text-[26px] font-extrabold uppercase tracking-wide whitespace-nowrap";
                    const isDisabled = item.to === "#" || item.disabled;

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
                                    className={base}
                                    aria-disabled="true"
                                >
                                    <span className="inline-flex items-center justify-center scale-125 flex-shrink-0">
                                        <InkAccentMobile active={active} />
                                    </span>
                                    <span className="whitespace-nowrap">{item.label}</span>
                                </button>
                            );
                        }
                        return (
                            <button
                                key={item.label}
                                type="button"
                                disabled
                                className={base}
                                aria-disabled="true"
                                title="In Development"
                            >
                                <span className="inline-flex items-center justify-center scale-125 flex-shrink-0">
                                    <InkAccentMobile active={active} />
                                </span>
                                <Lock size={18} className="opacity-80 flex-shrink-0" />
                                <span className="whitespace-nowrap">{item.label}</span>
                                <span className="rounded-md px-2 py-0.5 text-[12px] font-black uppercase tracking-wider bg-elevated border border-app text-app">
                                    In Development
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => setMobileMenuOpen?.(false)}
                            className={base}
                        >
                            <span className="inline-flex items-center justify-center scale-125">
                                <InkAccentMobile active={active} />
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}

                {isSignedIn && handleLogout && (
                    <>
                        {userVisibility !== undefined && onVisibilityChange && (
                            <div className="w-full px-8 py-4">
                                <div className="text-[14px] font-semibold uppercase tracking-wide text-app/70 mb-3 text-center">Status</div>
                                <VisibilityDropdown
                                    currentStatus={userVisibility}
                                    isOnline={isOnline || false}
                                    onStatusChange={(status) => {
                                        onVisibilityChange(status);
                                    }}
                                    triggerWidth={280}
                                />
                            </div>
                        )}
                        <div className="w-full h-px bg-app/20 my-2" />
                        <Link
                            to="/profile"
                            onClick={() => setMobileMenuOpen?.(false)}
                            className="relative inline-flex items-center justify-center gap-3 px-8 py-5 text-center text-app text-[24px] md:text-[26px] font-extrabold uppercase tracking-wide whitespace-nowrap"
                        >
                            <span className="inline-flex items-center justify-center scale-125 flex-shrink-0">
                                <InkAccentMobile active={isActive("/profile")} />
                            </span>
                            <User size={20} className="flex-shrink-0" />
                            <span className="whitespace-nowrap">Profile</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                setMobileMenuOpen?.(false);
                                handleLogout();
                            }}
                            className="relative inline-flex items-center justify-center gap-3 px-8 py-5 text-center text-app text-[24px] md:text-[26px] font-extrabold uppercase tracking-wide whitespace-nowrap"
                        >
                            <span className="inline-flex items-center justify-center scale-125 flex-shrink-0">
                                <InkAccentMobile active={false} />
                            </span>
                            <span className="whitespace-nowrap">Logout</span>
                        </button>
                    </>
                )}
            </nav>
        </>
    );
}