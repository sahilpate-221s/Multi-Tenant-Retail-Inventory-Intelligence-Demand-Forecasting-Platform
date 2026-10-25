import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../lib/authContext";
import {
  getKhataCustomers,
  addKhataSale,
  recordKhataRepayment,
  type KhataCustomer,
} from "../lib/khataStorage";

export function useKhata() {
  const { user } = useAuth();
  const storeId = user?.storeId || "default";

  const [customers, setCustomers] = useState<KhataCustomer[]>(() =>
    getKhataCustomers(storeId)
  );

  const reload = useCallback(() => {
    setCustomers(getKhataCustomers(storeId));
  }, [storeId]);

  useEffect(() => {
    reload();
    const handleUpdate = () => reload();
    window.addEventListener("khata-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("khata-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [reload]);

  const recordSale = useCallback(
    (name: string, phone: string, amount: number, saleId?: string, notes?: string) => {
      const res = addKhataSale(storeId, name, phone, amount, saleId, notes);
      reload();
      return res;
    },
    [storeId, reload]
  );

  const recordRepayment = useCallback(
    (customerId: string, amount: number, notes?: string) => {
      const res = recordKhataRepayment(storeId, customerId, amount, notes);
      reload();
      return res;
    },
    [storeId, reload]
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.totalBalance || 0), 0);

  return {
    customers,
    totalOutstanding,
    recordSale,
    recordRepayment,
    refetch: reload,
  };
}
