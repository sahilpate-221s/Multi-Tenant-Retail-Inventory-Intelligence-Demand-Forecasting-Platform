import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../lib/authContext";
import { useProducts, useCreateProduct } from "../hooks/useProducts";
import { useInventory } from "../hooks/useInventory";
import { useCreateSale, useSales, useProcessReturn } from "../hooks/useSales";
import { useStoreSettings } from "../hooks/useSettings";
import { useKhata } from "../hooks/useKhata";
import { apiClient } from "../lib/apiClient";
import type { Product, CreateSaleInput, Sale } from "../lib/types";
import CameraBarcodeScanner, { type ScanResult } from "../components/scanner/CameraBarcodeScanner";
import { lookupBarcodeInfo } from "../lib/barcodeLookup";

// Retail POS scanner beep synthesizer
function playBeepSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1850, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.09);
  } catch {
    // Autoplay blocked fallback
  }
}

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string | null;
  unitPrice: number;
  costPrice?: number;
  hsnCode?: string | null;
  gstRate?: number;
  quantity: number;
  stockAvailable: number;
}

// Compact UPI QR component
function CompactUpiQr({ amount, currency }: { amount: number; currency: string }) {
  const modules = useMemo(() => {
    const size = 21;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    const drawFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[row + r][col + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    let seed = Math.round(amount * 100) + 7713;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder1 = r < 8 && c < 8;
        const inFinder2 = r < 8 && c >= size - 8;
        const inFinder3 = r >= size - 8 && c < 8;
        const inTiming = r === 6 || c === 6;
        if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming) {
          seed = (seed * 9301 + 49297) % 233280;
          grid[r][c] = seed / 233280 > 0.48;
        }
      }
    }
    return { grid, size };
  }, [amount]);

  return (
    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-zinc-200">
      <svg
        viewBox={`0 0 ${modules.size} ${modules.size}`}
        className="w-20 h-20 rounded bg-white shrink-0"
        shapeRendering="crispEdges"
      >
        {modules.grid.map((row, r) =>
          row.map((active, c) =>
            active ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#09090b" /> : null
          )
        )}
      </svg>
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-zinc-900">Scan UPI QR to Pay</div>
        <div className="text-sm font-mono font-black text-[#d4a853] mt-0.5">{currency}{amount.toFixed(2)}</div>
        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">GPay • PhonePe • Paytm</div>
      </div>
    </div>
  );
}

