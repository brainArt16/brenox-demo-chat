import type { ConnectionState } from "@brenox/sdk";

const STATE_STYLES: Record<ConnectionState, string> = {
  connected: "bg-success/15 text-success",
  connecting: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  reconnecting: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  disconnected: "bg-text-muted/15 text-text-muted",
};

interface HeaderProps {
  username?: string;
  email?: string;
  connectionState?: ConnectionState;
  onLogout: () => void;
}

export function Header({
  username,
  email,
  connectionState,
  onLogout,
}: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-semibold text-text">Brenox Chat Demo</h1>
        <nav className="flex flex-wrap gap-3 text-sm">
          <a
            href="https://www.breno-x.com/resources/demos/chat"
            className="text-accent hover:underline"
          >
            Tutorial
          </a>
          <a
            href="https://www.breno-x.com/docs"
            className="text-accent hover:underline"
          >
            Docs
          </a>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {connectionState && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATE_STYLES[connectionState]}`}
            aria-live="polite"
          >
            {connectionState}
          </span>
        )}
        {username && (
          <span className="text-text-muted">
            {username}
            {email ? ` (${email})` : ""}
          </span>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-text hover:bg-surface-muted"
        >
          Reset / Logout
        </button>
      </div>
    </header>
  );
}
