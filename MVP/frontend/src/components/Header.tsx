import React from "react";

interface HeaderProps {
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ userName }) => {
  return (
    <header
      className="w-full text-gray-100 shadow-lg p-6 flex flex-col md:flex-row items-center justify-between border-b-4 border-gray-700 relative bg-cover bg-center"
      style={{ backgroundImage: "url('/Background.png')" }}
    >
      <img
        src="/Logo.png"
        alt="Logo"
        className="h-14 md:h-16 object-contain drop-shadow-lg"
      />

      {userName && (
        <div className="mt-3 md:mt-0 text-gray-200 text-lg flex items-center bg-black/50 px-4 py-2 rounded-lg">
          <span className="mr-2 font-semibold text-gray-400">✦</span>
          Hello, <span className="font-bold text-white ml-1">{userName}</span>!
        </div>
      )}
    </header>
  );
};

export default Header;