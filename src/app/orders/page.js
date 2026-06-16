"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import useAxios from "../../hooks/useAxios";
import TableSkeleton from "../../components/ui/TableSkeleton";
import SalesOrderModal from "../../components/SalesOrderModal";
import { toast } from "react-hot-toast";
import { confirmToast } from "../../lib/confirmToast";

export default function OrdersPage({ hideHeader = false }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { request: axiosRequest } = useAxios();

  const [orders, setOrders] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // Invoice generation state
  const [invoiceLoading, setInvoiceLoading] = useState({});
  const showToast = (message, type = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  // Details Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");

  // Metrics summary
  const [metrics, setMetrics] = useState({
    total: 0,
    created: 0,
    approved: 0,
    dispatched: 0,
    invoiced: 0,
    delivered: 0,
    cancelled: 0
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch sales orders list from API
  const fetchOrders = async (queryVal = searchQuery, statusVal = statusFilter, pageVal = page) => {
    try {
      setListLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageVal);
      params.append("limit", 10);

      // Determine query payload (backend merges status filter and query string)
      let apiQuery = queryVal.trim();
      if (statusVal !== "All" && !apiQuery) {
        apiQuery = statusVal.toLowerCase();
      }

      if (apiQuery) {
        params.append("query", apiQuery);
      }

      const res = await axiosRequest({
        url: `/admin/get-all-sales-order?${params.toString()}`,
        method: "GET"
      });

      if (res && res.success) {
        setOrders(res.data?.orders || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalOrders(res.data?.pagination?.total || 0);

        // Update basic metrics from list counts for dashboard view
        const rawOrders = res.data?.orders || [];
        const total = res.data?.pagination?.total || 0;

        setMetrics({
          total: total,
          created: rawOrders.filter((o) => o.status === "created").length,
          approved: rawOrders.filter((o) => o.status === "approved").length,
          dispatched: rawOrders.filter((o) => o.status === "dispatched").length,
          invoiced: rawOrders.filter((o) => o.status === "invoiced").length,
          delivered: rawOrders.filter((o) => o.status === "delivered").length,
          cancelled: rawOrders.filter((o) => o.status === "cancelled").length
        });
      }
    } catch (err) {
      console.error("Failed to load sales orders:", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchOrders(searchQuery, statusFilter, page);
    }
  }, [isAuthenticated, isLoading, statusFilter, page]);

  // Search input change handler with debounce
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (page === 1) {
        fetchOrders(value, statusFilter, 1);
      } else {
        setPage(1);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    setPage(1);
    fetchOrders(searchQuery, statusFilter, 1);
  };

  // Status Tab filters click handler
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPage(1);
    // If status filter is clicked, clear text query to avoid filter conflict
    setSearchQuery("");
  };

  const handleOpenCreateModal = () => {
    setEditingOrder(null);
    setShowOrderModal(true);
  };

  const handleOpenEditModal = (orderItem) => {
    setEditingOrder(orderItem);
    setShowOrderModal(true);
  };

  const handleOpenDetailsModal = (orderItem) => {
    setSelectedOrder(orderItem);
    setShowDetailsModal(true);
  };

  const handleModalSuccess = () => {
    setShowOrderModal(false);
    setEditingOrder(null);
    fetchOrders(searchQuery, statusFilter, page);
  };

  // Generate invoice for a sales order
  const handleGenerateInvoice = (order) => {
    confirmToast(
      `Generate invoice for order ${order.salesOrderNumber}?`,
      async () => {
        setInvoiceLoading((prev) => ({ ...prev, [order._id]: true }));
        try {
          await axiosRequest({
            url: "/admin/create-invoice",
            method: "POST",
            data: { salesOrderId: order._id },
          });
          showToast(`Invoice generated for ${order.salesOrderNumber}!`);
          fetchOrders(searchQuery, statusFilter, page);
        } catch (err) {
          showToast(err.message || "Failed to generate invoice.", "error");
        } finally {
          setInvoiceLoading((prev) => ({ ...prev, [order._id]: false }));
        }
      }
    );
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Sales Orders</h1>
            <p className="text-zinc-500 text-xs sm:text-sm font-light mt-1">Manage wholesale dispatches, order statuses, and invoices.</p>
          </div>
          <button 
            onClick={handleOpenCreateModal}
            className="self-start px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
          >
            + Create Sales Order
          </button>
        </div>

        {/* Sleek Metrics Stats Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row justify-between gap-6 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
          <div className="flex-1 flex items-center gap-4 sm:pl-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Orders</span>
              <span className="text-2xl font-black text-zinc-900">{totalOrders}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Created</span>
              <span className="text-2xl font-black text-zinc-900">{metrics.created}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Approved</span>
              <span className="text-2xl font-black text-zinc-900">{metrics.approved}</span>
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
              <span className="text-2xl font-black text-zinc-900">{metrics.dispatched}</span>
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
              <span className="text-2xl font-black text-zinc-900">{metrics.delivered + metrics.invoiced}</span>
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
              <span className="text-2xl font-black text-zinc-900">{metrics.cancelled}</span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          {/* Status Tabs */}
          <div className="flex bg-zinc-200/60 p-1 rounded-xl w-fit flex-wrap gap-1">
            {["All", "Created", "Approved", "Dispatched", "Invoiced", "Delivered", "Cancelled", "Requested"].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilterChange(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === status
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 bg-transparent border-0"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search ID, Customer, SKU..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition placeholder-zinc-400 font-medium shadow-inner"
            />
            <svg className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
        </div>

        {/* Table/Listing View */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6">
          {listLoading ? (
            <TableSkeleton cols={8} rows={6} />
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2.5m15 5h-3a5 5 0 01-5-5v0a5 5 0 01-5 5H6" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-1">No Orders Found</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">Create a new order or try adjusting your search parameters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8faff]/80 border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                    <th className="py-3.5 px-6">Order No</th>
                    <th className="py-3.5 px-6">Customer</th>
                    <th className="py-3.5 px-6">Order Date</th>
                    <th className="py-3.5 px-6 text-right">Net Value</th>
                    <th className="py-3.5 px-6 text-right">VAT (20%)</th>
                    <th className="py-3.5 px-6 text-right">Gross Total</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-750 font-medium">
                  {orders.map((o) => {
                    // Custom color logic based on actual schema status values
                    let statusColor = "bg-zinc-50 border-zinc-200 text-zinc-650";
                    if (o.status === "created") {
                      statusColor = "bg-indigo-50 border-indigo-200 text-indigo-700";
                    } else if (o.status === "approved") {
                      statusColor = "bg-amber-50 border-amber-200 text-amber-700";
                    } else if (o.status === "dispatched") {
                      statusColor = "bg-violet-50 border-violet-200 text-violet-700";
                    } else if (o.status === "invoiced") {
                      statusColor = "bg-cyan-50 border-cyan-200 text-cyan-700";
                    } else if (o.status === "delivered") {
                      statusColor = "bg-emerald-50 border-emerald-200 text-emerald-700";
                    } else if (o.status === "cancelled") {
                      statusColor = "bg-red-50 border-red-200 text-red-650";
                    } else if (o.status === "requested") {
                      statusColor = "bg-sky-50 border-sky-200 text-sky-700";
                    }

                    // Only allow edit on orders not yet dispatched, invoiced, delivered, or cancelled
                    const isEditable = !["dispatched", "invoiced", "delivered", "cancelled"].includes(o.status);

                    // Show "Generate Invoice" for created or approved orders with no invoice yet
                    const canGenerateInvoice = ["created", "approved"].includes(o.status) && !o.invoiceNumber;
                    const isGeneratingInvoice = !!invoiceLoading[o._id];

                    return (
                      <tr key={o._id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-zinc-900">{o.salesOrderNumber}</span>
                            {(o.customerOrderNo || o.purchaseOrderNo) && (
                              <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                {o.customerOrderNo ? `CO: ${o.customerOrderNo}` : ""}
                                {o.customerOrderNo && o.purchaseOrderNo ? " | " : ""}
                                {o.purchaseOrderNo ? `PO: ${o.purchaseOrderNo}` : ""}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-900">{o.customerId?.businessName || "Unknown Customer"}</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                              Code: {o.customerId?.customerCode || "—"} | Type: {o.customerType}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 px-6 text-right font-mono">£{o.totalNet.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right font-mono">£{o.totalVat.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-zinc-900">£{o.totalGross.toFixed(2)}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColor}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenDetailsModal(o)}
                              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer"
                            >
                              View
                            </button>

                            {/* Generate Invoice — only for approved orders */}
                            {canGenerateInvoice && (
                              <button
                                onClick={() => handleGenerateInvoice(o)}
                                disabled={isGeneratingInvoice}
                                className="px-2.5 py-1.5 bg-cyan-50 border border-cyan-200 text-cyan-700 hover:bg-cyan-100 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer disabled:opacity-60 flex items-center gap-1"
                              >
                                {isGeneratingInvoice ? (
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                                Invoice
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditModal(o)}
                              className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer ${
                                isEditable
                                  ? "bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100"
                                  : "bg-zinc-50 text-zinc-350 border border-zinc-200/50 cursor-not-allowed"
                              }`}
                              disabled={!isEditable}
                              title={!isEditable ? "Orders that are dispatched, invoiced, delivered or cancelled cannot be modified" : ""}
                            >
                              Edit
                            </button>
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

        {/* Pagination bar */}
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



      {/* 1. CREATE / EDIT SALES ORDER MODAL */}
      <SalesOrderModal
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setEditingOrder(null);
        }}
        onSuccess={handleModalSuccess}
        order={editingOrder}
      />

      {/* 2. DETAILED LEDGER POPUP DIALOG */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform scale-100 transition-all p-6 sm:p-8 relative">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedOrder(null);
              }}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3.5 mb-2">
              <h3 className="text-xl font-bold text-zinc-900 uppercase tracking-tight">
                Order Ledger: {selectedOrder.salesOrderNumber}
              </h3>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                selectedOrder.status === "created" ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                selectedOrder.status === "approved" ? "bg-amber-50 border-amber-200 text-amber-700" :
                selectedOrder.status === "dispatched" ? "bg-violet-50 border-violet-200 text-violet-700" :
                selectedOrder.status === "invoiced" ? "bg-cyan-50 border-cyan-200 text-cyan-700" :
                selectedOrder.status === "delivered" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                selectedOrder.status === "cancelled" ? "bg-red-50 border-red-200 text-red-650" :
                selectedOrder.status === "requested" ? "bg-sky-50 border-sky-200 text-sky-700" :
                "bg-zinc-50 border-zinc-200 text-zinc-600"
              }`}>
                {selectedOrder.status}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Review line items, pricing tiers, internal instructions, and customer billing address details.
            </p>

            <div className="space-y-6">
              
              {/* Section 1: Customer details & Delivery Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-zinc-50/50 p-4 border border-zinc-100 rounded-xl text-xs">
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Customer Information</h4>
                  <div className="space-y-1.5">
                    <div>
                      <span className="block text-[8px] font-bold text-zinc-400 uppercase">Business Name</span>
                      <strong className="text-zinc-850 text-sm">{selectedOrder.customerId?.businessName || "Unknown Customer"}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <span className="block text-[8px] font-bold text-zinc-400 uppercase">Customer Code</span>
                        <span className="font-semibold text-zinc-700">{selectedOrder.customerId?.customerCode || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold text-zinc-400 uppercase">Payment Terms</span>
                        <span className="font-semibold text-zinc-700">{selectedOrder.customerType} Account</span>
                      </div>
                    </div>
                    {(selectedOrder.customerOrderNo || selectedOrder.purchaseOrderNo) && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-100">
                        <div>
                          <span className="block text-[8px] font-bold text-zinc-400 uppercase">Customer Order No</span>
                          <span className="font-semibold text-zinc-700">{selectedOrder.customerOrderNo || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-bold text-zinc-400 uppercase">Purchase Order No</span>
                          <span className="font-semibold text-zinc-700">{selectedOrder.purchaseOrderNo || "—"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Logistical Shipping</h4>
                  <div className="space-y-1.5">
                    <div>
                      <span className="block text-[8px] font-bold text-zinc-400 uppercase">Delivery Address</span>
                      <span className="font-semibold text-zinc-700 block mt-0.5">
                        {selectedOrder.deliveryAddress || (
                          <>
                            {selectedOrder.customerId?.deliveryAddress?.line1 || "No Address Saved"}
                            {selectedOrder.customerId?.deliveryAddress?.line2 ? `, ${selectedOrder.customerId.deliveryAddress.line2}` : ""}
                            {selectedOrder.customerId?.deliveryAddress?.city ? `, ${selectedOrder.customerId.deliveryAddress.city}` : ""}
                            {selectedOrder.customerId?.deliveryAddress?.postcode ? ` ${selectedOrder.customerId.deliveryAddress.postcode}` : ""}
                          </>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-zinc-400 uppercase">Selected Carrier Plan</span>
                      <span className="font-bold text-zinc-800 uppercase tracking-wide">{selectedOrder.deliveryMethod}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Items Table breakdown */}
              <div>
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Line items breakdown</h4>
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs bg-white">
                    <thead>
                      <tr className="bg-[#f8faff] border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                        <th className="py-2 px-4">Product</th>
                        <th className="py-2 px-4 text-center">Unit type</th>
                        <th className="py-2 px-4 text-center">Qty</th>
                        <th className="py-2 px-4 text-right">Price</th>
                        <th className="py-2 px-4 text-right">Discount</th>
                        <th className="py-2 px-4 text-right">Gross Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                      {selectedOrder.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-zinc-50/40">
                          <td className="py-2.5 px-4 font-bold text-zinc-900">
                            {item.product?.productName || "Unknown Product"}
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">SKU: {item.product?.productCode || "—"}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center text-zinc-500 uppercase tracking-wider">{item.qtyType}</td>
                          <td className="py-2.5 px-4 text-center font-mono">{item.qty}</td>
                          <td className="py-2.5 px-4 text-right font-mono">£{item.unitPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-red-650">-£{item.discount.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">£{item.gross.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Notes & Final summary ledger */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 text-xs">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Internal Notes</h4>
                  <p className="bg-zinc-50 p-3.5 border border-zinc-100 rounded-xl text-zinc-600 leading-relaxed italic">
                    {selectedOrder.notes || "No custom instructions recorded for this sales transaction."}
                  </p>
                </div>

                <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between font-semibold text-zinc-500 uppercase tracking-wider">
                    <span>Net Total:</span>
                    <span className="font-mono text-zinc-800 font-bold">£{selectedOrder.totalNet.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-zinc-500 uppercase tracking-wider">
                    <span>VAT (20%):</span>
                    <span className="font-mono text-zinc-800 font-bold">£{selectedOrder.totalVat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-zinc-800 uppercase tracking-wider border-t border-dashed border-zinc-200/60 pt-2 text-sm">
                    <span>Gross Total:</span>
                    <span className="font-mono text-red-650">£{selectedOrder.totalGross.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8 border-t border-zinc-100 pt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedOrder(null);
                }}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
