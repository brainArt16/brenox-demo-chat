import { useCallback, useEffect, useState } from "react";
import type { ConnectionState, UserProfile } from "@brenox/sdk";
import { BrenoxProvider, useBrenoxClient } from "@brenox/react";
import { brenoxClient } from "./brenox/client";
import { AuthForm } from "./components/AuthForm";
import { ChatPanel } from "./components/ChatPanel";
import { Header } from "./components/Header";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { formatError } from "./utils/errors";

function DemoApp() {
  const client = useBrenoxClient();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

  const loadSession = useCallback(async () => {
    setBootstrapping(true);
    setAuthError(null);
    try {
      const token = await client.getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const profile = await client.users.me();
      setUser(profile);
    } catch (err) {
      setUser(null);
      setAuthError(formatError(err));
      await client.auth.logout();
    } finally {
      setBootstrapping(false);
    }
  }, [client]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  async function handleLogout() {
    await client.auth.logout();
    setUser(null);
    setWorkspaceId(null);
    setChannelId(null);
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

  if (!user) {
    return (
      <div className="flex min-h-svh flex-col">
        <Header onLogout={() => void handleLogout()} />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md space-y-4">
            {authError && (
              <p
                className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                Previous session expired: {authError}
              </p>
            )}
            <AuthForm onAuthenticated={() => void loadSession()} />
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
        connectionState={channelId !== null ? connectionState : undefined}
        onLogout={() => void handleLogout()}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <WorkspaceSidebar
          workspaceId={workspaceId}
          channelId={channelId}
          onWorkspaceChange={setWorkspaceId}
          onChannelChange={setChannelId}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {workspaceId !== null && channelId !== null ? (
            <ChatPanel
              workspaceId={workspaceId}
              channelId={channelId}
              currentUserId={user.id}
              onConnectionStateChange={setConnectionState}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="text-text-muted">
                Select or create a workspace and channel to start chatting.
              </p>
            </div>
          )}
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
