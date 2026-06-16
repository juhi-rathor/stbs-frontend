"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import useAxios from "../../hooks/useAxios";
import { toast } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Spinner({ size = "md" }) {
  const s = size === "sm" ? "w-4 h-4 border-2" : "w-8 h-8 border-4";
  return (
    <div className={`${s} border-blue-600 border-t-transparent rounded-full animate-spin`} />
  );
}

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const colors = type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white";
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold max-w-sm animate-slide-up ${colors}`}>
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
// Invoice Details Modal (read-only)
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceDetailsModal({ isOpen, invoice, onClose }) {
  if (!isOpen || !invoice) return null;

  const isPaid = invoice.isPaid;
  const isCC = invoice.invoiceType === "CC";

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-5 border-b border-zinc-100 z-10">
          <div>
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
              Invoice Details
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">{invoice.invoiceNo}</p>
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

        <div className="px-6 py-5 space-y-4 text-xs">
          {/* Type + Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              isCC
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              {isCC ? "VAT Invoice (CC)" : "Proforma Invoice (PC)"}
            </span>
            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              isPaid
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {isPaid ? "Paid" : "Pending"}
            </span>
          </div>

          {/* Customer */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-1.5">
            <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Customer</h4>
            <p className="font-bold text-zinc-900 text-sm">{invoice.customer?.businessName || "—"}</p>
            <p className="text-zinc-500 font-mono">{invoice.customer?.customerCode || "—"}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
              <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Invoice Date</h4>
              <p className="font-semibold text-zinc-800">{fmt(invoice.invoiceDate)}</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
              <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Payment Date</h4>
              <p className="font-semibold text-zinc-800">{fmt(invoice.paymentDate)}</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
              <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Due Date</h4>
              <p className="font-semibold text-zinc-800">{fmt(invoice.dueDate)}</p>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
              <span>Net</span>
              <span className="font-mono text-zinc-300">£{invoice.net?.toFixed(2) ?? "—"}</span>
            </div>
            <div className="flex justify-between text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
              <span>VAT (20%)</span>
              <span className="font-mono text-zinc-300">£{invoice.vat?.toFixed(2) ?? "—"}</span>
            </div>
            <div className="border-t border-zinc-700 pt-2 flex justify-between text-white text-sm font-extrabold uppercase tracking-wider">
              <span>Gross Total</span>
              <span className="font-mono">£{invoice.gross?.toFixed(2) ?? "—"}</span>
            </div>
            {invoice.amountPaid != null && (
              <div className="flex justify-between text-emerald-400 text-[10px] uppercase tracking-widest font-bold border-t border-zinc-700 pt-2">
                <span>Amount Paid</span>
                <span className="font-mono">£{invoice.amountPaid.toFixed(2)}</span>
              </div>
            )}
            {invoice.amountDue != null && (
              <div className="flex justify-between text-red-400 text-[10px] uppercase tracking-widest font-bold">
                <span>Amount Due</span>
                <span className="font-mono">£{invoice.amountDue.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="flex gap-2 flex-wrap">
            {invoice.isSettled && (
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase rounded-full">Settled</span>
            )}
            {invoice.isRefunded && (
              <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-[9px] font-black uppercase rounded-full">Refunded</span>
            )}
          </div>
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
export default function InvoicesPage({ hideHeader = false }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { request } = useAxios();

  // List
  const [invoices, setInvoices] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all | paid | pending
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modal
  const [viewTarget, setViewTarget] = useState(null);

  // Toast
  const showToast = (message, type = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  // Auth redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  // ── Fetch invoices ────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(
    async (q = searchQuery, status = statusFilter, p = page, fd = fromDate, td = toDate) => {
      try {
        setListLoading(true);
        const params = new URLSearchParams({ page: p, limit: 10, query: q });
        if (status !== "all") params.set("status", status);
        if (fd) params.set("fromDate", fd);
        if (td) params.set("toDate", td);

        const res = await request({
          url: `/admin/get-all-invoice?${params.toString()}`,
          method: "GET",
        });

        if (res?.success) {
          setInvoices(res.data?.invoices || []);
          setTotalPages(res.data?.pagination?.totalPages || 1);
          setTotalItems(res.data?.pagination?.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
      } finally {
        setListLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    if (isAuthenticated && !isLoading) fetchInvoices(searchQuery, statusFilter, page, fromDate, toDate);
  }, [isAuthenticated, isLoading, page, statusFilter]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => {
      if (page === 1) {
        fetchInvoices(val, statusFilter, 1, fromDate, toDate);
      } else {
        setPage(1);
      }
    }, 500);
    setSearchTimeout(t);
  };

  const handleDateFilter = () => {
    setPage(1);
    fetchInvoices(searchQuery, statusFilter, 1, fromDate, toDate);
  };

  const clearDateFilter = () => {
    setFromDate("");
    setToDate("");
    setPage(1);
    fetchInvoices(searchQuery, statusFilter, 1, "", "");
  };

  // Derived counts for cards
  const paidCount = invoices.filter((i) => i.isPaid).length;
  const pendingCount = invoices.filter((i) => !i.isPaid).length;
  const ccCount = invoices.filter((i) => i.invoiceType === "CC").length;
  const pcCount = invoices.filter((i) => i.invoiceType === "PC").length;

  const statusTabs = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "pending", label: "Pending" },
  ];

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
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Invoices</h1>
            <p className="text-zinc-500 text-xs sm:text-sm font-light mt-1">
              View and manage all customer invoices. Generate invoices from the Orders page.
            </p>
          </div>
          <button
            onClick={() => router.push("/orders")}
            className="self-start px-5 py-2.5 bg-zinc-800 hover:bg-zinc-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go to Orders
          </button>
        </div>

        {/* Sleek Metrics Stats Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row justify-between gap-6 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
          <div className="flex-1 flex items-center gap-4 sm:pl-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Invoices</span>
              <span className="text-2xl font-black text-zinc-900">{totalItems}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Paid</span>
              <span className="text-2xl font-black text-zinc-900">{paidCount}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Pending</span>
              <span className="text-2xl font-black text-zinc-900">{pendingCount}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">CC / PC</span>
              <span className="text-2xl font-black text-zinc-900">{ccCount} / {pcCount}</span>
            </div>
          </div>
        </div>

        {/* Filters: Status + Search + Date */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex bg-zinc-200/60 p-1 rounded-xl w-fit gap-1">
              {statusTabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setStatusFilter(key);
                    setPage(1);
                    fetchInvoices(searchQuery, key, 1, fromDate, toDate);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === key
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 bg-transparent border-0"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search invoice number..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-600/10 transition placeholder-zinc-400 font-medium shadow-inner"
              />
              <svg className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-600/10 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-600/10 cursor-pointer"
              />
            </div>
            <button
              onClick={handleDateFilter}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer"
            >
              Apply
            </button>
            {(fromDate || toDate) && (
              <button
                onClick={clearDateFilter}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6">
          {listLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner />
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Fetching invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-1">No Invoices Found</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Generate invoices from approved sales orders on the Orders page.
              </p>
              <button
                onClick={() => router.push("/orders")}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer"
              >
                Go to Orders
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8faff]/80 border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                    <th className="py-3.5 px-6">Invoice No.</th>
                    <th className="py-3.5 px-6">Customer</th>
                    <th className="py-3.5 px-6">Type</th>
                    <th className="py-3.5 px-6">Invoice Date</th>
                    <th className="py-3.5 px-6">Due Date</th>
                    <th className="py-3.5 px-6 text-right">Net</th>
                    <th className="py-3.5 px-6 text-right">VAT</th>
                    <th className="py-3.5 px-6 text-right">Gross</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-750">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-zinc-900">{inv.invoiceNo}</td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900">{inv.customer?.businessName || "—"}</span>
                          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{inv.customer?.customerCode || ""}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          inv.invoiceType === "CC"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          {inv.invoiceType === "CC" ? "VAT" : "Proforma"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-zinc-500">{fmt(inv.invoiceDate)}</td>
                      <td className="py-4 px-6 text-zinc-500">
                        {inv.dueDate ? (
                          <span className={new Date(inv.dueDate) < new Date() && !inv.isPaid ? "text-red-600 font-bold" : ""}>
                            {fmt(inv.dueDate)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-4 px-6 text-right font-mono">£{inv.net?.toFixed(2) ?? "—"}</td>
                      <td className="py-4 px-6 text-right font-mono">£{inv.vat?.toFixed(2) ?? "—"}</td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-zinc-900">£{inv.gross?.toFixed(2) ?? "—"}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          inv.isPaid
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-red-50 border-red-200 text-red-700"
                        }`}>
                          {inv.isPaid ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setViewTarget(inv)}
                          className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* Details Modal */}
      <InvoiceDetailsModal
        isOpen={!!viewTarget}
        invoice={viewTarget}
        onClose={() => setViewTarget(null)}
      />



      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
