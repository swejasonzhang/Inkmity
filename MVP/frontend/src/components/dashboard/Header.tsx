import React, { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Lock, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();
  const { pathname } = useLocation();

  const [flipped, setFlipped] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ink_theme_flip") === "1";
    } catch {
      return false;
    }
  });

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    await signOut({ redirectUrl: "/" });
  };

  const dropdownBtnClasses =
    "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition";

  const buttonRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(0);

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

  useEffect(() => {
    document.body.classList.toggle("theme-flip", flipped);
    try {
      localStorage.setItem("ink_theme_flip", flipped ? "1" : "0");
    } catch { }
  }, [flipped]);

  const userLabel =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User";

  const isActive = (to: string) =>
    to === "/dashboard"
      ? pathname === "/" || pathname.startsWith("/dashboard")
      : pathname.startsWith(to);

  const desktopLink =
    "relative px-1 py-1 transition text-white/80 hover:text-white group";

  const DesktopInkBar = ({ active }: { active: boolean }) => (
    <span
      className={[
        "pointer-events-none absolute -bottom-2 left-0 right-0 h-[3px] rounded-full",
        active
          ? "bg-gradient-to-r from-black via-gray-500 to-white shadow-[0_0_12px_rgba(255,255,255,0.25)]"
          : "left-1/3 right-1/3 h-[2px] bg-white/10 opacity-0 group-hover:opacity-100 group-hover:left-0 group-hover:right-0 transition-all duration-300",
      ].join(" ")}
    />
  );

  const mobileItem =
    "w-full text-left px-4 py-3 rounded-lg font-medium flex items-center justify-between text-white";

  const MobileAccent = ({ active }: { active: boolean }) => (
    <span
      className={[
        "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full",
        active
          ? "bg-gradient-to-b from-black via-gray-500 to-white shadow-[0_0_8px_rgba(255,255,255,0.25)]"
          : "bg-white/0",
      ].join(" ")}
    />
  );

  const logoSrc = flipped ? "/WhiteLogo.png" : "/BlackLogo.png";

  return (
    <>
      <header className="hidden md:flex w-full bg-gray-900 border-b border-white/10 relative h-24 items-center z-50">
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
            <span className="text-white">Dashboard</span>
            <DesktopInkBar active={isActive("/dashboard")} />
          </Link>

          <span
            aria-disabled="true"
            title="Gallery is a feature in progress"
            className="relative flex items-center gap-2 text-white/60 cursor-not-allowed opacity-60"
          >
            <span>Gallery</span>
            <span className="inline-flex items-center gap-1 text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded-full border border-white/15">
              <Lock size={10} /> In progress
            </span>
            <span className="pointer-events-none absolute -bottom-2 left-1/3 right-1/3 h-[2px] bg-white/10 rounded-full" />
          </span>

          <Link
            to="/contact"
            className={desktopLink}
            aria-current={isActive("/contact") ? "page" : undefined}
          >
            <span className="text-white">Contact</span>
            <DesktopInkBar active={isActive("/contact")} />
          </Link>

          <Link
            to="/about"
            className={desktopLink}
            aria-current={isActive("/about") ? "page" : undefined}
          >
            <span className="text-white">About Inkmity</span>
            <DesktopInkBar active={isActive("/about")} />
          </Link>
        </nav>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
          <button
            onClick={() => setFlipped((v) => !v)}
            aria-label="Flip theme"
            aria-pressed={flipped}
            className="group relative inline-flex items-center rounded-full border border-white/15 bg-white/5 pr-3 pl-2 py-1.5 text-sm text-white hover:bg-white/10 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <span className="relative mr-2 inline-flex h-6 w-12 items-center rounded-full bg-gradient-to-r from-white/20 via-white/25 to-white/20 p-0.5 transition-all duration-300">
              <span
                className={[
                  "absolute inset-0 rounded-full",
                  "bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_60%)]",
                ].join(" ")}
              />
              <span
                className={[
                  "z-10 grid h-5 w-5 place-items-center rounded-full bg-white shadow-md transition-all duration-300",
                  flipped ? "translate-x-6" : "translate-x-0",
                ].join(" ")}
              >
                <span className="transition-opacity duration-200">
                  {flipped ? (
                    <span className="text-gray-800 text-[11px]">☀︎</span>
                  ) : (
                    <span className="text-gray-900/70 text-[11px]">☾</span>
                  )}
                </span>
              </span>
              <span
                className={[
                  "absolute -inset-[1px] rounded-full opacity-0 blur-[6px] transition-opacity duration-300",
                  "bg-[conic-gradient(from_180deg,rgba(255,255,255,0.35),transparent_50%)]",
                  "group-hover:opacity-100",
                ].join(" ")}
              />
            </span>
            <span className="font-medium">{flipped ? "Light" : "Dark"}</span>
          </button>

          {isSignedIn && user && (
            <div
              className="relative"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              <div
                ref={buttonRef}
                className={`${dropdownBtnClasses} bg-white/5 text-white border border-white/10`}
              >
                <span className="mr-2 font-semibold">✦</span>
                Hello, <span className="font-bold ml-1">{userLabel}</span>
              </div>

              <div
                style={{ width: buttonWidth }}
                className={`absolute right-0 mt-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl transform transition-all duration-300 ${showDropdown
                  ? "opacity-100 translate-y-0 visible"
                  : "opacity-0 -translate-y-2 invisible"
                  }`}
              >
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left hover:bg-white/10 rounded-lg text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <header className="md:hidden w-full bg-gray-900 border-b border-white/10 h-16 flex items-center z-50 px-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src={logoSrc}
            alt="Inkmity Logo"
            className="h-10 w-auto object-contain"
            draggable={false}
          />
          <span className="sr-only">Inkmity</span>
        </Link>
        <div className="flex-1 text-center font-semibold truncate px-2 text-white">
          Hello, <span className="font-bold">{userLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Flip theme"
            aria-pressed={flipped}
            className="group relative inline-flex h-8 w-14 items-center rounded-full border border-white/15 bg-white/5 p-1 text-white hover:bg-white/10 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/30"
            onClick={() => setFlipped((v) => !v)}
          >
            <span
              className={[
                "absolute inset-0 rounded-full opacity-0 blur-[6px] transition-opacity duration-300",
                "bg-[conic-gradient(from_180deg,rgba(255,255,255,0.35),transparent_50%)]",
                "group-hover:opacity-100",
              ].join(" ")}
            />
            <span
              className={[
                "z-10 grid h-6 w-6 place-items-center rounded-full bg-white shadow-md transition-transform duration-300",
                flipped ? "translate-x-6" : "translate-x-0",
              ].join(" ")}
            >
              {flipped ? (
                <span className="text-gray-800 text-xs">☀︎</span>
              ) : (
                <span className="text-gray-900/70 text-xs">☾</span>
              )}
            </span>
          </button>
          <button
            aria-label="Open menu"
            className="p-2 rounded-lg hover:bg-white/10 active:scale-[0.98] text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gray-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <img
                  src={logoSrc}
                  alt="Inkmity Logo"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <button
                aria-label="Close menu"
                className="p-2 rounded-lg hover:bg-white/10 active:scale-[0.98] text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-4 text-white">
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
                className="relative mt-2 w-full px-6 py-3 rounded-lg bg-white/5 border border-white/10 cursor-not-allowed flex items-center justify-between text-white/80"
                aria-disabled="true"
              >
                <span>Gallery</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded-full border border-white/15">
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
                  className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 font-semibold hover:opacity-90 active:scale-[0.99]"
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