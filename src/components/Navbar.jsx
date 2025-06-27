import React from 'react';

export default function Navbar({ cartCount }) {
  return (
    <nav className="bg-blue-600 p-4 flex justify-between items-center text-white">
      <h1 className="text-xl font-bold">Capriccio Pizza</h1>
      <div className="relative cursor-pointer">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="7" cy="21" r="1" />
          <circle cx="17" cy="21" r="1" />
        </svg>
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 rounded-full text-xs w-5 h-5 flex items-center justify-center">{cartCount}</span>
        )}
      </div>
    </nav>
  );
}
