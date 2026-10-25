import { useState, useMemo } from "react";
import { useKhata } from "../hooks/useKhata";
import { useStoreSettings } from "../hooks/useSettings";
import { generateKhataReminderMessage, type KhataCustomer } from "../lib/khataStorage";

function CustomerKhataPage() {
  const { customers, totalOutstanding, recordSale, recordRepayment } = useKhata();
  const { data: store } = useStoreSettings();
  const currency = store?.currency || "₹";

  const [search, setSearch] = useState("");
  const [selectedCustomerForRepayment, setSelectedCustomerForRepayment] = useState<KhataCustomer | null>(null);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<KhataCustomer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Repayment form state
  const [repayAmount, setRepayAmount] = useState("");
  const [repayNotes, setRepayNotes] = useState("");

  // New Customer form state
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustOpeningBal, setNewCustOpeningBal] = useState("");

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
    );
  }, [customers, search]);

  const activeBorrowersCount = useMemo(() => {
    return customers.filter((c) => c.totalBalance > 0).length;
  }, [customers]);

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForRepayment || !repayAmount) return;
    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) return;

    recordRepayment(selectedCustomerForRepayment.id, amt, repayNotes);
    setSelectedCustomerForRepayment(null);
    setRepayAmount("");
    setRepayNotes("");
  };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const initialBal = parseFloat(newCustOpeningBal || "0");
    recordSale(
      newCustName.trim(),
      newCustPhone.trim(),
      isNaN(initialBal) ? 0 : initialBal,
      undefined,
      "Account opening balance"
    );
    setShowAddCustomerModal(false);
    setNewCustName("");
    setNewCustPhone("");
    setNewCustOpeningBal("");
  };

  const sendWhatsAppReminder = (customer: KhataCustomer) => {
    const phone = customer.phone.replace(/\D/g, "");
    const msg = generateKhataReminderMessage(store?.name || "StockPilot Retail", customer, currency);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const exportKhataCsv = () => {
    if (!filteredCustomers.length) return;
    const headers = ["Customer Name", "Phone", "Outstanding Debt (Balance)", "Last Updated"];
    const rows = filteredCustomers.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      c.totalBalance.toFixed(2),
      c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `customer_khata_statement_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
            RETAIL ACCOUNTS RECEIVABLE
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Customer Khata (Udhaar / Store Credit)
          </h1>
          <p className="text-xs text-[#97979d] mt-1">
            Track neighborhood credit books, record partial cash repayments, and send 1-click WhatsApp reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] transition-all shadow-md active:scale-95"
          >
            + New Khata Account
          </button>
          <button
            onClick={exportKhataCsv}
            disabled={filteredCustomers.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a24] hover:bg-[#242432] text-[#97979d] hover:text-[#e8e6e3] border border-white/10 transition-all disabled:opacity-40"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#71717a] block">TOTAL OUTSTANDING CREDIT</span>
          <span className="text-2xl font-bold text-[#d45a4a] tabular-nums mt-1 block">
            {currency}{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#97979d] mt-1 block">Uncollected store receivables</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#d4a853] block">ACTIVE BORROWERS</span>
          <span className="text-2xl font-bold text-[#f4f4f5] tabular-nums mt-1 block">
            {activeBorrowersCount} Customers
          </span>
          <span className="text-[10px] text-[#97979d] mt-1 block">Accounts with balance &gt; 0</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#4aba7a] block">LEDGER STATUS</span>
          <span className="text-sm font-bold text-[#4aba7a] mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4aba7a]" />
            Khata Ledger Synced
          </span>
          <span className="text-[10px] text-[#71717a] mt-1 block">Ready for counter billing & settlements</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-5 p-3.5 rounded-xl bg-[#14141a] border border-white/8 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name or phone number..."
            className="w-full bg-[#0a0a0d] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-1.5 text-xs text-[#e8e6e3] outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#71717a] hover:text-[#e8e6e3]"
            >
              ✕
            </button>
          )}
        </div>
        <span className="text-[11px] text-[#71717a]">
          {filteredCustomers.length} Account{filteredCustomers.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Customers Table */}
      <div className="mt-4 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#97979d]">
            No customer Khata accounts found matching "{search}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16161d] text-[#97979d] border-b border-[rgba(255,255,255,0.08)] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Customer Profile</th>
                  <th className="px-5 py-3">Contact Phone</th>
                  <th className="px-5 py-3">Outstanding Due</th>
                  <th className="px-5 py-3">Account Health</th>
                  <th className="px-5 py-3 text-right">Settlement Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {filteredCustomers.map((cust) => {
                  const hasDebt = cust.totalBalance > 0;
                  return (
                    <tr key={cust.id} className="hover:bg-[#181822]/70 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#e8e6e3]">{cust.name}</div>
                        {cust.address && <div className="text-[10px] text-[#71717a]">{cust.address}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-[#97979d]">
                        {cust.phone || "No phone listed"}
                      </td>
                      <td className="px-5 py-3.5 font-bold tabular-nums">
                        <span className={hasDebt ? "text-[#d45a4a] text-sm" : "text-[#4aba7a]"}>
                          {currency}{cust.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            hasDebt
                              ? "bg-[#d45a4a]/15 text-[#d45a4a] border-[#d45a4a]/30"
                              : "bg-[#4aba7a]/15 text-[#4aba7a] border-[#4aba7a]/30"
                          }`}
                        >
                          {hasDebt ? "PAYMENT PENDING" : "CLEAR / NO DUE"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setSelectedCustomerForStatement(cust)}
                          className="px-2.5 py-1 rounded bg-[#181822] hover:bg-[#20202e] text-[#97979d] hover:text-[#e8e6e3] border border-white/6 transition-colors"
                        >
                          Statement
                        </button>
                        {hasDebt && cust.phone && (
                          <button
                            onClick={() => sendWhatsAppReminder(cust)}
                            className="px-2.5 py-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition-all font-semibold"
                            title="Send WhatsApp payment reminder"
                          >
                            💬 WhatsApp
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedCustomerForRepayment(cust);
                            setRepayAmount(cust.totalBalance.toString());
                          }}
                          className="px-3 py-1 rounded bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold transition-all shadow-sm active:scale-95"
                        >
                          💰 Record Payment
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

      {/* Repayment Modal */}
      {selectedCustomerForRepayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
          <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/6">
              <h2 className="font-bold text-sm text-[#e8e6e3]">
                💰 Record Cash Settlement / Repayment
              </h2>
              <button
                onClick={() => setSelectedCustomerForRepayment(null)}
                className="text-[#97979d] hover:text-[#e8e6e3]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-[#0b0b0f] border border-white/6">
                <span className="text-[10px] text-[#71717a] uppercase block">Customer Account</span>
                <span className="text-sm font-semibold text-[#e8e6e3] block">{selectedCustomerForRepayment.name}</span>
                <div className="text-xs text-[#d45a4a] font-bold mt-1">
                  Current Due: {currency}{selectedCustomerForRepayment.totalBalance.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#71717a] block mb-1">
                  AMOUNT RECEIVED IN CASH / UPI ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCustomerForRepayment.totalBalance}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  required
                  placeholder="e.g. 500.00"
                  className="w-full bg-[#0a0a0d] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-sm text-[#e8e6e3] outline-none font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#71717a] block mb-1">NOTES (OPTIONAL)</label>
                <input
                  type="text"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  placeholder="e.g. Cash handed at evening counter"
                  className="w-full bg-[#0a0a0d] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-xs text-[#e8e6e3] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/6">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForRepayment(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-[#97979d] hover:text-[#e8e6e3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#4aba7a] hover:bg-[#5ac98a] text-[#0c0c0e] font-semibold text-xs px-4 py-1.5 rounded-lg transition-all shadow-md active:scale-95"
                >
                  Confirm Repayment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Statement History Modal */}
      {selectedCustomerForStatement && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
          <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/6">
              <div>
                <h2 className="font-bold text-sm text-[#e8e6e3]">
                  📄 Account Statement — {selectedCustomerForStatement.name}
                </h2>
                <span className="text-[10px] text-[#97979d]">
                  {selectedCustomerForStatement.phone || "No phone"} • Total Due: {currency}{selectedCustomerForStatement.totalBalance.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomerForStatement(null)}
                className="text-[#97979d] hover:text-[#e8e6e3]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
              {selectedCustomerForStatement.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-[#0b0b0f] border border-white/6 flex items-center justify-between"
                >
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      tx.type === "sale_credit" ? "text-[#d45a4a]" : "text-[#4aba7a]"
                    }`}>
                      {tx.type === "sale_credit" ? "📒 Groceries on Credit" : "💰 Cash Repayment"}
                    </span>
                    <span className="text-[10px] text-[#71717a] block mt-0.5">
                      {new Date(tx.date).toLocaleString()} • {tx.notes || "No notes"}
                    </span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${
                    tx.type === "sale_credit" ? "text-[#d45a4a]" : "text-[#4aba7a]"
                  }`}>
                    {tx.type === "sale_credit" ? "+" : "-"}{currency}{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/6 mt-4">
              <button
                onClick={() => setSelectedCustomerForStatement(null)}
                className="px-4 py-1.5 rounded-lg text-xs bg-[#1a1a24] text-[#e8e6e3] hover:bg-[#242432]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
          <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/6">
              <h2 className="font-bold text-sm text-[#e8e6e3]">
                + Open New Customer Khata Account
              </h2>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-[#97979d] hover:text-[#e8e6e3]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] uppercase text-[#71717a] block mb-1">
                  CUSTOMER NAME (REQUIRED)
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full bg-[#0a0a0d] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-xs text-[#e8e6e3] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#71717a] block mb-1">
                  WHATSAPP / MOBILE NUMBER
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. +91 98201 12345"
                  className="w-full bg-[#0a0a0d] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-xs text-[#e8e6e3] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#71717a] block mb-1">
                  OPENING OUTSTANDING BALANCE ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCustOpeningBal}
                  onChange={(e) => setNewCustOpeningBal(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0a0a0d] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-xs text-[#e8e6e3] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/6">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-[#97979d] hover:text-[#e8e6e3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold text-xs px-4 py-1.5 rounded-lg transition-all shadow-md active:scale-95"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerKhataPage;
