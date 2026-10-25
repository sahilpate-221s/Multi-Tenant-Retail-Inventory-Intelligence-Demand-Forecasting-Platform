import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "../hooks/useNotifications";
import type { Notification } from "../lib/types";
import EmptyState from "../components/states/EmptyState";
import LoadingState from "../components/states/LoadingState";

type TypeFilter = "all" | "STOCKOUT_RISK" | "LOW_STOCK" | "DEAD_STOCK" | "DEMAND_ANOMALY" | "IMPORT_COMPLETED" | "IMPORT_FAILED" | "FORECAST_READY" | "REORDER_RECOMMENDATION";

// ── Type Metadata ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  icon: string;
  label: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  severity: "critical" | "warning" | "info" | "success";
}> = {
  STOCKOUT_RISK: {
    icon: "⚠️",
    label: "Stockout Risk",
    accentColor: "#ff4d4f",
    bgColor: "rgba(255,77,79,0.06)",
    borderColor: "rgba(255,77,79,0.2)",
    severity: "critical",
  },
  LOW_STOCK: {
    icon: "📉",
    label: "Low Stock",
    accentColor: "#ff8c00",
    bgColor: "rgba(255,140,0,0.06)",
    borderColor: "rgba(255,140,0,0.2)",
    severity: "warning",
  },
  DEAD_STOCK: {
    icon: "🐌",
    label: "Dead Stock",
    accentColor: "#a78bfa",
    bgColor: "rgba(167,139,250,0.06)",
    borderColor: "rgba(167,139,250,0.2)",
    severity: "warning",
  },
  DEMAND_ANOMALY: {
    icon: "📊",
    label: "Demand Anomaly",
    accentColor: "#60a5fa",
    bgColor: "rgba(96,165,250,0.06)",
    borderColor: "rgba(96,165,250,0.2)",
    severity: "info",
  },
  IMPORT_COMPLETED: {
    icon: "✅",
    label: "Import Complete",
    accentColor: "#4ade80",
    bgColor: "rgba(74,222,128,0.06)",
    borderColor: "rgba(74,222,128,0.2)",
    severity: "success",
  },
  IMPORT_FAILED: {
    icon: "❌",
    label: "Import Failed",
    accentColor: "#ff4d4f",
    bgColor: "rgba(255,77,79,0.06)",
    borderColor: "rgba(255,77,79,0.2)",
    severity: "critical",
  },
  FORECAST_READY: {
    icon: "🔮",
    label: "Forecast Ready",
    accentColor: "#38bdf8",
    bgColor: "rgba(56,189,248,0.06)",
    borderColor: "rgba(56,189,248,0.2)",
    severity: "info",
  },
  REORDER_RECOMMENDATION: {
    icon: "📦",
    label: "Reorder",
    accentColor: "#d4a853",
    bgColor: "rgba(212,168,83,0.06)",
    borderColor: "rgba(212,168,83,0.2)",
    severity: "info",
  },
};

const DEFAULT_TYPE_CONFIG = {
  icon: "🔔",
  label: "Notification",
  accentColor: "#97979d",
  bgColor: "rgba(151,151,157,0.06)",
  borderColor: "rgba(151,151,157,0.2)",
  severity: "info" as const,
};

// ── Action Buttons per Notification Type ─────────────────────────────────────

