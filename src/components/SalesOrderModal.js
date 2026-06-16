"use client";

import { useState, useEffect, useMemo } from "react";
import useAxios from "../hooks/useAxios";

export default function SalesOrderModal({ isOpen, onClose, onSuccess, order = null }) {
  const { request: axiosRequest } = useAxios();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form states
  const [customerId, setCustomerId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("collection");
  const [notes, setNotes] = useState("");
  const [customerOrderNo, setCustomerOrderNo] = useState("");
  const [purchaseOrderNo, setPurchaseOrderNo] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [items, setItems] = useState([
    { product: "", qtyType: "pallet", qty: 1, unitPrice: 0, discount: 0 }
  ]);

  // Fetch active customers and products on mount/open
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      setLoadingData(true);
      setError("");
      try {
        const [custRes, prodRes] = await Promise.all([
          axiosRequest({
            url: "/admin/get-all-customer?limit=200&isArchived=false",
            method: "GET"
          }),
          axiosRequest({
            url: "/admin/get-all-product?limit=200",
            method: "GET"
          })
        ]);

        if (custRes && custRes.success) {
          setCustomers(custRes.data?.customers || []);
        }
        if (prodRes && prodRes.success) {
          setProducts(prodRes.data?.products || []);
        }
      } catch (err) {
        console.error("Fetch form select data error:", err);
        setError("Failed to load customer or product database lists.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Prefill in edit mode
  useEffect(() => {
    if (isOpen && order) {
      setCustomerId(order.customerId?._id || order.customerId || "");
      setDeliveryMethod(order.deliveryMethod || "collection");
      setNotes(order.notes || "");
      setCustomerOrderNo(order.customerOrderNo || "");
      setPurchaseOrderNo(order.purchaseOrderNo || "");
      setDeliveryAddress(order.deliveryAddress || "");
      
      if (order.items && order.items.length > 0) {
        const mappedItems = order.items.map((item) => ({
          product: item.product?._id || item.product || "",
          qtyType: item.qtyType || "pallet",
          qty: item.qty || 1,
          unitPrice: item.unitPrice || 0,
          discount: item.discount || 0
        }));
        setItems(mappedItems);
      }
    } else if (isOpen && !order) {
      // Clear form for create mode
      setCustomerId("");
      setDeliveryMethod("collection");
      setNotes("");
      setCustomerOrderNo("");
      setPurchaseOrderNo("");
      setDeliveryAddress("");
      setItems([{ product: "", qtyType: "pallet", qty: 1, unitPrice: 0, discount: 0 }]);
    }
  }, [isOpen, order]);

  // Handle customer selection changes to auto-fill delivery address in create mode
  useEffect(() => {
    if (customerId && !order) {
      const selected = customers.find((c) => c._id === customerId);
      if (selected && selected.deliveryAddress) {
        const addrParts = [];
        if (selected.deliveryAddress.line1) addrParts.push(selected.deliveryAddress.line1);
        if (selected.deliveryAddress.line2) addrParts.push(selected.deliveryAddress.line2);
        if (selected.deliveryAddress.city) addrParts.push(selected.deliveryAddress.city);
        if (selected.deliveryAddress.state) addrParts.push(selected.deliveryAddress.state);
        if (selected.deliveryAddress.postcode) addrParts.push(selected.deliveryAddress.postcode);
        setDeliveryAddress(addrParts.join(", "));
      }
    }
  }, [customerId, customers, order]);

  // Find selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c._id === customerId);
  }, [customers, customerId]);

  // Map products for fast lookup
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p._id, p));
    return map;
  }, [products]);

  // Compute calculated line item values
  const computedItems = useMemo(() => {
    return items.map((item) => {
      const prod = productMap.get(item.product);
      const qtyVal = Number(item.qty) || 0;
      const priceVal = Number(item.unitPrice) || 0;
      const discountVal = Number(item.discount) || 0;

      const net = Math.max(0, qtyVal * priceVal - discountVal);
      const vat = net * 0.2;
      const gross = net + vat;

      return {
        ...item,
        productObj: prod,
        net,
        vat,
        gross
      };
    });
  }, [items, productMap]);

  // Compute overall order totals
  const totals = useMemo(() => {
    let net = 0;
    let vat = 0;
    let gross = 0;

    computedItems.forEach((item) => {
      net += item.net;
      vat += item.vat;
      gross += item.gross;
    });

    return {
      net: Number(net.toFixed(2)),
      vat: Number(vat.toFixed(2)),
      gross: Number(gross.toFixed(2))
    };
  }, [computedItems]);

  // Perform dynamic validation messages
  const validationWarnings = useMemo(() => {
    const warnings = [];
    if (!selectedCustomer) return warnings;

    // 1. Suspension check
    if (selectedCustomer.isSuspended) {
      warnings.push("Account is suspended due to overdue invoices. Submission will be blocked.");
    }

    // 2. PC customer checks
    if (selectedCustomer.customerType === "PC") {
      if (selectedCustomer.accountBalance < 0) {
        warnings.push(`PC customer has outstanding dues of £${Math.abs(selectedCustomer.accountBalance).toFixed(2)}. Submission will be blocked.`);
      }
    }

    // 3. CC customer checks
    if (selectedCustomer.customerType === "CC") {
      const remainingCredit = selectedCustomer.creditLimit + selectedCustomer.accountBalance;
      const currentOrderTotal = totals.gross;

      if (order) {
        // Edit mode: incremental credit validation
        const originalTotal = order.totalGross || 0;
        const change = currentOrderTotal - originalTotal;
        if (change > 0 && remainingCredit < change) {
          warnings.push(`Order total increase of £${change.toFixed(2)} exceeds available credit limit of £${Math.max(0, remainingCredit).toFixed(2)}.`);
        }
      } else {
        // Create mode: full credit limit check
        if (currentOrderTotal > remainingCredit) {
          warnings.push(`Order total of £${currentOrderTotal.toFixed(2)} exceeds available credit limit of £${Math.max(0, remainingCredit).toFixed(2)}.`);
        }
      }
    }

    // 4. Stock validation checks
    computedItems.forEach((item, index) => {
      if (item.productObj) {
        const availableStock = item.productObj.stockQty || 0;
        let qtyChange = item.qty;

        if (order) {
          // Compare with original order product quantity if matches
          const origItem = order.items.find(
            (oi) => (oi.product?._id || oi.product) === item.product
          );
          if (origItem) {
            qtyChange = item.qty - origItem.qty;
          }
        }

        if (availableStock < qtyChange) {
          warnings.push(
            `Line #${index + 1} (${item.productObj.productName}): Insufficient stock. Available: ${availableStock}, Requested Change: ${qtyChange}`
          );
        }
      }
    });

    return warnings;
  }, [selectedCustomer, totals, computedItems, order]);

  // Check if order is in a non-editable state (dispatched, invoiced, delivered, cancelled)
  const isOrderLocked = order && ["dispatched", "invoiced", "delivered", "cancelled"].includes(order.status);

  if (!isOpen) return null;

  // Handle adding a new item line
  const handleAddItemLine = () => {
    setItems((prev) => [
      ...prev,
      { product: "", qtyType: "pallet", qty: 1, unitPrice: 0, discount: 0 }
    ]);
  };

  // Handle removing an item line
  const handleRemoveItemLine = (idxToRemove) => {
    if (items.length === 1) return; // Must keep at least one item
    setItems((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Handle changes within an item row
  const handleItemRowChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const currentItem = { ...updated[index], [field]: value };

      // Prefill unit price if user selects a product or toggles quantity type
      if (field === "product" || field === "qtyType") {
        const selectedProd = productMap.get(currentItem.product);
        if (selectedProd) {
          currentItem.unitPrice =
            currentItem.qtyType === "pallet"
              ? selectedProd.PricePerPallet || 0
              : selectedProd.PricePerBoard || 0;
        } else {
          currentItem.unitPrice = 0;
        }
      }

      updated[index] = currentItem;
      return updated;
    });
  };

  // Submit form payload
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate simple required fields
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    const invalidItem = items.some((i) => !i.product || i.qty <= 0 || !i.unitPrice || Number(i.unitPrice) <= 0);
    if (invalidItem) {
      setError("All line items require a product, quantity greater than 0, and a unit price greater than £0. Please fill in missing prices.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customerId,
        customerOrderNo: customerOrderNo.trim(),
        purchaseOrderNo: purchaseOrderNo.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryMethod,
        items: items.map((i) => ({
          product: i.product,
          qtyType: i.qtyType,
          qty: Number(i.qty),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount) || 0
        })),
        notes: notes.trim()
      };

      let res;
      if (order) {
        // Edit mode
        res = await axiosRequest({
          url: "/admin/update-sales-order",
          method: "PATCH",
          data: {
            salesOrderId: order._id,
            customerOrderNo: payload.customerOrderNo,
            purchaseOrderNo: payload.purchaseOrderNo,
            deliveryAddress: payload.deliveryAddress,
            deliveryMethod: payload.deliveryMethod,
            notes: payload.notes,
            items: payload.items
          }
        });
      } else {
        // Create mode
        res = await axiosRequest({
          url: "/admin/create-sales-order",
          method: "POST",
          data: payload
        });
      }

      if (res && res.success) {
        onSuccess();
      } else {
        throw new Error(res?.message || "Failed to process sales order.");
      }
    } catch (err) {
      console.error("Sales Order submission error:", err);
      setError(err.message || "An error occurred while saving the sales order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform scale-100 transition-all p-6 sm:p-8 relative">
        
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
          {order ? `Edit Sales Order: ${order.salesOrderNumber}` : "Create Sales Order"}
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          {order
            ? "Modify customer items, delivery terms, and calculate invoice totals."
            : "Initiate a new wholesale sales order and verify client credit limits."}
        </p>

        {/* Locked order banner */}
        {isOrderLocked && (
          <div className="mb-5 p-3.5 bg-zinc-100 border border-zinc-200 rounded-lg flex items-center gap-2.5 text-xs text-zinc-600 font-semibold">
            <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>This order is <strong className="uppercase">{order.status}</strong> and cannot be modified. View only.</span>
          </div>
        )}

        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Loading databases...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Error alerts */}
            {error && (
              <div className="p-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Validation warnings alerts */}
            {validationWarnings.length > 0 && (
              <div className="p-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                <div className="font-bold flex items-center gap-2 mb-1.5 text-amber-900">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>ORDER POLICY VIOLATIONS DETECTED:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx} className="font-semibold">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 1: Customer details & Delivery */}
            <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Customer & Logistical Terms</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Customer Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                    Customer Account *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                    required
                    disabled={submitting || order !== null} // Read-only in edit mode
                  >
                    <option value="">-- Select Customer Account --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.businessName} ({c.customerCode}) [{c.customerType}]
                      </option>
                    ))}
                  </select>

                  {/* Customer limit ledger summary */}
                  {selectedCustomer && (
                    <div className="mt-2 p-2.5 rounded-lg bg-zinc-100/50 border border-zinc-200/50 text-[10px] text-zinc-500 flex flex-wrap gap-x-4 gap-y-1 font-semibold uppercase tracking-wider">
                      <span>Terms: <strong className="text-zinc-700">{selectedCustomer.customerType}</strong></span>
                      <span>Balance: <strong className={selectedCustomer.accountBalance < 0 ? "text-red-650" : "text-emerald-600"}>£{selectedCustomer.accountBalance.toFixed(2)}</strong></span>
                      {selectedCustomer.customerType === "CC" && (
                        <>
                          <span>Limit: <strong className="text-zinc-700">£{selectedCustomer.creditLimit.toFixed(2)}</strong></span>
                          <span>Remaining Credit: <strong className="text-zinc-700">£{(selectedCustomer.creditLimit + selectedCustomer.accountBalance).toFixed(2)}</strong></span>
                        </>
                      )}
                      {selectedCustomer.isSuspended && (
                        <span className="text-red-650 font-bold shrink-0">Status: Account Suspended!</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery Method Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                    Delivery Method *
                  </label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                    required
                    disabled={submitting}
                  >
                    <option value="collection">Collection (Collect in Person)</option>
                    <option value="eco">Eco (Standard Economy Delivery)</option>
                    <option value="express">Express (Next-day Shipment)</option>
                  </select>
                </div>

                {/* Customer Order No */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                    Customer Order No
                  </label>
                  <input
                    type="text"
                    value={customerOrderNo}
                    onChange={(e) => setCustomerOrderNo(e.target.value)}
                    placeholder="e.g. CO-12345"
                    className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                    disabled={submitting}
                  />
                </div>

                {/* Purchase Order No */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                    Purchase Order No
                  </label>
                  <input
                    type="text"
                    value={purchaseOrderNo}
                    onChange={(e) => setPurchaseOrderNo(e.target.value)}
                    placeholder="e.g. PO-887712"
                    className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                    disabled={submitting}
                  />
                </div>

                {/* Delivery Address */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                    Delivery Address
                  </label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. Industrial Area, Plot No. 22, Dubai"
                    rows={2}
                    className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition resize-none"
                    disabled={submitting}
                  />
                </div>

              </div>
            </div>

            {/* Section 2: Lines Items Sub-table */}
            <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Order Line Items
                </h4>
                <button
                  type="button"
                  onClick={handleAddItemLine}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-[10px] uppercase tracking-wider rounded-md transition cursor-pointer"
                  disabled={submitting}
                >
                  + Add Line
                </button>
              </div>

              <div className="space-y-3.5">
                {items.map((item, idx) => {
                  const compItem = computedItems[idx];
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-2 md:grid-cols-12 gap-3 p-3 bg-white border border-zinc-200 rounded-xl relative group items-end"
                    >
                      {/* Delete item button */}
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemLine(idx)}
                          className="absolute -top-2.5 -right-2.5 bg-white border border-zinc-200 text-zinc-400 hover:text-red-650 hover:border-red-100 p-1.5 rounded-full shadow-sm hover:shadow transition opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete line"
                          disabled={submitting}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}

                      {/* Product Selector */}
                      <div className="md:col-span-4">
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1 font-sans">
                          Product Line *
                        </label>
                        <select
                          value={item.product}
                          onChange={(e) => handleItemRowChange(idx, "product", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                          required
                          disabled={submitting}
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.productName} ({p.productCode})
                            </option>
                          ))}
                        </select>
                        
                        {/* Warehouse Stock Level tag */}
                        {compItem?.productObj && (
                          <span className="block text-[8px] font-bold text-zinc-400 uppercase mt-1">
                            Warehouse Stock: <strong className="text-zinc-600">{compItem.productObj.stockQty} Units</strong>
                          </span>
                        )}
                      </div>

                      {/* Quantity Type Toggle */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1 font-sans">
                          Unit Type *
                        </label>
                        <select
                          value={item.qtyType}
                          onChange={(e) => handleItemRowChange(idx, "qtyType", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition"
                          required
                          disabled={submitting}
                        >
                          <option value="pallet">Pallet</option>
                          <option value="board">Board</option>
                        </select>
                      </div>

                      {/* Quantity Input */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1 font-sans">
                          Qty *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemRowChange(idx, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition text-center"
                          required
                          disabled={submitting}
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1 font-sans">
                          Price (£) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemRowChange(idx, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full px-2 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition text-right"
                          required
                          disabled={submitting}
                        />
                      </div>

                      {/* Discount Input */}
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1 font-sans">
                          Disc (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discount}
                          onChange={(e) => handleItemRowChange(idx, "discount", Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full px-2 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition text-right"
                          disabled={submitting}
                        />
                      </div>

                      {/* Line calculations review */}
                      <div className="md:col-span-1 text-right font-mono text-[10px] text-zinc-500 pb-2">
                        <span className="block text-[8px] font-bold text-zinc-400 uppercase mb-0.5 font-sans">Gross Total</span>
                        <strong className="text-zinc-800">£{compItem?.gross.toFixed(2)}</strong>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Notes & Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Order Notes text area */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                  Internal Order Notes / Instructions (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record carrier dispatch codes, custom price validations, packaging details..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition resize-none"
                  disabled={submitting}
                />
              </div>

              {/* Total calculations ledger */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex flex-col justify-between h-fit gap-3.5">
                <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200/50 pb-1.5">
                  Ledger Financial Breakdown
                </h5>
                <div className="space-y-2 text-xs uppercase tracking-wider font-semibold text-zinc-500">
                  <div className="flex justify-between">
                    <span>Total Net:</span>
                    <span className="font-mono text-zinc-850 font-bold">£{totals.net.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total VAT (20%):</span>
                    <span className="font-mono text-zinc-850 font-bold">£{totals.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-zinc-200/60 pt-2 text-sm text-zinc-800 font-extrabold">
                    <span>Total Gross:</span>
                    <span className="font-mono text-red-650">£{totals.gross.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Form Actions Footer */}
            <div className="flex items-center justify-end gap-3.5 border-t border-zinc-100 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
                disabled={submitting}
              >
                {isOrderLocked ? "Close" : "Cancel"}
              </button>
              {!isOrderLocked && (
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 cursor-pointer"
                  disabled={submitting}
                >
                  {submitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{order ? "Save Changes" : "Submit Sales Order"}</span>
                </button>
              )}
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
