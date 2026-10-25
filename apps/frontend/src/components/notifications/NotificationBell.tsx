import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "../../hooks/useNotifications";
import type { Notification } from "../../lib/types";

const TYPE_ICONS: Record<string, string> = {
  STOCKOUT_RISK: "⚠️",
  LOW_STOCK: "📉",
  DEAD_STOCK: "🐌",
  DEMAND_ANOMALY: "📊",
  IMPORT_COMPLETED: "✅",
  IMPORT_FAILED: "❌",
  FORECAST_READY: "🔮",
  REORDER_RECOMMENDATION: "📦",
};

const TYPE_COLORS: Record<string, string> = {
  STOCKOUT_RISK: "#ff4d4f",
  LOW_STOCK: "#ff8c00",
  DEAD_STOCK: "#a78bfa",
  DEMAND_ANOMALY: "#60a5fa",
  IMPORT_COMPLETED: "#4ade80",
  IMPORT_FAILED: "#ff4d4f",
  FORECAST_READY: "#38bdf8",
  REORDER_RECOMMENDATION: "#d4a853",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Returns the primary quick-action route for a notification type */
function getPrimaryAction(n: Notification): { label: string; to: string } | null {
  switch (n.type) {
    case "STOCKOUT_RISK":
      return { label: "⚡ View Risks", to: "/stockout-risks" };
    case "LOW_STOCK":
      return { label: "📦 Reorder", to: "/reorder-recommendations" };
    case "DEAD_STOCK":
      return { label: "🏷️ Markdown", to: "/dead-stock" };
    case "DEMAND_ANOMALY":
      return { label: "📊 Anomalies", to: "/anomalies" };
    case "IMPORT_COMPLETED":
    case "IMPORT_FAILED":
      return { label: "📁 Imports", to: "/import" };
    case "FORECAST_READY":
      return n.relatedProductId
        ? { label: "🔮 Forecast", to: `/forecasts/${n.relatedProductId}` }
        : { label: "🔮 Forecasts", to: "/forecasts" };
    case "REORDER_RECOMMENDATION":
      return { label: "📋 Draft PO", to: "/purchase-orders" };
    default:
      return n.relatedProductId
        ? { label: "→ View", to: `/products/${n.relatedProductId}` }
        : null;
  }
}

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count ?? 0;
  const hasCritical = notifications?.some((n) => !n.isRead && (n.type === "STOCKOUT_RISK" || n.type === "IMPORT_FAILED")) ?? false;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (n: Notification, to: string) => {
    if (!n.isRead) markAsRead.mutate(n.id);
    setIsOpen(false);
    navigate(to);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-sm transition-colors duration-150"
        style={{ color: "var(--color-sp-text-muted)" }}
        onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-sp-text-secondary)")}
        onMouseOut={(e) => (e.currentTarget.style.color = "var(--color-sp-text-muted)")}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium ${hasCritical ? "animate-pulse" : ""}`}
            style={{
              background: hasCritical ? "#ff4d4f" : "var(--color-sp-accent)",
              color: "var(--color-sp-base)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 z-50 max-h-[480px] overflow-y-auto rounded-xl"
          style={{
            background: "var(--color-sp-panel)",
            border: "1px solid var(--color-sp-border-default)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
            style={{
              background: "var(--color-sp-panel)",
              borderBottom: "1px solid var(--color-sp-border-subtle)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-sp-text-primary)" }}
              >
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: hasCritical ? "rgba(255,77,79,0.15)" : "rgba(212,168,83,0.15)",
                    color: hasCritical ? "#ff4d4f" : "#d4a853",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="text-[11px] transition-colors duration-150"
                  style={{ color: "var(--color-sp-text-muted)" }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-sp-text-secondary)")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "var(--color-sp-text-muted)")}
                >
                  Mark all read
                </button>
              )}
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-[11px] transition-colors duration-150"
                style={{ color: "#d4a853" }}
              >
                View all →
              </Link>
            </div>
          </div>

          {/* Empty State */}
          {(!notifications || notifications.length === 0) && (
            <p
              className="text-sm text-center py-8"
              style={{ color: "var(--color-sp-text-muted)" }}
            >
              No notifications yet.
            </p>
          )}

          {/* Notification Items */}
          {notifications?.slice(0, 15).map((n) => {
            const typeColor = TYPE_COLORS[n.type] ?? "#97979d";
            const primaryAction = getPrimaryAction(n);

            return (
              <div
                key={n.id}
                className="px-4 py-3 text-sm transition-colors duration-100"
                style={{
                  borderBottom: "1px solid var(--color-sp-border-subtle)",
                  background: !n.isRead ? `${typeColor}08` : "transparent",
                }}
                onMouseOver={(e) => { if (n.isRead) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseOut={(e) => { if (n.isRead) e.currentTarget.style.background = "transparent"; }}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-sm mt-0.5">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    {n.relatedProductId ? (
                      <Link
                        to={`/products/${n.relatedProductId}`}
                        onClick={() => {
                          if (!n.isRead) markAsRead.mutate(n.id);
                          setIsOpen(false);
                        }}
                        className="font-medium block hover:underline text-xs leading-snug"
                        style={{ color: "var(--color-sp-text-primary)" }}
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p
                        className="font-medium text-xs leading-snug"
                        style={{ color: "var(--color-sp-text-primary)" }}
                      >
                        {n.title}
                      </p>
                    )}

                    {/* Message */}
                    <p
                      className="text-[11px] mt-0.5 line-clamp-2"
                      style={{ color: "var(--color-sp-text-muted)" }}
                    >
                      {n.message}
                    </p>

                    {/* Action Button + Time */}
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      {primaryAction ? (
                        <button
                          onClick={() => handleAction(n, primaryAction.to)}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md transition-all active:scale-95 border"
                          style={{
                            color: typeColor,
                            borderColor: `${typeColor}30`,
                            backgroundColor: `${typeColor}10`,
                          }}
                        >
                          {primaryAction.label}
                        </button>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--color-sp-text-ghost)" }}
                        >
                          {timeAgo(n.createdAt)}
                        </span>
                        {!n.isRead && (
                          <button
                            onClick={() => markAsRead.mutate(n.id)}
                            className="text-[10px] transition-colors duration-150"
                            style={{ color: "var(--color-sp-text-muted)" }}
                            onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-sp-text-secondary)")}
                            onMouseOut={(e) => (e.currentTarget.style.color = "var(--color-sp-text-muted)")}
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          {notifications && notifications.length > 15 && (
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-[11px] py-3 transition-colors"
              style={{ color: "#d4a853", borderTop: "1px solid var(--color-sp-border-subtle)" }}
            >
              View all {notifications.length} notifications →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;