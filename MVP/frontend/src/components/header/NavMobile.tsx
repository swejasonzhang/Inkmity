import { Link } from "react-router-dom";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import { InkAccentMobile } from "@/components/header/InkBar";
import { Lock, User } from "lucide-react";

export type NavItem = BuildNavItem;

export function NavMobile({
    items,
    isActive,
    isSignedIn,
    setMobileMenuOpen,
    handleLogout,
}: {
    items: NavItem[];
    isActive: (to: string) => boolean;
    isSignedIn: boolean;
    setMobileMenuOpen: (v: boolean) => void;
    handleLogout: () => void;
}) {
    return (
        <nav className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-4 py-6">
            {items.map((item) => {
                const active = isActive(item.to);
                const base =
                    "relative inline-flex items-center justify-center gap-3 px-8 py-5 text-center text-app text-[26px] md:text-[28px] font-extrabold uppercase tracking-wide";
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
                                    setMobileMenuOpen(false);
                                }}
                                className={base}
                                aria-disabled="true"
                            >
                                <span className="inline-flex items-center justify-center scale-125">
                                    <InkAccentMobile active={active} />
                                </span>
                                <span>{item.label}</span>
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
                            <span className="inline-flex items-center justify-center scale-125">
                                <InkAccentMobile active={active} />
                            </span>
                            <Lock size={18} className="opacity-80" />
                            <span>{item.label}</span>
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
                        onClick={() => setMobileMenuOpen(false)}
                        className={base}
                    >
                        <span className="inline-flex items-center justify-center scale-125">
                            <InkAccentMobile active={active} />
                        </span>
                        <span>{item.label}</span>
                    </Link>
                );
            })}

            {isSignedIn && (
                <>
                    <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="relative inline-flex items-center justify-center gap-3 px-8 py-5 text-center text-app text-[22px] md:text-[24px] font-extrabold uppercase tracking-wide"
                    >
                        <span className="inline-flex items-center justify-center scale-125">
                            <InkAccentMobile active={isActive("/profile")} />
                        </span>
                        <User size={20} />
                        <span>Profile</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => {
                            setMobileMenuOpen(false);
                            handleLogout();
                        }}
                        className="relative inline-flex items-center justify-center gap-3 px-8 py-5 text-center text-app text-[22px] md:text-[24px] font-extrabold uppercase tracking-wide"
                    >
                        <span className="inline-flex items-center justify-center scale-125">
                            <InkAccentMobile active={false} />
                        </span>
                        <span>Logout</span>
                    </button>
                </>
            )}
        </nav>
    );
}