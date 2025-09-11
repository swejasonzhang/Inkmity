import React, { useState } from "react";

interface HeaderProps {
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ userName }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  let timeout: NodeJS.Timeout;

  const handleMouseEnter = () => {
    timeout = setTimeout(() => setShowDropdown(true), 500);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeout);
    setShowDropdown(false);
  };

  return (
    <header className="w-full bg-gray-50 shadow-lg border-b-4 border-gray-200 flex items-center justify-between px-6 py-4 h-24">
      <div className="flex items-center space-x-12 mx-auto">
        <nav className="flex space-x-12 text-lg font-medium text-gray-700">
          <a href="/dashboard" className="hover:text-black transition">
            Home
          </a>
          <a href="#" className="hover:text-black transition">
            About
          </a>
        </nav>

        {/* Logo */}
        <div className="flex-shrink-0 flex items-center justify-center h-20">
          <img
            src="/Logo.png"
            alt="Logo"
            className="h-full w-auto object-contain"
          />
        </div>

        {/* Right Links */}
        <nav className="flex space-x-4 text-lg font-medium text-gray-700">
          <a href="#" className="hover:text-black transition">
            Services
          </a>
          <a href="#" className="hover:text-black transition">
            Contact
          </a>
        </nav>
      </div>

      {/* User Dropdown on Right */}
      {userName && (
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="text-black text-lg flex items-center cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 transition">
            <span className="mr-2 font-semibold text-gray-600">✦</span>
            Hello, <span className="font-bold ml-1">{userName}</span>!
          </div>

          {/* Dropdown Menu */}
          <div
            className={`absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg transform transition-all duration-500 ${
              showDropdown
                ? "opacity-100 translate-y-0 visible"
                : "opacity-0 -translate-y-2 invisible"
            }`}
          >
            <button className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;