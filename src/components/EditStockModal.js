"use client";

import { useState, useEffect } from "react";
import useAxios from "../hooks/useAxios";

export default function EditStockModal({ isOpen, onClose, stockRecord, onSuccess }) {
  const { request: axiosRequest } = useAxios();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    goodsIn: "",
    reference: ""
  });

  // Load stock record details when the modal opens
  useEffect(() => {
    if (isOpen && stockRecord) {
      setFormData({
        goodsIn: stockRecord.goodsIn || "",
        reference: stockRecord.reference || ""
      });
      setError("");
    }
  }, [isOpen, stockRecord]);

  if (!isOpen || !stockRecord) return null;

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
      const qty = Number(formData.goodsIn);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Quantity must be a positive number greater than 0");
      }

      const payload = {
        stockId: stockRecord._id,
        goodsIn: qty,
        reference: formData.reference.trim() || undefined
      };

      const res = await axiosRequest({
        url: "/admin/update-stock",
        method: "PATCH",
        data: payload
      });

      if (res && res.success) {
        onSuccess();
      } else {
        throw new Error(res?.message || "Failed to update stock");
      }
    } catch (err) {
      console.error("Stock update error:", err);
      setError(err.message || "Failed to update stock record. Please check the fields.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform scale-100 transition-all p-6 sm:p-8 relative">
        
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
          Edit Stock Entry
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Update the manual stock-in quantity or reference.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Product (Read-only) */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
              Product
            </label>
            <div className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 font-semibold flex items-center justify-between">
              <span>{stockRecord.productId?.productName || "Unknown Product"}</span>
              <span className="text-[10px] font-mono font-bold bg-zinc-200 text-zinc-650 px-2 py-0.5 rounded uppercase">
                {stockRecord.productCode || "N/A"}
              </span>
            </div>
          </div>

          {/* Batch Number (Read-only) */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
              Batch No
            </label>
            <div className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 font-mono font-bold">
              {stockRecord.batchNo || "N/A"}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
              Quantity (Pallets) *
            </label>
            <input
              name="goodsIn"
              type="number"
              min="1"
              step="1"
              value={formData.goodsIn}
              onChange={handleInputChange}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
              required
              disabled={submitting}
            />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
              Reference / Reason
            </label>
            <input
              name="reference"
              type="text"
              value={formData.reference}
              onChange={handleInputChange}
              placeholder="e.g. Adjusted manual stock-in qty"
              className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
              disabled={submitting}
            />
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
              {submitting ? "Updating..." : "Save Changes"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
