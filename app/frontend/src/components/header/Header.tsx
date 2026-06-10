import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClerk, useUser, useAuth } from "@clerk/clerk-react";
import { Menu, X, Sun, Moon, LogOut, User, Circle, Clock, EyeOff, Lock } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import WhiteLogo from "@/assets/WhiteLogo.png";
import BlackLogo from "@/assets/BlackLogo.png";
import { buildNavItems, NavItem as BuildNavItem } from "../header/buildNavItems";
import { Nav } from "./Nav";
import { useTheme, isThemedPath } from "@/hooks/useTheme";
import { getSocket, connectSocket } from "@/lib/socket";
import { VisibilityStatus } from "./VisibilityDropdown";
import HeaderRewards from "./HeaderRewards";
import { API_URL, updateVisibility } from "@/api";
import { getCachedRole, setCachedRole, getCachedUsername, setCachedUsername, clearCachedUsername } from "@/lib/roleCache";

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
  if (!isThemedPath(pathname)) return null;
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

  const themed = isThemedPath(pathname);

  const [userLabel, setUserLabel] = useState<string>(() => getCachedUsername() ?? "User");
  const [userRole, setUserRole] = useState<"client" | "artist" | "studio" | null>(() => getCachedRole());
  const [userVisibility, setUserVisibility] = useState<VisibilityStatus>("online");
  const idleTimerRef = useRef<number | null>(null);
  const autoAwayRef = useRef<boolean>(false);
  const [statusReady, setStatusReady] = useState(false);
  const [userRefreshTick, setUserRefreshTick] = useState(0);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => !!getCachedUsername());
  const API_BASE = API_URL;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setStatusReady(false);
      return;
    }
    const t = window.setTimeout(() => setStatusReady(true), 2000);
    return () => window.clearTimeout(t);
  }, [isLoaded, isSignedIn]);

  const userLabelRef = useRef<string>(getCachedUsername() ?? "");

  useEffect(() => {
    const onUserUpdated = () => {
      userLabelRef.current = "";
      setUserRefreshTick((n) => n + 1);
    };
    window.addEventListener("inkmity:user-updated", onUserUpdated);
    return () => window.removeEventListener("inkmity:user-updated", onUserUpdated);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!isSignedIn) {
      setUserLabel("");
      userLabelRef.current = "";
      setIsOnboarded(false);
      return;
    }
    if (userLabelRef.current) {
      setUserLabel(userLabelRef.current);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    async function run() {
      if (!isSignedIn) return;
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
          data?.onboardingComplete === true
            ? (data?.username && String(data.username).trim()) ||
              (data?.handle && String(data.handle).replace(/^@/, "")) ||
              ""
            : "";
        if (cancelled || ac.signal.aborted) return;
        const finalName = name || "User";
        userLabelRef.current = finalName;
        setUserLabel(finalName);
        setIsOnboarded(data?.onboardingComplete === true);
        if (name) setCachedUsername(name);
        else clearCachedUsername();
        if (data?.role && (data.role === "client" || data.role === "artist" || data.role === "studio")) {
          setUserRole(data.role);
          setCachedRole(data.role);
        }
        if (data?.visibility && ["online", "away", "invisible"].includes(data.visibility)) {
          setUserVisibility(data.visibility as VisibilityStatus);
        } else {
          setUserVisibility("online");
        }
      } catch (e: any) {
        if (cancelled || ac.signal.aborted) return;
        if (e?.name === "AbortError") return;
        if (String(e?.message) === "404") {
          clearCachedUsername();
          setUserLabel("User");
          userLabelRef.current = "User";
          setIsOnboarded(false);
        } else {
          const cached = getCachedUsername() ?? "User";
          setUserLabel(cached);
          userLabelRef.current = cached;
        }
      }
    }
    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [isLoaded, isSignedIn, getToken, userRefreshTick]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      return;
    }

    const socket = getSocket();

    const handleVisibilityUpdate = (data: { userId: string; visibility: VisibilityStatus }) => {
      if (data.userId === user.id) {
        setUserVisibility(data.visibility);
      }
    };

    socket.on("user:visibility:updated", handleVisibilityUpdate);
    socket.on("user:visibility:changed", handleVisibilityUpdate);

    if (!socket.connected && user?.id) {
      connectSocket(getToken, user.id).catch(console.error);
    } else if (socket.connected && user?.id) {
      socket.emit("register", user.id);
    }

    return () => {
      socket.off("user:visibility:updated", handleVisibilityUpdate);
      socket.off("user:visibility:changed", handleVisibilityUpdate);
    };
  }, [isLoaded, isSignedIn, user?.id, getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const IDLE_MS = 5 * 60 * 1000;
    let lastReset = 0;

    const setVis = async (v: VisibilityStatus) => {
      try {
        const token = await getToken();
        await updateVisibility(v, token ?? undefined);
      } catch {
        // ignore
      }
    };

    const goAway = () => {
      setUserVisibility((prev) => {
        if (prev === "invisible" || prev === "away") return prev;
        autoAwayRef.current = true;
        void setVis("away");
        return "away";
      });
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastReset > 1000) {
        lastReset = now;
        if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = window.setTimeout(goAway, IDLE_MS);
      }
      if (autoAwayRef.current) {
        autoAwayRef.current = false;
        setUserVisibility("online");
        void setVis("online");
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    onActivity();

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [isLoaded, isSignedIn, getToken]);

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    clearCachedUsername();
    await signOut({ redirectUrl: "/login" });
  };

  const getVisibilityDisplay = () => {
    const displayStatus = userVisibility;
    if (displayStatus === "online") return { icon: Circle, label: "Online", color: "text-app", dot: "bg-white" };
    if (displayStatus === "away") return { icon: Clock, label: "Away", color: "text-white/80", dot: "bg-white/65" };
    return { icon: EyeOff, label: "Invisible", color: "text-white/65", dot: "bg-white/45" };
  };

  const effectiveSignedIn = isLoaded && !!isSignedIn && isOnboarded;
  const homeHref = "/landing";
  const navLocked = disableDashboardLink || !effectiveSignedIn;
  const [tip, setTip] = useState<TipState>({ show: false, x: 0, y: 0 });

  const onGate = useCallback<React.MouseEventHandler>((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const NAV_ITEMS: BuildNavItem[] = useMemo(() => buildNavItems(effectiveSignedIn, onGate, userRole), [effectiveSignedIn, onGate, userRole]);
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
    "relative inline-flex h-11 md:h-12 items-center justify-start px-4 rounded-xl cursor-pointer transition border border-[color-mix(in_srgb,var(--fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--elevated)_75%,transparent)] text-app hover:bg-[color-mix(in_srgb,var(--elevated)_55%,transparent)] text-[17px] whitespace-nowrap backdrop-blur supports-[backdrop-filter]:backdrop-blur-md";

  const onDashMouseMove = (e: React.MouseEvent) => {
    if (!navLocked) return;
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
      setTriggerWidth(rect.width);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!showDropdown) {
      setDropdownPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerWidth(rect.width);
      setDropdownPosition({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    };

    updatePosition();

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

  const resolvedLogo = logoSrcProp ?? (!themed ? WhiteLogo : theme === "light" ? BlackLogo : WhiteLogo);

  const mobileLogoCls = "h-16 sm:h-20 w-auto object-contain flex-shrink-0";
  const mobileBtnCls = "md:hidden grid place-items-center rounded-xl text-app hover:bg-white/10 active:scale-95 transition p-1";
  const mobileIconCls = "h-12 w-12 xs:h-14 xs:w-14";

  const mobileSheet = mobileMenuOpen
    ? createPortal(
      <div className="md:hidden fixed inset-0 z-[2147483647] text-white [&_*]:!text-white [&_*]:border-white/15">
        <div className="absolute inset-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover grayscale pointer-events-none"
          >
            <source src="/Landing.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between pl-[var(--ink-edge-l)] pr-[var(--ink-edge-r)] py-1.5 sm:py-2 flex-shrink-0">
              <Link to={homeHref} onClick={() => setMobileMenuOpen(false)} className="flex-shrink-0">
                <img src={WhiteLogo} alt="Inkmity Logo" className={mobileLogoCls} draggable={false} />
              </Link>
              <button aria-label="Close menu" className={`${mobileBtnCls} !text-white`} onClick={() => setMobileMenuOpen(false)}>
                <X strokeWidth={1.75} className={mobileIconCls} />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
              <Nav items={NAV_ITEMS} isActive={isActive} isSignedIn={effectiveSignedIn} setMobileMenuOpen={setMobileMenuOpen} handleLogout={handleLogout} />
            </div>
          </div>
        </div>
      </div>,
      portalTarget
    )
    : null;

  return (
    <>
      <header className="grid w-full relative items-center z-[100] py-1.5 sm:py-2 text-app bg-transparent min-w-0 overflow-visible" style={{ minWidth: '320px', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)' }}>
        <div className="col-start-1 justify-self-start flex-shrink-0 relative z-10">
          <Link to={homeHref} className="flex-center gap-fluid-sm xs:gap-fluid-md sm:gap-fluid-lg">
            <img src={resolvedLogo} alt="Inkmity Logo" className="h-16 sm:h-20 lg:h-24 w-auto object-contain flex-shrink-0" draggable={false} />
            <span className="sr-only">Inkmity</span>
          </Link>
        </div>

        <div className="col-start-2 justify-self-center hidden md:flex justify-center overflow-hidden min-w-0">
          <Nav items={NAV_ITEMS} isActive={isActive} isSignedIn={effectiveSignedIn} onDisabledDashboardHover={onDashMouseMove} onDisabledDashboardLeave={onDashLeave} />
        </div>

        <div className="col-start-3 justify-self-end flex-center gap-fluid-xs xs:gap-fluid-sm sm:gap-fluid-md flex-shrink-0">
            {themed && (
              <div className="md:hidden flex items-center">
                <ThemeSwitch theme={theme} toggleTheme={toggleTheme} size="md" />
              </div>
            )}
            <button type="button" aria-label="Open menu" className={mobileBtnCls} onClick={() => setMobileMenuOpen(true)}>
              <Menu strokeWidth={1.75} className={mobileIconCls} />
            </button>

            {effectiveSignedIn && userRole === "client" && <HeaderRewards />}

            {effectiveSignedIn ? (
              <div
                className="hidden md:flex relative flex-shrink-0 text-app [&_*]:text-app [&_*]:border-app"
              >
                <div
                  ref={triggerRef}
                  className={dropdownBtnClasses}
                  style={{ minWidth: 'clamp(140px, 18vw, 220px)', maxWidth: '260px' }}
                  aria-haspopup="menu"
                  aria-expanded={showDropdown}
                  onClick={() => setShowDropdown((v) => !v)}
                >
                  <span className="mr-2.5 text-lg lg:text-xl leading-none flex-shrink-0">✦</span>
                  <div className="flex flex-col items-start leading-tight min-w-0 flex-1">
                    <span className="text-[10px] lg:text-[11px] opacity-60 leading-none">Welcome back,</span>
                    <span className="flex items-center h-[18px] lg:h-[22px] w-16 lg:w-20">
                      {!statusReady ? (
                        <span className="ink-shimmer h-3 w-full rounded" />
                      ) : (
                        <span className="font-bold truncate w-full text-[13px] lg:text-[16px] leading-tight">{userLabel || "User"}</span>
                      )}
                    </span>
                  </div>
                  {(() => {
                    const visibility = getVisibilityDisplay();
                    return (
                      <span className="ml-2 flex items-center gap-1.5 flex-shrink-0">
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${visibility.dot}`}>
                          {visibility.label === "Online" && (
                            <span className={`absolute inset-0 rounded-full ${visibility.dot} opacity-60 animate-ping`} />
                          )}
                        </span>
                        <span className="hidden lg:inline text-[11px] opacity-60">{visibility.label}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="absolute left-0 right-0 top-full h-2" />
              </div>
            ) : (
              <div className="hidden md:flex relative flex-shrink-0">
                <button
                  className={dropdownBtnClasses}
                  style={{ minWidth: 'clamp(110px, 14vw, 160px)' }}
                  onClick={() => navigate('/login')}
                  type="button"
                >
                  <span className="flex items-center justify-center gap-2 w-full">
                    <span className="font-semibold text-xl leading-none">✦</span>
                    <span className="font-bold whitespace-nowrap text-[13px] lg:text-[17px]">Sign In</span>
                  </span>
                </button>
              </div>
            )}
          </div>
      </header>

      {navLocked && tip.show && (
        <div className="hidden md:block fixed z-[2147483600] pointer-events-none ink-gate-tip" style={{ left: tip.x, top: tip.y, transform: "translate(-50%, 18px)" }}>
          <div className="flex items-center gap-2 rounded-xl border border-app bg-card px-4 py-2.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)] ring-1 ring-[color-mix(in_srgb,var(--fg)_25%,transparent)]">
            <span className="inline-grid place-items-center rounded-lg border border-white/40 bg-elevated p-1.5">
              <Lock className="h-3.5 w-3.5 text-app" />
            </span>
            <span className="text-[13px] font-bold text-app whitespace-nowrap">Sign in to access this page</span>
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
          className="bg-card border border-[color-mix(in_srgb,var(--fg)_16%,transparent)] rounded-xl transform transition-all duration-300 ease-out overflow-visible"
        >
          {(() => {
            const visibility = getVisibilityDisplay();
            const initial = (userLabel || "U").trim().charAt(0).toUpperCase();
            const roleLabel = userRole === "artist" ? "Artist account" : userRole === "client" ? "Client account" : "Member";
            const greeting = userRole === "artist" ? "Ready to create your next masterpiece?" : userRole === "client" ? "Ready for your next tattoo?" : "Welcome back";
            return (
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <span className="relative grid place-items-center h-11 w-11 rounded-full bg-elevated border border-app text-app font-bold text-lg flex-shrink-0">
                    {initial}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[color:var(--card)] ${visibility.dot}`} title={visibility.label} />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-base font-semibold truncate text-app">{userLabel || "User"}</div>
                    <div className="text-[11px] uppercase tracking-wide opacity-50 truncate">{roleLabel}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs opacity-70 text-app text-center">{greeting}</div>
                {themed && (
                  <div className="mt-3 flex items-center justify-center">
                    <ThemeSwitch theme={theme} toggleTheme={toggleTheme} size="sm" />
                  </div>
                )}
              </div>
            );
          })()}
          <div className="h-px w-full bg-[color-mix(in_srgb,var(--fg)_14%,transparent)]" />
          <Link
            to="/profile"
            onClick={() => setShowDropdown(false)}
            className="w-full px-4 py-3 hover:bg-[color-mix(in_srgb,var(--elevated)_50%,transparent)] text-app text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <User size={16} className="opacity-70" />
            <span>Profile</span>
          </Link>
          <div className="h-px w-full bg-[color-mix(in_srgb,var(--fg)_14%,transparent)]" />
          <button onClick={handleLogout} className="w-full px-4 py-3 hover:bg-[color-mix(in_srgb,var(--elevated)_50%,transparent)] text-app text-sm flex items-center justify-center gap-2 transition-colors rounded-b-xl">
            <LogOut size={16} className="opacity-70" />
            <span>Logout</span>
          </button>
        </div>,
        portalTarget
      )}
    </>
  );
};

export default Header;