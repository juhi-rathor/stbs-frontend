"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import CustomersPage from "./customers/page";
import OrdersPage from "./orders/page";
import StockPage from "./stock/page";
import ProductsPage from "./products/page";
import ProfilePage from "./profile/page";
import FinancialsPage from "./financials/page";
import InvoicesPage from "./invoices/page";
import DispatchesPage from "./dispatches/page";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, admin, logout } = useAuth();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showDropdown && !event.target.closest("#user-profile-dropdown-container")) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showDropdown]);

  // Sync state with browser back/forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      if (pathname === "/") {
        setActiveTab(null);
      } else {
        const tabKey = pathname.substring(1);
        setActiveTab(tabKey);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Set initial active tab on page mount if path is not root (handled fallback)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (pathname !== "/") {
        const tabKey = pathname.substring(1);
        setActiveTab(tabKey);
      }
    }
  }, []);

  // If loading is done and user is not authenticated, redirect to /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);



  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-medium tracking-wide">Checking authorization...</p>
        </div>
      </div>
    );
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab("customers");
      window.history.pushState(null, "", "/customers");
      // Give a tiny timeout so the component is rendered and filters can be set or search initialized
      setTimeout(() => {
        const searchInput = document.querySelector('input[placeholder="Search customers..."]');
        if (searchInput) {
          searchInput.value = searchQuery.trim();
          const form = searchInput.closest("form");
          if (form) form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
      }, 300);
    }
  };

  const gridShortcuts = [
    {
      label: "CUSTOMER HUB",
      path: "/customers",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: "PRODUCTS CATALOG",
      path: "/products",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      label: "STOCK",
      path: "/stock",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      label: "SALES",
      path: "/orders",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: "DISPATCHES",
      path: "/dispatches",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1.6 11.2A2 2 0 008.6 21h6.8a2 2 0 001.993-1.8L19 8" />
        </svg>
      )
    },
    {
      label: "INVOICES",
      path: "/invoices",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: "FINANCIALS",
      path: "/financials",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: "ADMIN PROFILE",
      path: "/profile",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  const handleShortcutClick = (path) => {
    const tabKey = path.substring(1);
    if (activeTab === tabKey) {
      setActiveTab(null);
      window.history.pushState(null, "", "/");
    } else {
      setActiveTab(tabKey);
      window.history.pushState(null, "", path);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans select-none selection:bg-red-500/20 selection:text-red-900">
      
      {/* 1. HERO BANNER WITH WAREHOUSE BACKGROUND */}
      <div 
        className="relative min-h-[440px] flex flex-col justify-between pb-12 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.65)), url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80')` 
        }}
      >
        
        {/* Transparent Header */}
        <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between z-25">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => { setActiveTab(null); window.history.pushState(null, "", "/"); }}>
            <div className="bg-blue-600 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 text-base sm:text-xl font-extrabold tracking-widest uppercase rounded shadow-md border border-blue-700/50">
              STBS
            </div>
          </div>

          {/* Right Header Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">


            {/* SuperAdmin dropdown */}
            <div className="relative" id="user-profile-dropdown-container">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md border border-blue-700/30 transition cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px] uppercase flex-shrink-0">
                  {admin?.name ? admin.name.charAt(0) : "S"}
                </div>
                <span className="hidden sm:inline">{admin?.name || "SuperAdmin"}</span>
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 hidden sm:inline ${showDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-zinc-200 rounded-2xl shadow-xl py-2 z-50 animate-scale-in text-left">
                  <button
                    onClick={() => {
                      setActiveTab("profile");
                      window.history.pushState(null, "", "/profile");
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                  >
                    Admin Profile
                  </button>
                  <div className="border-t border-zinc-100 my-1"></div>
                  <button
                    onClick={() => {
                      logout();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-650 hover:bg-red-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Central Search Bar & Main Menu controls */}
        <div className="max-w-4xl w-full mx-auto px-4 text-center mt-12 z-10 flex flex-col items-center gap-6">
          <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Phone, ID, Email..."
              className="w-full pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 rounded-full bg-white text-zinc-900 border border-zinc-200 shadow-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition placeholder-zinc-400 font-medium"
            />
            <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-zinc-400 absolute left-3.5 sm:left-4.5 top-3.5 sm:top-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <button 
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-full shadow-lg border border-blue-700/40 transition cursor-default"
          >
            <span>Main Menu</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

      </div>

      {/* 2. SUB MENU (SLIDES DOWN ON MAIN MENU CLICK) */}
      {showMenu && (
        <div className="bg-blue-600 border-b border-blue-800 py-3.5 z-20 animate-fade-in shadow-inner">
          <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 sm:gap-6 text-white text-xs font-extrabold tracking-widest uppercase">
            <span onClick={() => { setActiveTab(null); window.history.pushState(null, "", "/"); }} className="hover:text-blue-200 cursor-pointer">Overview</span>
            <span onClick={() => { setActiveTab("customers"); window.history.pushState(null, "", "/customers"); }} className="hover:text-blue-200 cursor-pointer">Customers</span>
            <span onClick={() => { setActiveTab("products"); window.history.pushState(null, "", "/products"); }} className="hover:text-blue-200 cursor-pointer">Products</span>
            <span onClick={() => { setActiveTab("stock"); window.history.pushState(null, "", "/stock"); }} className="hover:text-blue-200 cursor-pointer">Stock</span>
            <span onClick={() => { setActiveTab("orders"); window.history.pushState(null, "", "/orders"); }} className="hover:text-blue-200 cursor-pointer">Orders</span>
            <span onClick={() => { setActiveTab("dispatches"); window.history.pushState(null, "", "/dispatches"); }} className="hover:text-blue-200 cursor-pointer">Dispatches</span>
            <span onClick={() => { setActiveTab("invoices"); window.history.pushState(null, "", "/invoices"); }} className="hover:text-blue-200 cursor-pointer">Invoices</span>
            <span onClick={() => { setActiveTab("financials"); window.history.pushState(null, "", "/financials"); }} className="hover:text-blue-200 cursor-pointer">Financials</span>
          </div>
        </div>
      )}

      {/* 3. SHORTCUTS GRID (THIN DASHED / DOTTED BORDERS) */}
      {!activeTab && (
        <main className="flex-1 w-full bg-white border-t border-dashed border-zinc-200">
          <div className="grid grid-cols-1 md:grid-cols-3 max-w-7xl mx-auto w-full">
            {gridShortcuts.map((shortcut, index) => {
              const tabKey = shortcut.path.substring(1);
              const isLastMobile = index === gridShortcuts.length - 1;
              const borderClass = `${isLastMobile ? "border-b-0" : "border-b"} ${index < 3 ? "md:border-b" : "md:border-b-0"} ${(index + 1) % 3 !== 0 ? "md:border-r" : "md:border-r-0"} border-dashed border-zinc-200`;
              const isActive = activeTab === tabKey;

              return (
                <div 
                  key={index}
                  onClick={() => handleShortcutClick(shortcut.path)}
                  className={`flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 cursor-pointer transition-all duration-300 group ${borderClass} ${
                    isActive 
                      ? "bg-blue-50/20 shadow-inner" 
                      : "bg-white hover:bg-zinc-50/60"
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300 mb-6 border ${
                    isActive
                      ? "bg-blue-600 text-white scale-110 shadow-md shadow-blue-600/20 border-blue-700"
                      : "bg-zinc-50 text-blue-600 group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-600 border-zinc-200/40"
                  }`}>
                    {shortcut.icon}
                  </div>
                  <span className={`text-xs font-extrabold tracking-widest uppercase transition-colors duration-200 ${
                    isActive ? "text-blue-700 font-black" : "text-zinc-500 group-hover:text-zinc-900"
                  }`}>
                    {shortcut.label}
                  </span>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* Embedded Sub-Page View Panel */}
      {activeTab && (
        <div id="embedded-content-section" className="border-t border-dashed border-zinc-200 bg-zinc-50 relative animate-fade-in pb-16">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-6 flex justify-between items-center border-b border-dashed border-zinc-200/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                Active Panel: {activeTab.replace("-", " ")}
              </span>
            </div>
            <button
              onClick={() => {
                setActiveTab(null);
                window.history.pushState(null, "", "/");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 text-xs font-bold uppercase tracking-wider rounded-full border border-zinc-200 transition shadow-md hover:shadow-lg cursor-pointer"
            >
              <svg className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>

          <div className="mt-2">
            {activeTab === "customers" && <CustomersPage hideHeader={true} hideFooter={true} />}
            {activeTab === "orders" && <OrdersPage hideHeader={true} />}
            {activeTab === "stock" && <StockPage hideHeader={true} hideFooter={true} />}
            {activeTab === "products" && <ProductsPage hideHeader={true} hideFooter={true} />}
            {activeTab === "profile" && <ProfilePage hideHeader={true} />}
            {activeTab === "financials" && <FinancialsPage hideHeader={true} hideFooter={true} />}
            {activeTab === "invoices" && <InvoicesPage hideHeader={true} />}
            {activeTab === "dispatches" && <DispatchesPage hideHeader={true} />}
          </div>
        </div>
      )}

      {/* 4. FOOTER */}
      <footer className="bg-white border-t border-dashed border-zinc-200 text-zinc-500 py-8 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-semibold text-zinc-800 uppercase tracking-wider">STBS Administration Panel</p>
          <p>&copy; {new Date().getFullYear()} STBS Ltd. All rights reserved. Tel: (01924) 763272</p>
        </div>
      </footer>

    </div>
  );
}
