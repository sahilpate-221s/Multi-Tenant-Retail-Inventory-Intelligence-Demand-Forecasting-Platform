// Vendor Khata (Supplier Accounts Payable / Distributor Credit Ledger)
// Tracks money owed TO suppliers/distributors on credit terms.
// Answers: "How much do I owe Amul Dairy this Friday?"

export type VendorLedgerEntryType = "invoice" | "payment" | "credit_note" | "debit_note";

export interface VendorLedgerEntry {
  id: string;
  date: string;
  type: VendorLedgerEntryType;
  /** Positive = amount owed (invoice), Negative = amount paid (payment/credit) */
  amount: number;
  invoiceNumber?: string;
  purchaseOrderId?: string;
  notes?: string;
  paymentMethod?: "cash" | "upi" | "neft" | "cheque" | "adjustment";
}

export interface VendorCreditTerms {
  creditPeriodDays: number; // e.g., 15, 30, 45
  creditLimitAmount: number; // Max outstanding allowed
  paymentDay?: string; // e.g., "Friday", "1st of month"
}

export interface VendorKhataAccount {
  id: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  totalOutstanding: number; // Positive = we owe them; 0 = settled
  creditTerms: VendorCreditTerms;
  ledgerEntries: VendorLedgerEntry[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = "sp_vendor_khata_";

function getStorageKey(storeId: string): string {
  return `${STORAGE_KEY_PREFIX}${storeId || "default"}`;
}

function generateId(): string {
  return `vk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ── Read ────────────────────────────────────────────────────────────────────

export function getVendorKhataAccounts(storeId: string): VendorKhataAccount[] {
  try {
    const raw = localStorage.getItem(getStorageKey(storeId));
    if (!raw) {
      // Seed with realistic demo data
      const demoData: VendorKhataAccount[] = buildDemoAccounts(storeId);
      localStorage.setItem(getStorageKey(storeId), JSON.stringify(demoData));
      return demoData;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getVendorKhataAccount(storeId: string, accountId: string): VendorKhataAccount | null {
  const accounts = getVendorKhataAccounts(storeId);
  return accounts.find((a) => a.id === accountId) ?? null;
}

// ── Create / Link Supplier ──────────────────────────────────────────────────

export function createVendorKhataAccount(
  storeId: string,
  input: {
    supplierId: string;
    supplierName: string;
    supplierPhone: string;
    creditPeriodDays: number;
    creditLimitAmount: number;
    paymentDay?: string;
  },
): VendorKhataAccount {
  const accounts = getVendorKhataAccounts(storeId);

  // Prevent duplicate accounts per supplier
  const existing = accounts.find((a) => a.supplierId === input.supplierId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const account: VendorKhataAccount = {
    id: generateId(),
    storeId,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    supplierPhone: input.supplierPhone,
    totalOutstanding: 0,
    creditTerms: {
      creditPeriodDays: input.creditPeriodDays,
      creditLimitAmount: input.creditLimitAmount,
      paymentDay: input.paymentDay,
    },
    ledgerEntries: [],
    createdAt: now,
    updatedAt: now,
  };

  accounts.push(account);
  localStorage.setItem(getStorageKey(storeId), JSON.stringify(accounts));
  return account;
}

// ── Record Invoice (Debit — we owe more) ────────────────────────────────────

export function recordInvoice(
  storeId: string,
  accountId: string,
  input: {
    amount: number;
    invoiceNumber?: string;
    purchaseOrderId?: string;
    notes?: string;
  },
): VendorKhataAccount | null {
  const accounts = getVendorKhataAccounts(storeId);
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return null;

  const entry: VendorLedgerEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    type: "invoice",
    amount: Math.abs(input.amount),
    invoiceNumber: input.invoiceNumber,
    purchaseOrderId: input.purchaseOrderId,
    notes: input.notes,
  };

  accounts[idx].ledgerEntries.unshift(entry);
  accounts[idx].totalOutstanding += Math.abs(input.amount);
  accounts[idx].updatedAt = new Date().toISOString();

  localStorage.setItem(getStorageKey(storeId), JSON.stringify(accounts));
  return accounts[idx];
}

// ── Record Payment (Credit — we owe less) ───────────────────────────────────

export function recordPayment(
  storeId: string,
  accountId: string,
  input: {
    amount: number;
    paymentMethod: "cash" | "upi" | "neft" | "cheque" | "adjustment";
    notes?: string;
  },
): VendorKhataAccount | null {
  const accounts = getVendorKhataAccounts(storeId);
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return null;

  const entry: VendorLedgerEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    type: "payment",
    amount: -Math.abs(input.amount),
    paymentMethod: input.paymentMethod,
    notes: input.notes,
  };

  accounts[idx].ledgerEntries.unshift(entry);
  accounts[idx].totalOutstanding = Math.max(0, accounts[idx].totalOutstanding - Math.abs(input.amount));
  accounts[idx].updatedAt = new Date().toISOString();

  localStorage.setItem(getStorageKey(storeId), JSON.stringify(accounts));
  return accounts[idx];
}

// ── Record Credit Note (Supplier adjustment reducing our debt) ──────────────

export function recordCreditNote(
  storeId: string,
  accountId: string,
  input: { amount: number; notes?: string },
): VendorKhataAccount | null {
  const accounts = getVendorKhataAccounts(storeId);
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return null;

  const entry: VendorLedgerEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    type: "credit_note",
    amount: -Math.abs(input.amount),
    notes: input.notes,
  };

  accounts[idx].ledgerEntries.unshift(entry);
  accounts[idx].totalOutstanding = Math.max(0, accounts[idx].totalOutstanding - Math.abs(input.amount));
  accounts[idx].updatedAt = new Date().toISOString();

  localStorage.setItem(getStorageKey(storeId), JSON.stringify(accounts));
  return accounts[idx];
}

// ── Update Credit Terms ─────────────────────────────────────────────────────

export function updateCreditTerms(
  storeId: string,
  accountId: string,
  terms: Partial<VendorCreditTerms>,
): VendorKhataAccount | null {
  const accounts = getVendorKhataAccounts(storeId);
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return null;

  accounts[idx].creditTerms = { ...accounts[idx].creditTerms, ...terms };
  accounts[idx].updatedAt = new Date().toISOString();

  localStorage.setItem(getStorageKey(storeId), JSON.stringify(accounts));
  return accounts[idx];
}

// ── Delete Account ──────────────────────────────────────────────────────────

export function deleteVendorKhataAccount(storeId: string, accountId: string): boolean {
  const accounts = getVendorKhataAccounts(storeId);
  const filtered = accounts.filter((a) => a.id !== accountId);
  if (filtered.length === accounts.length) return false;
  localStorage.setItem(getStorageKey(storeId), JSON.stringify(filtered));
  return true;
}

// ── Analytics Helpers ───────────────────────────────────────────────────────

export function getTotalPayables(storeId: string): number {
  const accounts = getVendorKhataAccounts(storeId);
  return accounts.reduce((sum, a) => sum + a.totalOutstanding, 0);
}

export function getOverdueAccounts(storeId: string): VendorKhataAccount[] {
  const accounts = getVendorKhataAccounts(storeId);
  const now = Date.now();
  return accounts.filter((a) => {
    if (a.totalOutstanding <= 0) return false;
    // Find oldest unpaid invoice
    const invoices = a.ledgerEntries.filter((e) => e.type === "invoice");
    if (invoices.length === 0) return false;
    const oldestInvoice = invoices[invoices.length - 1];
    const invoiceDate = new Date(oldestInvoice.date).getTime();
    const dueDateMs = invoiceDate + a.creditTerms.creditPeriodDays * 86400000;
    return now > dueDateMs;
  });
}

export function getPaymentsDueThisWeek(storeId: string): VendorKhataAccount[] {
  const accounts = getVendorKhataAccounts(storeId);
  const now = Date.now();
  const weekEnd = now + 7 * 86400000;

  return accounts.filter((a) => {
    if (a.totalOutstanding <= 0) return false;
    const invoices = a.ledgerEntries.filter((e) => e.type === "invoice");
    if (invoices.length === 0) return false;
    const oldestInvoice = invoices[invoices.length - 1];
    const invoiceDate = new Date(oldestInvoice.date).getTime();
    const dueDateMs = invoiceDate + a.creditTerms.creditPeriodDays * 86400000;
    return dueDateMs <= weekEnd && dueDateMs >= now;
  });
}

// ── Demo Data Builder ───────────────────────────────────────────────────────

function buildDemoAccounts(storeId: string): VendorKhataAccount[] {
  const now = Date.now();
  return [
    {
      id: "vk-demo-01",
      storeId,
      supplierId: "supplier-demo-amul",
      supplierName: "Amul Dairy Distributor",
      supplierPhone: "+91 98765 43210",
      totalOutstanding: 28500,
      creditTerms: { creditPeriodDays: 15, creditLimitAmount: 50000, paymentDay: "Friday" },
      ledgerEntries: [
        {
          id: "vle-01",
          date: new Date(now - 2 * 86400000).toISOString(),
          type: "invoice",
          amount: 12500,
          invoiceNumber: "AMU-2026-4521",
          notes: "Weekly dairy restock — butter, paneer, curd",
        },
        {
          id: "vle-02",
          date: new Date(now - 5 * 86400000).toISOString(),
          type: "payment",
          amount: -8000,
          paymentMethod: "neft",
          notes: "Part payment via NEFT",
        },
        {
          id: "vle-03",
          date: new Date(now - 9 * 86400000).toISOString(),
          type: "invoice",
          amount: 24000,
          invoiceNumber: "AMU-2026-4489",
          notes: "Bulk cheese + milk order",
        },
      ],
      createdAt: new Date(now - 60 * 86400000).toISOString(),
      updatedAt: new Date(now - 2 * 86400000).toISOString(),
    },
    {
      id: "vk-demo-02",
      storeId,
      supplierId: "supplier-demo-ite",
      supplierName: "ITC Foods Wholesale",
      supplierPhone: "+91 87654 32109",
      totalOutstanding: 15200,
      creditTerms: { creditPeriodDays: 30, creditLimitAmount: 75000, paymentDay: "1st of month" },
      ledgerEntries: [
        {
          id: "vle-04",
          date: new Date(now - 4 * 86400000).toISOString(),
          type: "invoice",
          amount: 15200,
          invoiceNumber: "ITC-INV-90234",
          notes: "Aashirvaad Atta, Sunfeast, Bingo",
        },
      ],
      createdAt: new Date(now - 90 * 86400000).toISOString(),
      updatedAt: new Date(now - 4 * 86400000).toISOString(),
    },
    {
      id: "vk-demo-03",
      storeId,
      supplierId: "supplier-demo-hul",
      supplierName: "HUL Distribution (Hindustan Unilever)",
      supplierPhone: "+91 76543 21098",
      totalOutstanding: 0,
      creditTerms: { creditPeriodDays: 21, creditLimitAmount: 100000 },
      ledgerEntries: [
        {
          id: "vle-05",
          date: new Date(now - 3 * 86400000).toISOString(),
          type: "payment",
          amount: -42000,
          paymentMethod: "cheque",
          notes: "Full settlement — Cheque #A2892",
        },
        {
          id: "vle-06",
          date: new Date(now - 18 * 86400000).toISOString(),
          type: "invoice",
          amount: 42000,
          invoiceNumber: "HUL-SEP-7823",
          notes: "Surf Excel, Lifebuoy, Vim quarterly order",
        },
      ],
      createdAt: new Date(now - 120 * 86400000).toISOString(),
      updatedAt: new Date(now - 3 * 86400000).toISOString(),
    },
    {
      id: "vk-demo-04",
      storeId,
      supplierId: "supplier-demo-local",
      supplierName: "Sharma General Wholesale",
      supplierPhone: "+91 99887 76655",
      totalOutstanding: 6800,
      creditTerms: { creditPeriodDays: 7, creditLimitAmount: 20000, paymentDay: "Saturday" },
      ledgerEntries: [
        {
          id: "vle-07",
          date: new Date(now - 1 * 86400000).toISOString(),
          type: "invoice",
          amount: 3800,
          invoiceNumber: "SGW-1204",
          notes: "Rice, dal, spices — weekly",
        },
        {
          id: "vle-08",
          date: new Date(now - 6 * 86400000).toISOString(),
          type: "invoice",
          amount: 5500,
          invoiceNumber: "SGW-1198",
          notes: "Cooking oil + sugar",
        },
        {
          id: "vle-09",
          date: new Date(now - 7 * 86400000).toISOString(),
          type: "payment",
          amount: -2500,
          paymentMethod: "cash",
          notes: "Cash payment at delivery",
        },
      ],
      createdAt: new Date(now - 45 * 86400000).toISOString(),
      updatedAt: new Date(now - 1 * 86400000).toISOString(),
    },
  ];
}
