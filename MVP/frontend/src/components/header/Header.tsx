import React, { useEffect, useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import WhiteLogo from "@/assets/WhiteLogo.png";
import BlackLogo from "@/assets/BlackLogo.png";
import { buildNavItems, NavItem as BuildNavItem } from "../header/buildNavItems";
import { NavDesktop } from "../header/NavDesktop";
import { NavMobile } from "../header/NavMobile";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export type HeaderProps = {
  disableDashboardLink?: boolean;
  logoSrc?: string;
};

type TipState = { show: boolean; x: number; y: number };

type ThemeSwitchProps = {
  theme: "light" | "dark";
  toggleTheme: () => void;
  size?: "md" | "sm";
};

const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ theme, toggleTheme, size = "md" }) => {
  const isLight = theme === "light";
  const dims = size === "md" ? { h: "h-12", w: "w-24", knob: "h-10 w-10", icon: 22 } : { h: "h-10", w: "w-20", knob: "h-8 w-8", icon: 18 };
  const iconColorClass = isLight ? "text-black" : "text-white";
  return (
    <button
      type="button"
      role="switch"
      aria-label="Toggle theme"
      aria-checked={isLight}
      onClick={toggleTheme}
      className={["relative inline-flex items-center rounded-full border border-app focus:outline-none bg-card", dims.h, dims.w].join(" ")}
    >
      <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${iconColorClass}`}>
        <Moon size={dims.icon} />
      </span>
      <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${iconColorClass}`}>
        <Sun size={dims.icon} />
      </span>
      <span className={["absolute top-1/2 -translate-y-1/2 rounded-full shadow-md grid place-items-center transition-all duration-300 bg-[color:var(--fg)]", dims.knob, isLight ? "right-1.5" : "left-1.5"].join(" ")} />
      <span className="sr-only">{isLight ? "Switch to dark theme" : "Switch to light theme"}</span>
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ disableDashboardLink = false, logoSrc: logoSrcProp }) => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const isSignedIn = Boolean(user?.id);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isDashboard = pathname.startsWith("/dashboard");

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    await signOut({ redirectUrl: "/" });
  };

  const homeHref = isSignedIn ? "/dashboard" : "/landing";
  const userLabel = user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User";
  const dashboardDisabled = disableDashboardLink && !isSignedIn;

  const onDashboardGate: React.MouseEventHandler = (e) => {
    if (!isSignedIn) {
      e.preventDefault();
      navigate("/login", { state: { from: pathname } });
    }
  };

  const NAV_ITEMS: BuildNavItem[] = useMemo(
    () => buildNavItems(dashboardDisabled, onDashboardGate),
    [dashboardDisabled, onDashboardGate]
  );
  const isActive = (to: string) => (to !== "#" ? pathname === to || pathname.startsWith(`${to}/`) : false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [mobileMenuOpen]);

  const dropdownBtnClasses = "inline-flex h-12 items-center justify-center px-4 rounded-lg cursor-pointer transition border border-app bg-elevated text-app hover:bg-elevated text-lg whitespace-nowrap";

  const [tip, setTip] = useState<TipState>({ show: false, x: 0, y: 0 });
  const onDashMouseMove = (e: React.MouseEvent) => {
    if (!dashboardDisabled) return;
    setTip({ show: true, x: e.clientX, y: e.clientY });
  };
  const onDashLeave = () => setTip((t) => ({ ...t, show: false }));

  const [showDropdown, setShowDropdown] = useState(false);

  const portalTarget = document.getElementById("dashboard-portal-root") ?? document.getElementById("dashboard-scope") ?? document.body;

  const MOBILE_HEADER_H = "h-24";
  const MOBILE_LOGO_H = "h-16";
  const MOBILE_ICON_SIZE = 28;
  const MOBILE_ICON_STROKE = 2.25;

  const resolvedLogo = logoSrcProp ?? (theme === "light" ? BlackLogo : WhiteLogo);

  const mobileSheet = mobileMenuOpen
    ? createPortal(
      <div className="md:hidden fixed inset-0 z-[2147483647]">
        <div className="absolute inset-0 bg-overlay" onClick={() => setMobileMenuOpen(false)} aria-hidden />
        <div className="absolute inset-0 bg-app flex flex-col text-app [&_*]:text-app [&_*]:border-app">
          <div className={`flex items-center justify-between px-6 ${MOBILE_HEADER_H}`}>
            <div className="flex items-center gap-4">
              <img src={resolvedLogo} alt="Inkmity Logo" className={`${MOBILE_LOGO_H} w-auto object-contain`} />
            </div>
            <Button aria-label="Close menu" variant="ghost" className="p-3 rounded-lg hover:bg-elevated active:scale-[0.98] text-app" onClick={() => setMobileMenuOpen(false)}>
              <X size={MOBILE_ICON_SIZE} strokeWidth={MOBILE_ICON_STROKE} />
            </Button>
          </div>
          <NavMobile items={NAV_ITEMS} isActive={isActive} isSignedIn={!!isSignedIn} setMobileMenuOpen={setMobileMenuOpen} handleLogout={handleLogout} />
        </div>
      </div>,
      portalTarget
    )
    : null;

  return (
    <>
      <header className="flex w-full relative items-center z-50 px-6 md:px-12 py-5 text-app bg-app">
        <div className="w-full grid grid-cols-[auto,1fr,auto] items-center">
          <div className="-ml-2">
            <Link to={homeHref} className="flex items-center gap-4">
              <img src={resolvedLogo} alt="Inkmity Logo" className="h-16 md:h-20 lg:h-24 w-auto object-contain" draggable={false} />
              <span className="sr-only">Inkmity</span>
            </Link>
          </div>

          <div className="hidden md:flex justify-center">
            <span
              className="inline-block text-lg [&_*]:text-app [&_*]:border-app"
              style={{ marginLeft: !isDashboard ? 10 : 0 }}
            >
              <NavDesktop
                items={NAV_ITEMS}
                isActive={isActive}
                isSignedIn={!!isSignedIn}
                onDisabledDashboardHover={onDashMouseMove}
                onDisabledDashboardLeave={onDashLeave}
                className="text-app [&_a]:text-app [&_button]:text-app [&_svg]:text-app text-lg"
              />
            </span>
          </div>

          <div className="flex items-center justify-end gap-4">
            {pathname.startsWith("/dashboard") && <ThemeSwitch theme={theme} toggleTheme={toggleTheme} size="md" />}
            <Button
              aria-label="Open menu"
              variant="ghost"
              className="md:hidden p-3 rounded-lg hover:bg-elevated active:scale-[0.98] text-app"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={MOBILE_ICON_SIZE} strokeWidth={MOBILE_ICON_STROKE} />
            </Button>
            {isSignedIn && user && (
              <div
                className="relative hidden md:inline-block align-top group text-app [&_*]:text-app [&_*]:border-app"
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={() => setShowDropdown(false)}
              >
                <div className={dropdownBtnClasses}>
                  <span className="mr-2 font-semibold text-xl">✦</span>
                  <span className="inline-flex items-center text-lg">
                    <span>Hello,&nbsp;</span>
                    <span className="font-bold max-w-[14rem] truncate leading-none">{userLabel}</span>
                  </span>
                </div>
                <div
                  className={`absolute right-0 mt-3 bg-card border border-app rounded-lg shadow-xl transform transition-all duration-200 ${showDropdown ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"
                    }`}
                >
                  <button
                    onClick={async () => await signOut({ redirectUrl: "/login" })}
                    className="w-full px-4 py-3 text-center hover:bg-elevated rounded-lg text-app text-lg"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {dashboardDisabled && tip.show && (
          <div className="fixed z-[70] pointer-events-none" style={{ left: tip.x, top: tip.y, transform: "translate(-50%, 20px)" }}>
            <div className="relative rounded-lg border border-app bg-card/95 backdrop-blur px-3 py-2 shadow-lg">
              <span className="pointer-events-none absolute left-1/2 -top-1.5 -translate-x-1/2 h-3 w-3 rotate-45 bg-card border-l border-t border-app" />
              <span className="text-sm text-app whitespace-nowrap">Not authorized. <span className="text-app">Sign up first.</span></span>
            </div>
          </div>
        )}
      </header>
      {mobileSheet}
    </>
  );
};

export default Header;