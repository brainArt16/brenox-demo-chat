import { useCallback, useEffect, useRef, useState } from "react";
import type { Attachment, ChannelServerEventType, MessageListItem } from "@brenox/sdk";
import { useBrenoxClient, useChannel } from "@brenox/react";
import { asArray } from "../utils/asArray";
import { formatError } from "../utils/errors";

interface ChatPanelProps {
  workspaceId: number;
  channelId: number;
  currentUserId: number;
  onConnectionStateChange?: (state: ReturnType<typeof useChannel>["connectionState"]) => void;
}

function toListItem(
  payload: {
    id: number;
    sender_id: number;
    content: string;
    created_at: string;
  },
  channelId: number,
  username = "",
): MessageListItem {
  return {
    id: payload.id,
    channel_id: channelId,
    sender_id: payload.sender_id,
    username,
    content: payload.content,
    created_at: payload.created_at,
  };
}

interface FeedEntry {
  id: string;
  eventType: ChannelServerEventType | string;
  summary: string;
  at: string;
}

const EVENT_TYPES: ChannelServerEventType[] = [
  "typing.start",
  "typing.stop",
  "presence.online",
  "presence.offline",
  "presence.status",
  "member.joined",
  "member.left",
  "notification.new",
];

export function ChatPanel({
  workspaceId,
  channelId,
  currentUserId,
  onConnectionStateChange,
}: ChatPanelProps) {
  const client = useBrenoxClient();
  const {
    connection,
    connectionState,
    connect,
    startTyping,
    stopTyping,
  } = useChannel(workspaceId, channelId);

  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const visibleMessages = asArray(messages);

  const refresh = useCallback(async () => {
    const items = asArray(
      await client.messages.list(workspaceId, channelId, { limit: 50 }),
    );
    setMessages(items);
  }, [client, workspaceId, channelId]);

  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [attachmentsByMessage, setAttachmentsByMessage] = useState<
    Record<number, Attachment[]>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  useEffect(() => {
    void connect();
  }, [connect]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    refresh()
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!connection) return;

    const offNew = connection.on("message.new", (event) => {
      setMessages((prev) => {
        if (prev.some((message) => message.id === event.payload.id)) {
          return prev;
        }
        return [...prev, toListItem(event.payload, channelId)];
      });
    });

    const offUpdated = connection.on("message.updated", (event) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === event.payload.id
            ? { ...message, content: event.payload.content }
            : message,
        ),
      );
    });

    return () => {
      offNew();
      offUpdated();
    };
  }, [connection, channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  useEffect(() => {
    if (!connection) return;

    const unsubs = EVENT_TYPES.map((type) =>
      connection.on(type, (event) => {
        const payload = event.payload as unknown as Record<string, unknown>;
        let summary: string = type;

        if (type === "typing.start" || type === "typing.stop") {
          const userId = payload.user_id as number;
          setTypingUsers((prev) => {
            const next = new Set(prev);
            if (type === "typing.start") next.add(userId);
            else next.delete(userId);
            return next;
          });
          summary = `User ${userId} ${type === "typing.start" ? "started" : "stopped"} typing`;
        } else if (type.startsWith("presence.")) {
          summary = `Presence: ${JSON.stringify(payload)}`;
        } else if (type.startsWith("member.")) {
          summary = `Member event: user ${payload.user_id}`;
        } else if (type === "notification.new") {
          summary = `Notification: ${String(payload.title ?? "new")}`;
        }

        setFeed((prev) => [
          {
            id: `${type}-${Date.now()}-${Math.random()}`,
            eventType: type,
            summary,
            at: new Date().toISOString(),
          },
          ...prev.slice(0, 49),
        ]);
      }),
    );

    return () => {
      for (const off of unsubs) off();
    };
  }, [connection]);

  useEffect(() => {
    let cancelled = false;

    async function loadAttachments() {
      const map: Record<number, Attachment[]> = {};
      await Promise.all(
        visibleMessages.map(async (message) => {
          try {
            const items = await client.attachments.listByMessage(
              workspaceId,
              channelId,
              message.id,
            );
            if (items.length > 0) {
              map[message.id] = items;
            }
          } catch {
            // attachments optional per message
          }
        }),
      );
      if (!cancelled) {
        setAttachmentsByMessage(map);
      }
    }

    if (visibleMessages.length > 0) {
      void loadAttachments();
    }

    return () => {
      cancelled = true;
    };
  }, [visibleMessages, client, workspaceId, channelId]);

  function handleDraftChange(value: string) {
    setDraft(value);
    if (connectionState !== "connected") return;

    startTyping();
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      if (connection?.connectionState === "connected") {
        stopTyping();
      }
    }, 1500);
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !pendingFile) return;

    setSending(true);
    setSendError(null);
    if (connectionState === "connected") {
      stopTyping();
    }

    try {
      let uploaded:
        | {
            object_key: string;
            file_name: string;
            mime_type: string;
            size_bytes: number;
          }
        | undefined;

      if (pendingFile) {
        uploaded = await client.attachments.uploadFile(pendingFile, {
          fileName: pendingFile.name,
          mimeType: pendingFile.type || "application/octet-stream",
        });
      }

      if (uploaded) {
        const messageContent =
          text || `(attachment: ${uploaded.file_name})`;
        const message = await client.messages.send(workspaceId, channelId, {
          content: messageContent,
        });
        const attached = await client.attachments.attachToMessage(
          workspaceId,
          channelId,
          message.id,
          [uploaded],
        );
        setAttachmentsByMessage((prev) => ({
          ...prev,
          [message.id]: attached,
        }));
        await refresh();
      } else if (text) {
        if (connectionState === "connected" && connection) {
          connection.sendMessage(text);
        } else {
          await client.messages.send(workspaceId, channelId, { content: text });
          await refresh();
        }
      }

      setDraft("");
      setPendingFile(null);
    } catch (err) {
      setSendError(formatError(err));
    } finally {
      setSending(false);
    }
  }

  const othersTyping = [...typingUsers].filter((id) => id !== currentUserId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold">Channel chat</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs text-accent hover:underline"
        >
          Refresh messages
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && (
          <p className="text-sm text-text-muted">Loading messages…</p>
        )}
        {error && (
          <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {formatError(error)}
          </p>
        )}
        {!loading && visibleMessages.length === 0 && (
          <p className="text-sm text-text-muted">No messages yet. Say hello!</p>
        )}

        <ul className="space-y-3">
          {visibleMessages.map((message) => (
            <li
              key={message.id}
              className={`rounded-lg border border-border px-3 py-2 ${
                message.sender_id === currentUserId
                  ? "ml-8 bg-accent/10"
                  : "mr-8 bg-surface"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 text-xs text-text-muted">
                <span className="font-medium text-text">
                  {message.username || `User ${message.sender_id}`}
                </span>
                <time dateTime={message.created_at}>
                  {new Date(message.created_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>
              {attachmentsByMessage[message.id]?.length ? (
                <ul className="mt-2 space-y-1">
                  {attachmentsByMessage[message.id].map((att) => (
                    <li key={att.id}>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        {att.file_name} ({Math.round(att.size_bytes / 1024)} KB)
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <div ref={messagesEndRef} />
      </div>

      {othersTyping.length > 0 && (
        <p className="px-4 text-xs text-text-muted" aria-live="polite">
          {othersTyping.map((id) => `User ${id}`).join(", ")}{" "}
          {othersTyping.length === 1 ? "is" : "are"} typing…
        </p>
      )}

      <form
        onSubmit={(e) => void handleSend(e)}
        className="border-t border-border bg-surface p-4"
      >
        {sendError && (
          <p className="mb-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
            {sendError}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="Type a message…"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <label className="flex cursor-pointer items-center justify-center rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-muted">
            {pendingFile ? pendingFile.name : "Attach file"}
            <input
              type="file"
              className="sr-only"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="submit"
            disabled={sending || (!draft.trim() && !pendingFile)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>

      <section className="max-h-40 overflow-y-auto border-t border-border bg-surface-muted p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Live events
        </h3>
        {feed.length === 0 ? (
          <p className="text-xs text-text-muted">Waiting for channel events…</p>
        ) : (
          <ul className="space-y-1">
            {feed.map((entry) => (
              <li key={entry.id} className="text-xs text-text-muted">
                <span className="font-mono text-text">{entry.eventType}</span> — {entry.summary}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
