"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import useAxios from "../../hooks/useAxios";
import { toast } from "react-hot-toast";

// Helper for formatting date
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
    <div className={`${s} border-red-600 border-t-transparent rounded-full animate-spin`} />
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

export default function FinancialsPage({ hideHeader = false, hideFooter = false }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { request: axiosRequest } = useAxios();

  const [activeTab, setActiveTab] = useState("all-ledger"); // all-ledger | upcoming | overdue | customer-ledger
  const [listLoading, setListLoading] = useState(false);

  // Lists state
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("all");

  // Record Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    customerId: "",
    invoiceId: "",
    amount: "",
    paymentMethod: "cash",
    referenceNo: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  const showToast = (message, type = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  // Auth check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch Customers List for Modal & Customer tab
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await axiosRequest({
        url: "/admin/get-all-customer?page=1&limit=10",
        method: "GET",
      });
      if (res?.success) {
        setCustomersList(res.data?.customers || []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  }, [axiosRequest]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchCustomers();
    }
  }, [isAuthenticated, isLoading, fetchCustomers]);

  // Fetch Invoices for selected Customer in Record Payment Modal
  useEffect(() => {
    const fetchCustomerInvoices = async () => {
      if (!paymentForm.customerId) {
        setInvoicesList([]);
        return;
      }
      try {
        setLoadingModalData(true);
        // Fetch pending invoices for the customer
        const res = await axiosRequest({
          url: `/admin/get-all-invoice?status=pending&limit=100`,
          method: "GET",
        });
        if (res?.success) {
          // Filter invoices for the specific customer
          const filtered = (res.data?.invoices || []).filter(
            (inv) => inv.customer?._id === paymentForm.customerId
          );
          setInvoicesList(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch customer invoices:", err);
      } finally {
        setLoadingModalData(false);
      }
    };
    fetchCustomerInvoices();
  }, [paymentForm.customerId, axiosRequest]);

  // 1. Fetch All Customer Finance History
  const fetchAllLedger = useCallback(async (q = searchQuery, p = page, type = txnTypeFilter) => {
    try {
      setListLoading(true);
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (q.trim()) params.set("query", q.trim());
      if (type !== "all") params.set("type", type);

      const res = await axiosRequest({
        url: `/admin/get-all-customer-finance-history?${params.toString()}`,
        method: "GET",
      });

      if (res?.success) {
        setLedgerTransactions(res.data?.transactions || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalItems(res.data?.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch all ledger:", err);
      showToast(err.message || "Failed to fetch ledger transactions", "error");
    } finally {
      setListLoading(false);
    }
  }, [axiosRequest]);

  // 2. Fetch Customer Specific Ledger
  const fetchCustomerLedger = useCallback(async (customerId) => {
    if (!customerId) {
      setCustomerHistory([]);
      return;
    }
    try {
      setListLoading(true);
      const res = await axiosRequest({
        url: `/admin/get-customer-finance-history?customerId=${customerId}`,
        method: "GET",
      });
      if (res?.success) {
        setCustomerHistory(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch customer ledger:", err);
      showToast(err.message || "Failed to fetch customer statement", "error");
    } finally {
      setListLoading(false);
    }
  }, [axiosRequest]);

  // 3. Fetch Upcoming Payments
  const fetchUpcoming = useCallback(async (q = searchQuery, p = page, fd = fromDate, td = toDate) => {
    try {
      setListLoading(true);
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (q.trim()) params.set("search", q.trim());
      if (fd) params.set("fromDate", fd);
      if (td) params.set("toDate", td);

      const res = await axiosRequest({
        url: `/admin/get-customer-upcoming-payments?${params.toString()}`,
        method: "GET",
      });

      if (res?.success) {
        setUpcomingPayments(res.data?.invoices || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalItems(res.data?.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch upcoming payments:", err);
      showToast(err.message || "Failed to fetch upcoming payments", "error");
    } finally {
      setListLoading(false);
    }
  }, [axiosRequest]);

  // 4. Fetch Overdue Payments
  const fetchOverdue = useCallback(async (q = searchQuery, p = page) => {
    try {
      setListLoading(true);
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (q.trim()) {
        params.set("query", q.trim());
        params.set("search", q.trim());
      }

      const res = await axiosRequest({
        url: `/admin/get-customer-overdue-payments?${params.toString()}`,
        method: "GET",
      });

      if (res?.success) {
        setOverduePayments(res.data?.payments || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalItems(res.data?.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch overdue payments:", err);
      showToast(err.message || "Failed to fetch overdue payments", "error");
    } finally {
      setListLoading(false);
    }
  }, [axiosRequest]);

  // Trigger loading based on active tab & filters
  const reloadTabContent = useCallback(() => {
    if (!isAuthenticated) return;
    setPage(1);
    if (activeTab === "all-ledger") {
      fetchAllLedger(searchQuery, 1, txnTypeFilter);
    } else if (activeTab === "upcoming") {
      fetchUpcoming(searchQuery, 1, fromDate, toDate);
    } else if (activeTab === "overdue") {
      fetchOverdue(searchQuery, 1);
    } else if (activeTab === "customer-ledger") {
      fetchCustomerLedger(selectedCustomer);
    }
  }, [isAuthenticated, activeTab, searchQuery, txnTypeFilter, fromDate, toDate, selectedCustomer, fetchAllLedger, fetchUpcoming, fetchOverdue, fetchCustomerLedger]);

  useEffect(() => {
    reloadTabContent();
  }, [activeTab, txnTypeFilter, selectedCustomer]);

  // Pagination Change
  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (activeTab === "all-ledger") {
      fetchAllLedger(searchQuery, newPage, txnTypeFilter);
    } else if (activeTab === "upcoming") {
      fetchUpcoming(searchQuery, newPage, fromDate, toDate);
    } else if (activeTab === "overdue") {
      fetchOverdue(searchQuery, newPage);
    }
  };

  // Debounced search change
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => {
      setPage(1);
      if (activeTab === "all-ledger") {
        fetchAllLedger(val, 1, txnTypeFilter);
      } else if (activeTab === "upcoming") {
        fetchUpcoming(val, 1, fromDate, toDate);
      } else if (activeTab === "overdue") {
        fetchOverdue(val, 1);
      }
    }, 500);
    setSearchTimeout(t);
  };

  // Submit payment form
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const { customerId, invoiceId, amount, paymentMethod, referenceNo, paymentDate } = paymentForm;
    if (!customerId || !invoiceId || !amount || !paymentMethod) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      setListLoading(true);
      const res = await axiosRequest({
        url: "/admin/make-payment",
        method: "POST",
        data: {
          customerId,
          invoiceId,
          amount: Number(amount),
          paymentMethod,
          referenceNo: referenceNo || undefined,
          paymentDate: paymentDate || undefined,
        },
      });

      if (res) {
        showToast("Payment recorded successfully!");
        setShowPaymentModal(false);
        setPaymentForm({
          customerId: "",
          invoiceId: "",
          amount: "",
          paymentMethod: "cash",
          referenceNo: "",
          paymentDate: new Date().toISOString().split("T")[0],
        });
        reloadTabContent();
      }
    } catch (err) {
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setListLoading(false);
    }
  };

  // Send receipt email
  const handleSendReceipt = async (paymentId) => {
    try {
      showToast("Sending payment receipt email...", "info");
      const res = await axiosRequest({
        url: `/admin/send-payment-receipt?paymentId=${paymentId}`,
        method: "POST",
      });
      if (res) {
        showToast("Payment receipt email sent successfully!");
      }
    } catch (err) {
      showToast(err.message || "Failed to send payment receipt", "error");
    }
  };

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
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Financials & Ledger</h1>
            <p className="text-zinc-500 text-xs sm:text-sm font-light mt-1">
              Manage incoming customer payments, overdue accounts, statements, and financial adjustments.
            </p>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="self-start px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Record Payment
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-200 pb-px">
          {[
            { key: "all-ledger", label: "Ledger History (All)" },
            { key: "upcoming", label: "Upcoming Payments" },
            { key: "overdue", label: "Overdue Payments" },
            { key: "customer-ledger", label: "Customer Statements" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchQuery("");
                setFromDate("");
                setToDate("");
                setPage(1);
              }}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 ${
                activeTab === tab.key
                  ? "border-red-600 text-red-600 font-extrabold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Panel */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            {/* Search Input (Disabled for specific customer ledger) */}
            {activeTab !== "customer-ledger" && (
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search ledger/invoices..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-600/10 transition placeholder-zinc-400 font-medium"
                />
                <svg className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}

            {/* Customer dropdown for Statement Tab */}
            {activeTab === "customer-ledger" && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 font-medium focus:outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.businessName} ({c.customerCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range filters (Upcoming Tab only) */}
            {activeTab === "upcoming" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 cursor-pointer"
                  />
                </div>
                <button
                  onClick={reloadTabContent}
                  className="px-4.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition"
                >
                  Apply Dates
                </button>
              </div>
            )}

            {/* Transaction Type Filter (All Ledger only) */}
            {activeTab === "all-ledger" && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Type</span>
                <select
                  value={txnTypeFilter}
                  onChange={(e) => setTxnTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 font-medium"
                >
                  <option value="all">All Transactions</option>
                  <option value="payment">Payments Only</option>
                  <option value="invoice">Invoices Only</option>
                  <option value="non_cash_adjustment">Adjustments</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Data Tables */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden mb-6">
          {listLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner />
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Loading data...</p>
            </div>
          ) : activeTab === "all-ledger" ? (
            /* TAB 1: ALL LEDGER */
            ledgerTransactions.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 text-sm">No ledger history entries found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8faff] border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-6">Invoice / SO No</th>
                      <th className="py-3 px-6">Customer</th>
                      <th className="py-3 px-6">Method / Type</th>
                      <th className="py-3 px-6">Description</th>
                      <th className="py-3 px-6 text-right">Debit (+)</th>
                      <th className="py-3 px-6 text-right">Credit (-)</th>
                      <th className="py-3 px-6 text-right">Running Balance</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                    {ledgerTransactions.map((txn) => (
                      <tr key={txn._id} className="hover:bg-zinc-50/50">
                        <td className="py-3.5 px-6 font-mono text-zinc-500">{fmt(txn.date)}</td>
                        <td className="py-3.5 px-6 font-mono font-bold text-zinc-900">
                          {txn.invoiceNo !== "-" ? txn.invoiceNo : txn.salesOrderNo !== "-" ? txn.salesOrderNo : "—"}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-800">{txn.customerName}</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{txn.customerCode}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border capitalize ${
                            txn.debit > 0
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {txn.paymentType || "ledger"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-zinc-500 font-light">{txn.description}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-red-650">{txn.debit > 0 ? `£${txn.debit.toFixed(2)}` : "—"}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-emerald-650">{txn.credit > 0 ? `£${txn.credit.toFixed(2)}` : "—"}</td>
                        <td className="py-3.5 px-6 text-right font-mono font-bold text-zinc-900">£{txn.balance.toFixed(2)}</td>
                        <td className="py-3.5 px-6 text-right">
                          {txn.credit > 0 && (
                            <button
                              onClick={() => handleSendReceipt(txn._id)}
                              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold uppercase tracking-wider rounded border border-zinc-200 transition cursor-pointer"
                            >
                              Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === "upcoming" ? (
            /* TAB 2: UPCOMING PAYMENTS */
            upcomingPayments.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 text-sm">No upcoming payments registered.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8faff] border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                      <th className="py-3 px-6">Invoice No</th>
                      <th className="py-3 px-6">Customer</th>
                      <th className="py-3 px-6">Due Date</th>
                      <th className="py-3 px-6 text-right">Days Left</th>
                      <th className="py-3 px-6 text-right">Gross Total</th>
                      <th className="py-3 px-6 text-right">Amount Paid</th>
                      <th className="py-3 px-6 text-right">Amount Due</th>
                      <th className="py-3 px-6 text-right">Running Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                    {upcomingPayments.map((inv) => (
                      <tr key={inv._id} className="hover:bg-zinc-50/50">
                        <td className="py-3.5 px-6 font-mono font-bold text-zinc-900">{inv.invoiceNo}</td>
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-800">{inv.customer?.businessName}</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{inv.customer?.customerCode}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-zinc-500">{fmt(inv.dueDate)}</td>
                        <td className="py-3.5 px-6 text-right font-bold text-red-650">
                          {inv.daysLeft != null ? `${inv.daysLeft} days` : "—"}
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono">£{(inv.gross || 0).toFixed(2)}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-emerald-650">£{(inv.amountPaid || 0).toFixed(2)}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-red-650 font-bold">£{(inv.amountDue ?? inv.gross).toFixed(2)}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-zinc-900">£{(inv.runningTotal || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === "overdue" ? (
            /* TAB 3: OVERDUE PAYMENTS */
            overduePayments.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 text-sm">No overdue payments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8faff] border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                      <th className="py-3 px-6">Invoice No</th>
                      <th className="py-3 px-6">Customer</th>
                      <th className="py-3 px-6">Due Date</th>
                      <th className="py-3 px-6 text-right">Status</th>
                      <th className="py-3 px-6 text-right">Gross Total</th>
                      <th className="py-3 px-6 text-right">Amount Paid</th>
                      <th className="py-3 px-6 text-right">Amount Due</th>
                      <th className="py-3 px-6 text-right">Running Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                    {overduePayments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-zinc-50/50">
                        <td className="py-3.5 px-6 font-mono font-bold text-zinc-900">{payment.invoiceNo}</td>
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-800">{payment.customer?.businessName}</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{payment.customer?.customerCode}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-zinc-500 font-semibold">{fmt(payment.dueDate)}</td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[9px] font-bold uppercase rounded-full">OVERDUE</span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono">£{(payment.gross || 0).toFixed(2)}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-emerald-650">£{(payment.amountPaid || 0).toFixed(2)}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-red-650 font-bold">£{(payment.amountDue ?? payment.gross).toFixed(2)}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-zinc-900">£{(payment.runningTotal || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* TAB 4: CUSTOMER SPECIFIC STATEMENT */
            !selectedCustomer ? (
              <div className="text-center py-20 text-zinc-400 text-sm">Please select a customer from the dropdown above to view their financial statement.</div>
            ) : customerHistory.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 text-sm">No ledger transaction history found for this customer.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8faff] border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                      <th className="py-3 px-6">Transaction Date</th>
                      <th className="py-3 px-6">Invoice Number</th>
                      <th className="py-3 px-6">Sales Order</th>
                      <th className="py-3 px-6">Type</th>
                      <th className="py-3 px-6">Description</th>
                      <th className="py-3 px-6 text-right">Debit (+)</th>
                      <th className="py-3 px-6 text-right">Credit (-)</th>
                      <th className="py-3 px-6 text-right">Running Balance</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                    {customerHistory.map((txn) => (
                      <tr key={txn._id} className="hover:bg-zinc-50/50">
                        <td className="py-3.5 px-6 font-mono text-zinc-500">{fmt(txn.transactionDate)}</td>
                        <td className="py-3.5 px-6 font-mono font-bold text-zinc-900">{txn.invoice?.invoiceNo || "—"}</td>
                        <td className="py-3.5 px-6 font-mono">{txn.salesOrder?.salesOrderNumber || "—"}</td>
                        <td className="py-3.5 px-6 capitalize">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            txn.transactionType === "payment"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : txn.transactionType === "invoice"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-zinc-100 border-zinc-300 text-zinc-650"
                          }`}>
                            {txn.transactionType}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-zinc-500 font-light">{txn.description}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-red-650">{txn.debit > 0 ? `£${txn.debit.toFixed(2)}` : "—"}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-emerald-650">{txn.credit > 0 ? `£${txn.credit.toFixed(2)}` : "—"}</td>
                        <td className="py-3.5 px-6 text-right font-mono font-bold text-zinc-900">£{txn.balance.toFixed(2)}</td>
                        <td className="py-3.5 px-6 text-right">
                          {txn.transactionType === "payment" && (
                            <button
                              onClick={() => handleSendReceipt(txn._id)}
                              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold uppercase tracking-wider rounded border border-zinc-200 transition cursor-pointer"
                            >
                              Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Pagination controls for paginated tabs */}
        {activeTab !== "customer-ledger" && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2 text-xs">
            <span className="text-zinc-500 font-medium">
              Showing page <strong className="text-zinc-800">{page}</strong> of <strong className="text-zinc-800">{totalPages}</strong> ({totalItems} total records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all p-6 relative">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-6">Record New Payment</h3>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs font-semibold">
              {/* Select Customer */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Customer *</label>
                <select
                  required
                  value={paymentForm.customerId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, customerId: e.target.value, invoiceId: "" })}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600"
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.businessName} ({c.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Invoice */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Invoice ID *</label>
                {loadingModalData ? (
                  <div className="py-2 flex items-center gap-2 text-zinc-400">
                    <Spinner size="sm" /> Loading unpaid invoices...
                  </div>
                ) : (
                  <select
                    required
                    disabled={!paymentForm.customerId}
                    value={paymentForm.invoiceId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 disabled:opacity-50"
                  >
                    <option value="">-- Choose Invoice --</option>
                    {invoicesList.map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        {inv.invoiceNo} (Total: £{inv.gross.toFixed(2)} / Due: £{(inv.amountDue ?? inv.gross).toFixed(2)})
                      </option>
                    ))}
                  </select>
                )}
                {!paymentForm.customerId && (
                  <span className="text-[10px] text-zinc-400 font-light mt-1 block">Please select a customer first.</span>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Amount (£) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 500.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="transfer">Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Reference No */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Reference No.</label>
                <input
                  type="text"
                  placeholder="Optional txn reference ID"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase tracking-wider rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={listLoading}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-lg transition disabled:opacity-50"
                >
                  {listLoading ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
