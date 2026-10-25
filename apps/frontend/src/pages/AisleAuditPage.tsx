import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useInventory, useAdjustStock } from "../hooks/useInventory";
import { useCategories } from "../hooks/useProducts";
import { useStoreSettings } from "../hooks/useSettings";
import type { InventoryItem } from "../lib/types";
import CameraBarcodeScanner from "../components/scanner/CameraBarcodeScanner";

interface AuditEntry {
  productId: string;
  physicalCount: number;
  reason: "theft_shrinkage" | "damaged_expired" | "clerical_error" | "supplier_shortage" | "found_stock";
  note: string;
}

const REASON_LABELS: Record<AuditEntry["reason"], { label: string; backendReason: "damage" | "correction" | "manual_adjustment" }> = {
  theft_shrinkage: { label: "Theft / Pilferage Shrinkage", backendReason: "correction" },
  damaged_expired: { label: "Damaged / Spoiled on Shelf", backendReason: "damage" },
  clerical_error: { label: "Clerical / Counting Error", backendReason: "correction" },
  supplier_shortage: { label: "Supplier Inbound Shortage", backendReason: "correction" },
  found_stock: { label: "Found Stock / Misplaced Item", backendReason: "manual_adjustment" },
};

export default function AisleAuditPage() {
  const { data: inventory = [], isLoading: isInventoryLoading, refetch: refetchInventory } = useInventory();
  const { data: categories = [] } = useCategories();
  const { data: store } = useStoreSettings();
  const adjustStock = useAdjustStock();

  const storeId = store?.id || "default";
  const storageKey = `stockpilot_cycle_audit_${storeId}`;

  // Scanner state
  const [scanInput, setScanInput] = useState("");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [continuousScan, setContinuousScan] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<{ name: string; sku: string; count: number } | null>(null);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: "success" | "warning" | "info" } | null>(null);

  // Audit state: map of productId -> AuditEntry
  const [auditEntries, setAuditEntries] = useState<Record<string, AuditEntry>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {};
  });

  // Filter & search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterTab, setFilterTab] = useState<"all" | "audited" | "discrepancies" | "shortage" | "surplus" | "matches" | "unscanned">("all");

  // Reconciliation modal state
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileProgress, setReconcileProgress] = useState<{ current: number; total: number } | null>(null);
  const [reconcileResult, setReconcileResult] = useState<{ adjustedCount: number; netUnits: number; netValue: number } | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Save audit entries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(auditEntries));
    } catch {}
  }, [auditEntries, storageKey]);

  // Audio synthesize function
  const playSound = useCallback((type: "success" | "warning" | "reconcile") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "success") {
        // High dual-tone chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "warning") {
        // Lower warning buzz
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === "reconcile") {
        // Ascending victory chime
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.24); // C6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}
  }, [soundEnabled]);

  // Keep scanner focused when continuousScan is active
  useEffect(() => {
    if (continuousScan && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [continuousScan, auditEntries]);

  // Map category lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Fast in-memory lookup for barcode, sku, name
  const lookupIndex = useMemo(() => {
    const byBarcode = new Map<string, InventoryItem>();
    const bySku = new Map<string, InventoryItem>();
    const byId = new Map<string, InventoryItem>();

    inventory.forEach((item) => {
      if (item.barcode) byBarcode.set(item.barcode.trim().toLowerCase(), item);
      if (item.sku) bySku.set(item.sku.trim().toLowerCase(), item);
      byId.set(item.productId, item);
    });

    return { byBarcode, bySku, byId };
  }, [inventory]);

  // Process a barcode or SKU scan
  const handleProcessScan = useCallback((queryCode: string) => {
    const code = queryCode.trim().toLowerCase();
    if (!code) return;

    // Check barcode first, then SKU
    let matchedItem = lookupIndex.byBarcode.get(code) || lookupIndex.bySku.get(code);

    // If still not matched, check if code matches product name substring
    if (!matchedItem) {
      matchedItem = inventory.find((i) => i.productName.toLowerCase().includes(code));
    }

    if (matchedItem) {
      const pId = matchedItem.productId;
      const currentPhysical = auditEntries[pId]?.physicalCount ?? 0;
      const newPhysical = currentPhysical + multiplier;

      setAuditEntries((prev) => ({
        ...prev,
        [pId]: {
          productId: pId,
          physicalCount: newPhysical,
          reason: prev[pId]?.reason ?? "theft_shrinkage",
          note: prev[pId]?.note ?? "",
        },
      }));

      setLastScannedItem({
        name: matchedItem.productName,
        sku: matchedItem.sku,
        count: newPhysical,
      });

      setScanMessage({
        text: `Scanned: ${matchedItem.productName} (+${multiplier}) → Count: ${newPhysical}`,
        type: "success",
      });

      playSound("success");
      setScanInput("");
    } else {
      setScanMessage({
        text: `No matching product found for code "${queryCode}". Check barcode or register SKU.`,
        type: "warning",
      });
      playSound("warning");
    }

    setTimeout(() => {
      setScanMessage((prev) => (prev?.text.includes(queryCode) ? null : prev));
    }, 4000);
  }, [lookupIndex, inventory, auditEntries, multiplier, playSound]);

  // Scan input keydown listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProcessScan(scanInput);
    }
  };

  // Direct manual adjustment of physical count
  const handleSetCount = (productId: string, count: number) => {
    const safeCount = Math.max(0, count);
    setAuditEntries((prev) => ({
      ...prev,
      [productId]: {
        productId,
        physicalCount: safeCount,
        reason: prev[productId]?.reason ?? "theft_shrinkage",
        note: prev[productId]?.note ?? "",
      },
    }));
  };

  const handleQuickAdd = (productId: string, delta: number) => {
    const current = auditEntries[productId]?.physicalCount ?? 0;
    handleSetCount(productId, current + delta);
    playSound("success");
  };

  const handleMatchSystem = (item: InventoryItem) => {
    handleSetCount(item.productId, item.currentStock);
    playSound("success");
  };

  const handleSetReason = (productId: string, reason: AuditEntry["reason"]) => {
    setAuditEntries((prev) => ({
      ...prev,
      [productId]: {
        productId,
        physicalCount: prev[productId]?.physicalCount ?? 0,
        reason,
        note: prev[productId]?.note ?? "",
      },
    }));
  };

  const handleSetNote = (productId: string, note: string) => {
    setAuditEntries((prev) => ({
      ...prev,
      [productId]: {
        productId,
        physicalCount: prev[productId]?.physicalCount ?? 0,
        reason: prev[productId]?.reason ?? "theft_shrinkage",
        note,
      },
    }));
  };

  // Filter items in scope
  const scopedItems = useMemo(() => {
    return inventory.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.categoryId !== selectedCategory) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesBarcode = item.barcode?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesSku && !matchesBarcode) return false;
      }
      return true;
    });
  }, [inventory, selectedCategory, searchQuery]);

  // Detailed audit rows with computed variance
  interface RowData {
    item: InventoryItem;
    categoryName: string;
    isAudited: boolean;
    physicalCount: number;
    systemCount: number;
    varianceUnits: number;
    unitCost: number;
    varianceValue: number;
    reason: AuditEntry["reason"];
    note: string;
  }

  const computedRows: RowData[] = useMemo(() => {
    return scopedItems.map((item) => {
      const entry = auditEntries[item.productId];
      const isAudited = entry !== undefined;
      const physicalCount = entry?.physicalCount ?? 0;
      const systemCount = item.currentStock;
      const varianceUnits = isAudited ? physicalCount - systemCount : 0;
      const unitCost = item.costPrice ?? 0;
      const varianceValue = varianceUnits * unitCost;

      return {
        item,
        categoryName: item.categoryId ? (categoryMap.get(item.categoryId) ?? "Uncategorized") : "Uncategorized",
        isAudited,
        physicalCount,
        systemCount,
        varianceUnits,
        unitCost,
        varianceValue,
        reason: entry?.reason ?? "theft_shrinkage",
        note: entry?.note ?? "",
      };
    });
  }, [scopedItems, auditEntries, categoryMap]);

  // Tab filtering
  const filteredRows = useMemo(() => {
    switch (filterTab) {
      case "audited":
        return computedRows.filter((r) => r.isAudited);
      case "discrepancies":
        return computedRows.filter((r) => r.isAudited && r.varianceUnits !== 0);
      case "shortage":
        return computedRows.filter((r) => r.isAudited && r.varianceUnits < 0);
      case "surplus":
        return computedRows.filter((r) => r.isAudited && r.varianceUnits > 0);
      case "matches":
        return computedRows.filter((r) => r.isAudited && r.varianceUnits === 0);
      case "unscanned":
        return computedRows.filter((r) => !r.isAudited);
      default:
        return computedRows;
    }
  }, [computedRows, filterTab]);

  // Telemetry aggregates
  const telemetry = useMemo(() => {
    let auditedCount = 0;
    let matchCount = 0;
    let shortageUnits = 0;
    let shortageCapitalLoss = 0;
    let surplusUnits = 0;
    let surplusCapitalGain = 0;
    let netVarianceValue = 0;

    computedRows.forEach((r) => {
      if (r.isAudited) {
        auditedCount++;
        if (r.varianceUnits === 0) {
          matchCount++;
        } else if (r.varianceUnits < 0) {
          shortageUnits += Math.abs(r.varianceUnits);
          shortageCapitalLoss += Math.abs(r.varianceValue);
        } else {
          surplusUnits += r.varianceUnits;
          surplusCapitalGain += r.varianceValue;
        }
        netVarianceValue += r.varianceValue;
      }
    });

    const totalInScope = computedRows.length;
    const progressPercent = totalInScope > 0 ? Math.round((auditedCount / totalInScope) * 100) : 0;
    const matchPercent = auditedCount > 0 ? Math.round((matchCount / auditedCount) * 100) : 0;

    return {
      totalInScope,
      auditedCount,
      progressPercent,
      matchCount,
      matchPercent,
      shortageUnits,
      shortageCapitalLoss,
      surplusUnits,
      surplusCapitalGain,
      netVarianceValue,
    };
  }, [computedRows]);

  // Items eligible for reconciliation (audited and variance ≠ 0)
  const discrepantItems = useMemo(() => {
    return computedRows.filter((r) => r.isAudited && r.varianceUnits !== 0);
  }, [computedRows]);

  // Execute batch stock reconciliation
  const handleCommitReconciliation = async () => {
    if (discrepantItems.length === 0) return;
    setIsReconciling(true);
    setReconcileProgress({ current: 0, total: discrepantItems.length });

    let adjustedCount = 0;
    let netUnits = 0;
    let netValue = 0;

    try {
      for (let i = 0; i < discrepantItems.length; i++) {
        const row = discrepantItems[i];
        const reasonConfig = REASON_LABELS[row.reason];
        const formattedNote = `Aisle Cycle Count: Scanned ${row.physicalCount} vs System ${row.systemCount} (${row.varianceUnits > 0 ? "+" : ""}${row.varianceUnits} units). Discrepancy: ${reasonConfig.label}${row.note ? ` - ${row.note}` : ""}`;

        await adjustStock.mutateAsync({
          productId: row.item.productId,
          quantityChange: row.varianceUnits,
          reason: reasonConfig.backendReason,
          note: formattedNote,
        });

        adjustedCount++;
        netUnits += row.varianceUnits;
        netValue += row.varianceValue;
        setReconcileProgress({ current: i + 1, total: discrepantItems.length });
      }

      await refetchInventory();
      playSound("reconcile");

      setReconcileResult({ adjustedCount, netUnits, netValue });

      // Update audit entries so variance is now 0 (physical matches newly adjusted system)
      setAuditEntries((prev) => {
        const next = { ...prev };
        discrepantItems.forEach((r) => {
          if (next[r.item.productId]) {
            next[r.item.productId] = {
              ...next[r.item.productId],
              physicalCount: r.physicalCount,
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Reconciliation failed:", err);
      alert("A problem occurred during reconciliation. Some adjustments may not have been saved.");
    } finally {
      setIsReconciling(false);
    }
  };

  // Export CSV Report
  const handleExportCsv = () => {
    if (computedRows.length === 0) return;

    const headers = [
      "Product Name",
      "SKU",
      "Barcode",
      "Category",
      "System Stock",
      "Physical Count",
      "Variance Units",
      "Unit Cost (INR)",
      "Variance Value (INR)",
      "Audit Status",
      "Discrepancy Reason",
      "Auditor Notes",
    ];

    const rows = computedRows.map((r) => [
      `"${r.item.productName.replace(/"/g, '""')}"`,
      `"${r.item.sku}"`,
      `"${r.item.barcode ?? ""}"`,
      `"${r.categoryName}"`,
      r.systemCount,
      r.isAudited ? r.physicalCount : "Not Audited",
      r.isAudited ? r.varianceUnits : "N/A",
      r.unitCost.toFixed(2),
      r.isAudited ? r.varianceValue.toFixed(2) : "0.00",
      r.isAudited ? (r.varianceUnits === 0 ? "MATCH" : r.varianceUnits < 0 ? "SHORTAGE" : "SURPLUS") : "UNSCANNED",
      r.isAudited && r.varianceUnits !== 0 ? `"${REASON_LABELS[r.reason].label}"` : '""',
      `"${r.note.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `StockPilot_Aisle_Cycle_Count_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset audit session
  const handleResetAudit = () => {
    if (window.confirm("Are you sure you want to reset this cycle audit? All counted items will be cleared.")) {
      setAuditEntries({});
      localStorage.removeItem(storageKey);
      setLastScannedItem(null);
      setScanMessage({ text: "Cycle audit session cleared.", type: "info" });
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto select-none font-mono">
      {/* ─── Breadcrumb & Navigation ─── */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-[#71717a]">
          <Link to="/inventory" className="hover:text-[#d4a853] transition-colors">
            Inventory
          </Link>
          <span>/</span>
          <span className="text-[#f4f4f5] font-semibold">Aisle Audit & Cycle Count</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              soundEnabled
                ? "bg-[#14141a] text-[#f5cf7b] border-[#d4a853]/30"
                : "bg-[#0b0b0f] text-[#71717a] border-white/10"
            }`}
            title="Toggle scanner audio feedback"
          >
            <span>{soundEnabled ? "🔊 Sound On" : "🔇 Muted"}</span>
          </button>

          {/* Reset Session */}
          <button
            onClick={handleResetAudit}
            disabled={Object.keys(auditEntries).length === 0}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#71717a] hover:text-[#d45a4a] hover:bg-[#d45a4a]/10 border border-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Clear all scanned physical counts in current session"
          >
            Reset Session
          </button>
        </div>
      </div>

      {/* ─── Page Title Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d4a853] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4a853]">
              Rapid Cycle Count Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#f4f4f5] tracking-tight">
            Aisle Audit & Shrinkage Scanner
          </h1>
          <p className="text-xs text-[#97979d] mt-1 max-w-2xl">
            Audit shelf inventory with a USB barcode gun. Instantly detects physical shortages, unrecorded theft, damaged goods, and aligns system balances with 1-click reconciliation.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={computedRows.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#e8e6e3] bg-[#14141a] hover:bg-[#1f1f2a] border border-white/10 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-40"
          >
            <span>📥 Export Audit CSV</span>
          </button>

          <button
            onClick={() => setShowReconcileModal(true)}
            disabled={discrepantItems.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg active:scale-95 ${
              discrepantItems.length > 0
                ? "bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] text-[#0c0c0e] hover:shadow-[0_0_20px_rgba(212,168,83,0.3)]"
                : "bg-white/5 text-[#71717a] border border-white/5 cursor-not-allowed"
            }`}
          >
            <span>⚡ Reconcile Variances</span>
            {discrepantItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#0c0c0e] text-[#f5cf7b] text-[10px]">
                {discrepantItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Real-Time Shrinkage Telemetry Ribbon ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-6">
        {/* Card 1: Audit Progress */}
        <div className="p-3.5 rounded-xl bg-[#14141a] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#71717a] tracking-wider">
            Audited Progress
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-[#f4f4f5]">
              {telemetry.auditedCount}
              <span className="text-xs font-normal text-[#71717a]"> / {telemetry.totalInScope}</span>
            </span>
            <span className="text-xs font-bold text-[#d4a853]">
              {telemetry.progressPercent}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] transition-all duration-300"
              style={{ width: `${telemetry.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Card 2: Match Accuracy */}
        <div className="p-3.5 rounded-xl bg-[#14141a] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#71717a] tracking-wider">
            Verified Accurate
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-[#4ade80]">
              {telemetry.matchCount}
              <span className="text-xs font-normal text-[#71717a]"> SKUs</span>
            </span>
            <span className="text-xs font-bold text-[#4ade80]">
              {telemetry.matchPercent}%
            </span>
          </div>
          <span className="text-[10px] text-[#71717a] mt-2">Zero variance matches</span>
        </div>

        {/* Card 3: Shortage Units */}
        <div className="p-3.5 rounded-xl bg-[#14141a] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#d45a4a] tracking-wider">
            Shortage / Lost
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-[#f87171]">
              -{telemetry.shortageUnits}
            </span>
            <span className="text-[10px] font-semibold text-[#f87171] uppercase">Units</span>
          </div>
          <span className="text-[10px] text-[#71717a] mt-2">Missing from shelves</span>
        </div>

        {/* Card 4: Shrinkage Capital Loss */}
        <div className="p-3.5 rounded-xl bg-[#14141a] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#d45a4a] tracking-wider">
            Shrinkage Loss
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-[#f87171]">
              -₹{telemetry.shortageCapitalLoss.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-[10px] text-[#71717a] mt-2">Immobilized / stolen loss</span>
        </div>

        {/* Card 5: Surplus / Found Stock */}
        <div className="p-3.5 rounded-xl bg-[#14141a] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#60a5fa] tracking-wider">
            Surplus / Found
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-[#60a5fa]">
              +{telemetry.surplusUnits}
            </span>
            <span className="text-[10px] font-semibold text-[#60a5fa] uppercase">Units</span>
          </div>
          <span className="text-[10px] text-[#71717a] mt-2">
            +₹{telemetry.surplusCapitalGain.toLocaleString("en-IN", { maximumFractionDigits: 0 })} found
          </span>
        </div>

        {/* Card 6: Net Financial Variance */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
          telemetry.netVarianceValue < 0
            ? "bg-[#d45a4a]/10 border-[#d45a4a]/30"
            : telemetry.netVarianceValue > 0
            ? "bg-[#60a5fa]/10 border-[#60a5fa]/30"
            : "bg-[#14141a] border-white/10"
        }`}>
          <span className="text-[10px] uppercase font-semibold text-[#71717a] tracking-wider">
            Net Variance Value
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-xl font-extrabold ${
              telemetry.netVarianceValue < 0
                ? "text-[#f87171]"
                : telemetry.netVarianceValue > 0
                ? "text-[#60a5fa]"
                : "text-[#4ade80]"
            }`}>
              {telemetry.netVarianceValue > 0 ? "+" : ""}
              ₹{telemetry.netVarianceValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-[10px] text-[#71717a] mt-2">
            {telemetry.netVarianceValue < 0 ? "Net capital loss" : telemetry.netVarianceValue > 0 ? "Net capital gain" : "Ledger in sync"}
          </span>
        </div>
      </div>

      {/* ─── USB Barcode Scanner Command Station ─── */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-[#181822] via-[#121218] to-[#0d0d12] border border-[#d4a853]/30 shadow-xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d4a853] animate-ping" />
            <span className="text-xs font-bold text-[#f5cf7b] uppercase tracking-wider">
              USB Barcode Gun Listener
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4a853]/20 text-[#d4a853] font-semibold">
              Live & Ready
            </span>
          </div>

          {/* Scanner Mode Controls */}
          <div className="flex items-center gap-3">
            {/* Multiplier Pills */}
            <div className="flex items-center gap-1 bg-[#0b0b0f] p-1 rounded-xl border border-white/10">
              <span className="text-[10px] text-[#71717a] px-1.5 font-semibold">Increment:</span>
              {[1, 5, 10, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMultiplier(m)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    multiplier === m
                      ? "bg-[#d4a853] text-[#0c0c0e]"
                      : "text-[#97979d] hover:text-[#f4f4f5] hover:bg-white/5"
                  }`}
                >
                  +{m}
                </button>
              ))}
            </div>

            {/* Continuous Focus Lock Toggle */}
            <label className="flex items-center gap-1.5 text-[11px] text-[#97979d] cursor-pointer">
              <input
                type="checkbox"
                checked={continuousScan}
                onChange={(e) => setContinuousScan(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#d4a853]"
              />
              <span>Focus Lock</span>
            </label>
          </div>
        </div>

        {/* Barcode Input Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={scanInputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan barcode with handheld gun or type SKU/Name and press Enter..."
              className="w-full px-4 py-3 rounded-xl bg-[#0b0b0f] text-[#f4f4f5] text-xs border border-[#d4a853]/40 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] outline-none shadow-inner placeholder:text-[#52525b]"
            />
            {scanInput && (
              <button
                type="button"
                onClick={() => setScanInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717a] hover:text-[#f4f4f5]"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleProcessScan(scanInput)}
            disabled={!scanInput.trim()}
            className="px-5 py-3 rounded-xl text-xs font-bold bg-[#d4a853] hover:bg-[#e8be66] active:scale-95 text-[#0c0c0e] transition-all shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Count (+{multiplier})
          </button>

          <button
            type="button"
            onClick={() => setIsCameraScannerOpen(true)}
            className="px-4 py-3 rounded-xl text-xs font-bold bg-[#1e1c18] hover:bg-[#29251e] border border-[#d4a853]/50 text-[#f5cf7b] hover:text-white hover:border-[#d4a853] hover:scale-[1.02] active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            title="Scan barcode with Phone Camera"
          >
            <span>📷 Camera</span>
          </button>
        </div>

        {/* Scan Feedback Banner */}
        {scanMessage && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between border ${
              scanMessage.type === "success"
                ? "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]"
                : scanMessage.type === "warning"
                ? "bg-[#d45a4a]/10 border-[#d45a4a]/30 text-[#f87171]"
                : "bg-white/5 border-white/10 text-[#97979d]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{scanMessage.type === "success" ? "✅" : scanMessage.type === "warning" ? "⚠️" : "ℹ️"}</span>
              <span>{scanMessage.text}</span>
            </div>
            <button
              onClick={() => setScanMessage(null)}
              className="text-[10px] underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Last Scanned Quick Badge */}
        {lastScannedItem && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#97979d]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-[#71717a]">Last Scanned:</span>
              <span className="font-semibold text-[#f4f4f5]">{lastScannedItem.name}</span>
              <span className="text-[10px] text-[#71717a]">({lastScannedItem.sku})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#71717a]">Shelf Total:</span>
              <span className="px-2 py-0.5 rounded-md bg-[#d4a853]/20 text-[#f5cf7b] font-bold text-xs">
                {lastScannedItem.count} units
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Scope Filter & Search Controls ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        {/* Left: Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Items", count: computedRows.length },
            { id: "audited", label: "Audited", count: telemetry.auditedCount },
            { id: "discrepancies", label: "Discrepancies", count: discrepantItems.length },
            { id: "shortage", label: "Shortage", count: computedRows.filter((r) => r.isAudited && r.varianceUnits < 0).length },
            { id: "surplus", label: "Surplus", count: computedRows.filter((r) => r.isAudited && r.varianceUnits > 0).length },
            { id: "matches", label: "Matches", count: telemetry.matchCount },
            { id: "unscanned", label: "Pending Scan", count: computedRows.filter((r) => !r.isAudited).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as typeof filterTab)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? "bg-[#d4a853] text-[#0c0c0e] font-bold shadow-sm"
                  : "bg-[#14141a] text-[#97979d] hover:text-[#f4f4f5] border border-white/5"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  filterTab === tab.id ? "bg-[#0c0c0e]/30 text-[#0c0c0e]" : "bg-white/10 text-[#71717a]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Category & Search */}
        <div className="flex items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-[#14141a] text-[#f4f4f5] border border-white/10 focus:border-[#d4a853] outline-none"
          >
            <option value="all">All Categories ({inventory.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Search box */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU or Name..."
            className="w-44 px-3 py-1.5 rounded-xl text-xs bg-[#14141a] text-[#f4f4f5] border border-white/10 focus:border-[#d4a853] outline-none placeholder:text-[#52525b]"
          />
        </div>
      </div>

      {/* ─── Inventory Audit & Shrinkage Table ─── */}
      <div className="rounded-2xl bg-[#14141a] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#0e0e14] text-[10px] uppercase font-bold tracking-wider text-[#71717a]">
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">System Stock</th>
                <th className="py-3 px-4 text-center">Physical Count</th>
                <th className="py-3 px-3 text-right">Variance Units</th>
                <th className="py-3 px-3 text-right">Capital Impact</th>
                <th className="py-3 px-4">Discrepancy Reason</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isInventoryLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#71717a]">
                    Loading store inventory records...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#71717a]">
                    No items match the selected filter or search query.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isShortage = row.isAudited && row.varianceUnits < 0;
                  const isSurplus = row.isAudited && row.varianceUnits > 0;
                  const isMatch = row.isAudited && row.varianceUnits === 0;

                  return (
                    <tr
                      key={row.item.productId}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isShortage ? "bg-[#d45a4a]/[0.03]" : isSurplus ? "bg-[#60a5fa]/[0.03]" : ""
                      }`}
                    >
                      {/* Status indicator */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {!row.isAudited ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-[#71717a] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#71717a]" />
                            Pending
                          </span>
                        ) : isMatch ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#4ade80]/15 text-[#4ade80] font-bold">
                            <span>✓</span> Match
                          </span>
                        ) : isShortage ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#d45a4a]/20 text-[#f87171] font-bold">
                            <span>▼</span> Shortage
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#60a5fa]/20 text-[#60a5fa] font-bold">
                            <span>▲</span> Surplus
                          </span>
                        )}
                      </td>

                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#f4f4f5] max-w-xs truncate">
                          {row.item.productName}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#71717a] mt-0.5">
                          <span>SKU: {row.item.sku}</span>
                          {row.item.barcode && (
                            <>
                              <span>•</span>
                              <span className="text-[#a1a1aa]">Barcode: {row.item.barcode}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-[#97979d] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px]">
                          {row.categoryName}
                        </span>
                      </td>

                      {/* System Stock */}
                      <td className="py-3 px-3 text-right font-semibold text-[#a1a1aa] whitespace-nowrap">
                        {row.systemCount} units
                      </td>

                      {/* Physical Count with Inline Buttons */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(row.item.productId, -1)}
                            className="w-6 h-6 rounded bg-[#1c1c26] hover:bg-white/10 text-[#f4f4f5] font-bold flex items-center justify-center transition-all"
                            title="Decrement count (-1)"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={row.isAudited ? row.physicalCount : ""}
                            placeholder="—"
                            onChange={(e) =>
                              handleSetCount(row.item.productId, parseInt(e.target.value, 10) || 0)
                            }
                            className={`w-16 px-2 py-1 text-center font-bold text-xs rounded-lg bg-[#0b0b0f] border focus:border-[#d4a853] outline-none ${
                              row.isAudited
                                ? isMatch
                                  ? "border-[#4ade80]/40 text-[#4ade80]"
                                  : isShortage
                                  ? "border-[#d45a4a]/40 text-[#f87171]"
                                  : "border-[#60a5fa]/40 text-[#60a5fa]"
                                : "border-white/10 text-[#71717a]"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(row.item.productId, 1)}
                            className="w-6 h-6 rounded bg-[#1c1c26] hover:bg-white/10 text-[#f4f4f5] font-bold flex items-center justify-center transition-all"
                            title="Increment count (+1)"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Variance Units */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold">
                        {!row.isAudited ? (
                          <span className="text-[#52525b]">—</span>
                        ) : isMatch ? (
                          <span className="text-[#4ade80]">0</span>
                        ) : isShortage ? (
                          <span className="text-[#f87171]">{row.varianceUnits}</span>
                        ) : (
                          <span className="text-[#60a5fa]">+{row.varianceUnits}</span>
                        )}
                      </td>

                      {/* Capital Impact */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-semibold">
                        {!row.isAudited || isMatch ? (
                          <span className="text-[#52525b]">₹0</span>
                        ) : isShortage ? (
                          <span className="text-[#f87171]">
                            -₹{Math.abs(row.varianceValue).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className="text-[#60a5fa]">
                            +₹{row.varianceValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </td>

                      {/* Discrepancy Reason Dropdown & Note */}
                      <td className="py-3 px-4">
                        {row.isAudited && row.varianceUnits !== 0 ? (
                          <div className="space-y-1">
                            <select
                              value={row.reason}
                              onChange={(e) =>
                                handleSetReason(row.item.productId, e.target.value as AuditEntry["reason"])
                              }
                              className="w-48 px-2 py-1 rounded-lg text-[11px] bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 focus:border-[#d4a853] outline-none"
                            >
                              {Object.entries(REASON_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={row.note}
                              placeholder="Audit note (optional)..."
                              onChange={(e) => handleSetNote(row.item.productId, e.target.value)}
                              className="w-48 px-2 py-0.5 rounded text-[10px] bg-[#0b0b0f] text-[#a1a1aa] border border-white/10 focus:border-[#d4a853] outline-none placeholder:text-[#52525b]"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#52525b]">
                            {row.isAudited ? "Verified accurate" : "Pending audit"}
                          </span>
                        )}
                      </td>

                      {/* Quick Action: Match System or Reconcile Single */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleMatchSystem(row.item)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#97979d] hover:text-[#f4f4f5] bg-white/5 hover:bg-white/10 transition-all"
                          title="Set physical count equal to current system stock"
                        >
                          Match System
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Reconciliation Confirmation Modal ─── */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#14141a] border border-[#d4a853]/40 shadow-2xl p-6 text-xs">
            {reconcileResult ? (
              /* Success View */
              <div className="text-center py-4">
                <span className="text-4xl">🎉</span>
                <h3 className="text-lg font-bold text-[#f4f4f5] mt-3">
                  Reconciliation Complete!
                </h3>
                <p className="text-xs text-[#97979d] mt-1">
                  Adjusted {reconcileResult.adjustedCount} inventory records in database ledger.
                </p>
                <div className="grid grid-cols-2 gap-3 my-5 p-4 rounded-xl bg-[#0b0b0f] border border-white/10 text-left">
                  <div>
                    <span className="text-[10px] uppercase text-[#71717a]">Net Units Adjusted</span>
                    <p className="text-base font-bold text-[#f4f4f5] mt-0.5">
                      {reconcileResult.netUnits > 0 ? "+" : ""}{reconcileResult.netUnits} units
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#71717a]">Net Capital Impact</span>
                    <p className={`text-base font-bold mt-0.5 ${
                      reconcileResult.netValue < 0 ? "text-[#f87171]" : "text-[#4ade80]"
                    }`}>
                      {reconcileResult.netValue > 0 ? "+" : ""}
                      ₹{reconcileResult.netValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowReconcileModal(false);
                    setReconcileResult(null);
                  }}
                  className="w-full py-2.5 rounded-xl font-bold bg-[#d4a853] text-[#0c0c0e] hover:bg-[#e8be66] transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Confirmation View */
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <h3 className="text-sm font-bold text-[#f4f4f5]">
                      Confirm Inventory Reconciliation
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowReconcileModal(false)}
                    className="text-xs text-[#71717a] hover:text-[#f4f4f5]"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-[#97979d] mt-3">
                  This action will commit physical audit variances into the permanent inventory ledger, creating auditable stock movement entries.
                </p>

                {/* Summary Box */}
                <div className="my-4 p-4 rounded-xl bg-[#0b0b0f] border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#71717a]">Items with Variances:</span>
                    <span className="font-bold text-[#f4f4f5]">{discrepantItems.length} SKUs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717a]">Total Physical Shortage:</span>
                    <span className="font-bold text-[#f87171]">-{telemetry.shortageUnits} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717a]">Total Physical Surplus:</span>
                    <span className="font-bold text-[#60a5fa]">+{telemetry.surplusUnits} units</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                    <span className="text-[#e8e6e3]">Net Capital Impact:</span>
                    <span className={telemetry.netVarianceValue < 0 ? "text-[#f87171]" : "text-[#4ade80]"}>
                      {telemetry.netVarianceValue > 0 ? "+" : ""}
                      ₹{telemetry.netVarianceValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {isReconciling && reconcileProgress && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-[#71717a] mb-1">
                      <span>Reconciling items...</span>
                      <span>{reconcileProgress.current} / {reconcileProgress.total}</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#d4a853] transition-all duration-200"
                        style={{ width: `${(reconcileProgress.current / reconcileProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowReconcileModal(false)}
                    disabled={isReconciling}
                    className="px-4 py-2 rounded-xl text-[#71717a] hover:text-[#f4f4f5] hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitReconciliation}
                    disabled={isReconciling || discrepantItems.length === 0}
                    className="px-5 py-2 rounded-xl font-bold bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] transition-all shadow-md active:scale-95 disabled:opacity-40"
                  >
                    {isReconciling ? "Reconciling Ledger..." : `Reconcile ${discrepantItems.length} SKUs`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(code) => handleProcessScan(code)}
      />
    </div>
  );
}
