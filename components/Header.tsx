
import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="pb-2 pt-1 px-3 bg-white border-b border-slate-200 sticky top-0 z-10">
      <h1 className="text-center text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
        {title}
      </h1>
    </header>
  );
};

export default Header;
