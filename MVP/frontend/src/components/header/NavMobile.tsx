import React from "react";
import { Link } from "react-router-dom";
import { MobileAccent } from "./InkBar";

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
    setMobileMenuOpen: (v: boolean) => void;
    handleLogout: () => void;
};

const mobileItem =
    "w-full text-left px-4 py-3 rounded-lg font-medium flex items-center justify-between text-white";

export const NavMobile: React.FC<Props> = ({
    items,
    isActive,
    isSignedIn,
    setMobileMenuOpen,
    handleLogout,
}) => {
    return (
        <nav className="flex-1 overflow-y-auto px-2 py-4 text-app" role="menu">
            {items.map((item) => {
                const active = isActive(item.to);
                return (
                    <div className="relative mt-2" key={item.label}>
                        <MobileAccent active={active} />
                        {item.disabled ? (
                            <div
                                role="button"
                                tabIndex={0}
                                aria-disabled="true"
                                onClick={item.onClick}
                                title={item.label === "Gallery" ? "Gallery is a feature in progress" : "Not authorized. Sign up first."}
                                className={`${mobileItem} pl-6 opacity-90 cursor-not-allowed`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={item.label === "Dashboard" ? "text-app/60" : ""}>{item.label}</span>
                                    {item.badge}
                                </div>
                                {item.label === "Dashboard" && !isSignedIn && (
                                    <span className="text-white text-xs ml-2">Not authorized. Sign up first.</span>
                                )}
                            </div>
                        ) : (
                            <Link
                                to={item.to}
                                onClick={(e) => {
                                    item.onClick?.(e);
                                    if (!item.disabled) setMobileMenuOpen(false);
                                }}
                                aria-current={active ? "page" : undefined}
                                className={`${mobileItem} pl-6`}
                                role="menuitem"
                            >
                                <span className="flex items-center gap-2">
                                    {item.label}
                                    {item.badge}
                                </span>
                            </Link>
                        )}
                    </div>
                );
            })}

            {!isSignedIn ? (
                <div className="px-[10px] pt-4">
                    <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full text-center px-4 py-3 rounded-lg border border-app bg-elevated text-app font-semibold hover:bg-elevated/90 active:scale-[0.99]"
                    >
                        Login
                    </Link>
                </div>
            ) : (
                <div className="px-[10px] pt-4">
                    <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 rounded-lg bg-white text-black font-semibold hover:opacity-90 active:scale-[0.99]"
                    >
                        Logout
                    </button>
                </div>
            )}
        </nav>
    );
};
