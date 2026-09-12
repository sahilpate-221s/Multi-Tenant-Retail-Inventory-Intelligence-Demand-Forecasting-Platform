import { Link } from "react-router-dom";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "../hooks/useNotifications";
import EmptyState from "../components/states/EmptyState";
import LoadingState from "../components/states/LoadingState";

function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
            SYSTEM DISPATCH
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Operational Notifications
          </h1>
        </div>

        <button
          onClick={() => markAllAsRead.mutate()}
          className="text-xs text-[#97979d] hover:text-[#d4a853] transition-colors"
        >
          Mark all as read
        </button>
      </div>

      {/* Main List Container */}
      <div className="mt-6 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {isLoading && <LoadingState message="Fetching system telemetry logs..." />}
        {notifications?.length === 0 && <EmptyState title="No active notifications" />}
        {notifications?.map((n) => (
          <div
            key={n.id}
            className={`px-5 py-4 border-b border-[rgba(255,255,255,0.04)] transition-colors ${
              !n.isRead ? "bg-[#d4a853]/5 border-l-2 border-l-[#d4a853]" : "hover:bg-[#181822]/60"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              {n.relatedProductId ? (
                <Link
                  to={`/products/${n.relatedProductId}`}
                  className="text-sm font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors"
                >
                  {n.title}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-[#e8e6e3]">{n.title}</p>
              )}
              {!n.isRead && (
                <button
                  onClick={() => markAsRead.mutate(n.id)}
                  className="text-[11px] text-[#d4a853] hover:underline shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
            <p className="text-xs text-[#97979d] mt-1.5 leading-relaxed">{n.message}</p>
            <p className="text-[10px] text-[#5c5c64] mt-2">
              {new Date(n.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPage;