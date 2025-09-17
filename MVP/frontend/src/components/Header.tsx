import React, { useState, useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem("siteLanguage") || "en"
  );
  const { signOut, setActive } = useClerk();
  const { user } = useUser();
  let timeout: NodeJS.Timeout;

  const handleMouseEnter = () => {
    clearTimeout(timeout);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    timeout = setTimeout(() => setShowDropdown(false), 500);
  };

  const handleLogout = async () => {
    localStorage.setItem("lastLogout", Date.now().toString());
    await setActive({ session: null });
    await signOut();
  };

  useEffect(() => {
    // Add Google Translate script
    const script = document.createElement("script");
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,es,fr,de,zh-CN,ja",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element"
      );

      // Apply stored language on init
      const lang = localStorage.getItem("siteLanguage");
      if (lang && lang !== "en") {
        const select = document.querySelector<HTMLSelectElement>(
          "#google_translate_element select"
        );
        if (select) {
          select.value = lang;
          select.dispatchEvent(new Event("change"));
        }
      }
    };
  }, []);

  const handleLanguageClick = (lang: string) => {
    const select = document.querySelector<HTMLSelectElement>(
      "#google_translate_element select"
    );
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event("change"));
    }
    setCurrentLanguage(lang);
    localStorage.setItem("siteLanguage", lang);
    setShowLangDropdown(false);
  };

  const dropdownBtnClasses =
    "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition";
  const dropdownMenuClasses =
    "absolute left-1/2 transform -translate-x-1/2 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 z-50";

  return (
    <header className="w-full bg-gray-50 shadow-lg border-b-4 border-gray-200 relative h-24 flex items-center z-50">
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

      {user && (
        <div className="absolute right-6 top-1/2 transform -translate-y-1/2 flex items-center gap-4">
          {/* Language Dropdown */}
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
              className={`${dropdownMenuClasses} ${
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
          
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={dropdownBtnClasses + " bg-gray-50 text-gray-700"}>
              <span className="mr-2 font-semibold text-gray-600">✦</span>
              Hello,{" "}
              <span className="font-bold ml-1">
                {user.firstName || user.emailAddresses[0].emailAddress}
              </span>
              !
            </div>

            <div
              className={`absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg transform transition-all duration-300 ${
                showDropdown
                  ? "opacity-100 translate-y-0 visible"
                  : "opacity-0 -translate-y-2 invisible"
              }`}
            >
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="google_translate_element" className="hidden"></div>
    </header>
  );
};

export default Header;