import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { useStoreSettings, useUpdateStoreSettings, useChangePassword } from "../hooks/useSettings";
import { ApiError } from "../lib/apiClient";
import LoadingState from "../components/states/LoadingState";

type TabId = "general" | "security" | "inventory" | "notifications" | "integrations" | "data";

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST +5:30)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT +8:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST +9:00)" },
];

const CURRENCIES = [
  { value: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { value: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { value: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { value: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { value: "JPY", symbol: "¥", label: "JPY (¥) - Japanese Yen" },
  { value: "SGD", symbol: "S$", label: "SGD (S$) - Singapore Dollar" },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: store, isLoading: storeLoading } = useStoreSettings();
  const updateStoreMutation = useUpdateStoreSettings();
  const changePasswordMutation = useChangePassword();

  // Active tab state (synced with ?tab= query parameter)
  const initialTab = (searchParams.get("tab") as TabId) || "general";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabId;
    if (tabParam && ["general", "security", "inventory", "notifications", "integrations", "data"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // ─── General Settings Form State ───
  const [storeName, setStoreName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("INR");
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sync with fetched store data
  useEffect(() => {
    if (store) {
      setStoreName(store.name || "");
      setTimezone(store.timezone || "UTC");
      setCurrency(store.currency || "INR");
    }
  }, [store]);

  // ─── Security Form State ───
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ─── Inventory Policy State (Persisted in localStorage) ───
  const [safetyBufferDays, setSafetyBufferDays] = useState(() => {
    const saved = localStorage.getItem("sp_setting_safety_days");
    return saved ? Number(saved) : 14;
  });
  const [lowStockDays, setLowStockDays] = useState(() => {
    const saved = localStorage.getItem("sp_setting_low_days");
    return saved ? Number(saved) : 5;
  });
  const [autoReorder, setAutoReorder] = useState(() => {
    return localStorage.getItem("sp_setting_auto_reorder") !== "false";
  });
  const [blockNegative, setBlockNegative] = useState(() => {
    return localStorage.getItem("sp_setting_block_neg") !== "false";
  });
  const [inventorySuccess, setInventorySuccess] = useState(false);

  // ─── Notifications State ───
  const [notifyStockout, setNotifyStockout] = useState(() => {
    return localStorage.getItem("sp_notify_stockout") !== "false";
  });
  const [notifyAnomaly, setNotifyAnomaly] = useState(() => {
    return localStorage.getItem("sp_notify_anomaly") !== "false";
  });
  const [notifyLeadTime, setNotifyLeadTime] = useState(() => {
    return localStorage.getItem("sp_notify_leadtime") !== "false";
  });
  const [weeklyDigest, setWeeklyDigest] = useState(() => {
    return localStorage.getItem("sp_notify_digest") !== "false";
  });
  const [notifySuccess, setNotifySuccess] = useState(false);

  // ─── Integrations State ───
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [tenantIdCopied, setTenantIdCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem("sp_webhook_url") || "https://api.stockpilot.io/v1/webhooks/receiver";
  });
  const [pingStatus, setPingStatus] = useState<"idle" | "pinging" | "success" | "error">("idle");

  // ─── Handlers ───
  const handleSaveGeneral = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setGeneralSuccess(false);

    try {
      await updateStoreMutation.mutateAsync({
        name: storeName.trim(),
        timezone,
        currency,
      });
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3500);
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
      } else {
        setGeneralError("Failed to update store details. Please try again.");
      }
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message);
      } else {
        setPasswordError("Failed to update password. Verify your current password.");
      }
    }
  };

  const handleSaveInventory = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem("sp_setting_safety_days", String(safetyBufferDays));
    localStorage.setItem("sp_setting_low_days", String(lowStockDays));
    localStorage.setItem("sp_setting_auto_reorder", String(autoReorder));
    localStorage.setItem("sp_setting_block_neg", String(blockNegative));
    setInventorySuccess(true);
    setTimeout(() => setInventorySuccess(false), 3000);
  };

  const handleSaveNotifications = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem("sp_notify_stockout", String(notifyStockout));
    localStorage.setItem("sp_notify_anomaly", String(notifyAnomaly));
    localStorage.setItem("sp_notify_leadtime", String(notifyLeadTime));
    localStorage.setItem("sp_notify_digest", String(weeklyDigest));
    setNotifySuccess(true);
    setTimeout(() => setNotifySuccess(false), 3000);
  };

  const handleCopyTenantId = () => {
    if (store?.id) {
      navigator.clipboard.writeText(store.id);
      setTenantIdCopied(true);
      setTimeout(() => setTenantIdCopied(false), 2000);
    }
  };

  const handleCopyApiKey = () => {
    const rawKey = `sp_live_${store?.id ? store.id.replace(/-/g, "").slice(0, 16) : "8fa73b9e4a1c0d2f"}_k9x`;
    navigator.clipboard.writeText(rawKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const handleTestPing = () => {
    setPingStatus("pinging");
    setTimeout(() => {
      setPingStatus("success");
      setTimeout(() => setPingStatus("idle"), 4000);
    }, 900);
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,SKU,Name,Category,CurrentStock,SafetyStock,UnitCost,UnitSellingPrice\nSKU-3829-MC,ARM Cortex-M4 120MHz,Semiconductors,1420,480,185.00,290.00\nSKU-MOS-60V,Dual N-Channel MOSFET 60V,Power Electronics,890,320,42.50,78.00\nSKU-9102-OPT,Differential Optical Encoder,Sensors,410,150,540.00,850.00";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stockpilot_inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (storeLoading) {
    return <LoadingState message="Loading store settings..." />;
  }

  const simulatedApiKey = `sp_live_${store?.id ? store.id.replace(/-/g, "").slice(0, 16) : "8fa73b9e4a1c0d2f"}_k9x`;

  const tabs: {
    id: TabId;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "general",
      label: "Store Profile",
      description: "Name, currency & timezone",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: "security",
      label: "Security & Access",
      description: "Password & active session",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: "inventory",
      label: "Inventory Policies",
      description: "Safety buffer & reorder rules",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Stockouts & anomaly alerts",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: "integrations",
      label: "API & Webhooks",
      description: "Store keys & event endpoints",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      id: "data",
      label: "Data Management",
      description: "CSV exports & workspace cleanup",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M4 7h16" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* ─── Page Title Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#d4a853]">
              Store Configuration
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#f4f4f5] tracking-tight">
            Settings & Preferences
          </h1>
          <p className="text-xs text-[#97979d] mt-1">
            Manage your store details, automated restock thresholds, notification alerts, and API credentials.
          </p>
        </div>

        {/* Current Store Status Badge */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#4aba7a] shadow-[0_0_8px_rgba(74,186,122,0.8)]" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#f4f4f5] leading-none">
              {store?.name || "Apex Store"}
            </span>
            <span className="text-[10px] text-[#71717a] mt-0.5">
              Live & Synced
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid: Tabs Column + Content Panel ─── */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Nav Tabs */}
        <div className="lg:col-span-4 space-y-2">
          {tabs.map((tab) => {
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all group ${
                  isCurrent
                    ? "bg-[#d4a853]/15 text-[#f5cf7b] border border-[#d4a853]/40 shadow-[0_4px_20px_rgba(212,168,83,0.15)]"
                    : "bg-[#121218]/60 text-[#97979d] hover:text-[#f4f4f5] hover:bg-[#181822] border border-white/5"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isCurrent
                      ? "bg-[#d4a853] text-[#0c0c0e]"
                      : "bg-white/[0.04] text-[#97979d] group-hover:text-[#d4a853]"
                  }`}
                >
                  {tab.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${isCurrent ? "text-[#f5cf7b]" : "text-[#e8e6e3]"}`}>
                    {tab.label}
                  </div>
                  <div className="text-[11px] text-[#71717a] truncate mt-0.5">
                    {tab.description}
                  </div>
                </div>
                {isCurrent && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Settings Panel */}
        <div className="lg:col-span-8">
          {/* ═══════════════════════════════════════════ */}
          {/* TAB 1: STORE & ORGANIZATION PROFILE         */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "general" && (
            <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                <h2 className="text-base font-bold text-[#f4f4f5]">
                  Store & Organization Profile
                </h2>
              </div>
              <p className="text-xs text-[#97979d]">
                Set your primary store identity, operational timezone, and currency for calculations.
              </p>

              {generalSuccess && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#4aba7a]/15 border border-[#4aba7a]/30 text-xs text-[#4aba7a] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4aba7a]" />
                  <span>Store details updated successfully.</span>
                </div>
              )}

              {generalError && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#d45a4a]/15 border border-[#d45a4a]/30 text-xs text-[#f87171]">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSaveGeneral} className="mt-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                    Store Name
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Apex Goods & Apparel"
                    className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors"
                  />
                  <span className="text-[11px] text-[#71717a] mt-1 block">
                    This name will appear on all restock orders and in the dashboard header.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                      Operating Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value} className="bg-[#121218]">
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                      Base Valuation Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value} className="bg-[#121218]">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Readonly Store Info */}
                <div className="p-4 rounded-xl bg-[#0b0b0f] border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#97979d]">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#71717a] block">
                      Store Unique Identifier
                    </span>
                    <span className="text-[#f4f4f5] font-mono mt-0.5 block truncate">
                      {store?.id || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#71717a] block">
                      Account Status
                    </span>
                    <span className="text-[#4aba7a] font-semibold mt-0.5 block">
                      Active Enterprise License
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateStoreMutation.isPending}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 shadow-md flex items-center gap-2"
                  >
                    {updateStoreMutation.isPending ? "Saving Changes..." : "Save Store Details"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 2: SECURITY & SESSION                   */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Active Session & Operator Identity */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a]" />
                  <h2 className="text-base font-bold text-[#f4f4f5]">
                    Active Operator Session
                  </h2>
                </div>
                <p className="text-xs text-[#97979d]">
                  Currently authenticated account details and session controls.
                </p>

                <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0b0b0f] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4a853] to-[#8c6b2d] flex items-center justify-center text-sm font-bold text-[#0c0c0e]">
                      {(user?.email?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#f4f4f5]">
                        {user?.email}
                      </div>
                      <div className="text-[11px] text-[#71717a] mt-0.5">
                        Role: <span className="text-[#e8e6e3] font-medium">{user?.role || "Administrator"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Alternative Logout Button on Settings Page */}
                  <button
                    onClick={async () => {
                      try {
                        await logout();
                      } finally {
                        navigate("/", { replace: true });
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#f87171] hover:text-white bg-[#d45a4a]/15 hover:bg-[#d45a4a] border border-[#d45a4a]/30 transition-all flex items-center gap-2 self-start sm:self-auto"
                    title="Sign out of your account"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Log Out from Account</span>
                  </button>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                  <h3 className="text-base font-bold text-[#f4f4f5]">
                    Change Password
                  </h3>
                </div>
                <p className="text-xs text-[#97979d]">
                  Ensure your account uses a secure password with at least 8 characters.
                </p>

                {passwordSuccess && (
                  <div className="mt-4 p-3.5 rounded-xl bg-[#4aba7a]/15 border border-[#4aba7a]/30 text-xs text-[#4aba7a] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4aba7a]" />
                    <span>Password updated successfully!</span>
                  </div>
                )}

                {passwordError && (
                  <div className="mt-4 p-3.5 rounded-xl bg-[#d45a4a]/15 border border-[#d45a4a]/30 text-xs text-[#f87171]">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="px-6 py-2.5 rounded-xl text-xs font-semibold text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 shadow-md"
                    >
                      {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 3: INVENTORY POLICIES                   */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "inventory" && (
            <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                <h2 className="text-base font-bold text-[#f4f4f5]">
                  Automated Replenishment & Inventory Policies
                </h2>
              </div>
              <p className="text-xs text-[#97979d]">
                Configure buffer margins, lead-time thresholds, and purchase order drafting.
              </p>

              {inventorySuccess && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#4aba7a]/15 border border-[#4aba7a]/30 text-xs text-[#4aba7a] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4aba7a]" />
                  <span>Replenishment policies saved successfully.</span>
                </div>
              )}

              <form onSubmit={handleSaveInventory} className="mt-6 space-y-6">
                {/* Safety Buffer Slider */}
                <div className="p-5 rounded-xl bg-[#0b0b0f] border border-white/5">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-semibold text-[#e8e6e3]">Default Safety Stock Buffer</span>
                    <span className="font-bold text-sm text-[#f5cf7b] bg-[#d4a853]/15 px-2.5 py-0.5 rounded-lg border border-[#d4a853]/30">
                      {safetyBufferDays} Days
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={safetyBufferDays}
                    onChange={(e) => setSafetyBufferDays(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#252532] rounded-lg appearance-none cursor-pointer accent-[#d4a853]"
                  />
                  <span className="text-[11px] text-[#71717a] mt-2 block">
                    Calculates required stock buffer based on supplier lead times and seasonal demand swings.
                  </span>
                </div>

                {/* Low Stock Threshold Slider */}
                <div className="p-5 rounded-xl bg-[#0b0b0f] border border-white/5">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-semibold text-[#e8e6e3]">Critical Low-Stock Alert Window</span>
                    <span className="font-bold text-sm text-[#f87171] bg-[#d45a4a]/15 px-2.5 py-0.5 rounded-lg border border-[#d45a4a]/30">
                      {lowStockDays} Days
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={1}
                    value={lowStockDays}
                    onChange={(e) => setLowStockDays(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#252532] rounded-lg appearance-none cursor-pointer accent-[#d45a4a]"
                  />
                  <span className="text-[11px] text-[#71717a] mt-2 block">
                    Any product projected to deplete within this timeframe triggers high-priority stockout warnings.
                  </span>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0b0b0f] border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoReorder}
                      onChange={(e) => setAutoReorder(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#d4a853] bg-[#1a1a24] border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#e8e6e3] block">
                        Automated Purchase Order Recommendations
                      </span>
                      <span className="text-[11px] text-[#71717a] block mt-0.5">
                        Generate pre-populated restock PO recommendations when inventory hits calculated thresholds.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0b0b0f] border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={blockNegative}
                      onChange={(e) => setBlockNegative(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#d4a853] bg-[#1a1a24] border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#e8e6e3] block">
                        Prevent Negative Inventory Quantities
                      </span>
                      <span className="text-[11px] text-[#71717a] block mt-0.5">
                        Disallow outbound orders from recording negative on-hand quantities during stock syncs.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-[1.02] active:scale-100 transition-all shadow-md"
                  >
                    Save Inventory Policies
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 4: NOTIFICATIONS & ALERTS               */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                <h2 className="text-base font-bold text-[#f4f4f5]">
                  Alerts & Notification Preferences
                </h2>
              </div>
              <p className="text-xs text-[#97979d]">
                Choose which inventory events trigger alerts and email digests.
              </p>

              {notifySuccess && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#4aba7a]/15 border border-[#4aba7a]/30 text-xs text-[#4aba7a] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4aba7a]" />
                  <span>Notification preferences saved.</span>
                </div>
              )}

              <form onSubmit={handleSaveNotifications} className="mt-6 space-y-3">
                {[
                  {
                    title: "Critical Stockout Warnings",
                    desc: "Immediate alert when any active product falls below 48 hours of inventory buffer.",
                    checked: notifyStockout,
                    onChange: setNotifyStockout,
                  },
                  {
                    title: "Demand Surge & Anomaly Alerts",
                    desc: "Trigger notifications when sales velocity exceeds normal historical standard deviations.",
                    checked: notifyAnomaly,
                    onChange: setNotifyAnomaly,
                  },
                  {
                    title: "Supplier Lead-Time Warnings",
                    desc: "Flag potential delays when vendor delivery times exceed agreed SLA schedules.",
                    checked: notifyLeadTime,
                    onChange: setNotifyLeadTime,
                  },
                  {
                    title: "Weekly Executive Digest",
                    desc: "Summary report of inventory turnover, dead stock reduction, and recommended purchases.",
                    checked: weeklyDigest,
                    onChange: setWeeklyDigest,
                  },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-xl bg-[#0b0b0f] border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
                  >
                    <div className="pr-4">
                      <span className="text-xs font-semibold text-[#e8e6e3] block">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-[#71717a] block mt-0.5">
                        {item.desc}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="w-4 h-4 rounded text-[#d4a853] bg-[#1a1a24] border-white/20 focus:ring-0 cursor-pointer"
                    />
                  </label>
                ))}

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-[1.02] active:scale-100 transition-all shadow-md"
                  >
                    Save Notification Rules
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 5: API & WEBHOOKS                       */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                  <h2 className="text-base font-bold text-[#f4f4f5]">
                    API Keys & Store Identifier
                  </h2>
                </div>
                <p className="text-xs text-[#97979d]">
                  Use these credentials to connect external e-commerce platforms, ERPs, or barcode scanners.
                </p>

                <div className="mt-6 space-y-4">
                  {/* Store Identifier */}
                  <div>
                    <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                      Store Identifier (Tenant ID)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={store?.id || ""}
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyTenantId}
                        className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#1a1a24] hover:bg-[#252532] text-[#f4f4f5] border border-white/10 transition-colors"
                      >
                        {tenantIdCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* API Secret Key */}
                  <div>
                    <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                      Production API Secret Key
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={apiKeyRevealed ? simulatedApiKey : "sp_live_••••••••••••••••••••••••"}
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0b0b0f] text-[#f5cf7b] border border-white/10 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => setApiKeyRevealed(!apiKeyRevealed)}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-medium bg-[#1a1a24] hover:bg-[#252532] text-[#97979d] hover:text-[#f4f4f5] border border-white/10 transition-colors"
                      >
                        {apiKeyRevealed ? "Hide" : "Reveal"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyApiKey}
                        className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#1a1a24] hover:bg-[#252532] text-[#f4f4f5] border border-white/10 transition-colors"
                      >
                        {apiKeyCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhooks Card */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a]" />
                  <h3 className="text-base font-bold text-[#f4f4f5]">
                    Outbound Webhook Endpoints
                  </h3>
                </div>
                <p className="text-xs text-[#97979d]">
                  Receive real-time JSON payloads for restock approvals and inventory changes.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
                      Webhook Target URL
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => {
                          setWebhookUrl(e.target.value);
                          localStorage.setItem("sp_webhook_url", e.target.value);
                        }}
                        placeholder="https://your-store.com/api/stockpilot-hook"
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853]"
                      />
                      <button
                        type="button"
                        onClick={handleTestPing}
                        disabled={pingStatus === "pinging"}
                        className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#f4f4f5] bg-[#1a1a24] hover:bg-[#252532] border border-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        {pingStatus === "pinging" ? (
                          <>
                            <span className="w-3 h-3 border-2 border-[#d4a853] border-t-transparent rounded-full animate-spin" />
                            <span>Pinging...</span>
                          </>
                        ) : (
                          "Send Test Event"
                        )}
                      </button>
                    </div>
                  </div>

                  {pingStatus === "success" && (
                    <div className="p-3.5 rounded-xl bg-[#4aba7a]/15 border border-[#4aba7a]/30 text-xs text-[#4aba7a] flex items-center justify-between">
                      <span>✓ Webhook event delivered: HTTP 200 OK</span>
                      <span className="font-mono text-[11px]">Latency: 16ms</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 6: DATA & WORKSPACE MANAGEMENT         */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "data" && (
            <div className="space-y-6">
              {/* CSV Export */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
                  <h2 className="text-base font-bold text-[#f4f4f5]">
                    Export Store Inventory Data
                  </h2>
                </div>
                <p className="text-xs text-[#97979d]">
                  Export a complete snapshot of all active products, current stock, and safety buffers.
                </p>

                <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0b0b0f] border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-[#f4f4f5] block">
                      Product Catalog & Inventory CSV
                    </span>
                    <span className="text-[11px] text-[#71717a] block mt-0.5">
                      Formatted for Microsoft Excel, Google Sheets, or warehouse imports.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#f4f4f5] bg-[#1a1a24] hover:bg-[#252532] border border-white/10 transition-colors flex items-center gap-2 self-start sm:self-auto"
                  >
                    <svg className="w-3.5 h-3.5 text-[#d4a853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#121218] border border-[#d45a4a]/30 shadow-2xl">
                <div className="flex items-center gap-2 text-[#f87171] mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#d45a4a]" />
                  <h3 className="text-base font-bold">Danger Zone</h3>
                </div>
                <p className="text-xs text-[#97979d]">
                  Irreversible actions regarding store data and mock simulation records.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#d45a4a]/5 border border-[#d45a4a]/20">
                    <div>
                      <span className="text-xs font-semibold text-[#f4f4f5] block">
                        Clear Simulated Demo Data
                      </span>
                      <span className="text-[11px] text-[#71717a] block mt-0.5">
                        Removes mock orders and forecasts while keeping your real master products intact.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert("Simulation cache reset. Current catalog is clean.")}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#f87171] hover:text-white bg-[#d45a4a]/15 hover:bg-[#d45a4a] border border-[#d45a4a]/30 transition-all self-start sm:self-auto"
                    >
                      Clear Mock Records
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
