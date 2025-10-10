import React from "react";
import { Link } from "react-router-dom";
import { DesktopInkBar } from "./InkBar";

export type NavItem = {
    label: string;
    to: string;
    disabled?: boolean;
    badge?: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
};

type Props = {
    items: NavItem[];
    isActive: (to: string) => boolean;
    isSignedIn: boolean;
    onDisabledDashboardHover?: (e: React.MouseEvent) => void;
    onDisabledDashboardLeave?: () => void;
};

const desktopLink = "relative px-2 py-1 transition text-white/80 hover:text-white group";

export const NavDesktop: React.FC<Props> = ({
    items,
    isActive,
    isSignedIn,
    onDisabledDashboardHover,
    onDisabledDashboardLeave,
}) => {
    return (
        <nav className="flex items-center gap-8 text-lg font-medium text-white">
            {items.map((item) => {
                const active = isActive(item.to);
                if (item.disabled) {
                    const isDashboard = item.label === "Dashboard";
                    return (
                        <span
                            key={item.label}
                            role="button"
                            tabIndex={0}
                            onClick={item.onClick}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") item.onClick?.(e as any);
                            }}
                            onMouseMove={isDashboard ? onDisabledDashboardHover : undefined}
                            onMouseLeave={isDashboard ? onDisabledDashboardLeave : undefined}
                            className={`${desktopLink} cursor-not-allowed text-white/60`}
                            title={item.label === "Gallery" ? "Feature in progress" : "Not authorized. Sign up first."}
                            aria-disabled="true"
                        >
                            <span className="text-white/60 inline-flex items-center gap-2">
                                {item.label}
                                {item.badge}
                            </span>
                            <DesktopInkBar active={active} />
                        </span>
                    );
                }
                return (
                    <Link
                        key={item.label}
                        to={item.to}
                        className={desktopLink}
                        aria-current={active ? "page" : undefined}
                        onClick={item.onClick}
                    >
                        <span className="text-white inline-flex items-center gap-2">
                            {item.label}
                            {item.badge}
                        </span>
                        <DesktopInkBar active={active} />
                    </Link>
                );
            })}

            {!isSignedIn && (
                <Link
                    to="/login"
                    className="inline-flex h-10 items-center justify-center px-3 rounded-lg border border-app bg-elevated text-white hover:bg-elevated/90 transition"
                >
                    Login
                </Link>
            )}
        </nav>
    );
};