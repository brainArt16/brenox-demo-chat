import { useState } from "react";
import { useBrenoxClient } from "@brenox/react";
import { formatError } from "../utils/errors";

interface AuthFormProps {
  onAuthenticated: () => void;
}

type AuthMode = "login" | "register";

export function AuthForm({ onAuthenticated }: AuthFormProps) {
  const client = useBrenoxClient();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "register") {
        await client.auth.register({ email, username, password });
        setInfo("Account created. Logging in…");
        await client.auth.login({ email, password });
      } else {
        await client.auth.login({ email, password });
      }
      onAuthenticated();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6 flex gap-2">
        {(["login", "register"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setMode(tab);
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${
              mode === tab
                ? "bg-accent text-white"
                : "bg-surface-muted text-text-muted hover:text-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          />
        </label>

        {mode === "register" && (
          <label className="block text-sm">
            <span className="mb-1 block text-text-muted">Username</span>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-text-muted">Password</span>
          <input
            type="password"
            required
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          />
        </label>

        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Register & log in"}
        </button>
      </form>
    </div>
  );
}
