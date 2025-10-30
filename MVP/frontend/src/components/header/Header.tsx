import React, { useEffect, useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import whiteLogo from "@/assets/WhiteLogo.png";
import blackLogo from "@/assets/BlackLogo.png";
import { buildNavItems, NavItem as BuildNavItem } from "./buildNavItems";
import { NavDesktop } from "./NavDesktop";
import { NavMobile } from "./NavMobile";
import { useTheme as useThemeHook } from "../../hooks/useTheme";
import { Button } from "@/components/ui/button";

export type HeaderProps = {
  disableDashboardLink?: boolean;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
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
  const dims = size === "md" ? { h: "h-10", w: "w-20", knob: "h-8 w-8", icon: 18 } : { h: "h-8", w: "w-16", knob: "h-6 w-6", icon: 16 };
  return (
    <button
      type="button"
      role="switch"
      aria-label="Toggle theme"
      aria-checked={isLight}
      onClick={toggleTheme}
      className={["relative inline-flex items-center rounded-full border border-app focus:outline-none focus:ring-2 focus:ring-[color:var(--border)] bg-card", dims.h, dims.w].join(" ")}
    >
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        <Moon size={dims.icon} className="text-app/80" />
      </span>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
        <Sun size={dims.icon} className="text-app/80" />
      </span>
      <span className={["absolute top-1/2 -translate-y-1/2 rounded-full shadow-md grid place-items-center transition-all duration-300 bg-[color:var(--fg)]", dims.knob, isLight ? "right-1" : "left-1"].join(" ")} />
      <span className="sr-only">{isLight ? "Switch to dark theme" : "Switch to light theme"}</span>
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ disableDashboardLink = false, theme: themeProp, toggleTheme: toggleThemeProp, logoSrc: logoSrcProp }) => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const isSignedIn = Boolean(user?.id);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { theme: hookTheme, toggleTheme: hookToggle } = useThemeHook();
  const theme = themeProp ?? hookTheme;
  const toggleTheme = toggleThemeProp ?? hookToggle;

  const isDashboard = pathname.startsWith("/dashboard");
  const computedLogo = theme === "light" ? blackLogo : whiteLogo;
  const logoSrc = isDashboard ? (logoSrcProp ?? computedLogo) : whiteLogo;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const showThemeToggle = isDashboard;

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
    const { overflow, height } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.height = height;
    };
  }, [mobileMenuOpen]);

  const dropdownBtnClasses = "inline-flex h-10 items-center justify-center px-3 rounded-lg cursor-pointer transition border border-app bg-elevated text-app hover:bg-elevated text-center whitespace-nowrap";

  const [tip, setTip] = useState<TipState>({ show: false, x: 0, y: 0 });
  const onDashMouseMove = (e: React.MouseEvent) => {
    if (!dashboardDisabled) return;
    setTip({ show: true, x: e.clientX, y: e.clientY });
  };
  const onDashLeave = () => setTip((t) => ({ ...t, show: false }));

  const [showDropdown, setShowDropdown] = useState(false);

  const mobileSheet = mobileMenuOpen
    ? createPortal(
      <div className="md:hidden fixed inset-0 z-[2147483647]">
        <div className="absolute inset-0 bg-overlay" onClick={() => setMobileMenuOpen(false)} aria-hidden />
        <div className="absolute inset-0 bg-app flex flex-col text-app [&_*]:text-app [&_*]:border-app">
          <div className="flex items-center justify-between px-[10px] py-[10px] border-b border-app">
            <div className="flex items-center gap-2">
              <img src={logoSrc} alt="Inkmity Logo" className="h-8 w-auto object-contain" />
            </div>
            <Button aria-label="Close menu" variant="ghost" className="p-2 rounded-lg hover:bg-elevated active:scale-[0.98] text-app" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </Button>
          </div>
          <NavMobile items={NAV_ITEMS} isActive={isActive} isSignedIn={!!isSignedIn} setMobileMenuOpen={setMobileMenuOpen} handleLogout={handleLogout} />
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <header className="hidden md:flex w-full relative items-center z-50 text-app py-[10px]">
        <div className="w-full flex items-center justify-between md:px-[30px] px-[30px]">
          <div className="flex items-center -ml-2.5">
            <Link to={homeHref} className="flex items-center gap-3">
              <img src={logoSrc} alt="Inkmity Logo" className="h-16 md:h-20 lg:h-24 w-auto object-contain" draggable={false} />
              <span className="sr-only">Inkmity</span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <span className="[&_*]:text-app [&_*]:border-app">
              <NavDesktop items={NAV_ITEMS} isActive={isActive} isSignedIn={!!isSignedIn} onDisabledDashboardHover={onDashMouseMove} onDisabledDashboardLeave={onDashLeave} className="text-app [&_a]:text-app [&_button]:text-app [&_svg]:text-app" />
            </span>

            <div className="flex items-center gap-3">
              {showThemeToggle && <ThemeSwitch theme={theme} toggleTheme={toggleTheme} size="md" />}

              {isSignedIn && user && (
                <div className="relative inline-block align-top group text-app [&_*]:text-app [&_*]:border-app" onMouseEnter={() => setShowDropdown(true)} onMouseLeave={() => setShowDropdown(false)}>
                  <div className={dropdownBtnClasses}>
                    <span className="mr-2 font-semibold">✦</span>
                    <span className="inline-flex items-center">
                      <span>Hello,&nbsp;</span>
                      <span className="font-bold text-sm max-w-[12rem] truncate leading-none">{userLabel}</span>
                    </span>
                  </div>

                  <div className={`absolute left-0 right-0 mt-2 bg-card border border-app rounded-lg shadow-xl transform transition-all duration-200 ${showDropdown ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"}`}>
                    <button onClick={async () => await signOut({ redirectUrl: "/login" })} className="w-full px-3 py-2 text-center hover:bg-elevated rounded-lg text-app">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {dashboardDisabled && tip.show && (
          <div className="fixed z-[70] pointer-events-none" style={{ left: tip.x, top: tip.y, transform: "translate(-50%, 20px)" }}>
            <div className="relative rounded-lg border border-app bg-card/95 backdrop-blur px-2.5 py-1.5 shadow-lg">
              <span className="pointer-events-none absolute left-1/2 -top-1.5 -translate-x-1/2 h-3 w-3 rotate-45 bg-card border-l border-t border-app" />
              <span className="text-xs text-app whitespace-nowrap">Not authorized. <span className="text-app">Sign up first.</span></span>
            </div>
          </div>
        )}
      </header>

      <header className={["md:hidden w-full flex items-center z-50 px-[10px] py-[10px] text-app", isAuthPage ? "bg-transparent border-transparent" : "bg-app border-b border-app"].join(" ")}>
        <Link to={homeHref} className="flex items-center gap-2">
          <img src={logoSrc} alt="Inkmity Logo" className="h-10 w-auto object-contain" draggable={false} />
          <span className="sr-only">Inkmity</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {showThemeToggle && <ThemeSwitch theme={theme} toggleTheme={toggleTheme} size="sm" />}
          <Button aria-label="Open menu" variant="ghost" className="p-2 rounded-lg hover:bg-elevated active:scale-[0.98] text-app" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={22} />
          </Button>
        </div>
      </header>

      {mobileSheet}
    </>
  );
};

export default Header;