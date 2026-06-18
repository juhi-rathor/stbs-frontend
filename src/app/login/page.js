"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import api from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [view, setView] = useState("login"); // "login" or "forgot"
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotApiError, setForgotApiError] = useState("");
  const [forgotApiSuccess, setForgotApiSuccess] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [debugToken, setDebugToken] = useState("");

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError("Email is required");
      return;
    } else if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotError("Please enter a valid email address");
      return;
    }

    setForgotSubmitting(true);
    setForgotApiError("");
    setForgotApiSuccess("");
    setDebugToken("");

    try {
      const response = await api.post("/admin/forget-password", { email: forgotEmail });
      if (response && response.success) {
        setForgotApiSuccess(response.message || "Password reset link sent to your email!");
        setForgotEmail("");
        if (response.data && response.data.token) {
          setDebugToken(response.data.token);
        }
      } else {
        throw new Error(response?.message || "Failed to send reset link.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setForgotApiError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  // If already authenticated, redirect to dashboard overview page
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (apiError) {
      setApiError("");
    }
  };

  const validate = () => {
    const tempErrors = {};
    
    // Email validate
    if (!formData.email) {
      tempErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = "Please enter a valid email address";
    }
    
    // Password validate
    if (!formData.password) {
      tempErrors.password = "Password is required";
    } else if (formData.password.length < 4) {
      tempErrors.password = "Password must be at least 4 characters long";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError("");

    try {
      await login(formData.email, formData.password);
      // AuthContext handles setting state and token. The useEffect above will trigger redirect.
    } catch (error) {
      setApiError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-600 font-medium">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-blue-100 via-white to-blue-50">
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          {view === "login" ? (
            <>
              {/* Logo / Header */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-md shadow-blue-500/20 mb-4">
                  S
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                  STBS Portal
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Sign in with your administrator credentials
                </p>
              </div>

              <div className="mt-8">
                <div className="mt-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {apiError && (
                      <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{apiError}</span>
                      </div>
                    )}

                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={handleChange}
                      error={errors.email}
                      disabled={isSubmitting}
                      required
                    />

                    <Input
                      label="Password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      error={errors.password}
                      disabled={isSubmitting}
                      required
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="remember-me" className="block ml-2 text-sm text-zinc-700 font-medium">
                          Remember me
                        </label>
                      </div>

                      <div className="text-sm">
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setView("forgot");
                            setApiError("");
                            setErrors({});
                          }}
                          className="font-semibold text-blue-600 hover:text-blue-500"
                        >
                          Forgot password?
                        </a>
                      </div>
                    </div>

                    <div>
                      <Button type="submit" isLoading={isSubmitting}>
                        Sign In
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Logo / Header */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-md shadow-blue-500/20 mb-4">
                  S
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                  Reset Password
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Enter your email address to receive a password reset link
                </p>
              </div>

              <div className="mt-8">
                <div className="mt-6">
                  <form onSubmit={handleForgotSubmit} className="space-y-6">
                    {forgotApiError && (
                      <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{forgotApiError}</span>
                      </div>
                    )}

                    {forgotApiSuccess && (
                      <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl flex flex-col gap-2.5">
                        <div className="flex items-start gap-2.5">
                          <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{forgotApiSuccess}</span>
                        </div>
                        {debugToken && (
                          <div className="mt-2 pt-2 border-t border-green-200 flex flex-col gap-1">
                            <span className="text-xs text-green-600 font-semibold uppercase tracking-wider">Debug Link:</span>
                            <a
                              href={`/reset-password/${debugToken}`}
                              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                            >
                              Click here to go directly to reset password page
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <Input
                      label="Email Address"
                      name="forgotEmail"
                      type="email"
                      placeholder="name@company.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError("");
                        if (forgotApiError) setForgotApiError("");
                      }}
                      error={forgotError}
                      disabled={forgotSubmitting}
                      required
                    />

                    <div>
                      <Button type="submit" isLoading={forgotSubmitting}>
                        Send Reset Link
                      </Button>
                    </div>

                    <div className="text-center mt-4">
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setView("login");
                          setForgotEmail("");
                          setForgotError("");
                          setForgotApiError("");
                          setForgotApiSuccess("");
                          setDebugToken("");
                        }}
                        className="font-semibold text-sm text-blue-600 hover:text-blue-500"
                      >
                        Back to Sign In
                      </a>
                    </div>
                    {debugToken && (
                      <div id="debug-token" style={{ display: "none" }}>{debugToken}</div>
                    )}
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Decorative Side Panel for Larger Screens */}
      <div className="relative flex-1 hidden w-0 lg:block bg-blue-600 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-blue-500 opacity-90" />
        {/* Subtle geometric circles */}
        <div className="absolute w-[500px] h-[500px] rounded-full border border-white/10 -top-20 -right-20 animate-pulse duration-4000" />
        <div className="absolute w-[300px] h-[300px] rounded-full border border-white/5 bottom-20 left-20" />
        
        <div className="relative flex flex-col justify-center h-full max-w-xl mx-auto px-12 text-white">
          <span className="text-blue-200 text-sm font-semibold tracking-wider uppercase mb-2">STBS Administration</span>
          <h1 className="text-5xl font-extrabold tracking-tight leading-none mb-6">
            Manage your sales & dispatch pipelines efficiently.
          </h1>
          <p className="text-lg text-blue-100 leading-relaxed">
            A unified interface for invoice logging, stocks adjustment, payment verification, and client reminders. Secure login ensures administrative control.
          </p>
        </div>
      </div>
    </div>
  );
}
