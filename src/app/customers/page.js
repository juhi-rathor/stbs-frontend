"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import CustomerModal from "../../components/CustomerModal";
import useAxios from "../../hooks/useAxios";
import Header from "../../components/Header";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { toast } from "react-hot-toast";
import { confirmToast } from "../../lib/confirmToast";

export default function CustomersPage({ hideHeader = false, hideFooter = false }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { request: axiosRequest } = useAxios();

  const [customers, setCustomers] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Selected Customer details state
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  const handleViewDetails = async (customerId) => {
    setSelectedCustomerId(customerId);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setDetailsError("");
    setCustomerDetails(null);
    try {
      const res = await axiosRequest({
        url: `/admin/get-customer-by-id?customerId=${customerId}`,
        method: "GET"
      });
      if (res && res.success) {
        const listCustomer = customers.find((c) => c._id === customerId);
        setCustomerDetails({
          ...res.data,
          salesOrders: listCustomer?.salesOrders || []
        });
      } else {
        throw new Error(res?.message || "Failed to fetch customer details");
      }
    } catch (err) {
      console.error("Fetch customer by ID error:", err);
      setDetailsError(err.message || "Failed to load customer details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleCustomerType = (customerId, businessName, currentType) => {
    const targetType = currentType === "CC" ? "Proforma (PC)" : "Credit (CC)";
    confirmToast(
      `Are you sure you want to change ${businessName}'s account type to ${targetType}?`,
      async () => {
        try {
          setListLoading(true);
          const res = await axiosRequest({
            url: "/admin/change-customer-type",
            method: "PATCH",
            data: { customerId }
          });
          if (res && res.success) {
            toast.success(`Successfully switched to ${targetType}!`);
            await fetchCustomers();
          } else {
            throw new Error(res?.message || "Failed to switch customer type");
          }
        } catch (err) {
          console.error("Switch customer type error:", err);
          toast.error(err.message || "Failed to switch customer type.");
        } finally {
          setListLoading(false);
        }
      }
    );
  };

  const handleArchiveCustomer = (customerId, businessName, isArchivedStatus) => {
    const action = isArchivedStatus ? "restore" : "archive";
    confirmToast(
      `Are you sure you want to ${action} the customer ${businessName}?`,
      async () => {
        try {
          setListLoading(true);
          const res = await axiosRequest({
            url: "/admin/archied-customer",
            method: "PATCH",
            data: { customerId }
          });
          if (res && res.success) {
            toast.success(`Successfully ${isArchivedStatus ? "restored" : "archived"} customer ${businessName}!`);
            await fetchCustomers();
          } else {
            throw new Error(res?.message || `Failed to ${action} customer`);
          }
        } catch (err) {
          console.error(`${action} customer error:`, err);
          toast.error(err.message || `Failed to ${action} customer.`);
        } finally {
          setListLoading(false);
        }
      }
    );
  };

  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch customers
  const fetchCustomers = async (queryVal = searchQuery, archivedVal = showArchived, pageVal = page) => {
    try {
      setListLoading(true);

      // When a search query is present, use the dedicated search-customer endpoint
      if (queryVal.trim()) {
        const res = await axiosRequest({
          url: `/admin/search-customer?query=${encodeURIComponent(queryVal.trim())}`,
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
        if (res && res.success) {
          const results = res.data || [];
          setCustomers(results);
          setTotalPages(1);
          setTotalCustomers(results.length);
        }
      } else {
        // Normal paginated listing via get-all-customer
        const params = new URLSearchParams();
        params.append("isArchived", archivedVal);
        params.append("page", pageVal);
        params.append("limit", 10);

        const res = await axiosRequest({
          url: `/admin/get-all-customer?${params.toString()}`,
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
        if (res && res.success) {
          setCustomers(res.data?.customers || []);
          setTotalPages(res.data?.pagination?.totalPages || 1);
          setTotalCustomers(res.data?.pagination?.total || 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchCustomers(searchQuery, showArchived, page);
    }
  }, [isAuthenticated, isLoading, showArchived, page]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (page === 1) {
        fetchCustomers(value, showArchived, 1);
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
    fetchCustomers(searchQuery, showArchived, 1);
  };



  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-medium tracking-wide">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-900">

      {!hideHeader && <Header />}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 lg:px-16 py-10">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Customers List</h1>
            <p className="text-zinc-500 text-xs sm:text-sm font-light mt-1">Manage credit accounts, retail clients, and address records.</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="self-start px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
          >
            + Create Customer
          </button>
        </div>

        {/* Sleek Metrics Stats Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row justify-between gap-6 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
          <div className="flex-1 flex items-center gap-4 sm:pl-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Database</span>
              <span className="text-2xl font-black text-zinc-900">{totalCustomers}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showArchived ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Status View</span>
              <span className="text-xl font-extrabold text-zinc-900 uppercase">{showArchived ? "Archived" : "Active Only"}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Credit Clients</span>
              <span className="text-2xl font-black text-zinc-900">
                {customers.filter(c => c.customerType === 'CC').length}
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 8h6m-5 0a3 3 0 110 6m0-6V4m5 12V4m-5 12h5" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Proforma Clients</span>
              <span className="text-2xl font-black text-zinc-900">
                {customers.filter(c => c.customerType === 'PC').length}
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          {/* Active/Archived Tabs */}
          <div className="flex bg-zinc-200/60 p-1 rounded-xl w-fit">
            <button
              onClick={() => {
                setShowArchived(false);
                setPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${!showArchived
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
                }`}
            >
              Active
            </button>
            <button
              onClick={() => {
                setShowArchived(true);
                setPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${showArchived
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
                }`}
            >
              Archived
            </button>
          </div>

          {/* Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 max-w-md w-full md:w-80"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
              />
              <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* List Table */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          {listLoading ? (
            <TableSkeleton cols={8} rows={6} />
          ) : customers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-400 text-sm font-medium">
                {searchQuery.trim() ? "No customers found matching search criteria" : "No customers found in database"}
              </p>
              {!searchQuery.trim() && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 text-xs font-bold text-blue-600 hover:underline uppercase"
                >
                  Add Your First Customer
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/75 border-b border-zinc-200 text-zinc-400 text-[10px] font-bold tracking-widest uppercase">
                    <th className="py-4 px-6 hidden sm:table-cell">Code</th>
                    <th className="py-4 px-6">Business Name</th>
                    <th className="py-4 px-6 hidden md:table-cell">Contact Person</th>
                    <th className="py-4 px-6 hidden lg:table-cell">Email</th>
                    <th className="py-4 px-6 hidden md:table-cell">Phone</th>
                    <th className="py-4 px-6 hidden sm:table-cell">Type</th>
                    <th className="py-4 px-6 hidden md:table-cell">Credit Limit</th>
                    <th className="py-4 px-6 hidden lg:table-cell">Category</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700 font-medium">
                  {customers.map((c) => (
                    <tr key={c._id} className="hover:bg-zinc-50/50 transition duration-150">
                      <td className="py-4 px-6 hidden sm:table-cell">
                        <span className="bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border border-zinc-200/60 uppercase tracking-wide">
                          {c.customerCode}
                        </span>
                      </td>
                      <td
                        className="py-4 px-6 cursor-pointer hover:text-blue-600 transition"
                        onClick={() => handleViewDetails(c._id)}
                      >
                        <div className="text-zinc-900 font-semibold line-clamp-2 max-w-[220px]">
                          {c.businessName}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-600 hidden md:table-cell">{c.name || "N/A"}</td>
                      <td className="py-4 px-6 text-zinc-500 font-normal hidden lg:table-cell">{c.email}</td>
                      <td className="py-4 px-6 text-zinc-600 font-normal hidden md:table-cell">{c.primaryPhone}</td>
                      <td className="py-4 px-6 hidden sm:table-cell">
                        <button
                          onClick={() => handleToggleCustomerType(c._id, c.businessName, c.customerType)}
                          title={`Click to switch to ${c.customerType === "CC" ? "Proforma (PC)" : "Credit (CC)"}`}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer ${c.customerType === "CC"
                              ? "bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200"
                            }`}
                        >
                          {c.customerType === "CC" ? "Credit (CC)" : "Proforma (PC)"}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-zinc-900 hidden md:table-cell">
                        {c.customerType === "CC" ? `£${(c.creditLimit || 0).toLocaleString()}` : "—"}
                      </td>
                      <td className="py-4 px-6 hidden lg:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${(c.category || "trade") === "trade"
                            ? "bg-violet-50 text-violet-700 border border-violet-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                          {c.category || "trade"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(c._id)}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-blue-50 hover:text-blue-600 text-zinc-700 font-bold text-[10px] uppercase tracking-wider rounded transition duration-150 cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-blue-50 hover:text-blue-600 text-zinc-700 font-bold text-[10px] uppercase tracking-wider rounded transition duration-150 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchiveCustomer(c._id, c.businessName, c.isArchived)}
                            className={`px-2.5 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider rounded transition duration-150 cursor-pointer ${c.isArchived
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-red-600 hover:bg-red-700"
                              }`}
                          >
                            {c.isArchived ? "Restore" : "Archive"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-xl shadow-sm border">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                className="relative inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                className="relative ml-3 inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-zinc-500 font-light">
                  Showing <span className="font-semibold text-zinc-800">{(page - 1) * 10 + 1}</span> to{' '}
                  <span className="font-semibold text-zinc-800">
                    {Math.min(page * 10, totalCustomers)}
                  </span>{' '}
                  of <span className="font-semibold text-zinc-800">{totalCustomers}</span> customers
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        aria-current={page === pageNum ? "page" : undefined}
                        className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold focus:z-20 ${page === pageNum
                            ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            : "text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:outline-offset-0"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Create/Edit Customer Dialog Modal */}
      <CustomerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        customer={editingCustomer}
        onSuccess={() => {
          setShowModal(false);
          fetchCustomers();
        }}
      />

      {/* Customer Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform scale-100 transition-all p-6 sm:p-8 relative">

            <button
              onClick={() => {
                setShowDetailsModal(false);
                setCustomerDetails(null);
                setDetailsError("");
              }}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition"
              aria-label="Close details"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {detailsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Fetching Customer Details...</p>
              </div>
            ) : detailsError ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-zinc-950 font-bold text-sm uppercase mb-2">Error Loading Details</h4>
                <p className="text-zinc-500 text-xs max-w-md mx-auto">{detailsError}</p>
                <button
                  onClick={() => handleViewDetails(selectedCustomerId)}
                  className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition"
                >
                  Retry
                </button>
              </div>
            ) : customerDetails ? (
              <div>
                {/* Header Banner */}
                <div className="border-b border-zinc-100 pb-6 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded uppercase tracking-wider">
                        {customerDetails.customerCode}
                      </span>
                      <h3 className="text-xl font-black text-zinc-900 mt-2 uppercase tracking-tight">
                        {customerDetails.businessName}
                      </h3>
                      <p className="text-zinc-500 text-xs font-light mt-0.5">
                        Registered Account Details & Addresses
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${customerDetails.customerType === "CC" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}>
                        {customerDetails.customerType === "CC" ? "Credit Account (CC)" : "Proforma Client (PC)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-6">
                  {/* Section 1: Basic details */}
                  <div className="bg-zinc-50/50 p-5 rounded-xl border border-zinc-100">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Account Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Contact Name</span>
                        <span className="text-sm font-semibold text-zinc-800">{customerDetails.name || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Email Address</span>
                        <span className="text-sm font-semibold text-zinc-800 select-all">{customerDetails.email}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Phone Number</span>
                        <span className="text-sm font-semibold text-zinc-800 select-all">{customerDetails.primaryPhone}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Category</span>
                        <span className="text-sm font-semibold text-zinc-800 capitalize">{customerDetails.category || "trade"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Credit Limit</span>
                        <span className="text-sm font-semibold text-zinc-800">
                          {customerDetails.customerType === "CC" ? `£${(customerDetails.creditLimit || 0).toLocaleString()}` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Account Status</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 mt-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Addresses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Correspondence */}
                    <div className="bg-zinc-50/50 p-5 rounded-xl border border-zinc-100">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Correspondence Address</h4>
                      <div className="space-y-2.5 text-xs text-zinc-700 font-semibold">
                        <div>
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-0.5">Line 1</span>
                          <span>{customerDetails.correspondenceAddress?.line1 || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-0.5">Line 2</span>
                          <span>{customerDetails.correspondenceAddress?.line2 || "—"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-0.5">City & State</span>
                            <span>
                              {customerDetails.correspondenceAddress?.city || "—"}
                              {customerDetails.correspondenceAddress?.state ? `, ${customerDetails.correspondenceAddress.state}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-0.5">Postcode</span>
                            <span>{customerDetails.correspondenceAddress?.postcode || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery */}
                    <div className="bg-zinc-50/50 p-5 rounded-xl border border-zinc-100">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Delivery Address</h4>
                      <div className="space-y-2.5 text-xs text-zinc-700 font-semibold">
                        <div>
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-0.5">Line 1</span>
                          <span>{customerDetails.deliveryAddress?.line1 || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-0.5">Line 2</span>
                          <span>{customerDetails.deliveryAddress?.line2 || "—"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-0.5">City & State</span>
                            <span>
                              {customerDetails.deliveryAddress?.city || "—"}
                              {customerDetails.deliveryAddress?.state ? `, ${customerDetails.deliveryAddress.state}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-0.5">Postcode</span>
                            <span>{customerDetails.deliveryAddress?.postcode || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Recent Sales Orders */}
                  {customerDetails.salesOrders && customerDetails.salesOrders.length > 0 && (
                    <div className="bg-zinc-50/50 p-5 rounded-xl border border-zinc-100">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Sales Orders & Invoices</h4>
                      <div className="overflow-x-auto border border-zinc-200 rounded-lg bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#f8faff]/80 border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                              <th className="py-2.5 px-4">Order No</th>
                              <th className="py-2.5 px-4">Order Date</th>
                              <th className="py-2.5 px-4">Gross Total</th>
                              <th className="py-2.5 px-4">Order Status</th>
                              <th className="py-2.5 px-4">Payment Status</th>
                              <th className="py-2.5 px-4">Invoice Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                            {customerDetails.salesOrders.map((order, idx) => (
                              <tr key={idx} className="hover:bg-zinc-50/50">
                                <td className="py-2 px-4 font-mono font-bold text-zinc-850">{order.salesOrderNumber}</td>
                                <td className="py-2 px-4 text-zinc-500 font-normal">
                                  {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "—"}
                                </td>
                                <td className="py-2 px-4">£{(order.totalGross || 0).toLocaleString()}</td>
                                <td className="py-2 px-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${order.status === "completed"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      : "bg-blue-50 text-blue-700 border border-blue-100"
                                    }`}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="py-2 px-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${order.paymentStatus === "paid"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      : "bg-amber-50 text-amber-700 border border-amber-100"
                                    }`}>
                                    {order.paymentStatus}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-zinc-500 font-normal">
                                  {order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-6 mt-6 border-t border-zinc-100 flex justify-end">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setCustomerDetails(null);
                    }}
                    className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition"
                  >
                    Close View
                  </button>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      )}

      {!hideFooter && (
        <footer className="bg-white border-t border-zinc-200 text-zinc-500 py-8 text-center text-xs mt-auto">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-semibold text-zinc-800 uppercase">STBS Admin Dashboard</p>
            <p>&copy; {new Date().getFullYear()} STBS Ltd. All rights reserved. Tel: (01924) 763272</p>
          </div>
        </footer>
      )}

    </div>
  );
}