function getActions(n: Notification): { label: string; icon: string; to: string; color: string; primary?: boolean }[] {
  const actions: { label: string; icon: string; to: string; color: string; primary?: boolean }[] = [];

  switch (n.type) {
    case "STOCKOUT_RISK":
      actions.push({ label: "View Stockout Risks", icon: "⚡", to: "/stockout-risks", color: "#ff4d4f", primary: true });
      if (n.relatedProductId) {
        actions.push({ label: "Reorder Now", icon: "📦", to: "/reorder-recommendations", color: "#d4a853" });
        actions.push({ label: "View Product", icon: "→", to: `/products/${n.relatedProductId}`, color: "#97979d" });
      }
      break;

    case "LOW_STOCK":
      if (n.relatedProductId) {
        actions.push({ label: "Reorder Now", icon: "📦", to: "/reorder-recommendations", color: "#d4a853", primary: true });
        actions.push({ label: "Adjust Stock", icon: "📝", to: "/inventory", color: "#ff8c00" });
        actions.push({ label: "View Product", icon: "→", to: `/products/${n.relatedProductId}`, color: "#97979d" });
      } else {
        actions.push({ label: "View Inventory", icon: "📋", to: "/inventory", color: "#ff8c00", primary: true });
      }
      break;

    case "DEAD_STOCK":
      actions.push({ label: "Dead Stock Analysis", icon: "🐌", to: "/dead-stock", color: "#a78bfa", primary: true });
      if (n.relatedProductId) {
        actions.push({ label: "Markdown / Liquidate", icon: "🏷️", to: "/dead-stock", color: "#ff8c00" });
        actions.push({ label: "View Product", icon: "→", to: `/products/${n.relatedProductId}`, color: "#97979d" });
      }
      break;

    case "DEMAND_ANOMALY":
      actions.push({ label: "View Anomalies", icon: "📊", to: "/anomalies", color: "#60a5fa", primary: true });
      if (n.relatedProductId) {
        actions.push({ label: "View Forecast", icon: "🔮", to: `/forecasts/${n.relatedProductId}`, color: "#38bdf8" });
        actions.push({ label: "View Product", icon: "→", to: `/products/${n.relatedProductId}`, color: "#97979d" });
      }
      break;

    case "IMPORT_COMPLETED":
      actions.push({ label: "View Import History", icon: "✅", to: "/import", color: "#4ade80", primary: true });
      break;

    case "IMPORT_FAILED":
      actions.push({ label: "View Import Errors", icon: "❌", to: "/import", color: "#ff4d4f", primary: true });
      actions.push({ label: "Retry Import", icon: "🔄", to: "/import", color: "#d4a853" });
      break;

    case "FORECAST_READY":
      if (n.relatedProductId) {
        actions.push({ label: "View Forecast", icon: "🔮", to: `/forecasts/${n.relatedProductId}`, color: "#38bdf8", primary: true });
        actions.push({ label: "View Product", icon: "→", to: `/products/${n.relatedProductId}`, color: "#97979d" });
      } else {
        actions.push({ label: "All Forecasts", icon: "🔮", to: "/forecasts", color: "#38bdf8", primary: true });
      }
      break;

    case "REORDER_RECOMMENDATION":
      actions.push({ label: "View Recommendations", icon: "📦", to: "/reorder-recommendations", color: "#d4a853", primary: true });
      if (n.relatedProductId) {
        actions.push({ label: "Draft PO", icon: "📋", to: "/purchase-orders", color: "#4ade80" });
        actions.push({ label: "View Product", icon: "→", to: `/products/${n.relatedProductId}`, color: "#97979d" });
      }
      break;

    default:
      if (n.relatedProductId) {
        actions.push({ label: "View Product", icon: "→", to: `/products/${n.relatedProductId}`, color: "#d4a853", primary: true });
      }
      break;
  }

  return actions;
}

// ── Relative Time ─────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────────

