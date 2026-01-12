import { useEffect, useMemo, useRef, useState } from "react";
import { useClerk, useUser, useAuth } from "@clerk/clerk-react";
import { Menu, X, Sun, Moon, LogOut, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import WhiteLogo from "@/assets/WhiteLogo.png";
import BlackLogo from "@/assets/BlackLogo.png";
import { buildNavItems, NavItem as BuildNavItem } from "../header/buildNavItems";
import { NavDesktop } from "../header/NavDesktop";
import { NavMobile } from "../header/NavMobile";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { getSocket } from "@/lib/socket";

export type HeaderProps = {
  disableDashboardLink?: boolean;
  logoSrc?: string;
};

type TipState = { show: boolean; x: number; y: number };

type ThemeSwitchProps = {
  theme: "light" | "dark";
  toggleTheme: () => void;
  size?: "lg" | "md" | "sm";
};

const ThemeSwitch = ({ theme, toggleTheme, size = "md" }: ThemeSwitchProps) => {
  const { pathname } = useLocation();
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/profile") || pathname.startsWith("/appointments");
  if (!isDashboard) return null;
  const isLight = theme === "light";
  const dims =
    size === "lg"
      ? { h: "h-[45px]", w: "w-28", knob: "h-[35px] w-[35px]", icon: 22 }
      : size === "md"
        ? { h: "h-10", w: "w-24", knob: "h-8 w-8", icon: 20 }
        : { h: "h-9", w: "w-20", knob: "h-7 w-7", icon: 18 };
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

const Header = ({ disableDashboardLink = false, logoSrc: logoSrcProp }: HeaderProps) => {
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/profile") || pathname.startsWith("/appointments");

  const [userLabel, setUserLabel] = useState<string>("User");
  const [userRole, setUserRole] = useState<"client" | "artist" | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

  const userLabelRef = useRef<string>("");
  useEffect(() => {
    if (!isLoaded) {
      setUserLabel("User");
      return;
    }
    if (!isSignedIn) {
      setUserLabel("");
      userLabelRef.current = "";
      return;
    }
    if (userLabelRef.current) {
      setUserLabel(userLabelRef.current);
      return;
    }
    setUserLabel("User");
    let cancelled = false;
    const ac = new AbortController();
    async function run() {
      if (!isSignedIn || !API_BASE) return;
      try {
        const token = await getToken();
        if (cancelled || ac.signal.aborted) return;
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
          signal: ac.signal,
        });
        if (cancelled || ac.signal.aborted) return;
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const name =
          (data?.username && String(data.username).trim()) ||
          (data?.handle && String(data.handle).replace(/^@/, "")) ||
          "";
        if (cancelled || ac.signal.aborted) return;
        const finalName = name || "User";
        userLabelRef.current = finalName;
        setUserLabel(finalName);
        if (data?.role && (data.role === "client" || data.role === "artist")) {
          setUserRole(data.role);
        }
        if (data?.role && (data.role === "client" || data.role === "artist")) {
          setUserRole(data.role);
        }
      } catch (e: any) {
        if (cancelled || ac.signal.aborted) return;
        if (e?.name === "AbortError") return;
        setUserLabel("User");
        userLabelRef.current = "User";
      }
    }
    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      setIsOnline(false);
      return;
    }

    const socket = getSocket();
    const updateOnlineStatus = () => {
      setIsOnline(socket.connected);
    };

    updateOnlineStatus();
    socket.on("connect", updateOnlineStatus);
    socket.on("disconnect", () => setIsOnline(false));

    return () => {
      socket.off("connect", updateOnlineStatus);
      socket.off("disconnect");
    };
  }, [isLoaded, isSignedIn, user?.id]);

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    await signOut({ redirectUrl: "/login" });
  };

  const homeHref = isSignedIn ? "/dashboard" : "/landing";
  const dashboardDisabled = disableDashboardLink && !isSignedIn;

  const onDashboardGate: React.MouseEventHandler = (e) => {
    if (!isSignedIn) {
      e.preventDefault();
      navigate("/login", { state: { from: pathname } });
    }
  };

  const NAV_ITEMS: BuildNavItem[] = useMemo(() => buildNavItems(dashboardDisabled, onDashboardGate), [dashboardDisabled, onDashboardGate]);
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

  const dropdownBtnClasses =
    "relative inline-flex h-11 md:h-12 items-center justify-center px-4 rounded-xl cursor-pointer transition border border-[color-mix(in_oklab,var(--fg)_16%,transparent)] bg-[color-mix(in_oklab,var(--elevated)_75%,transparent)] text-app hover:bg-[color-mix(in_oklab,var(--elevated)_55%,transparent)] text-[17px] whitespace-nowrap backdrop-blur supports-[backdrop-filter]:backdrop-blur-md shadow-[0_6px_24px_-8px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--fg)_10%,transparent)]";

  const [tip, setTip] = useState<TipState>({ show: false, x: 0, y: 0 });
  const onDashMouseMove = (e: React.MouseEvent) => {
    if (!dashboardDisabled) return;
    setTip({ show: true, x: e.clientX, y: e.clientY });
  };
  const onDashLeave = () => setTip((t) => ({ ...t, show: false }));

  const [showDropdown, setShowDropdown] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(220);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCloseDropdown = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setShowDropdown(false), 200);
  };

  useEffect(() => {
    const measure = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerWidth(Math.max(220, rect.width));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDropdown]);

  const portalTarget = document.getElementById("dashboard-portal-root") ?? document.getElementById("dashboard-scope") ?? document.body;

  const MOBILE_HEADER_H = "h-24";
  const MOBILE_LOGO_H = "h-20";
  const MOBILE_ICON_SIZE = 44;
  const MOBILE_ICON_STROKE = 2.6;

  const resolvedLogo = logoSrcProp ?? (!isDashboard ? WhiteLogo : theme === "light" ? BlackLogo : WhiteLogo);

  const mobileSheet = mobileMenuOpen
    ? createPortal(
      <div className="sm:hidden fixed inset-0 z-[2147483647]">
        <div className="absolute inset-0 bg-overlay" onClick={() => setMobileMenuOpen(false)} aria-hidden />
        <div className="absolute inset-0 bg-app flex flex-col text-app [&_*]:text-app [&_*]:border-app">
          <div className={`flex items-center justify-between px-4 xs:px-5 sm:px-6 ${MOBILE_HEADER_H}`}>
            <div className="flex items-center gap-3 xs:gap-3.5 sm:gap-4">
              <img src={resolvedLogo} alt="Inkmity Logo" className={`${MOBILE_LOGO_H} w-auto object-contain`} />
            </div>
            <Button aria-label="Close menu" variant="ghost" className="p-2 xs:p-2.5 sm:p-3 rounded-lg hover:bg-elevated active:scale-[0.98] text-app" onClick={() => setMobileMenuOpen(false)}>
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
      <header className="flex w-full relative items-center z-50 px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 py-3 xs:py-3.5 sm:py-4 md:py-4.5 lg:py-5 text-app bg-transparent">
        <div className="w-full flex justify-between items-center sm:grid sm:grid-cols-[auto_1fr_auto]">
          <div className="justify-self-start -ml-1 xs:-ml-1.5 sm:-ml-2 md:-ml-4 lg:-ml-6 pl-1 xs:pl-1.5 sm:pl-2 md:pl-0 flex-shrink-0">
            <Link to={homeHref} className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4">
              <img src={resolvedLogo} alt="Inkmity Logo" className="h-16 xs:h-[4.5rem] sm:h-20 md:h-24 lg:h-[6.5rem] xl:h-28 w-auto object-contain" draggable={false} />
              <span className="sr-only">Inkmity</span>
            </Link>
          </div>

          <div className="hidden sm:block justify-self-stretch flex items-center justify-center">
            <NavDesktop items={NAV_ITEMS} isActive={isActive} isSignedIn={!!isSignedIn} onDisabledDashboardHover={onDashMouseMove} onDisabledDashboardLeave={onDashLeave} className="text-app [&_a]:text-app [&_button]:text-app [&_svg]:text-app text-[17px] xs:text-[18px] sm:text-[19px] md:text-[20px]" />
          </div>

          <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 md:gap-4 pr-1 xs:pr-1.5 sm:pr-2 md:pr-0 justify-self-end">
            <Button aria-label="Open menu" variant="ghost" className="sm:hidden p-2 xs:p-2.5 rounded-lg hover:bg-elevated active:scale-[0.98] text-app ml-0.5 xs:ml-1" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={MOBILE_ICON_SIZE} strokeWidth={MOBILE_ICON_STROKE} />
            </Button>

            {isLoaded && isSignedIn ? (
              <div
                className="relative hidden md:inline-block align-top text-app [&_*]:text-app [&_*]:border-app"
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={scheduleCloseDropdown}
              >
                <div
                  ref={triggerRef}
                  className={`${dropdownBtnClasses} hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.45)]`}
                  style={{ width: '220px', minWidth: '220px' }}
                  aria-haspopup="menu"
                  aria-expanded={showDropdown}
                  onClick={() => setShowDropdown((v) => !v)}
                >
                  <span className="mr-2 font-semibold text-xl leading-none flex-shrink-0">✦</span>
                  <span className="inline-flex items-center leading-none gap-2">
                    <span className="font-bold">Welcome Back</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium opacity-70 flex-shrink-0" title={isOnline ? "Online" : "Offline"}>
                      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`}></span>
                      <span className="hidden lg:inline">{isOnline ? "Online" : "Offline"}</span>
                    </span>
                  </span>
                </div>

                <div className="absolute left-0 right-0 top-full h-2" />

                <div
                  role="menu"
                  aria-label="User menu"
                  style={{ width: triggerWidth || undefined, marginTop: 6 }}
                  className={`absolute right-0 top-full bg-card border border-[color-mix(in_oklab,var(--fg)_16%,transparent)] rounded-xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.6)] transform transition-all duration-300 ease-out z-[2147483000] overflow-hidden ${showDropdown ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"}`}
                >
                  <div className="px-4 py-3 text-center">
                    <div className="text-sm opacity-80 mb-2">
                      {userRole === "artist" ? "Let's get ready to tattoo your next masterpiece" : userRole === "client" ? "Ready for your next tattoo?" : "Welcome"}
                    </div>
                    <div className="text-lg font-semibold truncate">{userLabel || "User"}</div>
                    {isDashboard && (
                      <div className="mt-3 flex items-center justify-center">
                        <ThemeSwitch theme={theme} toggleTheme={toggleTheme} size="sm" />
                      </div>
                    )}
                  </div>
                  <div className="h-px w-full bg-[color-mix(in_oklab,var(--fg)_14%,transparent)]" />
                  <Link 
                    to="/profile" 
                    onClick={() => setShowDropdown(false)}
                    className="w-full px-4 py-3 text-center hover:bg-[color-mix(in_oklab,var(--elevated)_50%,transparent)] text-app text-lg flex items-center justify-center gap-2"
                  >
                    <User size={18} />
                    <span>Profile</span>
                  </Link>
                  <div className="h-px w-full bg-[color-mix(in_oklab,var(--fg)_14%,transparent)]" />
                  <button onClick={handleLogout} className="w-full px-4 py-3 text-center hover:bg-[color-mix(in_oklab,var(--elevated)_50%,transparent)] text-app text-lg flex items-center justify-center gap-2">
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : isLoaded && !isSignedIn ? null : (
              <div className="relative hidden md:inline-block align-top">
                <div
                  className={`${dropdownBtnClasses} opacity-50 pointer-events-none`}
                  style={{ minWidth: '140px' }}
                >
                  <span className="mr-2 font-semibold text-xl leading-none">✦</span>
                  <span className="inline-flex items-center leading-none">
                    <span className="mr-1">Hello,</span>
                    <span className="font-bold">User</span>
                  </span>
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
