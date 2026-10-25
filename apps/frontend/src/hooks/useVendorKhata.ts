import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "../lib/authContext";
import {
  getVendorKhataAccounts,
  createVendorKhataAccount,
  recordInvoice,
  recordPayment,
  recordCreditNote,
  updateCreditTerms,
  deleteVendorKhataAccount,
  getTotalPayables,
  getOverdueAccounts,
  getPaymentsDueThisWeek,
  type VendorKhataAccount,
  type VendorCreditTerms,
} from "../lib/vendorKhataStorage";

// ── External store subscription for localStorage reactivity ────────────────
let vendorKhataVersion = 0;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyAll() {
  vendorKhataVersion++;
  listeners.forEach((cb) => cb());
}

function getSnapshot() {
  return vendorKhataVersion;
}

// ── Main Hook ──────────────────────────────────────────────────────────────

export function useVendorKhata() {
  const { user } = useAuth();
  const storeId = user?.storeId ?? "default";

  // Re-render when localStorage changes
  useSyncExternalStore(subscribe, getSnapshot);

  const accounts = getVendorKhataAccounts(storeId);
  const totalPayables = getTotalPayables(storeId);
  const overdueAccounts = getOverdueAccounts(storeId);
  const dueThisWeek = getPaymentsDueThisWeek(storeId);

  const createAccount = useCallback(
    (input: {
      supplierId: string;
      supplierName: string;
      supplierPhone: string;
      creditPeriodDays: number;
      creditLimitAmount: number;
      paymentDay?: string;
    }) => {
      const result = createVendorKhataAccount(storeId, input);
      notifyAll();
      return result;
    },
    [storeId],
  );

  const addInvoice = useCallback(
    (accountId: string, input: { amount: number; invoiceNumber?: string; purchaseOrderId?: string; notes?: string }) => {
      const result = recordInvoice(storeId, accountId, input);
      notifyAll();
      return result;
    },
    [storeId],
  );

  const addPayment = useCallback(
    (accountId: string, input: { amount: number; paymentMethod: "cash" | "upi" | "neft" | "cheque" | "adjustment"; notes?: string }) => {
      const result = recordPayment(storeId, accountId, input);
      notifyAll();
      return result;
    },
    [storeId],
  );

  const addCreditNote = useCallback(
    (accountId: string, input: { amount: number; notes?: string }) => {
      const result = recordCreditNote(storeId, accountId, input);
      notifyAll();
      return result;
    },
    [storeId],
  );

  const updateTerms = useCallback(
    (accountId: string, terms: Partial<VendorCreditTerms>) => {
      const result = updateCreditTerms(storeId, accountId, terms);
      notifyAll();
      return result;
    },
    [storeId],
  );

  const deleteAccount = useCallback(
    (accountId: string) => {
      const result = deleteVendorKhataAccount(storeId, accountId);
      notifyAll();
      return result;
    },
    [storeId],
  );

  return {
    accounts,
    totalPayables,
    overdueAccounts,
    dueThisWeek,
    activeVendorCount: accounts.filter((a: VendorKhataAccount) => a.totalOutstanding > 0).length,
    settledCount: accounts.filter((a: VendorKhataAccount) => a.totalOutstanding === 0).length,
    createAccount,
    addInvoice,
    addPayment,
    addCreditNote,
    updateTerms,
    deleteAccount,
  };
}
