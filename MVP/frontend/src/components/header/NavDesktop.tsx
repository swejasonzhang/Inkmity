import { Link } from "react-router-dom";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import { InkBar } from "@/components/header/InkBar";
import { Lock } from "lucide-react";

export type NavItem = BuildNavItem;

export function NavDesktop({
    items,
    isActive,
    onDisabledDashboardHover,
    onDisabledDashboardLeave,
    className = "",
}: {
    items: NavItem[];
    isActive: (to: string) => boolean;
    isSignedIn: boolean;
    onDisabledDashboardHover?: React.MouseEventHandler<Element>;
    onDisabledDashboardLeave?: React.MouseEventHandler<Element>;
    className?: string;
}) {
    return (
        <nav className={["flex items-center gap-8", className].join(" ")}>
            {items.map((item) => {
                const active = isActive(item.to);
                const base =
                    "relative group inline-flex items-center gap-3 px-4 py-2 text-[17px] md:text-[18px] font-extrabold uppercase tracking-wide text-app/90 hover:text-app";

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
                            <Lock size={16} className="opacity-80" />
                            <span>{item.label}</span>
                            <span className="rounded-md px-2 py-0.5 text-[11px] font-black uppercase tracking-wider bg-elevated border border-app text-app">
                                In Development
                            </span>
                            <InkBar active={active} />
                        </button>
                    );
                }

                return (
                    <Link key={item.label} to={item.to} className={base}>
                        <span>{item.label}</span>
                        <InkBar active={active} />
                    </Link>
                );
            })}
        </nav>
    );
}