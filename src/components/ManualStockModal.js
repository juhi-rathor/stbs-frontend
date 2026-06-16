"use client";

import { useState, useEffect } from "react";
import useAxios from "../hooks/useAxios";

export default function ManualStockModal({ isOpen, onClose, product, onSuccess }) {
  const { request: axiosRequest } = useAxios();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [productsList, setProductsList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [formData, setFormData] = useState({
    qty: "",
    reference: ""
  });

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await axiosRequest({
        url: "/admin/get-all-product?limit=150",
        method: "GET"
      });
      if (res && res.success) {
        setProductsList(res.data?.products || []);
      }
    } catch (err) {
      console.error("Failed to load products for selection:", err);
      setError("Failed to load products list.");
    } finally {
      setLoadingProducts(false);
    }
  };

  // Reset form and state on open/close
  useEffect(() => {
    if (isOpen) {
      setFormData({
        qty: "",
        reference: ""
      });
      setError("");
      setSearchQuery("");
      
      if (product) {
        setSelectedProduct(product);
      } else {
        setSelectedProduct(null);
        fetchProducts();
      }
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
      const qty = Number(formData.qty);
      if (isNaN(qty) || qty < 1) {
        throw new Error("Quantity must be a number greater than or equal to 1");
      }

      const activeProduct = product || selectedProduct;
      if (!activeProduct) {
        throw new Error("Please select a product");
      }

      const payload = {
        productId: activeProduct._id,
        qty: qty,
        reference: formData.reference.trim() || undefined
      };

      const res = await axiosRequest({
        url: "/admin/add-stock-manually",
        method: "POST",
        data: payload
      });

      if (res && res.success) {
        onSuccess();
      } else {
        throw new Error(res?.message || "Failed to add stock");
      }
    } catch (err) {
      console.error("Manual stock addition error:", err);
      setError(err.message || "Failed to add stock. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products based on search query
  const filteredProducts = productsList.filter(
    (p) =>
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.productCode && p.productCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          Add Stock Manually
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Make manual stock adjustment for inventory leveling.
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

          {/* Product Selection */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
              Product *
            </label>
            
            {product ? (
              // Pre-selected Product Display
              <div className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 font-semibold flex items-center justify-between">
                <span>{product.productName}</span>
                <span className="text-[10px] font-mono font-bold bg-zinc-200 text-zinc-650 px-2 py-0.5 rounded uppercase">
                  {product.productCode}
                </span>
              </div>
            ) : (
              // Searchable Selector Dropdown
              <div className="relative">
                {selectedProduct ? (
                  <div className="w-full px-3 py-2 bg-zinc-50 border border-blue-200 rounded-lg text-sm text-zinc-800 font-semibold flex items-center justify-between">
                    <div>
                      <span className="mr-2 text-zinc-500 font-normal text-xs font-mono bg-zinc-200 px-1.5 py-0.5 rounded">
                        {selectedProduct.productCode}
                      </span>
                      <span>{selectedProduct.productName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="text-zinc-400 hover:text-red-500 text-xs font-bold border-0 bg-transparent cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Search and select product..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                      disabled={loadingProducts}
                    />
                    
                    {searchQuery && (
                      <div className="absolute w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10 text-xs">
                        {loadingProducts ? (
                          <div className="p-3 text-center text-zinc-500">Loading products...</div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="p-3 text-center text-zinc-500">No products found</div>
                        ) : (
                          filteredProducts.map((p) => (
                            <div
                              key={p._id}
                              onClick={() => {
                                setSelectedProduct(p);
                                setSearchQuery("");
                              }}
                              className="px-3 py-2 hover:bg-zinc-50 cursor-pointer flex items-center justify-between border-b border-zinc-100 last:border-0"
                            >
                              <span className="font-semibold text-zinc-800">{p.productName}</span>
                              <span className="font-mono text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-bold uppercase">
                                {p.productCode}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
              Quantity (Pallets) *
            </label>
            <input
              name="qty"
              type="number"
              min="1"
              step="1"
              value={formData.qty}
              onChange={handleInputChange}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
              required
              disabled={submitting}
            />
          </div>

          {/* Reference / Reason */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
              Reference / Reason
            </label>
            <input
              name="reference"
              type="text"
              value={formData.reference}
              onChange={handleInputChange}
              placeholder="e.g. Manual inventory leveling, stock-in adjustments"
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
              disabled={submitting || (!product && !selectedProduct)}
            >
              {submitting ? "Adding..." : "Add Stock"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
