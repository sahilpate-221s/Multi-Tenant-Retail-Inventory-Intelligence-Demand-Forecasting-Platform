import { useState, useMemo } from "react";
import { useVendorKhata } from "../hooks/useVendorKhata";
import { useSuppliers } from "../hooks/useSuppliers";
import type { VendorKhataAccount, VendorLedgerEntry } from "../lib/vendorKhataStorage";

type ViewMode = "overview" | "detail";
type LedgerFilter = "all" | "invoice" | "payment" | "credit_note";

// ── Utility Formatters ──────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(dateStr);
}

function getDueDate(account: VendorKhataAccount): Date | null {
  if (account.totalOutstanding <= 0) return null;
  const invoices = account.ledgerEntries.filter((e) => e.type === "invoice");
  if (invoices.length === 0) return null;
  const oldestInvoice = invoices[invoices.length - 1];
  return new Date(new Date(oldestInvoice.date).getTime() + account.creditTerms.creditPeriodDays * 86400000);
}

function getDueDaysRemaining(account: VendorKhataAccount): number | null {
  const due = getDueDate(account);
  if (!due) return null;
  return Math.ceil((due.getTime() - Date.now()) / 86400000);
}

function getDueStatusColor(daysLeft: number | null): string {
  if (daysLeft === null) return "text-[#5c5c64]";
  if (daysLeft < 0) return "text-[#ff4d4f]";
  if (daysLeft <= 3) return "text-[#ff8c00]";
  if (daysLeft <= 7) return "text-[#d4a853]";
  return "text-[#4ade80]";
}

function getDueBadgeBg(daysLeft: number | null): string {
  if (daysLeft === null) return "bg-[#5c5c64]/10";
  if (daysLeft < 0) return "bg-[#ff4d4f]/10";
  if (daysLeft <= 3) return "bg-[#ff8c00]/10";
  if (daysLeft <= 7) return "bg-[#d4a853]/10";
  return "bg-[#4ade80]/10";
}

function getEntryTypeLabel(type: VendorLedgerEntry["type"]): string {
  switch (type) {
    case "invoice": return "📄 Invoice";
    case "payment": return "💰 Payment";
    case "credit_note": return "🔄 Credit Note";
    case "debit_note": return "📋 Debit Note";
    default: return type;
  }
}

