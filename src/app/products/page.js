"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import useAxios from "../../hooks/useAxios";
import TableSkeleton from "../../components/ui/TableSkeleton";
import ProductModal from "../../components/ProductModal";
import BatchModal from "../../components/BatchModal";
import ManualStockModal from "../../components/ManualStockModal";

export default function ProductsPage({ hideHeader = false, hideFooter = false }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { request: axiosRequest } = useAxios();

  const [products, setProducts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Batch modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showManualStockModal, setShowManualStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Details modal state
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch products
  const fetchProducts = async (queryVal = searchQuery, isLowStockVal = lowStockFilter, pageVal = page) => {
    try {
      setListLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageVal);
      params.append("limit", 10);
      
      const sanitizedQuery = queryVal.trim().replace(/\s+/g, " ");
      if (sanitizedQuery) {
        params.append("query", sanitizedQuery);
      }

      const res = await axiosRequest({
        url: `/admin/get-all-product?${params.toString()}`,
        method: "GET"
      });

      if (res && res.success) {
        let loadedProducts = res.data?.products || [];
        let total = res.data?.pagination?.total || 0;
        
        // Filter low stock locally if required
        if (isLowStockVal) {
          loadedProducts = loadedProducts.filter(p => p.isLowStock);
          total = loadedProducts.length;
        }
        
        setProducts(loadedProducts);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalProducts(total);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchProducts(searchQuery, lowStockFilter, page);
    }
  }, [isAuthenticated, isLoading, lowStockFilter, page]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (value === "") {
      setPage(1);
      fetchProducts("", lowStockFilter, 1);
      return;
    }
    
    const timeout = setTimeout(() => {
      setPage(1);
      fetchProducts(value, lowStockFilter, 1);
    }, 500);
    
    setSearchTimeout(timeout);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    setPage(1);
    fetchProducts(searchQuery, lowStockFilter, 1);
  };

  const handleOpenBatchModal = (product) => {
    setSelectedProduct(product);
    setShowBatchModal(true);
  };

  const handleOpenManualStockModal = (product) => {
    setSelectedProduct(product);
    setShowManualStockModal(true);
  };

  const handleViewDetails = async (productId) => {
    setSelectedProductId(productId);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setDetailsError("");
    setProductDetails(null);
    try {
      // Fetch details
      const res = await axiosRequest({
        url: `/admin/get-product-by-id?productId=${productId}`,
        method: "GET"
      });

      // Fetch dynamic average cost
      let dynamicAvgCost = 0;
      try {
        const avgRes = await axiosRequest({
          url: `/admin/get-all-product-average?productId=${productId}`,
          method: "GET"
        });
        if (avgRes && avgRes.success) {
          dynamicAvgCost = avgRes.data.averageCost;
        }
      } catch (avgErr) {
        console.warn("Failed to fetch dynamic average cost:", avgErr);
      }

      if (res && res.success) {
        const detailsObj = {
          ...res.data,
          weightedAverageCost: dynamicAvgCost
        };
        setProductDetails(detailsObj);
      } else {
        throw new Error(res?.message || "Failed to fetch product details");
      }
    } catch (err) {
      console.error("Fetch product by ID error:", err);
      setDetailsError(err.message || "Failed to load product details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-650 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-medium tracking-wide">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans selection:bg-red-500/20 selection:text-red-900">
      
      {/* Navigation Header */}
      {!hideHeader && <Header />}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Products Catalog</h1>
            <p className="text-zinc-500 text-xs sm:text-sm font-light mt-1">Manage warehouse stock, product dimensions, pricing, and batches.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="self-start px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
          >
            + Add Product
          </button>
        </div>

        {/* Sleek Metrics Stats Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row justify-between gap-6 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
          <div className="flex-1 flex items-center gap-4 sm:pl-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Catalog</span>
              <span className="text-2xl font-black text-zinc-900">{totalProducts}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Low Stock Alerts</span>
              <span className="text-2xl font-black text-rose-650">{products.filter(p => p.isLowStock).length}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Quantity</span>
              <span className="text-2xl font-black text-zinc-900">{products.reduce((acc, curr) => acc + (curr.stockQty || 0), 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Average Value</span>
              <span className="text-2xl font-black text-zinc-900">
                £{(products.reduce((acc, curr) => acc + (curr.averageCost || 0) * (curr.stockQty || 0), 0) / (products.reduce((acc, curr) => acc + (curr.stockQty || 0), 0) || 1)).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Control Area */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex bg-zinc-200/60 p-1 rounded-xl w-fit">
            <button 
              onClick={() => {
                setLowStockFilter(false);
                setPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                !lowStockFilter 
                  ? "bg-white text-zinc-900 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              All Products
            </button>
            <button 
              onClick={() => {
                setLowStockFilter(true);
                setPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                lowStockFilter 
                  ? "bg-white text-zinc-900 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Low Stock Alert
            </button>
          </div>

          <form 
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 max-w-md w-full md:w-80"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-red-600 transition"
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
            <TableSkeleton cols={8} rows={6} />
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-400 text-sm font-medium">
                {searchQuery.trim() ? "No products found matching search criteria" : "No products found in database"}
              </p>
              {!searchQuery.trim() && (
                <button 
                  onClick={() => setShowModal(true)}
                  className="mt-4 text-xs font-bold text-red-600 hover:underline uppercase cursor-pointer"
                >
                  Add Your First Product
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                    <th className="py-4 px-6">SKU / Code</th>
                    <th className="py-4 px-6">Product Name</th>
                    <th className="py-4 px-6">Specifications</th>
                    <th className="py-4 px-6">Stock Level</th>
                    <th className="py-4 px-6">Pallet Price</th>
                    <th className="py-4 px-6">Board Price</th>
                    <th className="py-4 px-6">Average Cost</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700 font-medium">
                  {products.map((p) => (
                    <tr key={p._id} className="hover:bg-zinc-50/50 transition duration-150">
                      <td className="py-4 px-6">
                        <span className="bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border border-zinc-200/60 uppercase tracking-wide">
                          {p.productCode}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-zinc-900">{p.productName}</td>
                      <td className="py-4 px-6 text-zinc-500 font-normal">{p.size || "—"}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.isLowStock 
                            ? "bg-rose-50 text-rose-700 border border-rose-100" 
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isLowStock ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`}></span>
                          {p.stockQty || 0} {p.unit || "Pallets"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-zinc-900">£{(p.PricePerPallet || 0).toLocaleString()}</td>
                      <td className="py-4 px-6 text-zinc-650">£{(p.PricePerBoard || 0).toFixed(2)}</td>
                      <td className="py-4 px-6 text-zinc-550">£{(p.averageCost || 0).toFixed(2)}</td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(p._id)}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-red-50 hover:text-red-650 text-zinc-700 font-bold text-[10px] uppercase tracking-wider rounded transition duration-150 cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleOpenBatchModal(p)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-wider rounded transition duration-150 cursor-pointer"
                          >
                            + Batch
                          </button>
                          <button
                            onClick={() => handleOpenManualStockModal(p)}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[10px] uppercase tracking-wider rounded transition duration-150 cursor-pointer"
                          >
                            Add Stock
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
                    {Math.min(page * 10, totalProducts)}
                  </span>{' '}
                  of <span className="font-semibold text-zinc-800">{totalProducts}</span> products
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
                        className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold focus:z-20 ${
                          page === pageNum
                            ? "z-10 bg-red-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
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

      {/* Add Product Modal */}
      <ProductModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSuccess={() => {
          setShowModal(false);
          fetchProducts(searchQuery, lowStockFilter, page);
        }}
      />

      {/* Add Product Batch Modal */}
      <BatchModal 
        isOpen={showBatchModal}
        onClose={() => {
          setShowBatchModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={() => {
          setShowBatchModal(false);
          setSelectedProduct(null);
          fetchProducts(searchQuery, lowStockFilter, page);
        }}
      />

      {/* Add Stock Manually Modal */}
      <ManualStockModal
        isOpen={showManualStockModal}
        onClose={() => {
          setShowManualStockModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={() => {
          setShowManualStockModal(false);
          setSelectedProduct(null);
          fetchProducts(searchQuery, lowStockFilter, page);
        }}
      />

      {/* Product Details Modal Dialog */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform scale-100 transition-all p-6 sm:p-8 relative">
            
            <button
              onClick={() => {
                setShowDetailsModal(false);
                setProductDetails(null);
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
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Fetching Product Details...</p>
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
                  onClick={() => handleViewDetails(selectedProductId)}
                  className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition"
                >
                  Retry
                </button>
              </div>
            ) : productDetails ? (
              <div>
                {/* Header Banner */}
                <div className="border-b border-zinc-100 pb-6 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded uppercase tracking-wider">
                        {productDetails.productCode}
                      </span>
                      <h3 className="text-xl font-black text-zinc-900 mt-2 uppercase tracking-tight">
                        {productDetails.productName}
                      </h3>
                      <p className="text-zinc-500 text-xs font-light mt-0.5">
                        Warehouse catalog specifications & batch ledger records
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        productDetails.isLowStock ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        {productDetails.isLowStock ? "Low Stock Alert" : "In Stock"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-6">
                  {/* Basic Specifications details */}
                  <div className="bg-zinc-50/50 p-5 rounded-xl border border-zinc-100">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Specifications</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Unit</span>
                        <span className="text-sm font-semibold text-zinc-800">{productDetails.unit || "UNIT"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Dimensions / Size</span>
                        <span className="text-sm font-semibold text-zinc-800">{productDetails.size || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Container No</span>
                        <span className="text-sm font-semibold text-zinc-800 select-all">{productDetails.containerNo || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Pallet price</span>
                        <span className="text-sm font-semibold text-zinc-800">£{(productDetails.PricePerPallet || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Board price</span>
                        <span className="text-sm font-semibold text-zinc-800">£{(productDetails.PricePerBoard || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1 font-sans font-bold">Average Cost (Simple)</span>
                        <span className="text-sm font-semibold text-zinc-800 font-sans">£{(productDetails.averageCost || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1 font-sans font-bold text-red-600">Average Cost (Weighted)</span>
                        <span className="text-sm font-bold text-red-700 font-sans">£{(productDetails.weightedAverageCost !== undefined ? productDetails.weightedAverageCost : productDetails.averageCost || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1 font-sans">Low Stock Warning Limit</span>
                        <span className="text-sm font-semibold text-zinc-800 font-sans">{productDetails.lowStockWarning || 0} Pallets</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Stock Level</span>
                        <span className="text-sm font-semibold text-zinc-800">{productDetails.stockQty || 0} {productDetails.unit || "Pallets"}</span>
                      </div>
                      <div className="md:col-span-3">
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Description</span>
                        <span className="text-xs text-zinc-650 block mt-0.5">{productDetails.description || "No description provided."}</span>
                      </div>
                    </div>
                  </div>

                  {/* Batches Ledger list */}
                  <div className="bg-zinc-50/50 p-5 rounded-xl border border-zinc-100">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Stock Batches Ledger</h4>
                    
                    {!productDetails.batches || productDetails.batches.length === 0 ? (
                      <p className="text-zinc-400 text-xs italic font-light">No batches registered for this product.</p>
                    ) : (
                      <div className="overflow-x-auto border border-zinc-200 rounded-lg bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-widest uppercase">
                              <th className="py-2.5 px-4">Batch No</th>
                              <th className="py-2.5 px-4">Container No</th>
                              <th className="py-2.5 px-4">Received Qty</th>
                              <th className="py-2.5 px-4">Remaining Qty</th>
                              <th className="py-2.5 px-4">Purchase Price</th>
                              <th className="py-2.5 px-4">Cost/Unit</th>
                              <th className="py-2.5 px-4">Received Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                            {productDetails.batches.map((batch, index) => (
                              <tr key={index} className="hover:bg-zinc-50/50">
                                <td className="py-2 px-4 font-mono font-bold text-zinc-800">{batch.batchNo}</td>
                                <td className="py-2 px-4 font-mono select-all">{batch.containerNo || "—"}</td>
                                <td className="py-2 px-4">{batch.receivedPalletQty || batch.receivedQty}</td>
                                <td className="py-2 px-4">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    batch.remainingQty === 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                                  }`}>
                                    {batch.remainingQty}
                                  </span>
                                </td>
                                <td className="py-2 px-4">£{(batch.purchasePrice || 0).toLocaleString()}</td>
                                <td className="py-2 px-4">£{(batch.costPerUnit || 0).toFixed(2)}</td>
                                <td className="py-2 px-4 text-zinc-500 font-normal">
                                  {batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString() : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-6 mt-6 border-t border-zinc-100 flex justify-end">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setProductDetails(null);
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
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-semibold text-zinc-800 uppercase">STBS Admin Dashboard</p>
            <p>&copy; {new Date().getFullYear()} STBS Ltd. All rights reserved. Tel: (01924) 763272</p>
          </div>
        </footer>
      )}

    </div>
  );
}
