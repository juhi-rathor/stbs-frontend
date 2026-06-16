"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import useAxios from "../../hooks/useAxios";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Header from "../../components/Header";

export default function ProfilePage({ hideHeader = false }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout, updateAdmin } = useAuth();
  const { request: axiosRequest } = useAxios();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Change Password States
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwdFormData, setPwdFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdErrors, setPwdErrors] = useState({});
  const [pwdApiError, setPwdApiError] = useState("");
  const [pwdApiSuccess, setPwdApiSuccess] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // Edit Profile States
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
  });
  const [editErrors, setEditErrors] = useState({});
  const [editApiError, setEditApiError] = useState("");
  const [editApiSuccess, setEditApiSuccess] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Form handlers
  const handleInputChange = (e, setFormData, setErrors, clearApiMessage) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    clearApiMessage();
  };

  const validatePwd = () => {
    const tempErrors = {};
    if (!pwdFormData.oldPassword) {
      tempErrors.oldPassword = "Current password is required";
    }
    if (!pwdFormData.newPassword) {
      tempErrors.newPassword = "New password is required";
    } else if (pwdFormData.newPassword.length < 6) {
      tempErrors.newPassword = "Password must be at least 6 characters long";
    }
    if (pwdFormData.newPassword !== pwdFormData.confirmPassword) {
      tempErrors.confirmPassword = "Passwords do not match";
    }
    setPwdErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handlePwdSubmit = async (e) => {
    e.preventDefault();
    if (!validatePwd()) return;

    setPwdSubmitting(true);
    setPwdApiError("");
    setPwdApiSuccess("");

    try {
      const response = await axiosRequest({
        url: "/admin/change-password",
        method: "POST",
        data: {
          oldPassword: pwdFormData.oldPassword,
          newPassword: pwdFormData.newPassword,
        }
      });

      if (response && response.success) {
        setPwdApiSuccess(response.message || "Password changed successfully!");
        setPwdFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => {
          setShowChangePassword(false);
          setPwdApiSuccess("");
        }, 1500);
      } else {
        throw new Error(response?.message || "Failed to change password.");
      }
    } catch (err) {
      console.error("Change password error:", err);
      setPwdApiError(err.message || "Failed to change password.");
    } finally {
      setPwdSubmitting(false);
    }
  };

  const validateEdit = () => {
    const tempErrors = {};
    if (!editFormData.name.trim()) {
      tempErrors.name = "Name is required";
    }
    setEditErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateEdit()) return;

    setEditSubmitting(true);
    setEditApiError("");
    setEditApiSuccess("");

    try {
      const response = await axiosRequest({
        url: "/admin/update-admin-profile",
        method: "PUT",
        data: {
          name: editFormData.name,
        }
      });

      if (response && response.success && response.data) {
        setEditApiSuccess(response.message || "Profile updated successfully!");
        setProfile(response.data);
        updateAdmin(response.data);

        setTimeout(() => {
          setShowEditProfile(false);
          setEditApiSuccess("");
        }, 1500);
      } else {
        throw new Error(response?.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setEditApiError(err.message || "Failed to update profile.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Ensure user is authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch admin profile details
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!isAuthenticated) return;
      try {
        setLoading(true);
        setError("");
        const response = await axiosRequest({
          url: "/admin/get-admin-profile",
          method: "GET"
        });
        if (response && response.success && response.data) {
          setProfile(response.data);
        } else {
          throw new Error("Invalid response format received from server");
        }
      } catch (err) {
        console.error("Error fetching admin profile:", err);
        setError(err.message || "Failed to load admin profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [isAuthenticated, axiosRequest]);

  if (authLoading || (loading && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-650 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-medium tracking-wide">Loading Profile Details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Failed to load profile</h2>
          <p className="text-zinc-400 mb-6 text-xs leading-relaxed">{error}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()}>
              Retry Fetching
            </Button>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const headerExtraItems = [
    {
      label: "Edit Profile Info",
      onClick: () => {
        setEditFormData({ name: profile?.name || "" });
        setEditErrors({});
        setEditApiError("");
        setEditApiSuccess("");
        setShowEditProfile(true);
      },
      icon: (
        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: "Change Password",
      onClick: () => {
        setShowChangePassword(true);
      },
      icon: (
        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans selection:bg-red-500/20 selection:text-red-900">
      
      {/* Top Header */}
      {!hideHeader && <Header extraDropdownItems={headerExtraItems} />}

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 flex flex-col justify-center">
        
        {/* Dynamic Revamped Card */}
        <div className="w-full bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Panel: Profile Summary Card */}
          <div className="md:w-1/3 bg-gradient-to-b from-zinc-50 to-white p-6 sm:p-8 border-b md:border-b-0 md:border-r border-zinc-200/80 flex flex-col items-center justify-between text-center relative overflow-hidden group gap-6 md:gap-0">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-red-500/5 rounded-full blur-xl transition-all"></div>
            
            <div className="w-full flex flex-col items-center mt-4 z-10">
              
              {/* Profile Avatar */}
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-sm mb-5 bg-gradient-to-tr from-red-650 to-red-550 text-white font-black text-3xl flex items-center justify-center transition duration-300 hover:scale-105">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "A"}
              </div>

              <h2 className="text-xl font-black text-zinc-900 mb-1 uppercase tracking-tight">{profile.name}</h2>
              <p className="text-xs font-semibold text-zinc-400 mb-5 tracking-wide">{profile.email}</p>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {profile.isSuperAdmin && (
                  <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-750 bg-red-50 border border-red-100 rounded-full">
                    Super Admin
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                  profile.isActive 
                    ? "text-green-700 bg-green-50 border-green-100" 
                    : "text-zinc-500 bg-zinc-55 border-zinc-200"
                }`}>
                  {profile.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Joining Date */}
            <div className="w-full text-zinc-400 text-[10px] uppercase font-bold tracking-widest mt-4 md:mt-8 border-t border-zinc-150 pt-4 z-10">
              Joined {formatDate(profile.createdAt).split(" at ")[0]}
            </div>
          </div>

          {/* Right Panel: Detail Fields */}
          <div className="flex-1 p-6 sm:p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Profile Details</h3>
                  <p className="text-xs text-zinc-400 font-light mt-0.5">Manage administrative contact endpoints and password configurations.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-sans">Full Name</label>
                  <div className="text-sm font-semibold text-zinc-800 bg-zinc-50 border border-zinc-200/60 rounded-xl px-4 py-2.5 font-sans">
                    {profile.name || "—"}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-sans">Email Address</label>
                  <div className="text-sm font-semibold text-zinc-800 bg-zinc-50 border border-zinc-200/60 rounded-xl px-4 py-2.5 font-sans select-all">
                    {profile.email}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-sans">Freight Team Contact Email</label>
                  <div className="text-sm font-semibold text-zinc-800 bg-zinc-50 border border-zinc-200/60 rounded-xl px-4 py-2.5 flex items-center justify-between font-sans">
                    <span>{profile.freightTeamEmail || "No separate freight email configured"}</span>
                    {profile.freightTeamEmail && <span className="w-1.5 h-1.5 rounded-full bg-red-650"></span>}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-sans">Created On</label>
                  <div className="text-xs font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200/60 rounded-xl px-4 py-2.5 font-sans">
                    {formatDate(profile.createdAt)}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-sans">Last Updated</label>
                  <div className="text-xs font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200/60 rounded-xl px-4 py-2.5 font-sans">
                    {formatDate(profile.updatedAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setEditFormData({ name: profile?.name || "" });
                  setEditErrors({});
                  setEditApiError("");
                  setEditApiSuccess("");
                  setShowEditProfile(true);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer text-center"
              >
                Edit Info
              </button>
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-150 hover:bg-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer border border-zinc-200 text-center"
              >
                Change Password
              </button>
              <button
                onClick={logout}
                className="w-full sm:w-auto sm:ml-auto px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer text-center"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Change Password Dialog Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-md p-6 sm:p-8 relative my-8">
            <button
              onClick={() => {
                setShowChangePassword(false);
                setPwdFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
                setPwdErrors({});
                setPwdApiError("");
                setPwdApiSuccess("");
              }}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-zinc-900 mb-1 uppercase tracking-tight">Change Password</h3>
            <p className="text-xs text-zinc-400 mb-6">Update your admin credentials to secure your portal access.</p>

            <form onSubmit={handlePwdSubmit} className="space-y-4">
              {pwdApiError && (
                <div className="p-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-semibold">{pwdApiError}</span>
                </div>
              )}

              {pwdApiSuccess && (
                <div className="p-4 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">{pwdApiSuccess}</span>
                </div>
              )}

              <Input
                label="Current Password"
                name="oldPassword"
                type="password"
                placeholder="Enter current password"
                value={pwdFormData.oldPassword}
                onChange={(e) => handleInputChange(e, setPwdFormData, setPwdErrors, () => {
                  setPwdApiError("");
                  setPwdApiSuccess("");
                })}
                error={pwdErrors.oldPassword}
                disabled={pwdSubmitting}
                required
              />

              <Input
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="Minimum 4 characters"
                value={pwdFormData.newPassword}
                onChange={(e) => handleInputChange(e, setPwdFormData, setPwdErrors, () => {
                  setPwdApiError("");
                  setPwdApiSuccess("");
                })}
                error={pwdErrors.newPassword}
                disabled={pwdSubmitting}
                required
              />

              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={pwdFormData.confirmPassword}
                onChange={(e) => handleInputChange(e, setPwdFormData, setPwdErrors, () => {
                  setPwdApiError("");
                  setPwdApiSuccess("");
                })}
                error={pwdErrors.confirmPassword}
                disabled={pwdSubmitting}
                required
              />

              <div className="pt-4 flex gap-3">
                <Button 
                  type="submit" 
                  isLoading={pwdSubmitting}
                >
                  Change Password
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPwdFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
                    setPwdErrors({});
                    setPwdApiError("");
                    setPwdApiSuccess("");
                  }}
                  disabled={pwdSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Dialog Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-md p-6 sm:p-8 relative my-8">
            <button
              onClick={() => {
                setShowEditProfile(false);
                setEditErrors({});
                setEditApiError("");
                setEditApiSuccess("");
              }}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-zinc-900 mb-1 uppercase tracking-tight font-sans">Edit Profile</h3>
            <p className="text-xs text-zinc-400 mb-6 font-sans">Update your administrator username details.</p>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              {editApiError && (
                <div className="p-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-semibold">{editApiError}</span>
                </div>
              )}

              {editApiSuccess && (
                <div className="p-4 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">{editApiSuccess}</span>
                </div>
              )}

              <Input
                label="Full Name"
                name="name"
                type="text"
                placeholder="Enter full name"
                value={editFormData.name}
                onChange={(e) => handleInputChange(e, setEditFormData, setEditErrors, () => {
                  setEditApiError("");
                  setEditApiSuccess("");
                })}
                error={editErrors.name}
                disabled={editSubmitting}
                required
              />

              <div className="pt-2 flex gap-3">
                <Button 
                  type="submit" 
                  isLoading={editSubmitting}
                >
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowEditProfile(false);
                    setEditErrors({});
                    setEditApiError("");
                    setEditApiSuccess("");
                  }}
                  disabled={editSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
