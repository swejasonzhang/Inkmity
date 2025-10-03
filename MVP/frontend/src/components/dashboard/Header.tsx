import React, { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Lock } from "lucide-react";

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);

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
    if (buttonRef.current) {
      setButtonWidth(buttonRef.current.offsetWidth);
    }
  }, [user?.firstName, user?.emailAddresses]);

  return (
    <header className="w-full bg-gray-50 shadow-lg border-b-4 border-gray-200 relative h-24 flex items-center z-50">
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

      <nav
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                    flex items-center gap-10 text-lg font-medium text-gray-700"
      >
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
              Hello,{" "}
              <span className="font-bold ml-1">
                {user.firstName || user.emailAddresses[0].emailAddress}
              </span>
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
  );
};

export default Header;