function getEntryColor(type: VendorLedgerEntry["type"]): string {
  switch (type) {
    case "invoice": return "text-[#ff6b6b]";
    case "payment": return "text-[#4ade80]";
    case "credit_note": return "text-[#60a5fa]";
    case "debit_note": return "text-[#ff8c00]";
    default: return "text-[#97979d]";
  }
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────────

function VendorKhataPage() {
  const {
    accounts,
    totalPayables,
    overdueAccounts,
    dueThisWeek,
    activeVendorCount,
    settledCount,
    createAccount,
    addInvoice,
    addPayment,
    addCreditNote,
    deleteAccount,
  } = useVendorKhata();

  const { data: suppliers } = useSuppliers();

  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedAccount, setSelectedAccount] = useState<VendorKhataAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Ledger filter
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return accounts;
    const term = searchTerm.toLowerCase();
    return accounts.filter(
      (a) =>
        a.supplierName.toLowerCase().includes(term) ||
        a.supplierPhone.includes(term),
    );
  }, [accounts, searchTerm]);

  const handleSelectAccount = (account: VendorKhataAccount) => {
    setSelectedAccount(account);
    setViewMode("detail");
    setLedgerFilter("all");
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedAccount(null);
  };

  // Refresh the selected account from storage after mutations
  const refreshSelected = () => {
    if (selectedAccount) {
      const updated = accounts.find((a) => a.id === selectedAccount.id);
      if (updated) setSelectedAccount(updated);
    }
  };

  // ── Filtered Ledger Entries ─────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    if (!selectedAccount) return [];
    if (ledgerFilter === "all") return selectedAccount.ledgerEntries;
    return selectedAccount.ledgerEntries.filter((e) => e.type === ledgerFilter);
  }, [selectedAccount, ledgerFilter]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          {viewMode === "detail" && (
            <button
              onClick={handleBackToOverview}
              className="text-[11px] text-[#97979d] hover:text-[#d4a853] transition-colors mb-1 flex items-center gap-1"
            >
              ← Back to All Vendors
            </button>
          )}
          <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
            ACCOUNTS PAYABLE
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            {viewMode === "overview" ? "Vendor Khata" : selectedAccount?.supplierName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === "overview" && (
            <button
              onClick={() => setShowLinkModal(true)}
              className="text-xs font-mono font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95"
            >
              + Link Supplier
            </button>
          )}
          {viewMode === "detail" && selectedAccount && (
            <>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="text-xs font-mono font-semibold px-4 py-2 bg-[#ff6b6b]/15 hover:bg-[#ff6b6b]/25 text-[#ff6b6b] border border-[#ff6b6b]/30 rounded-lg transition-all active:scale-95"
              >
                + Record Invoice
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="text-xs font-mono font-semibold px-4 py-2 bg-[#4ade80]/15 hover:bg-[#4ade80]/25 text-[#4ade80] border border-[#4ade80]/30 rounded-lg transition-all active:scale-95"
              >
                💰 Record Payment
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Overview Mode ─────────────────────────────────────────────── */}
      {viewMode === "overview" && (
        <>
          {/* Telemetry Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <TelemetryCard
              label="TOTAL PAYABLE"
              value={formatCurrency(totalPayables)}
              accent={totalPayables > 0 ? "#ff6b6b" : "#4ade80"}
              sub={totalPayables > 0 ? "outstanding to vendors" : "all settled ✓"}
            />
            <TelemetryCard
              label="ACTIVE VENDORS"
              value={String(activeVendorCount)}
              accent="#d4a853"
              sub={`${settledCount} settled`}
            />
            <TelemetryCard
              label="OVERDUE"
              value={String(overdueAccounts.length)}
              accent={overdueAccounts.length > 0 ? "#ff4d4f" : "#4ade80"}
              sub={overdueAccounts.length > 0 ? "past credit period" : "no overdue"}
            />
            <TelemetryCard
              label="DUE THIS WEEK"
              value={String(dueThisWeek.length)}
              accent={dueThisWeek.length > 0 ? "#ff8c00" : "#5c5c64"}
              sub={dueThisWeek.length > 0 ? "payments upcoming" : "nothing due"}
            />
          </div>

          {/* Search */}
          <div className="mt-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍  Search vendors by name or phone..."
              className="w-full md:w-96 px-4 py-2.5 bg-[#121216] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#e8e6e3] placeholder:text-[#5c5c64] focus:outline-none focus:border-[#d4a853]/50 transition-colors"
            />
          </div>

          {/* Vendor Accounts Table */}
          <div className="mt-4 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
            {filteredAccounts.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[#5c5c64] text-sm">No vendor accounts found.</p>
                <p className="text-[#5c5c64] text-[11px] mt-1">Link a supplier to start tracking credit terms.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16161d] text-[#97979d] border-b border-[rgba(255,255,255,0.08)] uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Vendor</th>
                      <th className="px-5 py-3">Outstanding</th>
                      <th className="px-5 py-3">Credit Terms</th>
                      <th className="px-5 py-3">Payment Due</th>
                      <th className="px-5 py-3">Last Activity</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {filteredAccounts.map((account) => {
                      const daysLeft = getDueDaysRemaining(account);
                      const utilization = account.creditTerms.creditLimitAmount > 0
                        ? (account.totalOutstanding / account.creditTerms.creditLimitAmount) * 100
                        : 0;
                      const isOverLimit = utilization > 100;

                      return (
                        <tr
                          key={account.id}
                          className="hover:bg-[#181822]/70 transition-colors group cursor-pointer"
                          onClick={() => handleSelectAccount(account)}
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-[#e8e6e3] text-xs">{account.supplierName}</p>
                            <p className="text-[10px] text-[#5c5c64] mt-0.5">{account.supplierPhone}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className={`font-bold text-sm ${account.totalOutstanding > 0 ? "text-[#ff6b6b]" : "text-[#4ade80]"}`}>
                              {formatCurrency(account.totalOutstanding)}
                            </p>
                            {account.totalOutstanding > 0 && (
                              <div className="mt-1.5 w-24">
                                <div className="h-1 bg-[#1e1e28] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${isOverLimit ? "bg-[#ff4d4f]" : utilization > 75 ? "bg-[#ff8c00]" : "bg-[#d4a853]"}`}
                                    style={{ width: `${Math.min(utilization, 100)}%` }}
                                  />
                                </div>
                                <p className={`text-[9px] mt-0.5 ${isOverLimit ? "text-[#ff4d4f]" : "text-[#5c5c64]"}`}>
                                  {utilization.toFixed(0)}% of {formatCurrency(account.creditTerms.creditLimitAmount)} limit
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[#e8e6e3]">{account.creditTerms.creditPeriodDays}d credit</span>
                            {account.creditTerms.paymentDay && (
                              <p className="text-[10px] text-[#5c5c64] mt-0.5">Pay on {account.creditTerms.paymentDay}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {account.totalOutstanding > 0 ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getDueBadgeBg(daysLeft)} ${getDueStatusColor(daysLeft)}`}>
                                {daysLeft !== null && daysLeft < 0
                                  ? `⚠ ${Math.abs(daysLeft)}d OVERDUE`
                                  : daysLeft !== null && daysLeft <= 3
                                  ? `🔥 ${daysLeft}d left`
                                  : daysLeft !== null
                                  ? `${daysLeft}d remaining`
                                  : "—"}
                              </span>
                            ) : (
                              <span className="text-[#4ade80] text-[11px]">✓ Settled</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-[#97979d] text-[11px]">
                            {formatRelativeDate(account.updatedAt)}
                          </td>
                          <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleSelectAccount(account)}
                              className="text-xs text-[#97979d] hover:text-[#d4a853] transition-colors mr-3"
                            >
                              Ledger →
                            </button>
                            {account.supplierPhone && (
                              <a
                                href={`https://wa.me/${account.supplierPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Hi, this is regarding our outstanding balance of ${formatCurrency(account.totalOutstanding)}. Please confirm payment schedule.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#25D366] hover:text-[#2ae87d] transition-colors mr-3"
                                title="WhatsApp payment reminder"
                              >
                                💬
                              </a>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`Remove vendor khata for ${account.supplierName}?`)) {
                                  deleteAccount(account.id);
                                }
                              }}
                              className="text-xs text-[#d45a4a] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Detail View ───────────────────────────────────────────────── */}
      {viewMode === "detail" && selectedAccount && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <TelemetryCard
              label="OUTSTANDING"
              value={formatCurrency(selectedAccount.totalOutstanding)}
              accent={selectedAccount.totalOutstanding > 0 ? "#ff6b6b" : "#4ade80"}
              sub={selectedAccount.totalOutstanding > 0 ? "owed to vendor" : "fully settled"}
            />
            <TelemetryCard
              label="CREDIT PERIOD"
              value={`${selectedAccount.creditTerms.creditPeriodDays} days`}
              accent="#d4a853"
              sub={selectedAccount.creditTerms.paymentDay ? `Pay on ${selectedAccount.creditTerms.paymentDay}` : "No fixed day"}
            />
            <TelemetryCard
              label="CREDIT LIMIT"
              value={formatCurrency(selectedAccount.creditTerms.creditLimitAmount)}
              accent="#60a5fa"
              sub={`${((selectedAccount.totalOutstanding / (selectedAccount.creditTerms.creditLimitAmount || 1)) * 100).toFixed(0)}% utilized`}
            />
            {(() => {
              const daysLeft = getDueDaysRemaining(selectedAccount);
              return (
                <TelemetryCard
                  label="NEXT DUE"
                  value={daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d OVERDUE` : `${daysLeft}d`) : "N/A"}
                  accent={daysLeft !== null && daysLeft < 0 ? "#ff4d4f" : daysLeft !== null && daysLeft <= 7 ? "#ff8c00" : "#4ade80"}
                  sub={getDueDate(selectedAccount) ? formatDate(getDueDate(selectedAccount)!.toISOString()) : "No pending invoices"}
                />
              );
            })()}
          </div>

          {/* Ledger Filter Tabs */}
          <div className="flex items-center gap-2 mt-6 mb-4">
            {(["all", "invoice", "payment", "credit_note"] as LedgerFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setLedgerFilter(filter)}
                className={`text-[11px] px-3 py-1.5 rounded-lg transition-all font-medium ${
                  ledgerFilter === filter
                    ? "bg-[#d4a853]/15 text-[#d4a853] border border-[#d4a853]/30"
                    : "text-[#97979d] hover:text-[#e8e6e3] border border-transparent"
                }`}
              >
                {filter === "all" ? "All" : filter === "invoice" ? "📄 Invoices" : filter === "payment" ? "💰 Payments" : "🔄 Credits"}
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-[10px] text-[#5c5c64]">
              {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {/* Ledger Entries */}
          <div className="border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
            {filteredEntries.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[#5c5c64] text-sm">No ledger entries yet.</p>
                <p className="text-[#5c5c64] text-[11px] mt-1">Record an invoice or payment to start the ledger.</p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="px-5 py-4 hover:bg-[#181822]/60 transition-colors flex items-center gap-4"
                  >
                    {/* Type Badge */}
                    <div className="shrink-0">
                      <span className={`text-xs font-medium ${getEntryColor(entry.type)}`}>
                        {getEntryTypeLabel(entry.type)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.invoiceNumber && (
                          <span className="text-[11px] font-mono text-[#e8e6e3] bg-[#1e1e28] px-2 py-0.5 rounded">
                            #{entry.invoiceNumber}
                          </span>
                        )}
                        {entry.paymentMethod && (
                          <span className="text-[11px] text-[#97979d] bg-[#1e1e28] px-2 py-0.5 rounded uppercase">
                            {entry.paymentMethod}
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-[11px] text-[#97979d] mt-1 truncate">{entry.notes}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${entry.amount > 0 ? "text-[#ff6b6b]" : "text-[#4ade80]"}`}>
                        {entry.amount > 0 ? "+" : ""}{formatCurrency(Math.abs(entry.amount))}
                      </p>
                      <p className="text-[10px] text-[#5c5c64] mt-0.5">{formatRelativeDate(entry.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick WhatsApp Payment Reminder */}
          {selectedAccount.totalOutstanding > 0 && selectedAccount.supplierPhone && (
            <div className="mt-4 p-4 border border-[rgba(255,255,255,0.06)] rounded-xl bg-[#121216]/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#e8e6e3] font-medium">Send Payment Reminder via WhatsApp</p>
                  <p className="text-[10px] text-[#5c5c64] mt-0.5">
                    Notify {selectedAccount.supplierName} about outstanding {formatCurrency(selectedAccount.totalOutstanding)}
                  </p>
                </div>
                <a
                  href={`https://wa.me/${selectedAccount.supplierPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    [
                      `*Payment Confirmation Request*`,
                      `Vendor: ${selectedAccount.supplierName}`,
                      `Outstanding Balance: ${formatCurrency(selectedAccount.totalOutstanding)}`,
                      `Credit Terms: ${selectedAccount.creditTerms.creditPeriodDays} days`,
                      getDueDate(selectedAccount) ? `Due Date: ${formatDate(getDueDate(selectedAccount)!.toISOString())}` : "",
                      ``,
                      `Please confirm payment schedule. Thank you!`,
                    ].filter(Boolean).join("\n")
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-semibold px-4 py-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>💬</span> Send WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* Export Ledger CSV */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                if (!selectedAccount) return;
                const header = "Date,Type,Invoice#,Amount,Payment Method,Notes\n";
                const rows = selectedAccount.ledgerEntries.map((e) =>
                  [
                    formatDate(e.date),
                    e.type,
                    e.invoiceNumber || "",
                    e.amount,
                    e.paymentMethod || "",
                    `"${(e.notes || "").replace(/"/g, '""')}"`,
                  ].join(",")
                ).join("\n");
                const blob = new Blob([header + rows], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `vendor_ledger_${selectedAccount.supplierName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-[11px] text-[#97979d] hover:text-[#d4a853] transition-colors"
            >
              📥 Export Ledger CSV
            </button>
          </div>
        </>
      )}

      {/* ── Link Supplier Modal ───────────────────────────────────────── */}
      {showLinkModal && (
        <LinkSupplierModal
          suppliers={suppliers || []}
          existingAccountSupplierIds={accounts.map((a) => a.supplierId)}
          onLink={(input) => {
            createAccount(input);
            setShowLinkModal(false);
          }}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {/* ── Record Invoice Modal ──────────────────────────────────────── */}
      {showInvoiceModal && selectedAccount && (
        <RecordInvoiceModal
          supplierName={selectedAccount.supplierName}
          onRecord={(input) => {
            addInvoice(selectedAccount.id, input);
            setShowInvoiceModal(false);
            refreshSelected();
          }}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* ── Record Payment Modal ──────────────────────────────────────── */}
      {showPaymentModal && selectedAccount && (
        <RecordPaymentModal
          supplierName={selectedAccount.supplierName}
          outstanding={selectedAccount.totalOutstanding}
          onRecord={(input) => {
            addPayment(selectedAccount.id, input);
            setShowPaymentModal(false);
            refreshSelected();
          }}
          onCreditNote={(input) => {
            addCreditNote(selectedAccount.id, input);
            setShowPaymentModal(false);
            refreshSelected();
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function TelemetryCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub: string }) {
  return (
    <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121216]/80 backdrop-blur-lg">
      <p className="text-[10px] uppercase tracking-widest text-[#5c5c64]">{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: accent }}>{value}</p>
      <p className="text-[10px] text-[#5c5c64] mt-0.5">{sub}</p>
    </div>
  );
}

// ── Link Supplier Modal ─────────────────────────────────────────────────────

function LinkSupplierModal({
  suppliers,
  existingAccountSupplierIds,
  onLink,
  onClose,
}: {
  suppliers: { id: string; name: string; contactPhone: string | null }[];
  existingAccountSupplierIds: string[];
  onLink: (input: { supplierId: string; supplierName: string; supplierPhone: string; creditPeriodDays: number; creditLimitAmount: number; paymentDay?: string }) => void;
  onClose: () => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [creditPeriodDays, setCreditPeriodDays] = useState(15);
  const [creditLimitAmount, setCreditLimitAmount] = useState(50000);
  const [paymentDay, setPaymentDay] = useState("");

  const availableSuppliers = suppliers.filter((s) => !existingAccountSupplierIds.includes(s.id));
  const selectedSupplier = availableSuppliers.find((s) => s.id === supplierId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    onLink({
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      supplierPhone: selectedSupplier.contactPhone || "",
      creditPeriodDays,
      creditLimitAmount,
      paymentDay: paymentDay || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121216] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-bold text-[#e8e6e3]">Link Supplier to Vendor Khata</h2>
          <p className="text-[10px] text-[#5c5c64] mt-0.5">Set credit terms for accounts payable tracking</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Supplier</label>
            {availableSuppliers.length === 0 ? (
              <p className="text-[11px] text-[#5c5c64]">All suppliers are already linked. Add a new supplier first.</p>
            ) : (
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#e8e6e3] focus:outline-none focus:border-[#d4a853]/50"
              >
                <option value="">Select a supplier…</option>
                {availableSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Credit Period (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={creditPeriodDays}
                onChange={(e) => setCreditPeriodDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#e8e6e3] focus:outline-none focus:border-[#d4a853]/50"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Credit Limit (₹)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={creditLimitAmount}
                onChange={(e) => setCreditLimitAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#e8e6e3] focus:outline-none focus:border-[#d4a853]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Payment Day (optional)</label>
            <input
              type="text"
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
              placeholder='e.g., "Friday" or "1st of month"'
              className="w-full px-3 py-2 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#e8e6e3] placeholder:text-[#5c5c64] focus:outline-none focus:border-[#d4a853]/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-xs text-[#97979d] hover:text-[#e8e6e3] px-4 py-2 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!supplierId}
              className="text-xs font-mono font-semibold px-5 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              Link & Track
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Record Invoice Modal ────────────────────────────────────────────────────

function RecordInvoiceModal({
  supplierName,
  onRecord,
  onClose,
}: {
  supplierName: string;
  onRecord: (input: { amount: number; invoiceNumber?: string; notes?: string }) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onRecord({
      amount: amt,
      invoiceNumber: invoiceNumber || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121216] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-bold text-[#e8e6e3]">Record Invoice from {supplierName}</h2>
          <p className="text-[10px] text-[#5c5c64] mt-0.5">This increases the amount you owe to this vendor</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Invoice Amount (₹)</label>
            <input
              type="number"
              min={1}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              placeholder="e.g., 12500"
              className="w-full px-3 py-2.5 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#e8e6e3] placeholder:text-[#5c5c64] focus:outline-none focus:border-[#ff6b6b]/50"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Invoice Number (optional)</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g., AMU-2026-4521"
              className="w-full px-3 py-2 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#e8e6e3] placeholder:text-[#5c5c64] focus:outline-none focus:border-[#d4a853]/50"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Weekly dairy restock"
              className="w-full px-3 py-2 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#e8e6e3] placeholder:text-[#5c5c64] focus:outline-none focus:border-[#d4a853]/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-xs text-[#97979d] hover:text-[#e8e6e3] px-4 py-2 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0}
              className="text-xs font-mono font-semibold px-5 py-2 bg-[#ff6b6b]/15 hover:bg-[#ff6b6b]/25 text-[#ff6b6b] border border-[#ff6b6b]/30 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              + Record Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Record Payment Modal ────────────────────────────────────────────────────

function RecordPaymentModal({
  supplierName,
  outstanding,
  onRecord,
  onCreditNote,
  onClose,
}: {
  supplierName: string;
  outstanding: number;
  onRecord: (input: { amount: number; paymentMethod: "cash" | "upi" | "neft" | "cheque" | "adjustment"; notes?: string }) => void;
  onCreditNote: (input: { amount: number; notes?: string }) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "neft" | "cheque" | "adjustment">("neft");
  const [notes, setNotes] = useState("");
  const [isCreditNote, setIsCreditNote] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (isCreditNote) {
      onCreditNote({ amount: amt, notes: notes || undefined });
    } else {
      onRecord({ amount: amt, paymentMethod, notes: notes || undefined });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121216] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-bold text-[#e8e6e3]">
            {isCreditNote ? "Record Credit Note" : "Record Payment"} — {supplierName}
          </h2>
          <p className="text-[10px] text-[#5c5c64] mt-0.5">
            Outstanding: <span className="text-[#ff6b6b] font-medium">{formatCurrency(outstanding)}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsCreditNote(false)}
              className={`flex-1 text-[11px] py-2 rounded-lg transition-all font-medium ${
                !isCreditNote
                  ? "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30"
                  : "text-[#97979d] border border-[rgba(255,255,255,0.06)] hover:text-[#e8e6e3]"
              }`}
            >
              💰 Payment
            </button>
            <button
              type="button"
              onClick={() => setIsCreditNote(true)}
              className={`flex-1 text-[11px] py-2 rounded-lg transition-all font-medium ${
                isCreditNote
                  ? "bg-[#60a5fa]/15 text-[#60a5fa] border border-[#60a5fa]/30"
                  : "text-[#97979d] border border-[rgba(255,255,255,0.06)] hover:text-[#e8e6e3]"
              }`}
            >
              🔄 Credit Note
            </button>
          </div>

          <div>
            <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Amount (₹)</label>
            <input
              type="number"
              min={1}
              max={outstanding}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              placeholder={`Max: ${formatCurrency(outstanding)}`}
              className="w-full px-3 py-2.5 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#e8e6e3] placeholder:text-[#5c5c64] focus:outline-none focus:border-[#4ade80]/50"
            />
            {outstanding > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(outstanding))}
                className="text-[10px] text-[#d4a853] hover:underline mt-1"
              >
                Pay full outstanding ({formatCurrency(outstanding)})
              </button>
            )}
          </div>

          {!isCreditNote && (
            <div>
              <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Payment Method</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(["cash", "upi", "neft", "cheque", "adjustment"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`text-[10px] py-1.5 rounded-md transition-all capitalize ${
                      paymentMethod === method
                        ? "bg-[#d4a853]/15 text-[#d4a853] border border-[#d4a853]/30"
                        : "text-[#97979d] border border-[rgba(255,255,255,0.06)] hover:text-[#e8e6e3]"
                    }`}
                  >
                    {method === "neft" ? "NEFT" : method === "upi" ? "UPI" : method}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] text-[#97979d] uppercase tracking-wider block mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isCreditNote ? "e.g., Damaged goods return adjustment" : "e.g., NEFT Ref #TXN2892"}
              className="w-full px-3 py-2 bg-[#1e1e28] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#e8e6e3] placeholder:text-[#5c5c64] focus:outline-none focus:border-[#d4a853]/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-xs text-[#97979d] hover:text-[#e8e6e3] px-4 py-2 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0}
              className={`text-xs font-mono font-semibold px-5 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 ${
                isCreditNote
                  ? "bg-[#60a5fa]/15 hover:bg-[#60a5fa]/25 text-[#60a5fa] border border-[#60a5fa]/30"
                  : "bg-[#4ade80]/15 hover:bg-[#4ade80]/25 text-[#4ade80] border border-[#4ade80]/30"
              }`}
            >
              {isCreditNote ? "🔄 Apply Credit Note" : "💰 Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VendorKhataPage;
