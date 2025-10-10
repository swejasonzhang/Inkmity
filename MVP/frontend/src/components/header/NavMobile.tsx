import { Link } from "react-router-dom";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import { InkAccentMobile } from "@/components/header/InkBar";
import { Lock } from "lucide-react";

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
        <nav className="flex-1 overflow-y-auto flex flex-col items-center gap-3 py-3">
            {items.map((item) => {
                const active = isActive(item.to);
                const base =
                    "relative inline-flex items-center justify-center gap-3 px-7 py-4 text-center text-app text-[20px] md:text-[22px] font-extrabold uppercase tracking-wide";
                const isDisabled = item.to === "#" || item.disabled;

                if (isDisabled) {
                    return (
                        <button
                            key={item.label}
                            type="button"
                            disabled
                            onClick={item.onClick}
                            className={base}
                            aria-disabled="true"
                            title="In Development"
                        >
                            <InkAccentMobile active={active} />
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
                        <InkAccentMobile active={active} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}

            {isSignedIn && (
                <button
                    type="button"
                    onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                    }}
                    className="relative inline-flex items-center justify-center gap-3 px-7 py-4 text-center text-app text-[20px] md:text-[22px] font-extrabold uppercase tracking-wide"
                >
                    <InkAccentMobile active={false} />
                    <span>Logout</span>
                </button>
            )}
        </nav>
    );
}
