import React from "react";

interface HeaderProps {
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ userName }) => {
  return (
    <header className="w-full bg-black text-gray-100 shadow-lg p-6 flex flex-col md:flex-row items-center justify-between border-b-4 border-gray-700 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-800"></div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-widest font-[cursive] drop-shadow-lg uppercase text-white">
        <span className="text-gray-400">For</span>{" "}
        <span className="text-white">The Love</span>{" "}
        <span className="text-gray-400">of Tattoos</span>
      </h1>

      {userName && (
        <div className="mt-3 md:mt-0 text-gray-400 text-lg flex items-center">
          <span className="mr-2 font-semibold text-gray-500">✦</span>
          Hello, <span className="font-bold text-white ml-1">{userName}</span>!
        </div>
      )}
    </header>
  );
};

export default Header;
