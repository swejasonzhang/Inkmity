import React, { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Lock } from "lucide-react";

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem("siteLanguage") || "en"
  );

  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    localStorage.removeItem("trustedDevice");
    await signOut({ redirectUrl: "/" });
  };

  useEffect(() => {
    // Force English for now
    if (currentLanguage !== "en") {
      setCurrentLanguage("en");
      localStorage.setItem("siteLanguage", "en");
    }
  }, [currentLanguage]);

  const handleLanguageClick = (lang: string) => {
    if (lang !== "en") return; // locked for future implementation
    setCurrentLanguage(lang);
    localStorage.setItem("siteLanguage", lang);
    setShowLangDropdown(false);
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

  const languages = ["en", "es", "fr", "de", "zh-CN", "ja"];
  const langLabel = (lang: string) =>
    lang === "en"
      ? "English"
      : lang === "es"
      ? "Spanish"
      : lang === "fr"
      ? "French"
      : lang === "de"
      ? "German"
      : lang === "zh-CN"
      ? "Chinese"
      : "Japanese";

  return (
    <header className="w-full bg-gray-50 shadow-lg border-b-4 border-gray-200 relative h-24 flex items-center z-50">
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-12">
        <nav className="flex space-x-12 text-lg font-medium text-gray-700">
          <a href="/dashboard" className="hover:text-black transition">
            Dashboard
          </a>
          <a href="/gallery" className="hover:text-black transition">
            Gallery
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
          <a href="/contact" className="hover:text-black transition">
            Contact
          </a>
          <a href="/about" className="hover:text-black transition">
            About Inkmity
          </a>
        </nav>
      </div>

      {isSignedIn && user && (
        <div className="absolute right-6 top-1/2 transform -translate-y-1/2 flex items-center gap-4">
          {/* Language selector (locked – only English available) */}
          <div className="relative">
            <div
              onClick={() => setShowLangDropdown((v) => !v)}
              className={`${dropdownBtnClasses} bg-gray-50 text-gray-700`}
              title="Additional languages coming soon"
            >
              {langLabel(currentLanguage)}
              <span className="ml-1 inline-flex items-center gap-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                <Lock size={10} /> Coming soon
              </span>
            </div>

            <div
              className={`absolute left-1/2 transform -translate-x-1/2 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 z-50 ${
                showLangDropdown
                  ? "opacity-100 translate-y-0 visible"
                  : "opacity-0 -translate-y-2 invisible"
              }`}
            >
              {languages.map((lang) => {
                const disabled = lang !== "en";
                return (
                  <button
                    key={lang}
                    onClick={() => handleLanguageClick(lang)}
                    disabled={disabled}
                    aria-disabled={disabled}
                    title={disabled ? "Locked • Coming soon" : ""}
                    className={`w-full px-4 py-2 text-left transition ${
                      disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-100"
                    } ${currentLanguage === lang ? "font-bold" : ""}`}
                  >
                    {langLabel(lang)}
                  </button>
                );
              })}
              <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                More languages are in development.
              </div>
            </div>
          </div>

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