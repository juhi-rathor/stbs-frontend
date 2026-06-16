"use client";

import { useState, useEffect } from "react";
import useAxios from "../hooks/useAxios";

export default function BatchModal({ isOpen, onClose, product, onSuccess }) {
  const { request: axiosRequest } = useAxios();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    receivedPalletQty: "",
    purchasePrice: "",
    containerNo: "",
    shippingCharges: "",
    exciseDuty: "",
    vatRate: ""
  });

  // Reset form data on open/close
  useEffect(() => {
    if (isOpen) {
      setFormData({
        receivedPalletQty: "",
        purchasePrice: "",
        containerNo: product?.containerNo || "",
        shippingCharges: "",
        exciseDuty: "",
        vatRate: ""
      });
      setError("");
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // Validate inputs
      const qty = Number(formData.receivedPalletQty);
      const price = Number(formData.purchasePrice);

      if (isNaN(qty) || qty < 1) {
        throw new Error("Received Pallet Qty must be a number greater than or equal to 1");
      }
      if (isNaN(price) || price < 0) {
        throw new Error("Purchase Price must be a positive number");
      }

      const payload = {
        productId: product._id,
        productCode: product.productCode || undefined,
        containerNo: formData.containerNo.trim() || undefined,
        receivedQty: qty,
        purchasePrice: price,
        shippingCharges: formData.shippingCharges ? Number(formData.shippingCharges) : 0,
        exciseDuty: formData.exciseDuty ? Number(formData.exciseDuty) : 0,
        vatRate: formData.vatRate ? Number(formData.vatRate) : 0
      };

      const res = await axiosRequest({
        url: "/admin/add-product-batch",
        method: "POST",
        data: payload
      });

      if (res && res.success) {
        onSuccess();
      } else {
        throw new Error(res?.message || "Failed to add batch");
      }
    } catch (err) {
      console.error("Add batch error:", err);
      setError(err.message || "Failed to add batch. Please check the fields.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform scale-100 transition-all p-6 sm:p-8 relative">
        
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
          Add Stock Batch
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Add a new batch for <span className="font-semibold text-zinc-800 font-sans">{product?.productName} ({product?.productCode})</span>.
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

          {/* Section 1: Required Batch Info */}
          <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Required Batch Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Received Pallet Qty *</label>
                <input
                  name="receivedPalletQty"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.receivedPalletQty}
                  onChange={handleInputChange}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Purchase Price (£) *</label>
                <input
                  name="purchasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={handleInputChange}
                  placeholder="e.g. 250"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  required
                  disabled={submitting}
                />
              </div>

            </div>
          </div>

          {/* Section 2: Optional Batch Info */}
          <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Optional Batch Charges & Metadata</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Container Number</label>
                <input
                  name="containerNo"
                  type="text"
                  value={formData.containerNo}
                  onChange={handleInputChange}
                  placeholder="e.g. CO98765"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Shipping Charges (£)</label>
                <input
                  name="shippingCharges"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.shippingCharges}
                  onChange={handleInputChange}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Excise Duty (£)</label>
                <input
                  name="exciseDuty"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.exciseDuty}
                  onChange={handleInputChange}
                  placeholder="e.g. 20"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">VAT Rate (%)</label>
                <input
                  name="vatRate"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.vatRate}
                  onChange={handleInputChange}
                  placeholder="e.g. 20"
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                  disabled={submitting}
                />
              </div>

            </div>
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
              {submitting ? "Adding..." : "Add Batch"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
