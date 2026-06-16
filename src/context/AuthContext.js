"use client";

import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedToken = localStorage.getItem("stbs_admin_token");
        const storedAdmin = localStorage.getItem("stbs_admin_user");

        if (storedToken && storedAdmin) {
          setToken(storedToken);
          setAdmin(JSON.parse(storedAdmin));
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Log in the admin user using the backend API
   * @param {string} email 
   * @param {string} password 
   */
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      // Backend expects admin-login endpoint
      const response = await api.post("/admin/admin-login", { email, password });
      
      if (response && response.success && response.data) {
        const { admin: adminData, token: tokenData } = response.data;
        
        // Save to state
        setToken(tokenData);
        setAdmin(adminData);

        // Save to localStorage
        localStorage.setItem("stbs_admin_token", tokenData);
        localStorage.setItem("stbs_admin_user", JSON.stringify(adminData));
        
        return { success: true, message: response.message };
      }
      
      throw new Error(response?.message || "Invalid credentials received from server");
    } catch (error) {
      console.error("Login service error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    setToken(null);
    setAdmin(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("stbs_admin_token");
      localStorage.removeItem("stbs_admin_user");
    }
    setShowLogoutModal(false);
  };

  /**
   * Log out the admin user and clear local session
   */
  const logout = () => {
    setShowLogoutModal(true);
  };

  /**
   * Update active administrator details in state and storage
   */
  const updateAdmin = (newAdminData) => {
    setAdmin(newAdminData);
    if (typeof window !== "undefined") {
      localStorage.setItem("stbs_admin_user", JSON.stringify(newAdminData));
    }
  };

  const value = {
    admin,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
    updateAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-zinc-200/50 flex flex-col animate-scale-in text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-tight">Confirm Logout</h3>
            </div>
            
            <p className="text-zinc-650 text-xs font-light leading-relaxed mb-6">
              Are you sure you want to log out of the STBS administration panel? Any unsaved edits might be lost.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
