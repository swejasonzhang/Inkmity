import { Link } from "react-router-dom";
import type { NavItem as BuildNavItem } from "./buildNavItems";
import { InkAccentMobile } from "@/components/header/InkBar";

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
        <nav className="flex-1 overflow-y-auto flex flex-col items-center gap-1.5 py-2 px-4">
            {items.map((item) => {
                const active = isActive(item.to);

                if (item.to === "#") {
                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={item.onClick}
                            className="relative w-full inline-flex items-center justify-center px-6 py-4 text-center text-app text-[18px] md:text-[20px] font-semibold"
                        >
                            <InkAccentMobile active={active} />
                            <span className="w-full text-center">{item.label}</span>
                        </button>
                    );
                }

                return (
                    <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="relative w-full inline-flex items-center justify-center px-6 py-4 text-center text-app text-[18px] md:text-[20px] font-semibold"
                    >
                        <InkAccentMobile active={active} />
                        <span className="w-full text-center">{item.label}</span>
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
                    className="relative w-full inline-flex items-center justify-center px-6 py-4 text-center text-app text-[18px] md:text-[20px] font-semibold"
                >
                    <InkAccentMobile active={false} />
                    <span className="w-full text-center">Logout</span>
                </button>
            )}
        </nav>
    );
}