export default function PosPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const { data: store } = useStoreSettings();
  const currency = store?.currency === "USD" ? "$" : store?.currency === "EUR" ? "€" : store?.currency === "GBP" ? "£" : "₹";
  const { recordSale: recordKhataSale } = useKhata();
  const createSaleMutation = useCreateSale();
  const createProductMutation = useCreateProduct();
  const processReturnMutation = useProcessReturn();
  const { data: recentSalesData, refetch: refetchSales } = useSales({ limit: 12 });
  const { data: inventory = [] } = useInventory();

  // Stock lookup map
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    inventory.forEach((i) => map.set(i.productId, i.currentStock));
    return map;
  }, [inventory]);

  // Unified Search & Scanner state
  const [searchTerm, setSearchTerm] = useState("");
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannerResult, setScannerResult] = useState<ScanResult | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Mobile layout tab toggle: 'bill' vs 'catalog'
  const [mobileTab, setMobileTab] = useState<"bill" | "catalog">("bill");

  // Quick Add Item Modal (for scanned barcodes not in catalog)
  const [quickAddItem, setQuickAddItem] = useState<{
    barcode: string;
    name: string;
    price: string;
    costPrice: string;
    hsnCode: string;
    gstRate: string;
    isSaving: boolean;
  } | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Return & Exchange Flow State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnSearchInvoice, setReturnSearchInvoice] = useState("");
  const [selectedReturnSale, setSelectedReturnSale] = useState<Sale | null>(null);
  const [isLoadingSale, setIsLoadingSale] = useState(false);
  const [returnItemSelections, setReturnItemSelections] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState("Customer exchange / changed mind");
  const [customReturnReason, setCustomReturnReason] = useState("");
  const [exchangeCredit, setExchangeCredit] = useState<{
    saleId: string;
    amount: number;
    itemsDescription: string;
  } | null>(null);
  const [refundVoucher, setRefundVoucher] = useState<{
    saleId: string;
    refundMode: string;
    totalRefundAmount: number;
    items: { productName: string; quantity: number; refundAmount: number }[];
    date: string;
  } | null>(null);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "credit">("cash");
  const [tenderedAmount, setTenderedAmount] = useState<number | "">("");
  const [creditCustomerName, setCreditCustomerName] = useState("");
  const [creditCustomerPhone, setCreditCustomerPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cardReference, setCardReference] = useState("");
  const [upiVerified, setUpiVerified] = useState(false);

  // Receipt Modal state
  const [completedOrder, setCompletedOrder] = useState<{
    id: string;
    totalAmount: number;
    subtotal: number;
    discountAmount: number;
    items: CartItem[];
    paymentMethod: string;
    saleDate: string;
    tenderedAmount?: number;
    changeAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    totalTax?: number;
    taxableAmount?: number;
    exchangeCreditAmount?: number;
    exchangeCreditSaleId?: string;
    gstGroups?: Array<{
      hsnCode: string;
      gstRate: number;
      taxableValue: number;
      cgstAmount: number;
      sgstAmount: number;
      totalTax: number;
    }>;
  } | null>(null);

  // Products catalogue
  const { data: productsData } = useProducts({
    search: searchTerm.trim() || undefined,
    page: 1,
    pageSize: 40,
    isActive: "true",
    sortBy: "name",
    sortOrder: "asc",
  });
  const products = productsData?.items || [];

  // Auto focus scanner input on mount
  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (completedOrder) {
          setCompletedOrder(null);
        } else if (refundVoucher) {
          setRefundVoucher(null);
        } else if (quickAddItem) {
          setQuickAddItem(null);
        } else if (isReturnModalOpen) {
          setIsReturnModalOpen(false);
        } else if (cart.length > 0) {
          clearCart();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completedOrder, refundVoucher, quickAddItem, isReturnModalOpen, cart.length]);

  // Cart operations
  const addToCart = (product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
    sellingPrice: number | string;
    costPrice?: number | string | null;
    hsnCode?: string | null;
    gstRate?: number | string | null;
  }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unitPrice: Number(product.sellingPrice),
          costPrice: Number(product.costPrice || 0),
          hsnCode: product.hsnCode ?? null,
          gstRate: product.gstRate !== undefined && product.gstRate !== null ? Number(product.gstRate) : 0,
          quantity: 1,
          stockAvailable: stockMap.get(product.id) ?? 999,
        },
      ];
    });
    // On mobile, auto-switch to bill tab so user sees the added item immediately
    setMobileTab("bill");
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setExchangeCredit(null);
    setTenderedAmount("");
    setCreditCustomerName("");
    setCreditCustomerPhone("");
    setCardReference("");
    setErrorMessage("");
    setUpiVerified(false);
    scanInputRef.current?.focus();
  };

  // Financial Calculations with Exchange Credit & GST
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const exchangeCreditAmount = exchangeCredit?.amount || 0;

  const grandTotal = Math.max(0, subtotal - discountAmount - exchangeCreditAmount);

  const changeDue =
    typeof tenderedAmount === "number" && tenderedAmount >= grandTotal
      ? tenderedAmount - grandTotal
      : 0;

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Indian GST Tax Grouping Calculation (MRP-Inclusive)
  const gstBreakdown = useMemo(() => {
    const groups: Record<
      string,
      {
        hsnCode: string;
        gstRate: number;
        taxableValue: number;
        cgstAmount: number;
        sgstAmount: number;
        totalTax: number;
      }
    > = {};

    cart.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const rate = item.gstRate || 0;
      const hsn = item.hsnCode || "GENERIC";
      const key = `${hsn}-${rate}`;

      let taxable = lineTotal;
      let tax = 0;
      if (rate > 0) {
        taxable = lineTotal / (1 + rate / 100);
        tax = lineTotal - taxable;
      }

      if (!groups[key]) {
        groups[key] = {
          hsnCode: hsn,
          gstRate: rate,
          taxableValue: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          totalTax: 0,
        };
      }

      groups[key].taxableValue += taxable;
      groups[key].totalTax += tax;
    });

    let totalTaxable = 0;
    let totalTax = 0;
    const list = Object.values(groups).map((g) => {
      const cgst = Math.round((g.totalTax / 2) * 100) / 100;
      const sgst = Math.round((g.totalTax - cgst) * 100) / 100;
      totalTaxable += g.taxableValue;
      totalTax += g.totalTax;
      return {
        ...g,
        taxableValue: Math.round(g.taxableValue * 100) / 100,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalTax: Math.round(g.totalTax * 100) / 100,
      };
    });

    return {
      groups: list,
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      cgstTotal: Math.round((totalTax / 2) * 100) / 100,
      sgstTotal: Math.round((totalTax - Math.round((totalTax / 2) * 100) / 100) * 100) / 100,
    };
  }, [cart]);

  // Load sale details for Return / Exchange flow
  const handleLoadReturnSale = async (saleIdToLoad: string) => {
    const cleanId = saleIdToLoad.trim().replace(/^ORD-/i, "");
    if (!cleanId) return;

    setIsLoadingSale(true);
    setErrorMessage("");
    try {
      const saleData = await apiClient.get<Sale>(`/api/sales/${cleanId}`);
      if (saleData && saleData.id) {
        setSelectedReturnSale(saleData);
        setReturnItemSelections({});
      } else {
        setErrorMessage(`Sale #${saleIdToLoad} not found.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Invoice '${saleIdToLoad}' not found.`);
    } finally {
      setIsLoadingSale(false);
    }
  };

  // Process Return / Refund / Exchange submission
  const handleProcessReturnSubmit = async (mode: "cash" | "exchange_credit") => {
    if (!selectedReturnSale) return;

    const itemsToReturn = Object.entries(returnItemSelections)
      .filter(([_, qty]) => qty > 0)
      .map(([saleItemId, quantity]) => {
        const effectiveReason =
          returnReason === "Other" && customReturnReason.trim()
            ? customReturnReason.trim()
            : returnReason;
        return {
          saleItemId,
          quantity,
          reason: effectiveReason,
        };
      });

    if (itemsToReturn.length === 0) {
      setErrorMessage("Please select at least 1 item quantity to return.");
      return;
    }

    try {
      const result = await processReturnMutation.mutateAsync({
        saleId: selectedReturnSale.id,
        refundMode: mode,
        items: itemsToReturn,
      });

      if (mode === "exchange_credit") {
        // Apply credit to current active POS bill
        const desc = result.items.map((i) => `${i.productName} x${i.quantity}`).join(", ");
        setExchangeCredit({
          saleId: selectedReturnSale.id,
          amount: result.totalRefundAmount,
          itemsDescription: desc,
        });
        setIsReturnModalOpen(false);
        setSelectedReturnSale(null);
        setReturnItemSelections({});
        setScanStatus(`✓ Exchange credit ₹${result.totalRefundAmount.toFixed(2)} applied to current bill!`);
        setTimeout(() => setScanStatus(null), 3500);
      } else {
        // Cash refund mode: Show Refund Voucher
        setRefundVoucher({
          saleId: selectedReturnSale.id,
          refundMode: "cash",
          totalRefundAmount: result.totalRefundAmount,
          items: result.items.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            refundAmount: i.refundAmount,
          })),
          date: new Date().toLocaleString(),
        });
        setIsReturnModalOpen(false);
        setSelectedReturnSale(null);
        setReturnItemSelections({});
      }
      refetchSales();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process return. Please verify item quantities.");
    }
  };

  // Process barcode from either manual input or camera scanner
  const processBarcode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setScannerResult({ code, status: "searching" });
    setScanStatus(`🔍 Searching for '${code}'...`);

    // 1. Check local loaded products first (fastest)
    const localMatch = products.find(
      (p) => (p.barcode && p.barcode.trim() === code) || p.sku.toLowerCase() === code.toLowerCase()
    );
    if (localMatch) {
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(80);
      addToCart(localMatch);
      setScannerResult({
        code,
        status: "found",
        productName: `${localMatch.name} (${currency}${Number(localMatch.sellingPrice).toFixed(2)})`,
      });
      setScanStatus(`✓ Added ${localMatch.name}`);
      setSearchTerm("");
      setTimeout(() => setScanStatus(null), 2500);
      return;
    }

    // 2. Query backend store database
    try {
      const res = await apiClient.get<Product>(`/api/products/barcode/${encodeURIComponent(code)}`);
      if (res && res.id) {
        playBeepSound();
        if (navigator.vibrate) navigator.vibrate(80);
        addToCart(res);
        setScannerResult({
          code,
          status: "found",
          productName: `${res.name} (${currency}${Number(res.sellingPrice).toFixed(2)})`,
        });
        setScanStatus(`✓ Added ${res.name}`);
        setSearchTerm("");
        setTimeout(() => setScanStatus(null), 2500);
        return;
      }
    } catch {
      // Not in store database — fall through to online lookup & quick add
    }

    // 3. Not in store database: Look up product info online (Open Food Facts / Open Products Facts)
    setScannerResult({ code, status: "searching" });
    setScanStatus(`Looking up barcode ${code} online...`);

    try {
      const onlineInfo = await lookupBarcodeInfo(code);
      const prefilledName = onlineInfo?.name || "";

      setScannerResult({
        code,
        status: prefilledName ? "found" : "not_found",
        productName: prefilledName
          ? `Found: ${prefilledName} (Opening Quick Add...)`
          : "Not in catalog — Opening Quick Add...",
      });

      // Close scanner modal and show Quick Add item prompt
      setTimeout(() => {
        setIsCameraScannerOpen(false);
        setScannerResult(null);
        setQuickAddItem({
          barcode: code,
          name: prefilledName,
          price: "",
          costPrice: "",
          hsnCode: "",
          gstRate: "18",
          isSaving: false,
        });
        setScanStatus(prefilledName ? `✓ Identified '${prefilledName}'` : `Item '${code}' not in catalog`);
      }, 700);
    } catch {
      setIsCameraScannerOpen(false);
      setQuickAddItem({
        barcode: code,
        name: "",
        price: "",
        costPrice: "",
        hsnCode: "",
        gstRate: "18",
        isSaving: false,
      });
      setScanStatus(`Item '${code}' not in catalog`);
    }
  };

  // Quick scan submit via Enter key
  const handleScanKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchTerm.trim()) {
        processBarcode(searchTerm.trim());
      }
    }
  };

  // Quick Add Item Handler (saves to catalog & adds to current cart)
  const handleQuickAddSubmit = async (saveToCatalog: boolean) => {
    if (!quickAddItem) return;
    const name = quickAddItem.name.trim() || `Item ${quickAddItem.barcode.slice(-4)}`;
    const price = parseFloat(quickAddItem.price) || 0;
    const cost = parseFloat(quickAddItem.costPrice) || 0;
    const hsn = quickAddItem.hsnCode.trim() || null;
    const rate = quickAddItem.gstRate ? Number(quickAddItem.gstRate) : 18;

    if (price <= 0) {
      setErrorMessage("Please enter a valid selling price greater than 0.");
      return;
    }

    setQuickAddItem((prev) => (prev ? { ...prev, isSaving: true } : null));

    try {
      if (saveToCatalog) {
        // Create in backend product database
        const skuSeed = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "SKU";
        const newProduct = await createProductMutation.mutateAsync({
          name,
          sku: `${skuSeed}-${quickAddItem.barcode.slice(-4)}`,
          barcode: quickAddItem.barcode,
          sellingPrice: price,
          costPrice: cost,
          hsnCode: hsn,
          gstRate: rate,
          initialStock: 25,
          isActive: true,
        });
        addToCart(newProduct);
      } else {
        // Direct cart-only line item
        addToCart({
          id: `custom-${Date.now()}`,
          name,
          sku: `CUSTOM-${quickAddItem.barcode.slice(-4)}`,
          barcode: quickAddItem.barcode,
          sellingPrice: price,
          costPrice: cost,
          hsnCode: hsn,
          gstRate: rate,
        });
      }

      playBeepSound();
      setScanStatus(`✓ Added ${name} (${currency}${price.toFixed(2)})`);
      setQuickAddItem(null);
      setSearchTerm("");
      setTimeout(() => setScanStatus(null), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add product. Adding as custom item instead.");
      addToCart({
        id: `custom-${Date.now()}`,
        name,
        sku: `CUSTOM-${quickAddItem.barcode.slice(-4)}`,
        barcode: quickAddItem.barcode,
        sellingPrice: price,
        costPrice: cost,
        hsnCode: hsn,
        gstRate: rate,
      });
      setQuickAddItem(null);
    }
  };

  // Complete Sale Handler
  const handleCompleteSale = async () => {
    setErrorMessage("");

    if (cart.length === 0) {
      setErrorMessage("Cart is empty! Scan or select items to bill.");
      return;
    }

    if (paymentMethod === "cash" && typeof tenderedAmount === "number" && tenderedAmount < grandTotal) {
      setErrorMessage(`Tendered cash is less than grand total (${currency}${grandTotal.toFixed(2)}).`);
      return;
    }

    if (paymentMethod === "credit" && !creditCustomerName.trim()) {
      setErrorMessage("Please enter customer name for Khata / Store Credit.");
      return;
    }

    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const validItems = cart.filter((i) => !i.productId.startsWith("custom-"));

      const payload: CreateSaleInput = {
        saleDate: todayIso,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        notes: `Counter POS Sale | Pay: ${paymentMethod.toUpperCase()}${
          paymentMethod === "card" && cardReference ? ` (Ref: ${cardReference})` : ""
        }${paymentMethod === "upi" ? " (UPI QR)" : ""}${
          tenderedAmount ? ` | Tendered: ${currency}${tenderedAmount}` : ""
        }${creditCustomerName ? ` | Khata: ${creditCustomerName} (${creditCustomerPhone || "No Phone"})` : ""}${
          exchangeCredit
            ? ` | Exchange Credit Applied: -${currency}${exchangeCredit.amount.toFixed(2)} (Bill #${exchangeCredit.saleId.slice(0, 8)})`
            : ""
        }`,
      };

      const res = await createSaleMutation.mutateAsync(payload);

      if (paymentMethod === "credit" && creditCustomerName.trim()) {
        recordKhataSale(
          creditCustomerName.trim(),
          creditCustomerPhone.trim(),
          grandTotal,
          res.id,
          `Counter Sale ORD-${res.id.slice(0, 8).toUpperCase()}`
        );
      }

      setCompletedOrder({
        id: res.id,
        totalAmount: grandTotal,
        subtotal,
        discountAmount,
        items: [...cart],
        paymentMethod: paymentMethod === "credit" ? `KHATA (${creditCustomerName})` : paymentMethod.toUpperCase(),
        saleDate: new Date().toLocaleString(),
        tenderedAmount: typeof tenderedAmount === "number" ? tenderedAmount : undefined,
        changeAmount: changeDue,
        cgstAmount: gstBreakdown.cgstTotal,
        sgstAmount: gstBreakdown.sgstTotal,
        totalTax: gstBreakdown.totalTax,
        taxableAmount: gstBreakdown.totalTaxable,
        exchangeCreditAmount: exchangeCredit?.amount || 0,
        exchangeCreditSaleId: exchangeCredit?.saleId || undefined,
        gstGroups: gstBreakdown.groups,
      });

      // Clear cart and exchange credit
      setCart([]);
      setDiscountPercent(0);
      setExchangeCredit(null);
      setTenderedAmount("");
      setCreditCustomerName("");
      setCreditCustomerPhone("");
      setCardReference("");
      setUpiVerified(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process sale. Check inventory availability.");
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1600px] mx-auto select-none min-h-screen">
      {/* ─── Top Header: Clean, Uncluttered ─── */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4a853] to-[#f5cf7b] flex items-center justify-center text-[#0c0c0e] font-black text-sm shadow-[0_0_15px_rgba(212,168,83,0.3)]">
            ⚡
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-[#f4f4f5] tracking-tight leading-none">
              Billing Counter
            </h1>
            <span className="text-[10px] text-[#71717a] font-medium">
              High-Speed POS · Ready to Scan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsReturnModalOpen(true);
              setReturnSearchInvoice("");
              setSelectedReturnSale(null);
              setReturnItemSelections({});
              refetchSales();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1e1e28] hover:bg-[#282838] text-[#f5cf7b] border border-[#d4a853]/40 hover:border-[#d4a853] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <span>🔄</span>
            <span>Return / Exchange</span>
          </button>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
            >
              Clear Cart
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCameraScannerOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] text-[#0c0c0e] hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>📷</span>
            <span>Scan Camera</span>
          </button>
        </div>
      </div>

      {/* ─── Error Notification ─── */}
      {errorMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="text-rose-400 hover:text-rose-200 cursor-pointer">✕</button>
        </div>
      )}

      {/* ─── Unified Search & Barcode Bar ─── */}
      <div className="mt-3 p-2.5 rounded-xl bg-[#121218] border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#71717a]">
              🔍
            </span>
            <input
              ref={scanInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleScanKeyDown}
              placeholder="Scan barcode gun or type product / SKU... (Press Enter to Add)"
              className="w-full pl-9 pr-24 py-2 rounded-lg text-xs font-mono bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:border-[#d4a853] outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-xs text-[#71717a] hover:text-[#f4f4f5]"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (searchTerm.trim()) processBarcode(searchTerm.trim());
              }}
              className="absolute right-1 top-1 bottom-1 px-3 rounded-md text-[11px] font-bold bg-[#d4a853]/20 hover:bg-[#d4a853]/30 text-[#f5cf7b] border border-[#d4a853]/30 cursor-pointer transition-colors"
            >
              ↵ Add
            </button>
          </div>
        </div>
        {scanStatus && (
          <div className="mt-1.5 px-2 text-[11px] font-bold text-[#f5cf7b] flex items-center gap-1.5 animate-pulse">
            <span>●</span>
            <span>{scanStatus}</span>
          </div>
        )}
      </div>

      {/* ─── Mobile View Tabs: Toggle between Bill & Catalog ─── */}
      <div className="flex lg:hidden mt-3 p-1 bg-[#121218] rounded-xl border border-white/10">
        <button
          type="button"
          onClick={() => setMobileTab("bill")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === "bill"
              ? "bg-[#d4a853] text-[#0c0c0e] shadow-md"
              : "text-[#97979d] hover:text-white"
          }`}
        >
          <span>🛒 Current Bill</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
            {totalItemCount} · {currency}{grandTotal.toFixed(2)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("catalog")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === "catalog"
              ? "bg-[#d4a853] text-[#0c0c0e] shadow-md"
              : "text-[#97979d] hover:text-white"
          }`}
        >
          <span>📦 Product Touchpad</span>
          <span className="text-[10px] opacity-70">({products.length})</span>
        </button>
      </div>

      {/* ─── Main 2-Column POS Layout ─── */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ─── LEFT COLUMN (7 Cols): Product Catalog Touchpad ─── */}
        <div className={`lg:col-span-7 flex flex-col ${mobileTab === "catalog" ? "block" : "hidden lg:flex"}`}>
          <div className="p-4 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#f4f4f5]">Quick Tap Items</span>
                <span className="text-[10px] text-[#71717a]">
                  Click to add directly without scanning
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#97979d]">
                {products.length} products available
              </span>
            </div>

            {/* Compact Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[560px] overflow-y-auto pr-1">
              {products.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs text-[#71717a]">
                  No matching products found. Use barcode search or add products in Inventory.
                </div>
              ) : (
                products.map((p) => {
                  const stock = stockMap.get(p.id) ?? 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-2.5 rounded-xl bg-[#161620] hover:bg-[#1f1f2e] border border-white/5 hover:border-[#d4a853]/40 text-left transition-all active:scale-95 group flex flex-col justify-between min-h-[82px] cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#f4f4f5] line-clamp-2 leading-tight group-hover:text-[#f5cf7b]">
                          {p.name}
                        </div>
                        <div className="text-[9px] text-[#71717a] font-mono mt-0.5 truncate">
                          {p.sku} {p.barcode ? `· ${p.barcode}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                        <span className="text-xs font-extrabold text-[#d4a853] font-mono">
                          {currency}{Number(p.sellingPrice).toFixed(2)}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            stock > 0
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-rose-400 bg-rose-500/10"
                          }`}
                        >
                          {stock > 0 ? `${stock}` : "0"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN (5 Cols): Live Bill & Checkout ─── */}
        <div className={`lg:col-span-5 flex flex-col ${mobileTab === "bill" ? "block" : "hidden lg:flex"}`}>
          <div className="p-4 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl flex flex-col">
            
            {/* Bill Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#f4f4f5]">Current Bill</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d4a853]/20 text-[#f5cf7b]">
                  {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
                </span>
              </div>
              <span className="text-[10px] text-[#71717a] font-mono">
                Counter #{Date.now().toString().slice(-4)}
              </span>
            </div>

            {/* Exchange Credit Active Notice */}
            {exchangeCredit && (
              <div className="my-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <span>🔄 Exchange Credit Applied</span>
                  </div>
                  <div className="text-[10px] text-[#97979d] truncate">
                    Invoice #{exchangeCredit.saleId.slice(0, 8).toUpperCase()} ({exchangeCredit.itemsDescription})
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono font-bold text-emerald-400">
                    -{currency}{exchangeCredit.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => setExchangeCredit(null)}
                    title="Remove exchange credit"
                    className="text-[#71717a] hover:text-rose-400 p-1 cursor-pointer font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="divide-y divide-white/5 my-2 max-h-[220px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#71717a]">
                  🛒 Bill is empty. Scan barcodes or tap products to add.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="py-2 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#f4f4f5] truncate">{item.productName}</p>
                      <p className="text-[10px] text-[#71717a] font-mono">
                        {currency}{item.unitPrice.toFixed(2)} each {item.hsnCode ? `· HSN: ${item.hsnCode}` : ""}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 bg-[#0b0b0f] border border-white/10 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-xs text-[#97979d] hover:bg-white/10 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono text-xs font-bold text-[#f4f4f5]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-xs text-[#97979d] hover:bg-white/10 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right w-14">
                      <span className="text-xs font-bold text-[#f4f4f5] font-mono">
                        {currency}{(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-xs text-[#71717a] hover:text-rose-400 p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Financial Summary */}
            <div className="pt-2.5 border-t border-white/8 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#97979d]">
                <span>Subtotal</span>
                <span className="font-mono">{currency}{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center justify-between text-[#97979d]">
                <span className="flex items-center gap-1.5">
                  Discount
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-[#0b0b0f] border border-white/10 text-[#f5cf7b] outline-none cursor-pointer"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                    <option value={15}>15%</option>
                    <option value={20}>20%</option>
                  </select>
                </span>
                <span className="font-mono text-emerald-400">
                  {discountAmount > 0 ? `-${currency}${discountAmount.toFixed(2)}` : `${currency}0.00`}
                </span>
              </div>

              {exchangeCredit && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Exchange Credit</span>
                  <span className="font-mono">-{currency}{exchangeCredit.amount.toFixed(2)}</span>
                </div>
              )}

              {/* GST Tax Summary line */}
              {cart.length > 0 && (
                <div className="flex justify-between text-[#71717a] text-[10px]">
                  <span>Incl. Indian GST (CGST+SGST):</span>
                  <span className="font-mono text-[#d4a853]">
                    {currency}{gstBreakdown.totalTax.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Amount to Pay Highlight */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#d4a853]/15 to-transparent border border-[#d4a853]/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#d4a853]">Total Amount</span>
                  <div className="text-xl font-black text-[#f4f4f5] font-mono leading-none mt-0.5">
                    {currency}{grandTotal.toFixed(2)}
                  </div>
                </div>
                <div className="text-[10px] text-[#71717a]">
                  Net Payable
                </div>
              </div>
            </div>

            {/* ─── Compact Payment Selector ─── */}
            <div className="mt-3 pt-2.5 border-t border-white/8">
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {[
                  { id: "cash", label: "💵 Cash" },
                  { id: "upi", label: "📱 UPI" },
                  { id: "card", label: "💳 Card" },
                  { id: "credit", label: "📒 Khata" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? "bg-[#d4a853] text-[#0c0c0e] border-[#d4a853] shadow-md"
                        : "bg-[#0b0b0f] text-[#97979d] border-white/10 hover:border-white/20"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* CASH: Quick Tender & Change */}
              {paymentMethod === "cash" && (
                <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/10 space-y-2 mb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#97979d]">Cash Tendered:</span>
                    <input
                      type="number"
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value ? Number(e.target.value) : "")}
                      placeholder={`${grandTotal.toFixed(0)}`}
                      className="w-24 px-2 py-1 text-right rounded text-xs bg-[#161620] text-[#f4f4f5] border border-white/20 font-mono outline-none focus:border-[#d4a853]"
                    />
                  </div>
                  {/* Quick Chips */}
                  <div className="flex gap-1 justify-end flex-wrap">
                    {[grandTotal, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTenderedAmount(amt)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-[#d4a853] border border-white/10 cursor-pointer"
                      >
                        {currency}{amt}
                      </button>
                    ))}
                  </div>
                  {typeof tenderedAmount === "number" && (
                    <div className="pt-1.5 border-t border-white/5 flex justify-between text-xs font-bold">
                      <span className="text-[#97979d]">Return Change:</span>
                      <span className={`font-mono ${changeDue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {currency}{changeDue.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* UPI: Compact QR Preview */}
              {paymentMethod === "upi" && (
                <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/10 space-y-2 mb-2">
                  <CompactUpiQr amount={grandTotal} currency={currency} />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#97979d] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${upiVerified ? "bg-emerald-400" : "bg-[#d4a853] animate-ping"}`} />
                      <span>{upiVerified ? "Payment Verified" : "Waiting for scan"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setUpiVerified(!upiVerified)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/10 text-[#d4a853] border border-white/10 cursor-pointer"
                    >
                      {upiVerified ? "✓ Confirmed" : "Mark Received"}
                    </button>
                  </div>
                </div>
              )}

              {/* CARD: Clean Terminal Indicator */}
              {paymentMethod === "card" && (
                <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/10 space-y-2 mb-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Card Swiper / POS Terminal Ready
                    </span>
                    <span className="text-[10px] text-[#71717a]">Visa / MC / RuPay</span>
                  </div>
                  <input
                    type="text"
                    value={cardReference}
                    onChange={(e) => setCardReference(e.target.value)}
                    placeholder="Auth Code / Last 4 Digits (Optional)"
                    className="w-full px-2.5 py-1 rounded text-xs bg-[#161620] text-[#f4f4f5] border border-white/15 outline-none font-mono focus:border-[#d4a853]"
                  />
                </div>
              )}

              {/* KHATA: Customer Details */}
              {paymentMethod === "credit" && (
                <div className="p-2.5 rounded-xl bg-[#1a1812] border border-[#d4a853]/30 space-y-1.5 mb-2">
                  <span className="text-[10px] font-bold text-[#f5cf7b] uppercase block">
                    Customer Khata Ledger
                  </span>
                  <input
                    type="text"
                    value={creditCustomerName}
                    onChange={(e) => setCreditCustomerName(e.target.value)}
                    placeholder="Customer Name (e.g. Ramesh Bhai)*"
                    className="w-full px-2.5 py-1 rounded text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853]"
                  />
                  <input
                    type="text"
                    value={creditCustomerPhone}
                    onChange={(e) => setCreditCustomerPhone(e.target.value)}
                    placeholder="Customer Phone (Optional)"
                    className="w-full px-2.5 py-1 rounded text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853]"
                  />
                </div>
              )}
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || createSaleMutation.isPending}
              className="mt-1 w-full py-3.5 rounded-xl text-sm font-black bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] text-[#0c0c0e] hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-[0_0_20px_rgba(212,168,83,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {createSaleMutation.isPending ? (
                <span>Recording Sale...</span>
              ) : (
                <>
                  <span>⚡ Complete & Bill</span>
                  <span className="text-xs bg-[#0c0c0e]/20 px-2 py-0.5 rounded font-mono">
                    {currency}{grandTotal.toFixed(2)}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── QUICK ADD ITEM MODAL (When Scanned Barcode Isn't in Store Catalog) ─── */}
      {quickAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#121218] border border-[#d4a853]/40 p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <div>
                  <h3 className="text-xs font-bold text-[#f4f4f5]">New Scanned Barcode</h3>
                  <p className="text-[10px] text-[#71717a] font-mono">Code: {quickAddItem.barcode}</p>
                </div>
              </div>
              <button
                onClick={() => setQuickAddItem(null)}
                className="text-xs text-[#71717a] hover:text-[#f4f4f5] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-3.5 space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-[#97979d] block mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={quickAddItem.name}
                  onChange={(e) => setQuickAddItem({ ...quickAddItem, name: e.target.value })}
                  placeholder="e.g. Parle-G 100g, Coca-Cola 500ml"
                  className="w-full px-3 py-2 rounded-lg bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#97979d] block mb-1">
                    Selling Price ({currency})*
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickAddItem.price}
                    onChange={(e) => setQuickAddItem({ ...quickAddItem, price: e.target.value })}
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 rounded-lg bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853] font-mono"
                  />
                </div>
                {isOwner && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#97979d] block mb-1">
                      Cost Price (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quickAddItem.costPrice}
                      onChange={(e) => setQuickAddItem({ ...quickAddItem, costPrice: e.target.value })}
                      placeholder="e.g. 15"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853] font-mono"
                    />
                  </div>
                )}
              </div>

              {/* GST Slab & HSN Input in Quick Add */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#97979d] block mb-1">
                    GST Tax Slab
                  </label>
                  <select
                    value={quickAddItem.gstRate}
                    onChange={(e) => setQuickAddItem({ ...quickAddItem, gstRate: e.target.value })}
                    className="w-full px-2 py-2 rounded-lg bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853] text-[11px] cursor-pointer"
                  >
                    <option value="0">0% — Nil GST</option>
                    <option value="5">5% — Staples/Tea</option>
                    <option value="12">12% — Butter/Chips</option>
                    <option value="18">18% — FMCG/Soaps</option>
                    <option value="28">28% — Aerated/Soda</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#97979d] block mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={quickAddItem.hsnCode}
                    onChange={(e) => setQuickAddItem({ ...quickAddItem, hsnCode: e.target.value })}
                    placeholder="e.g. 1905, 3401"
                    className="w-full px-3 py-2 rounded-lg bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={quickAddItem.isSaving || !quickAddItem.price}
                  onClick={() => handleQuickAddSubmit(true)}
                  className="w-full py-2.5 rounded-xl font-bold bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {quickAddItem.isSaving ? "Saving Product..." : "💾 Save to Catalog & Add to Bill"}
                </button>
                <button
                  type="button"
                  disabled={quickAddItem.isSaving || !quickAddItem.price}
                  onClick={() => handleQuickAddSubmit(false)}
                  className="w-full py-2 rounded-xl text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-[#97979d] hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  Add to Current Bill Only (Quick Bill)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Print Modal (With Legal Indian GST Compliance Table) ─── */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#121218] border border-white/15 p-5 shadow-2xl relative font-mono text-xs max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCompletedOrder(null)}
              className="absolute top-4 right-4 text-[#71717a] hover:text-[#f4f4f5] p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center pb-3 border-b border-dashed border-white/20">
              <h2 className="text-sm font-black text-[#f4f4f5] uppercase tracking-wider">
                {store?.name || "STOCKPILOT RETAIL"}
              </h2>
              {store?.gstin && (
                <p className="text-[10px] text-[#f5cf7b] font-bold tracking-wider mt-0.5 font-mono">
                  GSTIN: {store.gstin}
                </p>
              )}
              <p className="text-[10px] text-[#71717a] mt-0.5">TAX INVOICE / CASH MEMO</p>
              <p className="text-[10px] text-[#71717a]">Invoice No: ORD-{completedOrder.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-[10px] text-[#71717a]">{completedOrder.saleDate}</p>
            </div>

            {/* Sold Items with HSN Code & GST Slab */}
            <div className="divide-y divide-dashed divide-white/10 my-2.5 max-h-36 overflow-y-auto pr-1">
              {completedOrder.items.map((it, idx) => (
                <div key={idx} className="py-1.5 flex justify-between text-[11px]">
                  <div>
                    <span className="text-[#f4f4f5]">{it.productName}</span>
                    <span className="text-[#71717a] ml-1">x{it.quantity}</span>
                    <span className="block text-[9px] text-[#97979d]">
                      {it.hsnCode ? `HSN: ${it.hsnCode} · ` : ""}GST: {it.gstRate || 0}%
                    </span>
                  </div>
                  <span className="font-bold text-[#f4f4f5]">
                    {currency}{(it.quantity * it.unitPrice).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Indian GST Tax Breakdown Table */}
            {completedOrder.gstGroups && completedOrder.gstGroups.length > 0 && (
              <div className="my-2 p-2 rounded-lg bg-black/40 border border-white/10 text-[9px]">
                <div className="font-bold text-[#f5cf7b] mb-1 uppercase tracking-wider flex justify-between">
                  <span>GST Tax Breakdown</span>
                  <span>(MRP Inclusive)</span>
                </div>
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#71717a] border-b border-white/10 pb-0.5">
                      <th className="py-0.5">HSN</th>
                      <th className="py-0.5 text-right">Taxable</th>
                      <th className="py-0.5 text-right">CGST</th>
                      <th className="py-0.5 text-right">SGST</th>
                      <th className="py-0.5 text-right">Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[#d4d4d8]">
                    {completedOrder.gstGroups.map((g, idx) => (
                      <tr key={idx}>
                        <td className="py-0.5">{g.hsnCode}</td>
                        <td className="py-0.5 text-right">{currency}{g.taxableValue.toFixed(2)}</td>
                        <td className="py-0.5 text-right">{currency}{g.cgstAmount.toFixed(2)}</td>
                        <td className="py-0.5 text-right">{currency}{g.sgstAmount.toFixed(2)}</td>
                        <td className="py-0.5 text-right font-bold text-[#f5cf7b]">{currency}{g.totalTax.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-bold text-[#f4f4f5]">
                      <td className="pt-1">Total</td>
                      <td className="pt-1 text-right">{currency}{(completedOrder.taxableAmount || 0).toFixed(2)}</td>
                      <td className="pt-1 text-right">{currency}{(completedOrder.cgstAmount || 0).toFixed(2)}</td>
                      <td className="pt-1 text-right">{currency}{(completedOrder.sgstAmount || 0).toFixed(2)}</td>
                      <td className="pt-1 text-right text-[#f5cf7b]">{currency}{(completedOrder.totalTax || 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Bill Summary */}
            <div className="pt-2 border-t border-dashed border-white/20 space-y-1 text-[11px]">
              <div className="flex justify-between text-[#97979d]">
                <span>Subtotal:</span>
                <span>{currency}{completedOrder.subtotal.toFixed(2)}</span>
              </div>
              {completedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span>-{currency}{completedOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {completedOrder.exchangeCreditAmount !== undefined && completedOrder.exchangeCreditAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Exchange Credit Applied:</span>
                  <span>-{currency}{completedOrder.exchangeCreditAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#d4a853] pt-1 border-t border-white/10">
                <span>NET TOTAL:</span>
                <span>{currency}{completedOrder.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#71717a] pt-1">
                <span>Payment Mode:</span>
                <span className="uppercase font-bold text-[#f4f4f5]">{completedOrder.paymentMethod}</span>
              </div>
              {completedOrder.tenderedAmount !== undefined && (
                <>
                  <div className="flex justify-between text-[#71717a]">
                    <span>Cash Tendered:</span>
                    <span>{currency}{completedOrder.tenderedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Change Returned:</span>
                    <span>{currency}{(completedOrder.changeAmount || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-[#f4f4f5] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🖨️</span> Print Invoice
              </button>
              <button
                onClick={() => {
                  setCompletedOrder(null);
                  scanInputRef.current?.focus();
                }}
                className="flex-1 py-2 rounded-xl font-bold bg-[#d4a853] text-[#0c0c0e] hover:bg-[#e5b95c] transition-all cursor-pointer"
              >
                Next Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RETURN & EXCHANGE FLOW MODAL ─── */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-[#121218] border border-white/15 p-5 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => {
                setIsReturnModalOpen(false);
                setSelectedReturnSale(null);
                setReturnItemSelections({});
              }}
              className="absolute top-4 right-4 text-[#71717a] hover:text-[#f4f4f5] p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
              <div className="w-8 h-8 rounded-lg bg-[#d4a853]/20 text-[#f5cf7b] flex items-center justify-center text-sm font-bold">
                🔄
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#f4f4f5]">
                  Returns, Refunds & Item Exchange Counter
                </h2>
                <p className="text-[11px] text-[#97979d]">
                  Select past invoice, pick items to return, and disburse cash or adjust against exchange.
                </p>
              </div>
            </div>

            {/* ─── Step 1: Search or Pick Past Invoice ─── */}
            {!selectedReturnSale && (
              <div className="mt-4 flex-1 flex flex-col min-h-0">
                {/* Search Bar */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={returnSearchInvoice}
                      onChange={(e) => setReturnSearchInvoice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && returnSearchInvoice.trim()) {
                          handleLoadReturnSale(returnSearchInvoice.trim());
                        }
                      }}
                      placeholder="Enter Invoice Number or Sale ID (e.g. ORD-1234ABCD)..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0b0f] text-xs font-mono text-[#f4f4f5] border border-white/15 focus:border-[#d4a853] outline-none"
                      autoFocus
                    />
                    {returnSearchInvoice && (
                      <button
                        onClick={() => setReturnSearchInvoice("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717a] hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!returnSearchInvoice.trim() || isLoadingSale}
                    onClick={() => handleLoadReturnSale(returnSearchInvoice.trim())}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#d4a853] text-[#0c0c0e] hover:bg-[#e8be66] disabled:opacity-40 transition-all cursor-pointer"
                  >
                    {isLoadingSale ? "Searching..." : "🔍 Search Invoice"}
                  </button>
                </div>

                {/* Recent Invoices Quick Picker */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                    <span className="text-[11px] font-bold uppercase text-[#71717a]">
                      Or Pick From Recent Counter Invoices
                    </span>
                    <span className="text-[10px] text-[#97979d]">
                      {recentSalesData?.items?.length || 0} recent sales
                    </span>
                  </div>

                  <div className="divide-y divide-white/5 overflow-y-auto max-h-[360px] pr-1">
                    {!recentSalesData?.items || recentSalesData.items.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#71717a]">
                        No recent sales found in this store.
                      </div>
                    ) : (
                      recentSalesData.items.map((sale) => (
                        <div
                          key={sale.id}
                          onClick={() => handleLoadReturnSale(sale.id)}
                          className="py-2.5 px-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/10 flex items-center justify-between cursor-pointer transition-all group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[#f5cf7b] group-hover:underline">
                                ORD-{sale.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className="text-[10px] text-[#71717a] font-mono">
                                {sale.saleDate}
                              </span>
                              {sale.returnStatus && sale.returnStatus !== "none" && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                    sale.returnStatus === "full"
                                      ? "bg-rose-500/20 text-rose-300"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {sale.returnStatus.toUpperCase()} RETURNED
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#97979d] mt-0.5 truncate max-w-sm">
                              {sale.items?.map((it) => `${it.productName} (x${it.quantity})`).join(", ")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-[#f4f4f5]">
                              {currency}{Number(sale.totalAmount).toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-[#d4a853] font-medium group-hover:underline">
                              Select & Return →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Invoice Loaded — Select Return Items & Mode ─── */}
            {selectedReturnSale && (
              <div className="mt-3 flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
                {/* Invoice Bar */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#71717a] block">
                      Active Invoice
                    </span>
                    <span className="font-mono font-bold text-[#f5cf7b]">
                      ORD-{selectedReturnSale.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[11px] text-[#97979d] ml-2">
                      ({selectedReturnSale.saleDate})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-[#71717a] block">Original Total</span>
                      <span className="font-mono font-bold text-[#f4f4f5]">
                        {currency}{Number(selectedReturnSale.totalAmount).toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReturnSale(null);
                        setReturnItemSelections({});
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-[#97979d] hover:text-white border border-white/10 cursor-pointer"
                    >
                      ← Back
                    </button>
                  </div>
                </div>

                {/* Items to Return List */}
                <div className="flex-1 min-h-0 mb-3">
                  <span className="text-[10px] uppercase font-bold text-[#71717a] block mb-1.5">
                    Select Quantities to Return
                  </span>
                  <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-[#0b0b0f]">
                    {selectedReturnSale.items.map((it) => {
                      const alreadyReturned = it.returnedQuantity || 0;
                      const returnable = Math.max(0, it.quantity - alreadyReturned);
                      const selectedQty = returnItemSelections[it.id] || 0;
                      const refundValue = selectedQty * it.unitPrice;

                      return (
                        <div
                          key={it.id}
                          className={`p-3 flex items-center justify-between gap-3 text-xs ${
                            selectedQty > 0 ? "bg-[#d4a853]/10" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#f4f4f5] truncate">{it.productName}</p>
                            <div className="flex items-center gap-2 text-[10px] text-[#71717a] mt-0.5 font-mono">
                              <span>Price: {currency}{it.unitPrice.toFixed(2)}</span>
                              <span>·</span>
                              <span>Sold: {it.quantity}</span>
                              <span>·</span>
                              <span>Returned: {alreadyReturned}</span>
                              <span>·</span>
                              <span className={returnable > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                Returnable: {returnable}
                              </span>
                            </div>
                          </div>

                          {/* Stepper */}
                          {returnable > 0 ? (
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1 bg-[#161620] border border-white/15 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReturnItemSelections((prev) => ({
                                      ...prev,
                                      [it.id]: Math.max(0, (prev[it.id] || 0) - 1),
                                    }));
                                  }}
                                  className="w-6 h-6 rounded flex items-center justify-center text-xs text-[#97979d] hover:bg-white/10 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-7 text-center font-mono text-xs font-bold text-[#f4f4f5]">
                                  {selectedQty}
                                </span>
                                <button
                                  type="button"
                                  disabled={selectedQty >= returnable}
                                  onClick={() => {
                                    setReturnItemSelections((prev) => ({
                                      ...prev,
                                      [it.id]: Math.min(returnable, (prev[it.id] || 0) + 1),
                                    }));
                                  }}
                                  className="w-6 h-6 rounded flex items-center justify-center text-xs text-[#97979d] hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              <div className="w-16 text-right font-mono font-bold text-[#f5cf7b]">
                                {currency}{refundValue.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded font-mono">
                              Fully Returned
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return Reason Selector */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/8 space-y-2 mb-3 text-xs">
                  <label className="text-[10px] uppercase font-bold text-[#71717a] block">
                    Reason for Return / Exchange
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853] cursor-pointer"
                  >
                    <option value="Customer exchange / changed mind">Customer exchange / changed mind</option>
                    <option value="Defective or damaged product">Defective or damaged product</option>
                    <option value="Wrong item or size purchased">Wrong item or size purchased</option>
                    <option value="Expired / near shelf-life">Expired / near shelf-life</option>
                    <option value="Other">Other (specify below)</option>
                  </select>
                  {returnReason === "Other" && (
                    <input
                      type="text"
                      value={customReturnReason}
                      onChange={(e) => setCustomReturnReason(e.target.value)}
                      placeholder="Specify reason..."
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853] text-xs"
                    />
                  )}
                </div>

                {/* Live Return Total & Action Buttons */}
                {(() => {
                  const totalSelectedQty = Object.values(returnItemSelections).reduce((a, b) => a + b, 0);
                  const totalRefundVal = selectedReturnSale.items.reduce((sum, item) => {
                    const q = returnItemSelections[item.id] || 0;
                    return sum + q * item.unitPrice;
                  }, 0);

                  return (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-[#d4a853]/15 to-transparent border border-[#d4a853]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#d4a853] block">
                          Total Return / Credit Value
                        </span>
                        <div className="text-xl font-black text-[#f4f4f5] font-mono leading-none mt-0.5">
                          {currency}{totalRefundVal.toFixed(2)}
                          <span className="text-xs font-normal text-[#97979d] ml-2">
                            ({totalSelectedQty} {totalSelectedQty === 1 ? "unit" : "units"} to restock)
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        {/* Option A: Cash Refund */}
                        <button
                          type="button"
                          disabled={totalSelectedQty === 0 || processReturnMutation.isPending}
                          onClick={() => handleProcessReturnSubmit("cash")}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold bg-[#1e1e28] hover:bg-[#282838] text-amber-300 border border-amber-500/30 hover:border-amber-400 disabled:opacity-40 transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span>💵</span>
                          <span>Refund Cash ({currency}{totalRefundVal.toFixed(2)})</span>
                        </button>

                        {/* Option B: Apply to Current Bill as Exchange */}
                        <button
                          type="button"
                          disabled={totalSelectedQty === 0 || processReturnMutation.isPending}
                          onClick={() => handleProcessReturnSubmit("exchange_credit")}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] disabled:opacity-40 transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                        >
                          <span>🔁</span>
                          <span>Exchange in Current Bill</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CASH REFUND VOUCHER MODAL (Printed When Direct Cash Refund Given) ─── */}
      {refundVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#121218] border border-amber-500/30 p-5 shadow-2xl relative font-mono text-xs">
            <button
              onClick={() => setRefundVoucher(null)}
              className="absolute top-4 right-4 text-[#71717a] hover:text-[#f4f4f5] p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center pb-3 border-b border-dashed border-white/20">
              <h2 className="text-sm font-black text-[#f4f4f5] uppercase tracking-wider">
                {store?.name || "STOCKPILOT RETAIL"}
              </h2>
              <p className="text-[11px] font-bold text-amber-400 mt-1 uppercase">
                💵 CASH REFUND VOUCHER
              </p>
              <p className="text-[10px] text-[#71717a]">Original Invoice: ORD-{refundVoucher.saleId.slice(0, 8).toUpperCase()}</p>
              <p className="text-[10px] text-[#71717a]">{refundVoucher.date}</p>
            </div>

            <div className="divide-y divide-dashed divide-white/10 my-3">
              <div className="text-[10px] uppercase font-bold text-[#71717a] pb-1">
                Restocked Items to Shelf:
              </div>
              {refundVoucher.items.map((it, idx) => (
                <div key={idx} className="py-1.5 flex justify-between text-[11px]">
                  <div>
                    <span className="text-[#f4f4f5]">{it.productName}</span>
                    <span className="text-[#71717a] ml-1">x{it.quantity}</span>
                  </div>
                  <span className="font-bold text-amber-400">
                    {currency}{it.refundAmount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center my-3">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">
                Cash to Disburse to Customer
              </span>
              <span className="text-2xl font-black text-[#f4f4f5] font-mono mt-1 block">
                {currency}{refundVoucher.totalRefundAmount.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#97979d] mt-1 block">
                Please disburse from counter cash drawer. Stock has been returned to inventory.
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-[#f4f4f5] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🖨️</span> Print Voucher
              </button>
              <button
                onClick={() => setRefundVoucher(null)}
                className="flex-1 py-2 rounded-xl font-bold bg-[#d4a853] text-[#0c0c0e] hover:bg-[#e5b95c] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Camera Barcode Scanner Modal with Live HUD Feedback ─── */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => {
          setIsCameraScannerOpen(false);
          setScannerResult(null);
        }}
        onScan={(code) => processBarcode(code)}
        scanResult={scannerResult}
      />
    </div>
  );
}
