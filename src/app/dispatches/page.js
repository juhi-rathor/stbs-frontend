"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import useAxios from "../../hooks/useAxios";
import { toast } from "react-hot-toast";
import { confirmToast } from "../../lib/confirmToast";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusStyle(status) {
  switch (status) {
    case "requested":
      return "bg-sky-50 border-sky-200 text-sky-700";
    case "approved":
      return "bg-amber-50 border-amber-200 text-amber-700";
    case "dispatched":
      return "bg-violet-50 border-violet-200 text-violet-700";
    case "delivered":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "cancelled":
      return "bg-red-50 border-red-200 text-red-700";
    default:
      return "bg-zinc-50 border-zinc-200 text-zinc-600";
  }
}

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────────────────────
function Spinner({ size = "md" }) {
  const s = size === "sm" ? "w-4 h-4 border-2" : "w-8 h-8 border-4";
  return (
    <div
      className={`${s} border-red-600 border-t-transparent rounded-full animate-spin`}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const colors =
    type === "error"
      ? "bg-red-600 text-white"
      : "bg-emerald-600 text-white";

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold max-w-sm animate-slide-up ${colors}`}
    >
      {type === "error" ? (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Dispatch Modal
// ─────────────────────────────────────────────────────────────────────────────
function CreateDispatchModal({ isOpen, onClose, onSuccess }) {
  const { request } = useAxios();
  const [form, setForm] = useState({ salesOrderId: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setForm({ salesOrderId: "", notes: "" });
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.salesOrderId.trim()) {
      setError("Sales Order ID is required.");
      return;
    }
    setLoading(true);
    try {
      await request({
        url: "/admin/create-dispatch",
        method: "POST",
        data: {
          salesOrderId: form.salesOrderId.trim(),
          notes: form.notes.trim(),
        },
      });
      onSuccess("Dispatch created successfully!");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create dispatch.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
              Create Dispatch
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Initiate dispatch for a confirmed sales order.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
              Sales Order ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.salesOrderId}
              onChange={(e) => setForm((f) => ({ ...f, salesOrderId: e.target.value }))}
              placeholder="e.g. 693911fee4ae09f83671b1de"
              className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-650/20 font-mono placeholder-zinc-300 bg-zinc-50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Handle with care. Deliver before 5 PM."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-650/20 placeholder-zinc-300 bg-zinc-50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition disabled:opacity-60 cursor-pointer flex items-center gap-2"
            >
              {loading && <Spinner size="sm" />}
              Create Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Dispatch Modal
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmDispatchModal({ isOpen, dispatch, onClose, onSuccess }) {
  const { request } = useAxios();
  const [form, setForm] = useState({ vehicleNo: "", driverName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setForm({ vehicleNo: "", driverName: "" });
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await request({
        url: "/admin/confirm-dispatch",
        method: "POST",
        data: {
          dispatchId: dispatch?._id,
          vehicleNo: form.vehicleNo.trim(),
          driverName: form.driverName.trim(),
        },
      });
      onSuccess("Dispatch confirmed successfully!");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to confirm dispatch.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !dispatch) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
              Confirm Dispatch
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {dispatch.dispatchNumber} — Assign vehicle & driver details.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
              Vehicle Number
            </label>
            <input
              type="text"
              value={form.vehicleNo}
              onChange={(e) => setForm((f) => ({ ...f, vehicleNo: e.target.value }))}
              placeholder="e.g. MH12AB4567"
              className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-650/20 placeholder-zinc-300 bg-zinc-50 font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
              Driver Name
            </label>
            <input
              type="text"
              value={form.driverName}
              onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
              placeholder="e.g. Rakesh Kumar"
              className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-650/20 placeholder-zinc-300 bg-zinc-50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition disabled:opacity-60 cursor-pointer flex items-center gap-2">
              {loading && <Spinner size="sm" />}
              Confirm & Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Dispatch Modal
// ─────────────────────────────────────────────────────────────────────────────
function CancelDispatchModal({ isOpen, dispatch, onClose, onSuccess }) {
  const { request } = useAxios();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Cancel reason is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await request({
        url: `/admin/cancel-dispatch?dispatchId=${dispatch?._id}&reason=${encodeURIComponent(reason.trim())}`,
        method: "GET",
      });
      onSuccess("Dispatch cancelled successfully.");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to cancel dispatch.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !dispatch) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-black text-red-700 uppercase tracking-tight">
              Cancel Dispatch
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {dispatch.dispatchNumber} — This action may restore stock.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
            ⚠️ Cancelling a dispatched order will restore the inventory stock levels.
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason for cancellation..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 placeholder-zinc-300 bg-zinc-50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition cursor-pointer">
              Keep
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition disabled:opacity-60 cursor-pointer flex items-center gap-2">
              {loading && <Spinner size="sm" />}
              Cancel Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch Details Modal
// ─────────────────────────────────────────────────────────────────────────────
function DispatchDetailsModal({ isOpen, dispatchId, onClose }) {
  const { request } = useAxios();
  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && dispatchId) {
      setError("");
      setLoading(true);
      request({ url: `/admin/get-dispatch-by-id?dispatchId=${dispatchId}`, method: "GET" })
        .then((res) => setDispatch(res?.data))
        .catch((err) => setError(err.message || "Failed to load dispatch."))
        .finally(() => setLoading(false));
    } else {
      setDispatch(null);
    }
  }, [isOpen, dispatchId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-5 border-b border-zinc-100 z-10">
          <div>
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
              Dispatch Details
            </h2>
            {dispatch && (
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                {dispatch.dispatchNumber}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner />
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Loading dispatch data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl font-medium">
              {error}
            </div>
          ) : dispatch ? (
            <div className="space-y-5">

              {/* Status Badge + Dates */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle(dispatch.status)}`}>
                  {dispatch.status}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Created: {fmt(dispatch.createdAt)}
                </span>
              </div>

              {/* Customer + Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50/60 border border-zinc-100 rounded-xl p-4 text-xs">
                <div className="space-y-2">
                  <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Customer</h4>
                  <p className="font-bold text-zinc-900">{dispatch.customer?.businessName || "—"}</p>
                  <p className="text-zinc-500 font-mono">{dispatch.customer?.customerCode || "—"}</p>
                  <p className="text-zinc-500">{dispatch.customer?.email || "—"}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Order Reference</h4>
                  <p className="font-bold text-zinc-900 font-mono">{dispatch.salesOrder?.salesOrderNumber || "—"}</p>
                  <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Delivery Method</h4>
                  <p className="font-semibold text-zinc-700 uppercase">{dispatch.deliveryMethod || "—"}</p>
                </div>
              </div>

              {/* Vehicle + Driver */}
              {(dispatch.vehicleNo || dispatch.driverName) && (
                <div className="grid grid-cols-2 gap-4 bg-violet-50/60 border border-violet-100 rounded-xl p-4 text-xs">
                  <div>
                    <h4 className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-1">Vehicle No.</h4>
                    <p className="font-bold text-zinc-900 font-mono uppercase">{dispatch.vehicleNo || "—"}</p>
                  </div>
                  <div>
                    <h4 className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-1">Driver</h4>
                    <p className="font-bold text-zinc-900">{dispatch.driverName || "—"}</p>
                  </div>
                </div>
              )}

              {/* Dispatch Date */}
              {dispatch.dispatchDate && (
                <div className="text-xs bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                  <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Dispatch Date</h4>
                  <p className="font-semibold text-zinc-700">{fmt(dispatch.dispatchDate)}</p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Dispatched Items</h4>
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        <th className="py-2.5 px-4">Product</th>
                        <th className="py-2.5 px-4 text-center">Type</th>
                        <th className="py-2.5 px-4 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {dispatch.items?.map((item, i) => (
                        <tr key={i} className="hover:bg-zinc-50/40">
                          <td className="py-2.5 px-4 font-semibold text-zinc-900">
                            {item.product?.productName || "Unknown"}
                            <span className="block text-[9px] text-zinc-400 font-bold uppercase mt-0.5">
                              {item.product?.productCode || "—"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center text-zinc-500 uppercase font-bold">{item.qtyType}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {dispatch.notes && (
                <div className="text-xs bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                  <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Notes</h4>
                  <p className="text-zinc-600 italic leading-relaxed">{dispatch.notes}</p>
                </div>
              )}

              {/* Cancel Reason */}
              {dispatch.cancelReason && (
                <div className="text-xs bg-red-50 border border-red-100 rounded-xl p-4">
                  <h4 className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">Cancellation Reason</h4>
                  <p className="text-red-700 font-medium">{dispatch.cancelReason}</p>
                  {dispatch.cancelledAt && (
                    <p className="text-red-400 text-[9px] mt-1 uppercase font-bold">Cancelled on: {fmt(dispatch.cancelledAt)}</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DispatchesPage({ hideHeader = false }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { request } = useAxios();

  // List state
  const [dispatches, setDispatches] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);

  // Inline action loading states (per dispatch id)
  const [actionLoading, setActionLoading] = useState({});

  // Toast
  const showToast = (message, type = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  // Redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  // ── Fetch Dispatches ──────────────────────────────────────────────────────
  const fetchDispatches = useCallback(
    async (q = searchQuery, status = statusFilter, p = page) => {
      try {
        setListLoading(true);
        const params = new URLSearchParams({ page: p, limit: 10, search: q });
        if (status !== "all") params.set("status", status);

        const res = await request({
          url: `/admin/get-all-dispatches?${params.toString()}`,
          method: "GET",
        });

        if (res?.success) {
          setDispatches(res.data?.dispatches || []);
          setTotalPages(res.data?.pagination?.totalPages || 1);
          setTotalItems(res.data?.pagination?.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch dispatches:", err);
      } finally {
        setListLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    if (isAuthenticated && !isLoading) fetchDispatches(searchQuery, statusFilter, page);
  }, [isAuthenticated, isLoading, page, statusFilter]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => {
      if (page === 1) {
        fetchDispatches(val, statusFilter, 1);
      } else {
        setPage(1);
      }
    }, 500);
    setSearchTimeout(t);
  };

  // ── Mark Delivered ────────────────────────────────────────────────────────
  const handleMarkDelivered = (d) => {
    confirmToast(
      `Mark "${d.dispatchNumber}" as delivered?`,
      async () => {
        setActionLoading((prev) => ({ ...prev, [d._id]: "delivering" }));
        try {
          await request({ url: `/admin/mark-delivered?dispatchId=${d._id}`, method: "GET" });
          showToast("Marked as delivered!");
          fetchDispatches(searchQuery, statusFilter, page);
        } catch (err) {
          showToast(err.message || "Failed to mark as delivered.", "error");
        } finally {
          setActionLoading((prev) => ({ ...prev, [d._id]: null }));
        }
      }
    );
  };

  // ── Status color tabs ──────────────────────────────────────────────────────
  const statusTabs = ["all", "requested", "dispatched", "delivered", "cancelled"];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-zinc-400 font-medium tracking-wide">Authorizing user access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col font-sans select-none">
      {!hideHeader && <Header />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Dispatches</h1>
            <p className="text-zinc-500 text-xs sm:text-sm font-light mt-1">
              Manage outbound shipments, confirmations, and delivery tracking.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="self-start px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
          >
            + Create Dispatch
          </button>
        </div>

        {/* Summary Cards */}
        {/* Sleek Metrics Stats Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row justify-between gap-6 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
          <div className="flex-1 flex items-center gap-4 sm:pl-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Dispatches</span>
              <span className="text-2xl font-black text-zinc-900">{totalItems}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1.6 11.2A2 2 0 008.6 21h6.8a2 2 0 001.993-1.8L19 8" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Dispatched</span>
              <span className="text-2xl font-black text-zinc-900">{dispatches.filter((d) => d.status === "dispatched").length}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Delivered</span>
              <span className="text-2xl font-black text-zinc-900">{dispatches.filter((d) => d.status === "delivered").length}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Cancelled</span>
              <span className="text-2xl font-black text-zinc-900">{dispatches.filter((d) => d.status === "cancelled").length}</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          {/* Status tabs */}
          <div className="flex bg-zinc-200/60 p-1 rounded-xl w-fit flex-wrap gap-1">
            {statusTabs.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                  fetchDispatches(searchQuery, s, 1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 bg-transparent border-0"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search dispatch no, vehicle, driver..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-650/10 transition placeholder-zinc-400 font-medium shadow-inner"
            />
            <svg className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6">
          {listLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner />
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Fetching dispatch records...</p>
            </div>
          ) : dispatches.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1.6 11.2A2 2 0 008.6 21h6.8a2 2 0 001.993-1.8L19 8" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-1">No Dispatches Found</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Create a new dispatch or try adjusting your search filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8faff]/80 border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                    <th className="py-3.5 px-6">Dispatch No.</th>
                    <th className="py-3.5 px-6">Customer</th>
                    <th className="py-3.5 px-6">Order No.</th>
                    <th className="py-3.5 px-6">Dispatch Date</th>
                    <th className="py-3.5 px-6">Vehicle / Driver</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-750">
                  {dispatches.map((d) => {
                    const isActioning = actionLoading[d._id];
                    return (
                      <tr key={d._id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-zinc-900">{d.dispatchNumber}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-900">{d.customer?.businessName || "—"}</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{d.customer?.customerCode || ""}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-zinc-600">{d.salesOrder?.salesOrderNumber || "—"}</td>
                        <td className="py-4 px-6 text-zinc-500">{fmt(d.dispatchDate || d.createdAt)}</td>
                        <td className="py-4 px-6">
                          {d.vehicleNo || d.driverName ? (
                            <div className="flex flex-col">
                              <span className="font-mono text-zinc-900 font-bold uppercase">{d.vehicleNo || "—"}</span>
                              <span className="text-[9px] text-zinc-400">{d.driverName || ""}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-300 italic text-[10px]">Not assigned</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusStyle(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View */}
                            <button
                              onClick={() => setViewTarget(d._id)}
                              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer"
                            >
                              View
                            </button>

                            {/* Confirm (only for "requested") */}
                            {d.status === "requested" && (
                              <button
                                onClick={() => setConfirmTarget(d)}
                                disabled={!!isActioning}
                                className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            )}

                            {/* Mark Delivered (only for "dispatched") */}
                            {d.status === "dispatched" && (
                              <button
                                onClick={() => handleMarkDelivered(d)}
                                disabled={!!isActioning}
                                className="px-2.5 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                {isActioning === "delivering" ? <Spinner size="sm" /> : null}
                                Delivered
                              </button>
                            )}

                            {/* Cancel (for requested or dispatched) */}
                            {["requested", "dispatched"].includes(d.status) && (
                              <button
                                onClick={() => setCancelTarget(d)}
                                disabled={!!isActioning}
                                className="px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2 text-xs">
            <span className="text-zinc-500 font-medium">
              Showing page <strong className="text-zinc-800">{page}</strong> of <strong className="text-zinc-800">{totalPages}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <CreateDispatchModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchDispatches(searchQuery, statusFilter, page);
        }}
      />

      <ConfirmDispatchModal
        isOpen={!!confirmTarget}
        dispatch={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchDispatches(searchQuery, statusFilter, page);
        }}
      />

      <CancelDispatchModal
        isOpen={!!cancelTarget}
        dispatch={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchDispatches(searchQuery, statusFilter, page);
        }}
      />

      <DispatchDetailsModal
        isOpen={!!viewTarget}
        dispatchId={viewTarget}
        onClose={() => setViewTarget(null)}
      />



      {/* Global animation style */}
      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.15s ease-out; }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
