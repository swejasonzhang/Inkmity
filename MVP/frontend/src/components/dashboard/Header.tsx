import React, { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Lock, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const THEME_MS = 600; // keep this in sync with global.css --theme-ms

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();
  const { pathname } = useLocation();

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch { }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-ms", `${THEME_MS}ms`);
    root.classList.add("theme-smooth");
    root.setAttribute("data-ink-theme", theme);
    root.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem("theme", theme);
    } catch { }
    const id = window.setTimeout(() => root.classList.remove("theme-smooth"), THEME_MS);
    return () => window.clearTimeout(id);
  }, [theme]);

  function runThemeSwitch(next: "light" | "dark") {
    const root = document.documentElement;
    const curtain = document.createElement("div");
    curtain.className = "theme-curtain";
    document.body.appendChild(curtain);

    root.classList.add("theme-smooth");

    requestAnimationFrame(() => setTheme(next));

    window.setTimeout(() => {
      curtain.remove();
      root.classList.remove("theme-smooth");
    }, THEME_MS);
  }

  const toggleTheme = () => runThemeSwitch(theme === "light" ? "dark" : "light");

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    await signOut({ redirectUrl: "/" });
  };

  const dropdownBtnClasses =
    "inline-flex h-10 items-center justify-center px-3 rounded-lg cursor-pointer transition border border-app bg-elevated text-app hover:bg-elevated text-center";

  const buttonRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (buttonRef.current) setButtonWidth(buttonRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (buttonRef.current) setButtonWidth(buttonRef.current.offsetWidth);
  }, [user?.firstName, user?.emailAddresses]);

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

  const userLabel =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User";

  const isActive = (to: string) =>
    to === "/dashboard"
      ? pathname === "/" || pathname.startsWith("/dashboard")
      : pathname.startsWith(to);

  const desktopLink =
    "relative px-1 py-1 transition text-app/80 hover:text-app group";

  const DesktopInkBar = ({ active }: { active: boolean }) => (
    <span className="pointer-events-none absolute -bottom-2 left-0 right-0">
      <span className="block h-[3px] rounded-full bg-app/15 overflow-hidden">
        <span
          className={[
            "block h-full bg-[linear-gradient(90deg,#000,#777,#fff)]",
            "origin-left will-change-transform",
            active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
          ].join(" ")}
          style={{ transition: `transform ${THEME_MS}ms ease-out` }}
        />
      </span>
    </span>
  );

  const mobileItem =
    "w-full text-left px-4 py-3 rounded-lg font-medium flex items-center justify-between text-app";

  const MobileAccent = ({ active }: { active: boolean }) => (
    <span
      className={[
        "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full",
        active ? "bg-[linear-gradient(#000,#777,#fff)]" : "bg-transparent",
      ].join(" ")}
    />
  );

  const logoSrc = theme === "light" ? "/BlackLogo.png" : "/WhiteLogo.png";

  return (
    <>
      <header className="hidden md:flex w-full bg-app border-b border-app relative h-24 items-center z-50">
        <div className="absolute left-4 top-[60%] -translate-y-1/2 flex items-center">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="Inkmity Logo"
              className="h-20 md:h-24 w-auto object-contain"
              draggable={false}
            />
            <span className="sr-only">Inkmity</span>
          </Link>
        </div>

        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-10 text-lg font-medium">
          <Link
            to="/dashboard"
            className={desktopLink}
            aria-current={isActive("/dashboard") ? "page" : undefined}
          >
            <span className="text-app">Dashboard</span>
            <DesktopInkBar active={isActive("/dashboard")} />
          </Link>

          <span
            aria-disabled="true"
            title="Gallery is a feature in progress"
            className="relative flex items-center gap-2 text-app/60 cursor-not-allowed opacity-60"
          >
            <span>Gallery</span>
            <span className="inline-flex items-center gap-1 text-[10px] bg-elevated text-app px-1.5 py-0.5 rounded-full border border-app">
              <Lock size={10} /> In progress
            </span>
            <span className="pointer-events-none absolute -bottom-2 left-1/3 right-1/3 h-[2px] bg-app/10 rounded-full" />
          </span>

          <Link
            to="/contact"
            className={desktopLink}
            aria-current={isActive("/contact") ? "page" : undefined}
          >
            <span className="text-app">Contact</span>
            <DesktopInkBar active={isActive("/contact")} />
          </Link>

          <Link
            to="/about"
            className={desktopLink}
            aria-current={isActive("/about") ? "page" : undefined}
          >
            <span className="text-app">About Inkmity</span>
            <DesktopInkBar active={isActive("/about")} />
          </Link>
        </nav>

        <div className="absolute right-10 lg:right-12 top-1/2 -translate-y-1/2 flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={theme === "light"}
            className="group relative inline-flex items-center rounded-full border border-app bg-elevated pr-3 pl-2 py-1.5 text-sm text-app hover:bg-elevated active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]"
          >
            <span className="relative mr-2 inline-flex h-6 w-12 items-center rounded-full bg-elevated p-0.5">
              <span
                className={[
                  "z-10 grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm",
                  theme === "light" ? "translate-x-6" : "translate-x-0",
                ].join(" ")}
                style={{ transition: `transform ${THEME_MS}ms` }}
              >
                <span className="text-[11px]">{theme === "light" ? "☀︎" : "☾"}</span>
              </span>
            </span>
            <span className="font-medium">{theme === "light" ? "Light" : "Dark"}</span>
          </button>

          {isSignedIn && user && (
            <div
              className="relative"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              <div
                ref={buttonRef}
                style={{ width: buttonWidth ? `${buttonWidth}px` : undefined }}
                className={dropdownBtnClasses}
              >
                <span className="mr-2 font-semibold">✦</span>
                <span className="inline-flex items-center">
                  <span>Hello,&nbsp;</span>
                  <span className="font-bold text-sm max-w-[12rem] truncate text-center leading-none">
                    {userLabel}
                  </span>
                </span>
              </div>

              <div
                style={{ width: buttonWidth ? `${buttonWidth}px` : undefined }}
                className={`absolute right-0 mt-2 bg-card border border-app rounded-lg shadow-xl transform transition-all duration-300 ${showDropdown ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"
                  }`}
              >
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-center hover:bg-elevated rounded-lg text-app"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <header className="md:hidden w-full bg-app border-b border-app h-16 flex items-center z-50 px-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src={logoSrc}
            alt="Inkmity Logo"
            className="h-10 w-auto object-contain"
            draggable={false}
          />
          <span className="sr-only">Inkmity</span>
        </Link>
        <div className="flex-1 text-center font-semibold truncate px-2 text-app">
          Hello,&nbsp;
          <span className="font-bold text-sm max-w-[10rem] inline-block align-middle truncate">
            {userLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Toggle theme"
            aria-pressed={theme === "light"}
            className="group relative inline-flex h-8 w-14 items-center rounded-full border border-app bg-elevated p-1 text-app hover:bg-elevated active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]"
            onClick={toggleTheme}
          >
            <span
              className={[
                "z-10 grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm",
                theme === "light" ? "translate-x-6" : "translate-x-0",
              ].join(" ")}
              style={{ transition: `transform ${THEME_MS}ms` }}
            >
              <span className="text-xs">{theme === "light" ? "☀︎" : "☾"}</span>
            </span>
          </button>
          <button
            aria-label="Open menu"
            className="p-2 rounded-lg hover:bg-elevated active:scale-[0.98] text-app"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-0 bg-app flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-app">
              <div className="flex items-center gap-2">
                <img
                  src={logoSrc}
                  alt="Inkmity Logo"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <button
                aria-label="Close menu"
                className="p-2 rounded-lg hover:bg-elevated active:scale-[0.98] text-app"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-4 text-app">
              <div className="relative">
                <MobileAccent active={isActive("/dashboard")} />
                <Link
                  to="/dashboard"
                  className={`${mobileItem} pl-6`}
                  aria-current={isActive("/dashboard") ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              </div>

              <div
                title="Gallery is a feature in progress"
                className="relative mt-2 w-full px-6 py-3 rounded-lg bg-elevated border border-app cursor-not-allowed flex items-center justify-between text-app/80"
                aria-disabled="true"
              >
                <span>Gallery</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-elevated text-app px-1.5 py-0.5 rounded-full border border-app">
                  <Lock size={10} /> In progress
                </span>
              </div>

              <div className="relative mt-2">
                <MobileAccent active={isActive("/contact")} />
                <Link
                  to="/contact"
                  className={`${mobileItem} pl-6`}
                  aria-current={isActive("/contact") ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
              </div>

              <div className="relative mt-2">
                <MobileAccent active={isActive("/about")} />
                <Link
                  to="/about"
                  className={`${mobileItem} pl-6`}
                  aria-current={isActive("/about") ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About Inkmity
                </Link>
              </div>
            </nav>

            {isSignedIn && (
              <div className="px-4 pb-6">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-lg bg-white text-black font-semibold hover:opacity-90 active:scale-[0.99]"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;