import React from "react";

interface HeaderProps {
  title: string;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ title, userName }) => {
  return (
    <header className="w-full bg-gray-900 text-white shadow-md p-6 flex flex-col md:flex-row items-center justify-between">
      <h1 className="text-3xl font-bold">{title}</h1>
      {userName && (
        <div className="mt-2 md:mt-0 text-gray-300 text-lg">
          Hello, <span className="font-semibold text-white">{userName}</span>!
        </div>
      )}
    </header>
  );
};

export default Header;