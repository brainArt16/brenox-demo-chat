import { useNotifications } from "@brenox/react";
import { formatError } from "../utils/errors";

export function NotificationsPanel() {
  const {
    notifications,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications({ pollIntervalMs: 30_000 });

  return (
    <aside className="flex w-full flex-col border-l border-border bg-surface lg:w-72">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-xs text-accent hover:underline"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="text-xs text-accent hover:underline"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading && (
          <p className="text-sm text-text-muted">Loading notifications…</p>
        )}
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
            {formatError(error)}
          </p>
        )}
        {!loading && notifications.length === 0 && (
          <p className="text-sm text-text-muted">No notifications.</p>
        )}

        <ul className="space-y-2">
          {notifications.map((item) => (
            <li
              key={item.id}
              className={`rounded-md border border-border p-3 text-sm ${
                item.read ? "opacity-70" : "bg-accent/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{item.body}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {item.type} · {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => void markRead(item.id)}
                    className="shrink-0 text-xs text-accent hover:underline"
                  >
                    Read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-border px-3 py-2 text-xs text-text-muted">
        Polling every 30s via{" "}
        <code className="rounded bg-surface-muted px-1">useNotifications</code>
      </p>
    </aside>
  );
}
