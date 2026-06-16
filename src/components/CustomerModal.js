"use client";

import { useState, useEffect } from "react";
import useAxios from "../hooks/useAxios";

export default function CustomerModal({ isOpen, onClose, customer, onSuccess }) {
  const isEditMode = !!customer;
  const { request: axiosRequest } = useAxios();

  const [sameAddress, setSameAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", phone: "" });
  const [formData, setFormData] = useState({
    businessName: "",
    name: "",
    phone: "",
    email: "",
    customerType: "CC",
    creditLimit: "",
    category: "trade",
    deliveryAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postcode: ""
    },
    correspondenceAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postcode: ""
    }
  });

  // Sync address fields if sameAddress is true
  useEffect(() => {
    if (sameAddress) {
      setFormData((prev) => ({
        ...prev,
        deliveryAddress: { ...prev.correspondenceAddress }
      }));
    }
  }, [sameAddress]);

  // Reset/populate form data on open/load
  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setFormData({
          businessName: customer.businessName || "",
          name: customer.name || "",
          phone: customer.primaryPhone || customer.phone || "",
          email: customer.email || "",
          customerType: customer.customerType || "CC",
          creditLimit: customer.creditLimit !== undefined ? String(customer.creditLimit) : "",
          category: customer.category || "trade",
          deliveryAddress: {
            line1: customer.deliveryAddress?.line1 || "",
            line2: customer.deliveryAddress?.line2 || "",
            city: customer.deliveryAddress?.city || "",
            state: customer.deliveryAddress?.state || "",
            postcode: customer.deliveryAddress?.postcode || ""
          },
          correspondenceAddress: {
            line1: customer.correspondenceAddress?.line1 || "",
            line2: customer.correspondenceAddress?.line2 || "",
            city: customer.correspondenceAddress?.city || "",
            state: customer.correspondenceAddress?.state || "",
            postcode: customer.correspondenceAddress?.postcode || ""
          }
        });

        const isSame = 
          customer.deliveryAddress?.line1 === customer.correspondenceAddress?.line1 &&
          customer.deliveryAddress?.line2 === customer.correspondenceAddress?.line2 &&
          customer.deliveryAddress?.city === customer.correspondenceAddress?.city &&
          customer.deliveryAddress?.state === customer.correspondenceAddress?.state &&
          customer.deliveryAddress?.postcode === customer.correspondenceAddress?.postcode;
        setSameAddress(isSame);
      } else {
        setFormData({
          businessName: "",
          name: "",
          phone: "",
          email: "",
          customerType: "CC",
          creditLimit: "",
          category: "trade",
          deliveryAddress: { line1: "", line2: "", city: "", state: "", postcode: "" },
          correspondenceAddress: { line1: "", line2: "", city: "", state: "", postcode: "" }
        });
        setSameAddress(false);
      }
      setFieldErrors({ email: "", phone: "" });
      setError("");
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const checkAvailability = async (field, value) => {
    if (!value) return;
    
    // Validate length for phone field first
    if (field === "phone" && value.length !== 10) {
      setFieldErrors(prev => ({ ...prev, phone: "Phone number must be exactly 10 digits" }));
      return;
    }

    if (isEditMode) return;

    try {
      const params = new URLSearchParams();
      if (field === "email") {
        params.append("email", value.trim());
      } else if (field === "phone") {
        params.append("primaryPhone", value.trim());
      }
      
      const res = await axiosRequest({
        url: `/admin/check-customer-availability?${params.toString()}`,
        method: "GET"
      });
      if (res && res.success) {
        if (field === "email" && res.data.emailExists) {
          setFieldErrors(prev => ({ ...prev, email: "This email is already registered" }));
        } else if (field === "phone" && res.data.primaryPhoneExists) {
          setFieldErrors(prev => ({ ...prev, phone: "This number is already registered" }));
        } else {
          setFieldErrors(prev => ({ ...prev, [field]: "" }));
        }
      }
    } catch (err) {
      console.error("Availability check failed:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Only allow digits (0-9) and limit to max 10 digits for the phone field
    if (name === "phone") {
      const cleanValue = value.replace(/[^0-9]/g, "").slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: cleanValue
      }));
    } else if (name === "name") {
      // Only allow alphabets (A-Z, a-z) and spaces
      const cleanValue = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: cleanValue
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleAddressChange = (type, field, value) => {
    setFormData((prev) => {
      const updatedAddress = {
        ...prev[type],
        [field]: value
      };

      const newState = {
        ...prev,
        [type]: updatedAddress
      };

      if (type === "correspondenceAddress" && sameAddress) {
        newState.deliveryAddress = {
          ...newState.deliveryAddress,
          [field]: value
        };
      }

      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // Validate length for phone field first
      if (formData.phone.length !== 10) {
        setFieldErrors(prev => ({ ...prev, phone: "Phone number must be exactly 10 digits" }));
        setError("Phone number must be exactly 10 digits.");
        setSubmitting(false);
        return;
      }

      // Direct prevent if local state has errors
      if (!isEditMode && (fieldErrors.email || fieldErrors.phone)) {
        setError("Please resolve the errors below.");
        setSubmitting(false);
        return;
      }

      // Final check availability before calling create endpoint
      if (!isEditMode) {
        const emailVal = formData.email.trim();
        const phoneVal = formData.phone.trim();
        const checkRes = await axiosRequest({
          url: `/admin/check-customer-availability?email=${encodeURIComponent(emailVal)}&primaryPhone=${encodeURIComponent(phoneVal)}`,
          method: "GET"
        });
        
        if (checkRes && checkRes.success) {
          let hasErrors = false;
          const newFieldErrors = { email: "", phone: "" };
          
          if (checkRes.data.emailExists) {
            newFieldErrors.email = "This email is already registered";
            hasErrors = true;
          }
          if (checkRes.data.primaryPhoneExists) {
            newFieldErrors.phone = "This number is already registered";
            hasErrors = true;
          }
          
          if (hasErrors) {
            setFieldErrors(newFieldErrors);
            setError("Please resolve the marked errors below.");
            setSubmitting(false);
            return;
          }
        }
      }

      const payload = {
        ...formData,
        creditLimit: formData.customerType === "CC" ? (Number(formData.creditLimit) || 0) : 0
      };

      let res;
      if (isEditMode) {
        payload.customerId = customer._id;
        res = await axiosRequest({
          url: "/admin/update-customer",
          method: "PATCH",
          data: payload
        });
      } else {
        res = await axiosRequest({
          url: "/admin/create-customer",
          method: "POST",
          data: payload
        });
      }
      
      if (res && res.success) {
        onSuccess();
      } else {
        throw new Error(res?.message || `Failed to ${isEditMode ? "update" : "create"} customer`);
      }
    } catch (err) {
      console.error(`${isEditMode ? "Update" : "Create"} customer error:`, err);
      setError(err.message || `Failed to ${isEditMode ? "update" : "create"} customer. Please check the fields.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform scale-100 transition-all p-6 sm:p-8 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-xl font-bold text-zinc-900 mb-1 uppercase tracking-tight">
          {isEditMode ? "Update Customer" : "Create Customer"}
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          {isEditMode ? "Modify account details, credit limit, and address records." : "Register a new client account, credit limits, and shipping coordinates."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Step 1: Basic Information */}
          <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Basic Account Info</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Business Name *</label>
                <input
                  name="businessName"
                  type="text"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Contact Name</label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address *</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={(e) => checkAvailability("email", e.target.value)}
                  placeholder="e.g. contact@acme.com"
                  className={`w-full px-3 py-2 text-sm text-zinc-900 bg-white border rounded-lg outline-none transition ${
                    fieldErrors.email ? "border-red-500 focus:border-red-600" : "border-zinc-200 focus:border-blue-600"
                  }`}
                  required
                  disabled={submitting}
                />
                {fieldErrors.email && (
                  <p className="text-red-600 text-[10px] font-bold mt-1.5 uppercase tracking-wider">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Phone Number *</label>
                <input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={(e) => checkAvailability("phone", e.target.value)}
                  placeholder="e.g. 07912345678"
                  className={`w-full px-3 py-2 text-sm text-zinc-900 bg-white border rounded-lg outline-none transition ${
                    fieldErrors.phone ? "border-red-500 focus:border-red-600" : "border-zinc-200 focus:border-blue-600"
                  }`}
                  required
                  disabled={submitting}
                />
                {fieldErrors.phone && (
                  <p className="text-red-600 text-[10px] font-bold mt-1.5 uppercase tracking-wider">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Customer Type *</label>
                <select
                  name="customerType"
                  value={formData.customerType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                >
                  <option value="CC">Credit Account (CC)</option>
                  <option value="PC">Proforma Client (PC)</option>
                </select>
              </div>

              {formData.customerType === "CC" && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Credit Limit (£) *</label>
                  <input
                    name="creditLimit"
                    type="number"
                    value={formData.creditLimit}
                    onChange={handleInputChange}
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                    required
                    disabled={submitting}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                >
                  <option value="trade">Trade</option>
                  <option value="retail">Retail</option>
                </select>
              </div>

            </div>
          </div>

          {/* Step 2: Correspondence & Delivery Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Correspondence Address */}
            <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100 space-y-3">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Correspondence Address</h4>
              
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={formData.correspondenceAddress.line1}
                  onChange={(e) => handleAddressChange("correspondenceAddress", "line1", e.target.value)}
                  placeholder="Street, unit number"
                  className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData.correspondenceAddress.line2}
                  onChange={(e) => handleAddressChange("correspondenceAddress", "line2", e.target.value)}
                  placeholder="Apartment, suite, etc. (optional)"
                  className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={formData.correspondenceAddress.city}
                    onChange={(e) => handleAddressChange("correspondenceAddress", "city", e.target.value)}
                    placeholder="City"
                    className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">State / Province</label>
                  <input
                    type="text"
                    value={formData.correspondenceAddress.state}
                    onChange={(e) => handleAddressChange("correspondenceAddress", "state", e.target.value)}
                    placeholder="State"
                    className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Postcode / Zip</label>
                <input
                  type="text"
                  value={formData.correspondenceAddress.postcode}
                  onChange={(e) => handleAddressChange("correspondenceAddress", "postcode", e.target.value)}
                  placeholder="Postcode"
                  className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Delivery Address</h4>
                <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase cursor-pointer selection:bg-transparent">
                  <input 
                    type="checkbox"
                    checked={sameAddress}
                    onChange={(e) => setSameAddress(e.target.checked)}
                    className="w-3.5 h-3.5 border-zinc-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  Same as Correspondence
                </label>
              </div>

              {!sameAddress ? (
                <>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={formData.deliveryAddress.line1}
                      onChange={(e) => handleAddressChange("deliveryAddress", "line1", e.target.value)}
                      placeholder="Street, warehouse number"
                      className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={formData.deliveryAddress.line2}
                      onChange={(e) => handleAddressChange("deliveryAddress", "line2", e.target.value)}
                      placeholder="Additional info (optional)"
                      className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                      disabled={submitting}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">City</label>
                      <input
                        type="text"
                        value={formData.deliveryAddress.city}
                        onChange={(e) => handleAddressChange("deliveryAddress", "city", e.target.value)}
                        placeholder="City"
                        className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">State / Province</label>
                      <input
                        type="text"
                        value={formData.deliveryAddress.state}
                        onChange={(e) => handleAddressChange("deliveryAddress", "state", e.target.value)}
                        placeholder="State"
                        className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Postcode / Zip</label>
                    <input
                      type="text"
                      value={formData.deliveryAddress.postcode}
                      onChange={(e) => handleAddressChange("deliveryAddress", "postcode", e.target.value)}
                      placeholder="Postcode"
                      className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                      disabled={submitting}
                    />
                  </div>
                </>
              ) : (
                <div className="h-44 flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-lg text-center text-xs text-zinc-400 font-medium">
                  Synced with Correspondence Address
                </div>
              )}

            </div>

          </div>

          {/* Submit Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Customer" : "Save Customer")}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