function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter((n) => {
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (showUnreadOnly && n.isRead) return false;
      return true;
    });
  }, [notifications, typeFilter, showUnreadOnly]);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const criticalCount = notifications?.filter((n) => !n.isRead && (n.type === "STOCKOUT_RISK" || n.type === "IMPORT_FAILED")).length ?? 0;

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const dateMap = new Map<string, Notification[]>();
    for (const n of filtered) {
      const dateKey = new Date(n.createdAt).toDateString();
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(n);
    }

    for (const [dateKey, items] of dateMap) {
      let label = dateKey;
      if (dateKey === today) label = "Today";
      else if (dateKey === yesterday) label = "Yesterday";
      else label = new Date(dateKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
      groups.push({ label, items });
    }

    return groups;
  }, [filtered]);

  const handleActionClick = (n: Notification, to: string) => {
    if (!n.isRead) markAsRead.mutate(n.id);
    navigate(to);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
            OPERATIONS COMMAND STREAM
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Actionable Notifications
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="text-[11px] text-[#97979d]">
              {unreadCount} unread
              {criticalCount > 0 && (
                <span className="text-[#ff4d4f] ml-1 font-medium">({criticalCount} critical)</span>
              )}
            </span>
          )}
          <button
            onClick={() => markAllAsRead.mutate()}
            className="text-xs text-[#97979d] hover:text-[#d4a853] transition-colors"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <MiniCard
          label="UNREAD"
          value={String(unreadCount)}
          accent={unreadCount > 0 ? "#d4a853" : "#4ade80"}
        />
        <MiniCard
          label="CRITICAL"
          value={String(criticalCount)}
          accent={criticalCount > 0 ? "#ff4d4f" : "#5c5c64"}
        />
        <MiniCard
          label="TOTAL"
          value={String(notifications?.length ?? 0)}
          accent="#97979d"
        />
        <MiniCard
          label="TYPES ACTIVE"
          value={String(new Set(notifications?.map((n) => n.type) ?? []).size)}
          accent="#60a5fa"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 mt-5 flex-wrap">
        {/* Type filter pills */}
        <button
          onClick={() => setTypeFilter("all")}
          className={`text-[11px] px-3 py-1.5 rounded-lg transition-all font-medium ${
            typeFilter === "all"
              ? "bg-[#d4a853]/15 text-[#d4a853] border border-[#d4a853]/30"
              : "text-[#97979d] hover:text-[#e8e6e3] border border-transparent"
          }`}
        >
          All
        </button>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const count = notifications?.filter((n) => n.type === type).length ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type as TypeFilter)}
              className={`text-[11px] px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1 ${
                typeFilter === type
                  ? `border`
                  : "text-[#97979d] hover:text-[#e8e6e3] border border-transparent"
              }`}
              style={typeFilter === type ? {
                backgroundColor: config.bgColor,
                color: config.accentColor,
                borderColor: config.borderColor,
              } : undefined}
            >
              <span>{config.icon}</span> {config.label}
              <span className="text-[9px] opacity-60">({count})</span>
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Unread toggle */}
        <button
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className={`text-[11px] px-3 py-1.5 rounded-lg transition-all font-medium ${
            showUnreadOnly
              ? "bg-[#d4a853]/15 text-[#d4a853] border border-[#d4a853]/30"
              : "text-[#97979d] hover:text-[#e8e6e3] border border-transparent"
          }`}
        >
          {showUnreadOnly ? "● Unread only" : "○ Unread only"}
        </button>
      </div>

      {/* Main List */}
      <div className="mt-4 space-y-6">
        {isLoading && (
          <div className="border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
            <LoadingState message="Fetching operations feed..." />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
            <EmptyState
              title={showUnreadOnly ? "No unread notifications" : "No notifications"}
              description={showUnreadOnly ? "All caught up! Toggle off the unread filter to see history." : "System alerts and operational events will appear here."}
            />
          </div>
        )}

        {groupedByDate.map((group) => (
          <div key={group.label}>
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] uppercase tracking-widest text-[#5c5c64] font-medium">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.04)]" />
              <span className="text-[10px] text-[#5c5c64]">{group.items.length}</span>
            </div>

            {/* Notification Cards */}
            <div className="space-y-2">
              {group.items.map((n) => {
                const config = TYPE_CONFIG[n.type] ?? DEFAULT_TYPE_CONFIG;
                const actions = getActions(n);

                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border transition-all duration-200 ${
                      !n.isRead
                        ? "border-l-2"
                        : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)]"
                    }`}
                    style={{
                      backgroundColor: !n.isRead ? config.bgColor : "rgba(18,18,22,0.9)",
                      borderLeftColor: !n.isRead ? config.accentColor : undefined,
                      borderColor: !n.isRead ? config.borderColor : undefined,
                    }}
                  >
                    <div className="px-5 py-4">
                      {/* Top Row: Icon + Title + Time + Mark Read */}
                      <div className="flex items-start gap-3">
                        {/* Type Icon */}
                        <span className="text-lg shrink-0 mt-0.5">{config.icon}</span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Type Badge */}
                            <span
                              className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                              style={{
                                color: config.accentColor,
                                backgroundColor: `${config.accentColor}15`,
                              }}
                            >
                              {config.label}
                            </span>

                            {/* Severity */}
                            {config.severity === "critical" && !n.isRead && (
                              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-[#ff4d4f]/15 text-[#ff4d4f] animate-pulse">
                                CRITICAL
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-semibold text-[#e8e6e3] mt-1.5 leading-snug">
                            {n.relatedProductId ? (
                              <Link
                                to={`/products/${n.relatedProductId}`}
                                className="hover:text-[#d4a853] transition-colors"
                                onClick={() => { if (!n.isRead) markAsRead.mutate(n.id); }}
                              >
                                {n.title}
                              </Link>
                            ) : (
                              n.title
                            )}
                          </h3>

                          {/* Message */}
                          <p className="text-xs text-[#97979d] mt-1 leading-relaxed">{n.message}</p>

                          {/* ── ACTION BUTTONS (the key upgrade) ─────────── */}
                          {actions.length > 0 && (
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              {actions.map((action, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleActionClick(n, action.to)}
                                  className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 ${
                                    action.primary
                                      ? "border shadow-sm"
                                      : "hover:bg-[rgba(255,255,255,0.04)]"
                                  }`}
                                  style={action.primary ? {
                                    color: action.color,
                                    borderColor: `${action.color}40`,
                                    backgroundColor: `${action.color}10`,
                                  } : {
                                    color: action.color,
                                  }}
                                >
                                  <span>{action.icon}</span>
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right: Timestamp + Mark Read */}
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-[#5c5c64]">{timeAgo(n.createdAt)}</p>
                          {!n.isRead && (
                            <button
                              onClick={() => markAsRead.mutate(n.id)}
                              className="text-[10px] text-[#d4a853] hover:underline mt-1 block ml-auto"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini Telemetry Card ─────────────────────────────────────────────────────

function MiniCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="p-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121216]/80">
      <p className="text-[9px] uppercase tracking-widest text-[#5c5c64]">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color: accent }}>{value}</p>
    </div>
  );
}

export default NotificationsPage;