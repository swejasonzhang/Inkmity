import { Link } from "react-router-dom";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import { InkBar } from "@/components/header/InkBar";

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
        <nav className={["flex items-center gap-6 lg:gap-8", className].join(" ")}>
            {items.map((item) => {
                const active = isActive(item.to);
                const base =
                    "relative group inline-flex items-center rounded-md px-3 py-2 text-[px] md:text-[22px] font-bold text-app/90 hover:text-app transition-colors";

                if (item.to === "#") {
                    return (
                        <button
                            key={item.label}
                            type="button"
                            disabled={!!item.disabled}
                            onMouseEnter={onDisabledDashboardHover}
                            onMouseLeave={onDisabledDashboardLeave}
                            onClick={item.onClick}
                            className={base}
                        >
                            {item.label}
                            <InkBar active={active} />
                        </button>
                    );
                }

                return (
                    <Link key={item.label} to={item.to} className={base}>
                        {item.label}
                        <InkBar active={active} />
                    </Link>
                );
            })}
        </nav>
    );
}