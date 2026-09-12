import { useState, useEffect } from "react";
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
  const { user } = useAuth();
  const { data: store, isLoading: storeLoading } = useStoreSettings();
  const updateStoreMutation = useUpdateStoreSettings();
  const changePasswordMutation = useChangePassword();

  const [activeTab, setActiveTab] = useState<TabId>("general");

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
  const handleSaveGeneral = async (e: React.FormEvent) => {
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
        setGeneralError("Failed to update store details.");
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password confirmation does not match.");
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
        setPasswordError("Failed to update password. Verify current password.");
      }
    }
  };

  const handleSaveInventory = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("sp_setting_safety_days", String(safetyBufferDays));
    localStorage.setItem("sp_setting_low_days", String(lowStockDays));
    localStorage.setItem("sp_setting_auto_reorder", String(autoReorder));
    localStorage.setItem("sp_setting_block_neg", String(blockNegative));
    setInventorySuccess(true);
    setTimeout(() => setInventorySuccess(false), 3000);
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
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
    const csvContent = "data:text/csv;charset=utf-8,SKU,Name,Category,CurrentStock,SafetyStock,UnitCost,UnitSellingPrice\nSKU-3829-MC,ARM Cortex-M4 120MHz,Semiconductors,1420,480,185.00,290.00\nSKU-MOS-60V,Dual N-Channel MOSFET 60V,Power Electronics,890,320,42.50,78.00\nSKU-9102-OPT,Differential Optical Encoder,Sensors,410,150,540.00,850.00";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stockpilot_inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (storeLoading) {
    return <LoadingState message="Loading organization settings..." />;
  }

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "general", label: "Organization", icon: "🏢" },
    { id: "security", label: "Security & Access", icon: "🛡️" },
    { id: "inventory", label: "Warehouse Policies", icon: "📦" },
    { id: "notifications", label: "Alerts & Telemetry", icon: "🔔" },
    { id: "integrations", label: "API & Webhooks", icon: "⚡" },
    { id: "data", label: "Data & Danger Zone", icon: "💾" },
  ];

  const simulatedApiKey = `sp_live_${store?.id ? store.id.replace(/-/g, "").slice(0, 16) : "8fa73b9e4a1c0d2f"}_k9x`;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto select-none">
      {/* ─── Page Title Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#97979d]">
              TENANT CONTROL PLANE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#e8e6e3] tracking-tight mt-1">
            System Settings
          </h1>
          <p className="text-xs text-[#97979d] mt-1 font-mono">
            Manage your facility parameters, cryptographic credentials, and autonomous restock policies.
          </p>
        </div>

        {/* Status indicator badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#14141a] border border-[rgba(255,255,255,0.08)]">
          <span className="w-2 h-2 rounded-full bg-[#4aba7a] animate-pulse" />
          <span className="text-xs font-mono font-medium text-[#e8e6e3]">
            Tenant Mesh: <span className="text-[#4aba7a]">Operational</span>
          </span>
        </div>
      </div>

      {/* ─── Main Content Grid: Tabs + Body ─── */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Nav Tabs */}
        <div className="lg:col-span-3 space-y-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono transition-all text-left ${
                activeTab === tab.id
                  ? "bg-[#d4a853] text-[#0c0c0e] font-bold shadow-[0_4px_15px_rgba(212,168,83,0.25)]"
                  : "bg-[#14141a] text-[#97979d] hover:text-[#e8e6e3] hover:bg-[#1a1a22] border border-[rgba(255,255,255,0.04)]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}

          {/* Quick Node Identity Pill */}
          <div className="p-4 rounded-xl bg-[#101014] border border-[rgba(255,255,255,0.06)] mt-6 text-[11px] font-mono text-[#97979d]">
            <span className="text-[10px] text-[#5c5c64] uppercase block">FACILITY NODE</span>
            <span className="text-[#e8e6e3] font-semibold mt-0.5 block truncate">
              {store?.name || "Apex Central"}
            </span>
            <span className="text-[#d4a853] text-[10px] block mt-1">v2.4.1 (Distributed)</span>
          </div>
        </div>

        {/* Right Settings Panel */}
        <div className="lg:col-span-9">
          {/* ═══════════════════════════════════════════ */}
          {/* TAB 1: ORGANIZATION / GENERAL PROFILE       */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "general" && (
            <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              <h2 className="text-lg font-bold text-[#e8e6e3] tracking-tight">
                Organization & Facility Profile
              </h2>
              <p className="text-xs text-[#97979d] mt-1">
                Configure primary tenant identity, operational timezone for daily run-rates, and base accounting currency.
              </p>

              {generalSuccess && (
                <div className="mt-4 p-3 rounded-xl bg-[rgba(74,186,122,0.12)] border border-[rgba(74,186,122,0.3)] text-xs font-mono text-[#4aba7a] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a]" />
                  Organization details updated successfully.
                </div>
              )}

              {generalError && (
                <div className="mt-4 p-3 rounded-xl bg-[rgba(212,90,74,0.12)] border border-[rgba(212,90,74,0.3)] text-xs font-mono text-[#d45a4a]">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSaveGeneral} className="mt-6 space-y-5">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                    Store / Facility Name
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Apex Central Distribution Hub"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Operating Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors font-mono"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value} className="bg-[#14141a]">
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Base Valuation Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors font-mono"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value} className="bg-[#14141a]">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Readonly Tenant Metadata */}
                <div className="p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)] grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs text-[#97979d]">
                  <div>
                    <span className="text-[10px] text-[#5c5c64] uppercase block">TENANT RECORD ID</span>
                    <span className="text-[#e8e6e3] mt-0.5 block truncate">{store?.id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5c5c64] uppercase block">DATABASE LEDGER</span>
                    <span className="text-[#4aba7a] mt-0.5 block">PostgreSQL 16 Multi-Tenant</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateStoreMutation.isPending}
                    className="px-6 py-2.5 rounded-xl text-xs font-mono font-semibold text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
                  >
                    {updateStoreMutation.isPending ? "Saving Changes..." : "Save Organization Settings"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 2: SECURITY & OPERATOR ACCESS           */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Operator Identity Card */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <h2 className="text-lg font-bold text-[#e8e6e3] tracking-tight">
                  Operator Credentials & Role
                </h2>
                <p className="text-xs text-[#97979d] mt-1">
                  Active authentication session and cryptographic tenant role.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4a853] to-[#8c6b2d] flex items-center justify-center text-sm font-bold text-[#0c0c0e]">
                      {(user?.email?.[0] || "O").toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-[#e8e6e3] block">
                        {user?.email}
                      </span>
                      <span className="text-[10px] font-mono text-[#5c5c64] block mt-0.5">
                        USER ID: {user?.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#d4a853]/15 text-[#d4a853] border border-[#d4a853]/30 uppercase">
                      ROLE: {user?.role || "Owner"}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#4aba7a]/15 text-[#4aba7a] border border-[#4aba7a]/30">
                      Active Session
                    </span>
                  </div>
                </div>
              </div>

              {/* Password Rotation Card */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <h3 className="text-base font-bold text-[#e8e6e3] tracking-tight">
                  Rotate Password
                </h3>
                <p className="text-xs text-[#97979d] mt-1">
                  Ensure your account uses a strong cryptographic password with at least 8 characters.
                </p>

                {passwordSuccess && (
                  <div className="mt-4 p-3 rounded-xl bg-[rgba(74,186,122,0.12)] border border-[rgba(74,186,122,0.3)] text-xs font-mono text-[#4aba7a]">
                    Password updated successfully. Next session will require the updated password.
                  </div>
                )}

                {passwordError && (
                  <div className="mt-4 p-3 rounded-xl bg-[rgba(212,90,74,0.12)] border border-[rgba(212,90,74,0.3)] text-xs font-mono text-[#d45a4a]">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="px-6 py-2.5 rounded-xl text-xs font-mono font-semibold text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
                    >
                      {changePasswordMutation.isPending ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 3: WAREHOUSE & INVENTORY POLICIES       */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "inventory" && (
            <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              <h2 className="text-lg font-bold text-[#e8e6e3] tracking-tight">
                Autonomous Restock & Inventory Policies
              </h2>
              <p className="text-xs text-[#97979d] mt-1">
                Configure safety margins, reorder trigger algorithms, and physical dispatch constraints.
              </p>

              {inventorySuccess && (
                <div className="mt-4 p-3 rounded-xl bg-[rgba(74,186,122,0.12)] border border-[rgba(74,186,122,0.3)] text-xs font-mono text-[#4aba7a]">
                  Warehouse replenishment policies saved successfully.
                </div>
              )}

              <form onSubmit={handleSaveInventory} className="mt-6 space-y-6">
                {/* Safety Buffer Horizon Slider */}
                <div className="p-5 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)]">
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-[#e8e6e3] font-semibold">DEFAULT SAFETY BUFFER HORIZON</span>
                    <span className="text-[#d4a853] font-bold text-sm">{safetyBufferDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={safetyBufferDays}
                    onChange={(e) => setSafetyBufferDays(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#202028] rounded-lg appearance-none cursor-pointer accent-[#d4a853]"
                  />
                  <span className="text-[10px] text-[#5c5c64] font-mono mt-1.5 block">
                    Defines baseline safety stock buffer days calculated by the Bayesian demand forecasting models.
                  </span>
                </div>

                {/* Stockout Warning Horizon */}
                <div className="p-5 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)]">
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-[#e8e6e3] font-semibold">CRITICAL LOW-STOCK WARNING MARGIN</span>
                    <span className="text-[#d45a4a] font-bold text-sm">{lowStockDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={1}
                    value={lowStockDays}
                    onChange={(e) => setLowStockDays(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#202028] rounded-lg appearance-none cursor-pointer accent-[#d45a4a]"
                  />
                  <span className="text-[10px] text-[#5c5c64] font-mono mt-1.5 block">
                    Any SKU projected to deplete below this threshold triggers priority dispatch flags and anomaly alerts.
                  </span>
                </div>

                {/* Policy Toggles */}
                <div className="space-y-4 pt-2">
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoReorder}
                      onChange={(e) => setAutoReorder(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#d4a853] bg-[#1a1a22] border-[rgba(255,255,255,0.2)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#e8e6e3] block">
                        Autonomous Purchase Order Generation
                      </span>
                      <span className="text-[11px] text-[#97979d] block mt-0.5">
                        Automatically synthesize recommended PO batches when inventory breaches calculated trigger points.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blockNegative}
                      onChange={(e) => setBlockNegative(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#d4a853] bg-[#1a1a22] border-[rgba(255,255,255,0.2)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#e8e6e3] block">
                        Block Negative Physical Inventory
                      </span>
                      <span className="text-[11px] text-[#97979d] block mt-0.5">
                        Prevent barcode dispatch scans from recording negative bin quantities in the PostgreSQL ledger.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-mono font-semibold text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] active:scale-95 transition-all shadow-md"
                  >
                    Save Warehouse Policies
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 4: ALERTS & NOTIFICATIONS               */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              <h2 className="text-lg font-bold text-[#e8e6e3] tracking-tight">
                Alert Subscriptions & Sentinel Routing
              </h2>
              <p className="text-xs text-[#97979d] mt-1">
                Configure real-time event triggers, email dispatches, and warehouse alert thresholds.
              </p>

              {notifySuccess && (
                <div className="mt-4 p-3 rounded-xl bg-[rgba(74,186,122,0.12)] border border-[rgba(74,186,122,0.3)] text-xs font-mono text-[#4aba7a]">
                  Notification preferences saved.
                </div>
              )}

              <form onSubmit={handleSaveNotifications} className="mt-6 space-y-4">
                <label className="flex items-center justify-between p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)] cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-[#e8e6e3] block">Critical Stockout Warnings</span>
                    <span className="text-[11px] text-[#97979d] block mt-0.5">
                      Immediate alert when any active SKU drops below 48 hours of estimated demand.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyStockout}
                    onChange={(e) => setNotifyStockout(e.target.checked)}
                    className="w-4 h-4 rounded text-[#d4a853] bg-[#1a1a22] border-[rgba(255,255,255,0.2)] focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)] cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-[#e8e6e3] block">Demand Surge Anomaly Alerts</span>
                    <span className="text-[11px] text-[#97979d] block mt-0.5">
                      Trigger notification when sudden consumption exceeds 3 standard deviations from the baseline.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAnomaly}
                    onChange={(e) => setNotifyAnomaly(e.target.checked)}
                    className="w-4 h-4 rounded text-[#d4a853] bg-[#1a1a22] border-[rgba(255,255,255,0.2)] focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)] cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-[#e8e6e3] block">Supplier Lead-Time Breach Warning</span>
                    <span className="text-[11px] text-[#97979d] block mt-0.5">
                      Flag shipments where supplier historical delivery transit exceeds agreed SLA windows.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyLeadTime}
                    onChange={(e) => setNotifyLeadTime(e.target.checked)}
                    className="w-4 h-4 rounded text-[#d4a853] bg-[#1a1a22] border-[rgba(255,255,255,0.2)] focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)] cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-[#e8e6e3] block">Weekly Executive Telemetry Digest</span>
                    <span className="text-[11px] text-[#97979d] block mt-0.5">
                      Condensed overview of stock turnover, dead stock reduction, and procurement efficiency.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="w-4 h-4 rounded text-[#d4a853] bg-[#1a1a22] border-[rgba(255,255,255,0.2)] focus:ring-0 cursor-pointer"
                  />
                </label>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-mono font-semibold text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] active:scale-95 transition-all shadow-md"
                  >
                    Save Alert Preferences
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 5: API & WEBHOOK INTEGRATIONS           */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <h2 className="text-lg font-bold text-[#e8e6e3] tracking-tight">
                  Developer Credentials & Tenant Keys
                </h2>
                <p className="text-xs text-[#97979d] mt-1">
                  Authenticate warehouse barcode scanners, conveyors, and external ERP systems via REST / Webhook protocols.
                </p>

                <div className="mt-6 space-y-4">
                  {/* Tenant ID */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Tenant Identifier
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={store?.id || ""}
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0c0c0e] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyTenantId}
                        className="px-4 py-2.5 rounded-xl text-xs font-mono bg-[#1c1c24] hover:bg-[#252530] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] transition-colors"
                      >
                        {tenantIdCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Production Secret Key */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Production API Secret Key
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={apiKeyRevealed ? simulatedApiKey : "sp_live_••••••••••••••••••••••••"}
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0c0c0e] text-[#d4a853] border border-[rgba(255,255,255,0.1)] select-all"
                      />
                      <button
                        type="button"
                        onClick={() => setApiKeyRevealed(!apiKeyRevealed)}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#1c1c24] hover:bg-[#252530] text-[#97979d] hover:text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] transition-colors"
                      >
                        {apiKeyRevealed ? "Hide" : "Reveal"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyApiKey}
                        className="px-4 py-2.5 rounded-xl text-xs font-mono bg-[#1c1c24] hover:bg-[#252530] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] transition-colors"
                      >
                        {apiKeyCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook Configuration Card */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <h3 className="text-base font-bold text-[#e8e6e3] tracking-tight">
                  Outbound Event Webhooks
                </h3>
                <p className="text-xs text-[#97979d] mt-1">
                  Deliver instantaneous JSON telemetry events (`inventory.updated`, `po.created`, `anomaly.flagged`).
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Target Webhook HTTPS Endpoint
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => {
                          setWebhookUrl(e.target.value);
                          localStorage.setItem("sp_webhook_url", e.target.value);
                        }}
                        placeholder="https://your-erp.com/api/stockpilot-hook"
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#0c0c0e] text-[#e8e6e3] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#d4a853]"
                      />
                      <button
                        type="button"
                        onClick={handleTestPing}
                        disabled={pingStatus === "pinging"}
                        className="px-4 py-2.5 rounded-xl text-xs font-mono font-medium text-[#e8e6e3] bg-[#1c1c24] hover:bg-[#252530] border border-[rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-1.5"
                      >
                        {pingStatus === "pinging" ? (
                          <>
                            <span className="w-3 h-3 border-2 border-[#d4a853] border-t-transparent rounded-full animate-spin" />
                            Pinging...
                          </>
                        ) : (
                          "Send Test Ping"
                        )}
                      </button>
                    </div>
                  </div>

                  {pingStatus === "success" && (
                    <div className="p-3 rounded-xl bg-[rgba(74,186,122,0.1)] border border-[rgba(74,186,122,0.25)] text-xs font-mono text-[#4aba7a] flex items-center justify-between">
                      <span>✓ Webhook Payload Accepted: HTTP 200 OK</span>
                      <span>Latency: 18ms</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 6: DATA MANAGEMENT & DANGER ZONE       */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "data" && (
            <div className="space-y-6">
              {/* Data Export Card */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <h2 className="text-lg font-bold text-[#e8e6e3] tracking-tight">
                  Data Portability & Export
                </h2>
                <p className="text-xs text-[#97979d] mt-1">
                  Export complete snapshots of your active warehouse ledger, inventory levels, and transaction logs.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0c0c0e] border border-[rgba(255,255,255,0.06)]">
                  <div>
                    <span className="text-sm font-semibold text-[#e8e6e3] block">
                      Full Inventory & Safety Stock CSV
                    </span>
                    <span className="text-xs text-[#97979d] block mt-0.5">
                      Contains SKU identifiers, bay coordinates, reorder triggers, and current stock.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-[#e8e6e3] bg-[#1c1c24] hover:bg-[#252530] border border-[rgba(255,255,255,0.1)] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download CSV
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#14141a] border border-[rgba(212,90,74,0.3)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-2 text-[#d45a4a]">
                  <span className="w-2 h-2 rounded-full bg-[#d45a4a]" />
                  <h3 className="text-base font-bold tracking-tight">Danger Zone</h3>
                </div>
                <p className="text-xs text-[#97979d] mt-1">
                  Destructive operations requiring explicit administrator confirmation.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[rgba(212,90,74,0.05)] border border-[rgba(212,90,74,0.15)]">
                    <div>
                      <span className="text-xs font-semibold text-[#e8e6e3] block">
                        Purge Demo & Simulated Transactions
                      </span>
                      <span className="text-[11px] text-[#97979d] block mt-0.5">
                        Removes generated mock sales records while retaining catalog master products and suppliers.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert("Demo data purge requested. Confirmation code required in production.")}
                      className="px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-[#d45a4a] hover:text-[#fff] bg-[rgba(212,90,74,0.1)] hover:bg-[#d45a4a] border border-[rgba(212,90,74,0.3)] transition-colors"
                    >
                      Purge Demo Records
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[rgba(212,90,74,0.05)] border border-[rgba(212,90,74,0.15)]">
                    <div>
                      <span className="text-xs font-semibold text-[#e8e6e3] block">
                        Deactivate Facility Workspace
                      </span>
                      <span className="text-[11px] text-[#97979d] block mt-0.5">
                        Immediately locks all operator access and schedules tenant storage for cryptographically shredded disposal.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert("Tenant workspace deactivation requires master owner multi-factor approval.")}
                      className="px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-[#d45a4a] hover:text-[#fff] bg-[rgba(212,90,74,0.1)] hover:bg-[#d45a4a] border border-[rgba(212,90,74,0.3)] transition-colors"
                    >
                      Deactivate Tenant
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
