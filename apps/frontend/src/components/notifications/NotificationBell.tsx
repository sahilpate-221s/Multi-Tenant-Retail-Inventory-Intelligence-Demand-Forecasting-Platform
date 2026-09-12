import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "../../hooks/useNotifications";

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

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: notifications } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            className="absolute -top-1 -right-1 text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium"
            style={{
              background: "var(--color-sp-accent)",
              color: "var(--color-sp-base)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 z-50 max-h-96 overflow-y-auto"
          style={{
            background: "var(--color-sp-panel)",
            border: "1px solid var(--color-sp-border-default)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: "1px solid var(--color-sp-border-subtle)" }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-sp-text-primary)" }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs transition-colors duration-150"
                style={{ color: "var(--color-sp-text-muted)" }}
                onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-sp-text-secondary)")}
                onMouseOut={(e) => (e.currentTarget.style.color = "var(--color-sp-text-muted)")}
              >
                Mark all read
              </button>
            )}
          </div>

          {(!notifications || notifications.length === 0) && (
            <p
              className="text-sm text-center py-6"
              style={{ color: "var(--color-sp-text-muted)" }}
            >
              No notifications yet.
            </p>
          )}

          {notifications?.map((n) => (
            <div
              key={n.id}
              className="px-3 py-2 text-sm"
              style={{
                borderBottom: "1px solid var(--color-sp-border-subtle)",
                background: !n.isRead ? "var(--color-sp-accent-bg)" : "transparent",
              }}
            >
              <div className="flex items-start gap-2">
                <span>{TYPE_ICONS[n.type] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  {n.relatedProductId ? (
                    <Link
                      to={`/products/${n.relatedProductId}`}
                      onClick={() => setIsOpen(false)}
                      className="font-medium block hover:underline"
                      style={{ color: "var(--color-sp-text-primary)" }}
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p
                      className="font-medium"
                      style={{ color: "var(--color-sp-text-primary)" }}
                    >
                      {n.title}
                    </p>
                  )}
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-sp-text-muted)" }}
                  >
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-sp-text-ghost)" }}
                    >
                      {timeAgo(n.createdAt)}
                    </span>
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead.mutate(n.id)}
                        className="text-xs transition-colors duration-150"
                        style={{ color: "var(--color-sp-text-muted)" }}
                        onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-sp-text-secondary)")}
                        onMouseOut={(e) => (e.currentTarget.style.color = "var(--color-sp-text-muted)")}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;