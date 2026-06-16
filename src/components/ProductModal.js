"use client";

import { useState, useEffect } from "react";
import useAxios from "../hooks/useAxios";

export default function ProductModal({ isOpen, onClose, onSuccess }) {
  const { request: axiosRequest } = useAxios();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [formData, setFormData] = useState({
    productName: "",
    productCode: "",
    description: "",
    unit: "SHEET",
    size: "",
    productImage: [],
    containerNo: ""
  });
  
  // Reset form data on open/close
  useEffect(() => {
    if (isOpen) {
      setFormData({
        productName: "",
        productCode: "",
        description: "",
        unit: "SHEET",
        size: "",
        productImage: [],
        containerNo: ""
      });
      setImageUrlInput("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    const url = imageUrlInput.trim();
    if (!url) return;

    // Basic URL structure validation
    try {
      new URL(url);
    } catch (_) {
      setError("Please enter a valid URL (e.g. http://example.com/image.jpg)");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      productImage: [...prev.productImage, url]
    }));
    setImageUrlInput("");
    setError("");
  };

  const handleRemoveImageUrl = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      productImage: prev.productImage.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        ...formData,
        // Trim standard string inputs
        productName: formData.productName.trim(),
        productCode: formData.productCode.trim() || undefined, // Send undefined so backend generates it if empty
        description: formData.description.trim(),
        unit: formData.unit.trim(),
        size: formData.size.trim(),
        containerNo: formData.containerNo.trim()
      };

      const res = await axiosRequest({
        url: "/admin/create-product",
        method: "POST",
        data: payload
      });

      if (res && res.success) {
        onSuccess();
      } else {
        throw new Error(res?.message || "Failed to create product");
      }
    } catch (err) {
      console.error("Create product error:", err);
      setError(err.message || "Failed to create product. Please check the fields.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform scale-100 transition-all p-6 sm:p-8 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-xl font-bold text-zinc-900 mb-1 uppercase tracking-tight">
          Create Product
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Register a new product in the warehouse catalog with specifications, image URLs, and container details.
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

          {/* Section 1: Basic Information */}
          <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Basic Product Info</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Product Name *</label>
                <input
                  name="productName"
                  type="text"
                  value={formData.productName}
                  onChange={handleInputChange}
                  placeholder="e.g. tiles 8mm"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Product SKU / Code (Optional)</label>
                <input
                  name="productCode"
                  type="text"
                  value={formData.productCode}
                  onChange={handleInputChange}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Unit *</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                >
                  <option value="SHEET">SHEET</option>
                  <option value="PALLET">PALLET</option>
                  <option value="PACK">PACK</option>
                  <option value="BOX">BOX</option>
                  <option value="UNIT">UNIT</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Size (Dimensions)</label>
                <input
                  name="size"
                  type="text"
                  value={formData.size}
                  onChange={handleInputChange}
                  placeholder="e.g. 600mm × 1200mm"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g. High quality tiles board..."
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition resize-none"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Container Number (Optional)</label>
                <input
                  name="containerNo"
                  type="text"
                  value={formData.containerNo}
                  onChange={handleInputChange}
                  placeholder="e.g. CO12345"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

            </div>
          </div>

          {/* Section 2: Image URLs Management */}
          <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Product Images (URLs)</h4>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="e.g. https://mybucket.com/image1.jpg"
                className="flex-1 px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer"
                disabled={submitting}
              >
                Add URL
              </button>
            </div>

            {formData.productImage.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Added Image URLs:</p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {formData.productImage.map((url, index) => (
                    <div key={index} className="flex items-center justify-between bg-white border border-zinc-200 px-3 py-2 rounded-lg text-xs">
                      <span className="truncate text-zinc-700 font-mono font-medium max-w-[90%]">{url}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImageUrl(index)}
                        className="text-red-500 hover:text-red-700 font-bold uppercase text-[10px] tracking-wider cursor-pointer"
                        disabled={submitting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-zinc-400 text-xs mt-3 italic font-light">No image URLs added yet.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition cursor-pointer"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Save Product"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
