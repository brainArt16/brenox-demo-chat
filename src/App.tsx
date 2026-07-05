import { useCallback, useEffect, useState } from "react";
import type { ConnectionState, UserProfile } from "@brenox/sdk";
import { BrenoxProvider, useBrenoxClient } from "@brenox/react";
import { brenoxClient } from "./brenox/client";
import { ChatPanel } from "./components/ChatPanel";
import { EmbedLauncher } from "./components/EmbedLauncher";
import { EmbedRoomBar } from "./components/EmbedRoomBar";
import { Header } from "./components/Header";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { formatError } from "./utils/errors";

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
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

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
      setAuthError(formatError(err));
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
    await client.setToken(input.token);
    setEmbedSession({
      personaLabel: input.username,
      workspaceId: input.workspaceId,
      channelId: input.channelId,
      channelName: input.channelName,
    });
    await loadSession();
  }

  async function handleSwitchUser() {
    await client.auth.logout();
    setUser(null);
    setEmbedSession(null);
    setConnectionState("disconnected");
    setAuthError(null);
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
                Previous session expired: {authError}
              </p>
            )}
            <EmbedLauncher onLaunch={(input) => void handleLaunch(input)} />
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
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <EmbedRoomBar
          channelName={embedSession.channelName}
          workspaceId={embedSession.workspaceId}
          channelId={embedSession.channelId}
          personaLabel={embedSession.personaLabel}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChatPanel
            workspaceId={embedSession.workspaceId}
            channelId={embedSession.channelId}
            currentUserId={user.id}
            onConnectionStateChange={setConnectionState}
          />
        </main>

        <NotificationsPanel />
      </div>
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
