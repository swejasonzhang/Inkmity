import { useEffect, useMemo, useRef, useState } from "react";
import { useClerk, useUser, useAuth } from "@clerk/clerk-react";
import { Menu, X, Sun, Moon, LogOut, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import WhiteLogo from "@/assets/WhiteLogo.png";
import BlackLogo from "@/assets/BlackLogo.png";
import { buildNavItems, NavItem as BuildNavItem } from "../header/buildNavItems";
import { Nav } from "./Nav";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { getSocket } from "@/lib/socket";
import { VisibilityDropdown, VisibilityStatus } from "./VisibilityDropdown";
import { updateVisibility } from "@/api";
import { Circle, Clock, EyeOff } from "lucide-react";

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
  const [userVisibility, setUserVisibility] = useState<VisibilityStatus>("online");
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
        if (data?.visibility && ["online", "away", "invisible"].includes(data.visibility)) {
          setUserVisibility(data.visibility as VisibilityStatus);
        } else {
          setUserVisibility("online");
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
  }, [isLoaded, isSignedIn, getToken, API_BASE]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      setIsOnline(false);
      return;
    }

    const socket = getSocket();
    const updateOnlineStatus = () => {
      setIsOnline(socket.connected);
    };
    const handleDisconnect = () => setIsOnline(false);

    updateOnlineStatus();
    socket.on("connect", updateOnlineStatus);
    socket.on("disconnect", handleDisconnect);

    const handleVisibilityUpdate = (data: { userId: string; visibility: VisibilityStatus }) => {
      if (data.userId === user.id) {
        setUserVisibility(data.visibility);
      }
    };
    socket.on("user:visibility:updated", handleVisibilityUpdate);
    socket.on("user:visibility:changed", handleVisibilityUpdate);

    return () => {
      socket.off("connect", updateOnlineStatus);
      socket.off("disconnect", handleDisconnect);
      socket.off("user:visibility:updated", handleVisibilityUpdate);
      socket.off("user:visibility:changed", handleVisibilityUpdate);
    };
  }, [isLoaded, isSignedIn, user?.id]);

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    await signOut({ redirectUrl: "/login" });
  };

  const handleVisibilityChange = async (status: VisibilityStatus) => {
    try {
      const token = await getToken();
      await updateVisibility(status, token || undefined);
      setUserVisibility(status);
    } catch (error) {
      console.error("Failed to update visibility:", error);
    }
  };

  const getVisibilityDisplay = () => {
    const displayStatus = isOnline ? userVisibility : "invisible";
    const isLight = theme === "light";
    if (displayStatus === "online") return { icon: Circle, label: "Online", color: isLight ? "text-black" : "text-white" };
    if (displayStatus === "away") return { icon: Clock, label: "Away", color: isLight ? "text-gray-600" : "text-gray-400" };
    return { icon: EyeOff, label: "Invisible", color: isLight ? "text-gray-400" : "text-gray-500" };
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
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const bodyStyle = document.body.style;
    const originalOverflow = bodyStyle.overflow;
    const originalPaddingRight = bodyStyle.paddingRight;
    
    bodyStyle.overflow = "hidden";
    if (scrollbarWidth > 0) {
      bodyStyle.paddingRight = `${scrollbarWidth}px`;
    }
    
    return () => {
      bodyStyle.overflow = originalOverflow;
      bodyStyle.paddingRight = originalPaddingRight;
    };
  }, [mobileMenuOpen]);

  const dropdownBtnClasses =
    "relative inline-flex h-11 md:h-12 items-center justify-start px-4 rounded-xl cursor-pointer transition border border-[color-mix(in_oklab,var(--fg)_16%,transparent)] bg-[color-mix(in_oklab,var(--elevated)_75%,transparent)] text-app hover:bg-[color-mix(in_oklab,var(--elevated)_55%,transparent)] text-[17px] whitespace-nowrap backdrop-blur supports-[backdrop-filter]:backdrop-blur-md shadow-[0_6px_24px_-8px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--fg)_10%,transparent)]";

  const [tip, setTip] = useState<TipState>({ show: false, x: 0, y: 0 });
  const onDashMouseMove = (e: React.MouseEvent) => {
    if (!dashboardDisabled) return;
    setTip({ show: true, x: e.clientX, y: e.clientY });
  };
  const onDashLeave = () => setTip((t) => ({ ...t, show: false }));

  const [showDropdown, setShowDropdown] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(180);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      // Use exact width to match the trigger button
      setTriggerWidth(rect.width);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Remeasure when dropdown opens to ensure accurate width and position
  useEffect(() => {
    if (!showDropdown) {
      setDropdownPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerWidth(rect.width);
      // Calculate position for portal rendering
      setDropdownPosition({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    };

    updatePosition();
    
    // Update position on scroll and resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const isInStatusDropdown = target.closest('[data-slot="dropdown-menu"]') ||
                                  target.closest('[data-slot="dropdown-menu-content"]') || 
                                  target.closest('[data-slot="dropdown-menu-trigger"]') ||
                                  target.closest('[data-slot="dropdown-menu-radio-group"]') ||
                                  target.closest('[data-slot="dropdown-menu-radio-item"]') ||
                                  target.closest('[data-slot="dropdown-menu-portal"]') ||
                                  target.closest('[role="menu"]') ||
                                  target.closest('[role="radiogroup"]') ||
                                  target.closest('[role="radio"]') ||
                                  target.closest('[data-radix-popper-content-wrapper]') ||
                                  target.closest('[data-radix-portal]') ||
                                  target.closest('[data-radix-dropdown-menu-content]') ||
                                  target.closest('[data-radix-dropdown-menu-trigger]');
      
      const isInMainDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      const isInTrigger = triggerRef.current && triggerRef.current.contains(target);
      
      if (!isInMainDropdown && !isInTrigger && !isInStatusDropdown) {
        setShowDropdown(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [showDropdown]);

  const portalTarget = document.getElementById("dashboard-portal-root") ?? document.getElementById("dashboard-scope") ?? document.body;

  const MOBILE_HEADER_H = "h-20 xs:h-24";
  const MOBILE_LOGO_H = "h-16 xs:h-20";
  const MOBILE_ICON_STROKE = 1.5;

  const resolvedLogo = logoSrcProp ?? (!isDashboard ? WhiteLogo : theme === "light" ? BlackLogo : WhiteLogo);

  const mobileSheet = mobileMenuOpen
    ? createPortal(
      <div className="sm:hidden fixed inset-0 z-[2147483647]">
        <div className="absolute inset-0 bg-transparent" onClick={() => setMobileMenuOpen(false)} aria-hidden />
        <div className="absolute inset-0 bg-app/95 backdrop-blur-sm flex-col text-app [&_*]:text-app [&_*]:border-app overflow-hidden">
          <div className={`flex-between items-center px-fluid-md xs:px-fluid-lg sm:px-fluid-xl ${MOBILE_HEADER_H} min-w-0`}>
            <div className="flex-center gap-fluid-sm xs:gap-fluid-md sm:gap-fluid-lg">
              <img src={resolvedLogo} alt="Inkmity Logo" className={`${MOBILE_LOGO_H} w-auto object-contain`} />
            </div>
            <Button aria-label="Close menu" variant="ghost" className="p-fluid-xs xs:p-fluid-sm sm:p-fluid-md rounded-fluid-md hover:bg-elevated active:scale-[0.98] text-app" onClick={() => setMobileMenuOpen(false)}>
              <X strokeWidth={MOBILE_ICON_STROKE} className="h-fluid-8 xs:h-fluid-10 w-auto" />
            </Button>
          </div>
          <Nav items={NAV_ITEMS} isActive={isActive} isSignedIn={!!isSignedIn} setMobileMenuOpen={setMobileMenuOpen} handleLogout={handleLogout} />
        </div>
      </div>,
      portalTarget
    )
    : null;

  return (
    <>
      <header className="flex w-full relative items-center z-[100] px-fluid-sm xs:px-fluid-md sm:px-fluid-lg md:px-fluid-xl py-1 xs:py-1.5 sm:py-2 text-app bg-transparent min-w-0 overflow-visible" style={{ minWidth: '320px' }}>
        <div className="flex-shrink-0 relative z-10 mr-fluid-sm xs:mr-fluid-md sm:mr-fluid-lg">
          <Link to={homeHref} className="flex-center gap-fluid-sm xs:gap-fluid-md sm:gap-fluid-lg">
            <img src={resolvedLogo} alt="Inkmity Logo" className="h-fluid-8 xs:h-fluid-10 sm:h-fluid-8 md:h-fluid-10 lg:h-fluid-12 xl:h-fluid-16 w-auto object-contain flex-shrink-0" draggable={false} />
            <span className="sr-only">Inkmity</span>
          </Link>
        </div>

        <div className="flex-1 min-w-0 flex justify-center">
          <Nav items={NAV_ITEMS} isActive={isActive} isSignedIn={!!isSignedIn} onDisabledDashboardHover={onDashMouseMove} onDisabledDashboardLeave={onDashLeave} />
        </div>

        <div className="flex-center gap-fluid-xs xs:gap-fluid-sm sm:gap-fluid-md flex-shrink-0">
            <Button aria-label="Open menu" variant="ghost" className="sm:hidden p-fluid-xs xs:p-fluid-sm rounded-fluid-md hover:bg-elevated active:scale-[0.98] text-app ml-fluid-1 xs:ml-fluid-2" onClick={() => setMobileMenuOpen(true)}>
              <Menu strokeWidth={MOBILE_ICON_STROKE} className="h-fluid-8 xs:h-fluid-10 w-auto" />
            </Button>

            {isLoaded && isSignedIn ? (
              <div
                className="relative flex flex-shrink-0 text-app [&_*]:text-app [&_*]:border-app"
              >
                <div
                  ref={triggerRef}
                  className={`${dropdownBtnClasses} hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.45)]`}
                  style={{ minWidth: '180px', maxWidth: '280px' }}
                  aria-haspopup="menu"
                  aria-expanded={showDropdown}
                  onClick={() => setShowDropdown((v) => !v)}
                >
                  <span className="mr-1 md:mr-2 font-semibold text-lg md:text-xl leading-none flex-shrink-0">✦</span>
                  <div className="flex items-center leading-none gap-1 md:gap-2 justify-center min-w-0 flex-1">
                    <span className="font-bold truncate flex-shrink-0 min-w-0">Welcome Back</span>
                    {(() => {
                      const visibility = getVisibilityDisplay();
                      const Icon = visibility.icon;
                      return (
                        <span className="flex items-center gap-1 md:gap-1.5 flex-shrink-0 opacity-70 text-xs min-w-0">
                          <Icon size={8} className={visibility.color} />
                          <span className="truncate min-w-0">{visibility.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="absolute left-0 right-0 top-full h-2" />
              </div>
            ) : isLoaded && !isSignedIn ? (
              <div className="relative flex flex-shrink-0">
                <button
                  className={`${dropdownBtnClasses} hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.45)]`}
                  style={{ minWidth: '140px' }}
                  onClick={() => navigate('/login')}
                  type="button"
                >
                  <span className="mr-2 font-semibold text-xl leading-none">✦</span>
                  <span className="font-bold whitespace-nowrap">Sign In</span>
                </button>
              </div>
            ) : (
              <div className="relative flex flex-shrink-0">
                <div
                  className={`${dropdownBtnClasses} opacity-50 pointer-events-none`}
                  style={{ minWidth: '140px' }}
                >
                  <span className="mr-2 font-semibold text-xl leading-none">✦</span>
                  <span className="font-bold whitespace-nowrap">Welcome User</span>
                </div>
              </div>
            )}
          </div>
      </header>

      {dashboardDisabled && tip.show && (
        <div className="fixed z-[70] pointer-events-none" style={{ left: tip.x, top: tip.y, transform: "translate(-50%, 20px)" }}>
          <div className="relative rounded-lg border border-app bg-card/95 backdrop-blur px-3 py-2 shadow-lg">
            <span className="pointer-events-none absolute left-1/2 -top-1.5 -translate-x-1/2 h-3 w-3 rotate-45 bg-card border-l border-t border-app" />
            <span className="text-sm text-app whitespace-nowrap">Not authorized. <span className="text-app">Sign up first.</span></span>
          </div>
        </div>
      )}

      {mobileSheet}

      {showDropdown && dropdownPosition && triggerRef.current && createPortal(
        <div
          ref={dropdownRef}
          role="menu"
          aria-label="User menu"
          style={{ 
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            width: triggerWidth || undefined, 
            minWidth: triggerWidth || undefined,
            maxWidth: triggerWidth || undefined,
            zIndex: 2147483600,
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          className="bg-card border border-[color-mix(in_oklab,var(--fg)_16%,transparent)] rounded-xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.6)] transform transition-all duration-300 ease-out overflow-visible"
        >
          <div className="px-4 py-3 text-center">
            <div className="text-sm opacity-80 mb-2">
              {userRole === "artist" ? "Ready to create your next masterpiece?" : userRole === "client" ? "Ready for your next tattoo?" : "Welcome"}
            </div>
            <div className="text-lg font-semibold truncate">{userLabel || "User"}</div>
            {isDashboard && (
              <div className="mt-3 flex items-center justify-center">
                <ThemeSwitch theme={theme} toggleTheme={toggleTheme} size="sm" />
              </div>
            )}
          </div>
          <div className="h-px w-full bg-[color-mix(in_oklab,var(--fg)_14%,transparent)]" />
          <div 
            className="px-4 py-3"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <VisibilityDropdown
              currentStatus={userVisibility}
              isOnline={isOnline}
              onStatusChange={handleVisibilityChange}
              triggerWidth={triggerWidth}
            />
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
        </div>,
        portalTarget
      )}
    </>
  );
};

export default Header;