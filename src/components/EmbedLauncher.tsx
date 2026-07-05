import { useEffect, useState } from "react";
import {
  DEMO_PERSONAS,
  createEmbedSession,
  fetchDemoConfig,
  type DemoConfig,
  type DemoPersona,
} from "../lib/embed-api";
import { formatError } from "../utils/errors";

interface EmbedLauncherProps {
  onLaunch: (input: {
    persona: DemoPersona["id"];
    token: string;
    workspaceId: number;
    channelId: number;
    channelName: string;
    username: string;
  }) => void;
}

export function EmbedLauncher({ onLaunch }: EmbedLauncherProps) {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [loadingPersona, setLoadingPersona] = useState<DemoPersona["id"] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDemoConfig()
      .then((value) => {
        if (!cancelled) setConfig(value);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            formatError(err) +
              " — is the embed demo server running? (npm run dev:server)",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleOpen(persona: DemoPersona["id"]) {
    setLoadingPersona(persona);
    setError(null);
    try {
      const session = await createEmbedSession(persona);
      onLaunch({
        persona,
        token: session.token,
        workspaceId: session.workspace_id,
        channelId: session.channel_id,
        channelName: config?.channel_name ?? "general",
        username: session.user.username,
      });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoadingPersona(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Embed demo
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-text">
          Your app&apos;s chat — powered by Brenox
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          This simulates how your product embeds Brenox: your backend provisions
          users with an API key and returns a session token. End users never
          register on Brenox directly — they open chat inside your app.
        </p>
        {config && (
          <p className="mt-3 text-xs text-text-muted">
            Demo room: <span className="font-mono">#{config.channel_name}</span>{" "}
            (workspace {config.workspace_id}, channel {config.channel_id})
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DEMO_PERSONAS.map((persona) => (
          <button
            key={persona.id}
            type="button"
            disabled={loadingPersona !== null}
            onClick={() => void handleOpen(persona.id)}
            className="rounded-lg border border-border bg-surface p-5 text-left transition hover:border-accent/40 hover:bg-surface-muted disabled:opacity-60"
          >
            <p className="text-lg font-semibold text-text">{persona.label}</p>
            <p className="mt-1 text-sm text-text-muted">{persona.description}</p>
            <p className="mt-4 text-xs font-medium text-accent">
              {loadingPersona === persona.id ? "Opening chat…" : "Open chat →"}
            </p>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-text-muted">
        Open Alice in one browser window and Bob in another (or incognito) to
        try realtime chat.
      </p>
    </div>
  );
}
