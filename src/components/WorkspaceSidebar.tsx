import { useCallback, useEffect, useState } from "react";
import type { Channel, WorkspaceListItem } from "@brenox/sdk";
import { useBrenoxClient } from "@brenox/react";
import { formatError } from "../utils/errors";

interface WorkspaceSidebarProps {
  workspaceId: number | null;
  channelId: number | null;
  onWorkspaceChange: (id: number | null) => void;
  onChannelChange: (id: number | null) => void;
}

export function WorkspaceSidebar({
  workspaceId,
  channelId,
  onWorkspaceChange,
  onChannelChange,
}: WorkspaceSidebarProps) {
  const client = useBrenoxClient();
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    setError(null);
    try {
      const items = await client.workspaces.list();
      setWorkspaces(items);
      if (items.length > 0 && workspaceId === null) {
        onWorkspaceChange(items[0].id);
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [client, onWorkspaceChange, workspaceId]);

  const loadChannels = useCallback(async () => {
    if (workspaceId === null) {
      setChannels([]);
      return;
    }
    setLoadingChannels(true);
    setError(null);
    try {
      const items = await client.channels.list(workspaceId);
      setChannels(items);
      if (items.length > 0 && channelId === null) {
        onChannelChange(items[0].ID);
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoadingChannels(false);
    }
  }, [client, workspaceId, channelId, onChannelChange]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  async function handleCreateWorkspace(event: React.FormEvent) {
    event.preventDefault();
    if (!workspaceName.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const workspace = await client.workspaces.create({
        name: workspaceName.trim(),
      });
      await loadWorkspaces();
      onWorkspaceChange(workspace.id);
      setWorkspaceName("");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateChannel(event: React.FormEvent) {
    event.preventDefault();
    if (!channelName.trim() || workspaceId === null) return;
    setActionLoading(true);
    setError(null);
    try {
      const channel = await client.channels.create(workspaceId, {
        name: channelName.trim(),
      });
      await loadChannels();
      onChannelChange(channel.ID);
      setChannelName("");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleJoinChannel(id: number) {
    if (workspaceId === null) return;
    setActionLoading(true);
    setError(null);
    try {
      await client.channels.join(workspaceId, id);
      onChannelChange(id);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleViewWorkspace() {
    if (workspaceId === null) return;
    setActionLoading(true);
    setError(null);
    try {
      const workspace = await client.workspaces.get(workspaceId);
      setError(null);
      alert(
        `Workspace: ${workspace.name}\nSlug: ${workspace.slug}\nOwner: ${workspace.owner_id}`,
      );
    } catch (err) {
      setError(formatError(err));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <aside className="flex w-full flex-col gap-4 border-r border-border bg-surface p-4 lg:w-72">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Workspaces
        </h2>
        {loadingWorkspaces ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : (
          <ul className="space-y-1">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <button
                  type="button"
                  onClick={() => {
                    onWorkspaceChange(ws.id);
                    onChannelChange(null);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    workspaceId === ws.id
                      ? "bg-accent/15 font-medium text-accent"
                      : "hover:bg-surface-muted"
                  }`}
                >
                  {ws.name}
                  <span className="ml-1 text-xs text-text-muted">({ws.role})</span>
                </button>
              </li>
            ))}
            {workspaces.length === 0 && (
              <li className="text-sm text-text-muted">No workspaces yet.</li>
            )}
          </ul>
        )}

        <form onSubmit={handleCreateWorkspace} className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="New workspace"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={actionLoading}
            className="rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            Add
          </button>
        </form>

        {workspaceId !== null && (
          <button
            type="button"
            onClick={() => void handleViewWorkspace()}
            disabled={actionLoading}
            className="mt-2 text-xs text-accent hover:underline disabled:opacity-60"
          >
            View workspace details
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Channels
        </h2>
        {workspaceId === null ? (
          <p className="text-sm text-text-muted">Select a workspace first.</p>
        ) : loadingChannels ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : (
          <ul className="space-y-1">
            {channels.map((ch) => (
              <li key={ch.ID} className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onChannelChange(ch.ID)}
                  className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm ${
                    channelId === ch.ID
                      ? "bg-accent/15 font-medium text-accent"
                      : "hover:bg-surface-muted"
                  }`}
                >
                  # {ch.Name}
                </button>
                <button
                  type="button"
                  title="Join channel"
                  onClick={() => void handleJoinChannel(ch.ID)}
                  disabled={actionLoading}
                  className="rounded-md border border-border px-2 text-xs hover:bg-surface-muted disabled:opacity-60"
                >
                  Join
                </button>
              </li>
            ))}
            {channels.length === 0 && (
              <li className="text-sm text-text-muted">No channels yet.</li>
            )}
          </ul>
        )}

        {workspaceId !== null && (
          <form onSubmit={handleCreateChannel} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="New channel"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              Add
            </button>
          </form>
        )}
      </section>

      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}
