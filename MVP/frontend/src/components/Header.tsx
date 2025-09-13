import React, { useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
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

  return (
    <header className="w-full bg-gray-50 shadow-lg border-b-4 border-gray-200 relative h-24 flex items-center">
      {/* Centered Logo and Links */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-12">
        <nav className="flex space-x-12 text-lg font-medium text-gray-700">
          <a href="/dashboard" className="hover:text-black transition">
            Home
          </a>
          <a href="#" className="hover:text-black transition">
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
          <a href="#" className="hover:text-black transition">
            Services
          </a>
          <a href="#" className="hover:text-black transition">
            Contact
          </a>
        </nav>
      </div>

      {/* User Dropdown on Right */}
      {user && (
        <div
          className="absolute right-6 top-1/2 transform -translate-y-1/2"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="text-black text-lg flex items-center cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 transition">
            <span className="mr-2 font-semibold text-gray-600">✦</span>
            Hello,{" "}
            <span className="font-bold ml-1">
              {user.firstName || user.emailAddresses[0].emailAddress}
            </span>
            !
          </div>

          <div
            className={`absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg transform transition-all duration-500 ${
              showDropdown
                ? "opacity-100 translate-y-0 visible"
                : "opacity-0 -translate-y-2 invisible"
            }`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;