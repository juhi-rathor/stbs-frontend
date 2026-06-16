"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import useAxios from "../../hooks/useAxios";
import TableSkeleton from "../../components/ui/TableSkeleton";
import EditStockModal from "../../components/EditStockModal";
import { toast } from "react-hot-toast";
import { confirmToast } from "../../lib/confirmToast";

export default function StockPage({ hideHeader = false, hideFooter = false }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { request: axiosRequest } = useAxios();

  const [stockRecords, setStockRecords] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch stock ledger records
  const fetchStockRecords = async (queryVal = searchQuery, pageVal = page) => {
    try {
      setListLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageVal);
      params.append("limit", 10);
      params.append("sort", "createdAt");
      params.append("sortType", "desc");

      const sanitizedQuery = queryVal.trim();
      if (sanitizedQuery) {
        params.append("query", sanitizedQuery);
      }

      const res = await axiosRequest({
        url: `/admin/get-all-stock?${params.toString()}`,
        method: "GET"
      });

      if (res && res.success) {
        setStockRecords(res.data?.records || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalRecords(res.data?.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch stock records:", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchStockRecords(searchQuery, page);
    }
  }, [isAuthenticated, isLoading, page]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (value === "") {
      setPage(1);
      fetchStockRecords("", 1);
      return;
    }

    const timeout = setTimeout(() => {
      setPage(1);
      fetchStockRecords(value, 1);
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    setPage(1);
    fetchStockRecords(searchQuery, 1);
  };

  const handleOpenEditModal = (record) => {
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  const handleDeleteRecord = (record) => {
    confirmToast(
      `Are you sure you want to delete this stock adjustment record for ${
        record.productId?.productName || "Unknown Product"
      } (${record.batchNo})?`,
      async () => {
        try {
          setListLoading(true);
          const res = await axiosRequest({
            url: `/admin/delete-stock?stockId=${record._id}`,
            method: "DELETE"
          });

          if (res && res.success) {
            toast.success("Stock record deleted successfully!");
            fetchStockRecords(searchQuery, page);
          } else {
            throw new Error(res?.message || "Failed to delete stock record");
          }
        } catch (err) {
          console.error("Delete stock error:", err);
          toast.error(err.message || "Failed to delete stock record.");
          setListLoading(false);
        }
      }
    );
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Stock Ledger</h1>
            <p className="text-zinc-500 text-xs sm:text-sm font-light mt-1">
              Monitor inventory movement, goods in/out, and perform manual stock leveling adjustments.
            </p>
          </div>
        </div>

        {/* Search & Control Area */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
            Total Ledger Entries: <span className="font-bold text-zinc-950">{totalRecords}</span>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 max-w-md w-full md:w-80"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by product name, code, or ref..."
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
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Data List Table */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          {listLoading ? (
            <TableSkeleton cols={10} rows={6} />
          ) : stockRecords.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-400 text-sm font-medium">
                {searchQuery.trim() ? "No ledger entries found matching search criteria" : "No stock movements registered in database"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-50/75 border-b border-zinc-200 text-zinc-400 text-[10px] font-bold tracking-widest uppercase">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6">Batch No</th>
                    <th className="py-4 px-6">Movement Type</th>
                    <th className="py-4 px-6 text-emerald-650">Goods In</th>
                    <th className="py-4 px-6 text-rose-650">Goods Out</th>
                    <th className="py-4 px-6">Pallet Level</th>
                    <th className="py-4 px-6">Board Level</th>
                    <th className="py-4 px-6">Reference</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700 font-semibold">
                  {stockRecords.map((record) => {
                    const isManual = record.movementType === "stock-in" || record.reference === "stock-in";
                    const canEdit = record.isMutable !== false && isManual && record.batchNo;
                    
                    return (
                      <tr key={record._id} className="hover:bg-zinc-50/50 transition duration-150">
                        <td className="py-4 px-6 font-normal text-zinc-500 whitespace-nowrap">
                          {record.date ? new Date(record.date).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-zinc-900 font-bold max-w-[200px] truncate" title={record.productId?.productName}>
                            {record.productId?.productName || "Unknown Product"}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-zinc-400 block mt-0.5">
                            {record.productCode || record.productId?.productCode || "N/A"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {record.batchNo ? (
                            <span className="font-mono text-xs font-bold text-zinc-800">
                              {record.batchNo}
                            </span>
                          ) : (
                            <span className="text-zinc-400 font-normal italic">N/A</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            record.movementType === "stock-in" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : record.movementType === "stock-out"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-zinc-100 text-zinc-650 border border-zinc-200"
                          }`}>
                            {record.movementType || "system"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-emerald-600 font-bold">
                          {record.goodsIn > 0 ? `+${record.goodsIn}` : "—"}
                        </td>
                        <td className="py-4 px-6 text-rose-600 font-bold">
                          {record.goodsOut > 0 ? `-${record.goodsOut}` : "—"}
                        </td>
                        <td className="py-4 px-6 text-zinc-900 font-bold">
                          {record.palletLevel ?? "—"}
                        </td>
                        <td className="py-4 px-6 text-zinc-500 font-normal">
                          {record.boardLevel?.toLocaleString() ?? "—"}
                        </td>
                        <td className="py-4 px-6 font-normal text-zinc-600 max-w-[150px] truncate" title={record.reference}>
                          {record.reference || "—"}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          {canEdit ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditModal(record)}
                                className="px-2.5 py-1.5 bg-zinc-100 hover:bg-blue-50 hover:text-blue-600 text-zinc-700 font-bold text-[10px] uppercase tracking-wider rounded transition duration-150 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 font-bold text-[10px] uppercase tracking-wider rounded transition duration-150 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-normal uppercase italic">System Lock</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="relative inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
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
                    {Math.min(page * 10, totalRecords)}
                  </span>{' '}
                  of <span className="font-semibold text-zinc-800">{totalRecords}</span> ledger entries
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
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
                        className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold focus:z-20 ${
                          page === pageNum
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
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
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

      {/* Reusable Modals */}

      <EditStockModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedRecord(null);
        }}
        stockRecord={selectedRecord}
        onSuccess={() => {
          setShowEditModal(false);
          setSelectedRecord(null);
          fetchStockRecords(searchQuery, page);
        }}
      />

      {!hideFooter && (
        <footer className="bg-white border-t border-zinc-200 text-zinc-500 py-8 text-center text-xs mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-semibold text-zinc-800 uppercase">STBS Admin Dashboard</p>
            <p>&copy; {new Date().getFullYear()} STBS Ltd. All rights reserved. Tel: (01924) 763272</p>
          </div>
        </footer>
      )}
    </div>
  );
}
