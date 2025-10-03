import React, { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Lock, Menu, X } from "lucide-react";

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    await signOut({ redirectUrl: "/" });
  };

  const dropdownBtnClasses =
    "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition";

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

  const userLabel =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User";

  return (
    <>
      <header className="hidden md:flex w-full bg-gray-50 shadow-lg border-b-4 border-gray-200 relative h-24 items-center z-50">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
          <a href="/dashboard" className="flex items-center gap-3">
            <img
              src="/Logo.png"
              alt="Inkmity Logo"
              className="h-16 md:h-20 w-auto object-contain"
              draggable={false}
            />
            <span className="sr-only">Inkmity</span>
          </a>
        </div>

        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-10 text-lg font-medium text-gray-700">
          <a href="/dashboard" className="hover:text-black transition">
            Dashboard
          </a>
          <span
            aria-disabled="true"
            title="Gallery is a feature in progress"
            className="flex items-center gap-2 text-gray-500 cursor-not-allowed opacity-60 pointer-events-none"
          >
            Gallery
            <span className="inline-flex items-center gap-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
              <Lock size={10} /> In progress
            </span>
          </span>
          <a href="/contact" className="hover:text-black transition">
            Contact
          </a>
          <a href="/about" className="hover:text-black transition">
            About Inkmity
          </a>
        </nav>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
          {isSignedIn && user && (
            <div
              className="relative"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              <div
                ref={buttonRef}
                className={dropdownBtnClasses + " bg-gray-50 text-gray-700"}
              >
                <span className="mr-2 font-semibold text-gray-600">✦</span>
                Hello, <span className="font-bold ml-1">{userLabel}</span>
              </div>

              <div
                style={{ width: buttonWidth }}
                className={`absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg transform transition-all duration-300 ${showDropdown
                  ? "opacity-100 translate-y-0 visible"
                  : "opacity-0 -translate-y-2 invisible"
                  }`}
              >
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-center hover:bg-gray-100 rounded-lg"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden w-full bg-gray-50 shadow-lg border-b-2 border-gray-200 h-16 flex items-center z-50 px-3">
        <a href="/dashboard" className="flex items-center gap-2">
          <img
            src="/Logo.png"
            className="h-10 w-auto object-contain"
            draggable={false}
          />
          <span className="sr-only">Inkmity</span>
        </a>
        <div className="flex-1 text-center text-gray-800 font-semibold truncate px-2">
          Hello, <span className="font-bold">{userLabel}</span>
        </div>
        <button
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-gray-100 active:scale-[0.98]"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={22} />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gray-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <img
                  src="/Logo.png"
                  alt="Inkmity Logo"
                  className="h-8 w-auto object-contain"
                  draggable={false}
                />
              </div>
              <button
                aria-label="Close menu"
                className="p-2 rounded-lg hover:bg-gray-100 active:scale-[0.98]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4">
              <a
                href="/dashboard"
                className="w-full text-left px-4 py-3 rounded-lg text-gray-800 hover:bg-gray-100 font-medium flex"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </a>

              <div
                title="Gallery is a feature in progress"
                className="w-full px-4 py-3 rounded-lg text-gray-500 bg-gray-100/50 cursor-not-allowed flex items-center justify-between"
                aria-disabled="true"
              >
                <span>Gallery</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  <Lock size={10} /> In progress
                </span>
              </div>

              <a
                href="/contact"
                className="mt-2 w-full text-left px-4 py-3 rounded-lg text-gray-800 hover:bg-gray-100 font-medium flex"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
              <a
                href="/about"
                className="mt-2 w-full text-left px-4 py-3 rounded-lg text-gray-800 hover:bg-gray-100 font-medium flex"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Inkmity
              </a>
            </nav>

            {isSignedIn && (
              <div className="px-4 pb-6">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black active:scale-[0.99]"
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