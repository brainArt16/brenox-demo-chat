import { useCallback, useEffect, useState } from "react";
import type { ConnectionState, UserProfile } from "@brenox/sdk";
import { BrenoxProvider, useBrenoxClient } from "@brenox/react";
import { brenoxClient } from "./brenox/client";
import { BrenoxMultiChat } from "./components/BrenoxMultiChat";
import { EmbedLauncher } from "./components/EmbedLauncher";
import { Header } from "./components/Header";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { SupportFab } from "./components/SupportFab";
import { formatError, isAuthFailure } from "./utils/errors";

type ViewMode = "full" | "widget";

interface EmbedSession {
  personaLabel: string;
  workspaceId: number;
  channelId: number;
  channelName: string;
}

function DemoApp() {
  const client = useBrenoxClient();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [embedSession, setEmbedSession] = useState<EmbedSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [launcherKey, setLauncherKey] = useState(0);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [viewMode, setViewMode] = useState<ViewMode>("full");

  const loadSession = useCallback(async () => {
    setBootstrapping(true);
    setAuthError(null);
    try {
      const token = await client.getToken();
      if (!token) {
        setUser(null);
        setEmbedSession(null);
        return;
      }
      const profile = await client.users.me();
      setUser(profile);
    } catch (err) {
      setUser(null);
      setEmbedSession(null);
      setAuthError(
        isAuthFailure(err)
          ? `Session expired. Pick a user below to start again. (${formatError(err)})`
          : formatError(err),
      );
      await client.auth.logout();
    } finally {
      setBootstrapping(false);
    }
  }, [client]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  async function handleLaunch(input: {
    persona: "alice" | "bob";
    token: string;
    workspaceId: number;
    channelId: number;
    channelName: string;
    username: string;
  }) {
    setAuthError(null);
    setBootstrapping(true);
    try {
      await client.setToken(input.token);
      const profile = await client.users.me();
      setUser(profile);
      setEmbedSession({
        personaLabel: input.username,
        workspaceId: input.workspaceId,
        channelId: input.channelId,
        channelName: input.channelName,
      });
      setViewMode("full");
    } catch (err) {
      await client.auth.logout();
      setUser(null);
      setEmbedSession(null);
      setAuthError(formatError(err));
    } finally {
      setBootstrapping(false);
    }
  }

  async function handleSwitchUser() {
    await client.auth.logout();
    setUser(null);
    setEmbedSession(null);
    setConnectionState("disconnected");
    setAuthError(null);
    setViewMode("full");
    setLauncherKey((value) => value + 1);
  }

  if (bootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-text-muted">Loading session…</p>
      </div>
    );
  }

  if (!user || !embedSession) {
    return (
      <div className="flex min-h-svh flex-col">
        <Header onLogout={() => void handleSwitchUser()} />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-2xl space-y-4">
            {authError && (
              <p
                className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                {authError}
              </p>
            )}
            <EmbedLauncher
              key={launcherKey}
              onLaunch={(input) => void handleLaunch(input)}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Header
        username={user.username}
        email={user.email}
        connectionState={connectionState}
        onLogout={() => void handleSwitchUser()}
        logoutLabel="Switch user"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === "widget" ? (
        <main className="relative min-h-0 flex-1 bg-gradient-to-br from-surface to-surface-muted">
          <div className="mx-auto max-w-lg px-6 py-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Support widget preview
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text">
              Your product page
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              This simulates a host app with a floating support chat button
              (bottom-right). Open it as {embedSession.personaLabel} — use
              another tab for the other persona to reply in realtime.
            </p>
          </div>
          <SupportFab
            workspaceId={embedSession.workspaceId}
            channelId={embedSession.channelId}
            channelName={embedSession.channelName}
            currentUserId={user.id}
            currentUsername={user.username}
            onConnectionStateChange={setConnectionState}
          />
        </main>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <BrenoxMultiChat
              workspaceId={embedSession.workspaceId}
              initialChannelId={embedSession.channelId}
              currentUserId={user.id}
              currentUsername={user.username}
              onConnectionStateChange={setConnectionState}
            />
          </main>
          <NotificationsPanel />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrenoxProvider client={brenoxClient}>
      <DemoApp />
    </BrenoxProvider>
  );
}
