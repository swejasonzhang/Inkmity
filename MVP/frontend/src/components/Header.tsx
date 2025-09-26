import React, { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  // 🔒 Language dropdown temporarily disabled
  // const [showLangDropdown, setShowLangDropdown] = useState(false);
  // const [currentLanguage, setCurrentLanguage] = useState(
  //   localStorage.getItem("siteLanguage") || "en"
  // );

  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    await signOut({ redirectUrl: "/" });
  };

  // const handleLanguageClick = (lang: string) => {
  //   setCurrentLanguage(lang);
  //   localStorage.setItem("siteLanguage", lang);
  //   setShowLangDropdown(false);
  // };

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
      {/* Center nav + logo */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-12">
        <nav className="flex space-x-12 text-lg font-medium text-gray-700">
          <a href="/dashboard" className="hover:text-black transition">
            Home
          </a>
          <a href="/about" className="hover:text-black transition">
            About
          </a>
        </nav>

        <div className="flex-shrink-0 flex items-center justify-center h-20">
          <img
            src="/Logo.png"
            alt="Logo"
            className="h-full w-auto object-contain"
          />
        </div>

        <nav className="flex space-x-4 text-lg font-medium text-gray-700">
          <a href="/services" className="hover:text-black transition">
            Services
          </a>
          <a href="/contact" className="hover:text-black transition">
            Contact
          </a>
        </nav>
      </div>

      {isSignedIn && user && (
        <div className="absolute right-6 top-1/2 transform -translate-y-1/2 flex items-center gap-4">
          {/* 🔒 Language dropdown temporarily disabled */}
          {/*
          <div className="relative">
            <div
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className={dropdownBtnClasses + " bg-gray-50 text-gray-700"}
            >
              {currentLanguage === "en"
                ? "English"
                : currentLanguage === "es"
                ? "Spanish"
                : currentLanguage === "fr"
                ? "French"
                : currentLanguage === "de"
                ? "German"
                : currentLanguage === "zh-CN"
                ? "Chinese"
                : "Japanese"}
            </div>
            <div
              className={`absolute left-1/2 transform -translate-x-1/2 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 z-50 ${
                showLangDropdown
                  ? "opacity-100 translate-y-0 visible"
                  : "opacity-0 -translate-y-2 invisible"
              }`}
            >
              {["en", "es", "fr", "de", "zh-CN", "ja"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageClick(lang)}
                  className={`w-full px-4 py-2 text-center transition hover:bg-gray-100 ${
                    currentLanguage === lang ? "bg-gray-200 font-bold" : ""
                  }`}
                >
                  {lang === "en"
                    ? "English"
                    : lang === "es"
                    ? "Spanish"
                    : lang === "fr"
                    ? "French"
                    : lang === "de"
                    ? "German"
                    : lang === "zh-CN"
                    ? "Chinese"
                    : "Japanese"}
                </button>
              ))}
            </div>
          </div>
          */}

          {/* User dropdown */}
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
              className={`absolute left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg transform transition-all duration-300 ${
                showDropdown
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
        </div>
      )}
    </header>
  );
};

export default Header;
