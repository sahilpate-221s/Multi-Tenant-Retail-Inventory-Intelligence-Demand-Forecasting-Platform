// Customer Khata (Store Credit / Udhaar Ledger)
// Handles neighborhood store credit, customer balances, repayments, and reminders.

export interface KhataTransaction {
  id: string;
  date: string;
  type: "sale_credit" | "repayment";
  amount: number;
  saleId?: string;
  notes?: string;
}

export interface KhataCustomer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  address?: string;
  totalBalance: number; // Positive = customer owes money to store
  transactions: KhataTransaction[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = "sp_khata_customers_";

function getStorageKey(storeId: string): string {
  return `${STORAGE_KEY_PREFIX}${storeId || "default"}`;
}

export function getKhataCustomers(storeId: string): KhataCustomer[] {
  try {
    const raw = localStorage.getItem(getStorageKey(storeId));
    if (!raw) {
      // Seed with realistic demo neighborhood accounts if empty
      const demoData: KhataCustomer[] = [
        {
          id: "khata-01",
          storeId,
          name: "Ramesh Sharma (Flat 402)",
          phone: "+91 98201 12345",
          address: "Sai Krupa Apts, 4th Floor",
          totalBalance: 850,
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          transactions: [
            {
              id: "tx-01",
              date: new Date(Date.now() - 14 * 86400000).toISOString(),
              type: "sale_credit",
              amount: 1350,
              notes: "Weekly groceries & milk",
            },
            {
              id: "tx-02",
              date: new Date(Date.now() - 7 * 86400000).toISOString(),
              type: "repayment",
              amount: 500,
              notes: "Cash partial settlement",
            },
          ],
        },
        {
          id: "khata-02",
          storeId,
          name: "Pooja Verma",
          phone: "+91 98112 55678",
          address: "B-12 Krishna Niwas",
          totalBalance: 320,
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          transactions: [
            {
              id: "tx-03",
              date: new Date(Date.now() - 5 * 86400000).toISOString(),
              type: "sale_credit",
              amount: 320,
              notes: "Tea, sugar & biscuits",
            },
          ],
        },
      ];
      localStorage.setItem(getStorageKey(storeId), JSON.stringify(demoData));
      return demoData;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveKhataCustomers(storeId: string, customers: KhataCustomer[]) {
  try {
    localStorage.setItem(getStorageKey(storeId), JSON.stringify(customers));
    window.dispatchEvent(new Event("khata-updated"));
  } catch {
    // Silently ignore storage quota errors
  }
}

export function addKhataSale(
  storeId: string,
  customerName: string,
  customerPhone: string,
  amount: number,
  saleId?: string,
  notes?: string
): KhataCustomer {
  const customers = getKhataCustomers(storeId);
  const cleanName = customerName.trim();
  const cleanPhone = customerPhone.trim();

  let customer = customers.find(
    (c) =>
      (cleanPhone && c.phone.replace(/\D/g, "") === cleanPhone.replace(/\D/g, "")) ||
      c.name.toLowerCase() === cleanName.toLowerCase()
  );

  const tx: KhataTransaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    type: "sale_credit",
    amount,
    saleId,
    notes: notes || "Store counter credit checkout",
  };

  if (customer) {
    customer.totalBalance += amount;
    customer.transactions.unshift(tx);
    customer.updatedAt = new Date().toISOString();
    if (cleanPhone && !customer.phone) customer.phone = cleanPhone;
  } else {
    customer = {
      id: `khata-${Date.now()}`,
      storeId,
      name: cleanName,
      phone: cleanPhone,
      totalBalance: amount,
      transactions: [tx],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    customers.unshift(customer);
  }

  saveKhataCustomers(storeId, customers);
  return customer;
}

export function recordKhataRepayment(
  storeId: string,
  customerId: string,
  amount: number,
  notes?: string
): KhataCustomer | null {
  const customers = getKhataCustomers(storeId);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return null;

  const tx: KhataTransaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    type: "repayment",
    amount,
    notes: notes || "Cash payment received",
  };

  customer.totalBalance = Math.max(0, customer.totalBalance - amount);
  customer.transactions.unshift(tx);
  customer.updatedAt = new Date().toISOString();

  saveKhataCustomers(storeId, customers);
  return customer;
}

export function generateKhataReminderMessage(
  storeName: string,
  customer: KhataCustomer,
  currency: string = "₹"
): string {
  return (
    `Namaste ${customer.name},\n\n` +
    `Greetings from ${storeName || "StockPilot Retail"}.\n` +
    `This is a friendly reminder that your current store credit (Udhaar) balance is ${currency}${customer.totalBalance.toLocaleString(
      undefined,
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}.\n\n` +
    `You can settle this in cash or via UPI at your convenience. Thank you for your continued patronage!`
  );
}
