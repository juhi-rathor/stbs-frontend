"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Header({ extraDropdownItems = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showDropdown && !event.target.closest("#header-profile-dropdown")) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showDropdown]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: "OVERVIEW", path: "/" },
    { name: "CUSTOMERS", path: "/customers" },
    { name: "PRODUCTS", path: "/products" },
    { name: "STOCK", path: "/stock" },
    { name: "ORDERS", path: "/orders" },
    { name: "DISPATCHES", path: "/dispatches" },
    { name: "INVOICES", path: "/invoices" },
    { name: "FINANCIALS", path: "/financials" }
  ];

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-650 text-white font-bold text-lg shadow-sm shadow-red-500/10 group-hover:scale-105 transition-transform duration-200">
            S
          </div>
          <span className="text-base font-bold text-zinc-900 tracking-wider uppercase">STBS</span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden min-[985px]:flex items-center gap-6 text-xs font-bold tracking-widest text-zinc-500">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <span
                key={link.name}
                className={`cursor-pointer relative py-2 transition-colors duration-200 ${
                  isActive ? "text-zinc-950 font-extrabold" : "hover:text-zinc-900"
                }`}
                onClick={() => router.push(link.path)}
              >
                {link.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-red-650 animate-fade-in"></span>
                )}
              </span>
            );
          })}
        </nav>

        {/* Right profile area & Mobile menu toggle */}
        <div className="flex items-center gap-3">
          
          <div className="relative" id="header-profile-dropdown">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-all select-none focus:outline-none bg-transparent border-0 p-0"
            >
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wide">
                  {admin?.name?.split(" ")[0] || "ADMIN"}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                  Control
                </span>
              </div>
              <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-200 flex items-center justify-center bg-zinc-50 text-zinc-700 font-bold text-sm shadow-sm uppercase">
                {admin?.name ? admin.name.charAt(0) : "A"}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-2xl shadow-xl py-2 z-50 animate-scale-in text-left">
                
                {/* Default option: Dashboard */}
                <button
                  onClick={() => {
                    router.push("/");
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                >
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </button>

                {/* Default option: Profile Settings */}
                <button
                  onClick={() => {
                    router.push("/profile");
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                >
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Admin Profile
                </button>

                {/* Extra customized page dropdown options */}
                {extraDropdownItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.onClick();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}

                <div className="border-t border-zinc-100 my-1"></div>
                
                {/* Default option: Logout */}
                <button
                  onClick={() => {
                    logout();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                >
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>

              </div>
            )}
          </div>

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-[985px]:hidden flex items-center justify-center p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors focus:outline-none bg-transparent border-0 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

        </div>

      </div>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <nav className="min-[985px]:hidden border-t border-zinc-200 bg-white px-4 py-3 space-y-1 shadow-inner animate-fade-in text-left">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <div
                key={link.name}
                className={`block px-4 py-3 rounded-xl text-xs font-bold tracking-widest cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? "bg-red-50 text-red-600 font-extrabold"
                    : "text-zinc-650 hover:bg-zinc-50 hover:text-zinc-950"
                }`}
                onClick={() => {
                  router.push(link.path);
                  setMobileMenuOpen(false);
                }}
              >
                {link.name}
              </div>
            );
          })}
        </nav>
      )}
    </header>
  );
}
