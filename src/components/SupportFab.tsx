import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import type { Attachment, ConnectionState, MessageListItem } from "@brenox/sdk";
import { useBrenoxClient } from "@brenox/react";
import { ChannelSessionProvider, useChannelSession } from "../context/channel-session";
import { asArray } from "../utils/asArray";
import { formatError } from "../utils/errors";
import { ChatArea } from "./messaging";
import {
  channelToConversation,
  messageToUi,
  profileToUiUser,
} from "./messaging/map";
import type { Conversation, Message } from "./messaging/types";

interface SupportFabProps {
  workspaceId: number;
  channelId: number;
  channelName: string;
  currentUserId: number;
  currentUsername: string;
  onConnectionStateChange?: (state: ConnectionState) => void;
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

function SupportChatPanel({
  workspaceId,
  channelId,
  channelName,
  currentUserId,
  currentUsername,
  onClose,
  onConnectionStateChange,
}: SupportFabProps & { onClose: () => void }) {
  const client = useBrenoxClient();
  const { connection, connectionState } = useChannelSession();
  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [attachmentsByMessage, setAttachmentsByMessage] = useState<
    Record<number, Attachment[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const loadedAttachmentIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  const refresh = useCallback(async () => {
    const items = asArray(
      await client.messages.list(workspaceId, channelId, { limit: 50 }),
    );
    setMessages(items);
  }, [client, workspaceId, channelId]);

  useEffect(() => {
    let cancelled = false;
    refresh().catch((err: unknown) => {
      if (!cancelled) setError(formatError(err));
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!connection) return;

    const offNew = connection.on("message.new", (event) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === event.payload.id)) return prev;
        return [...prev, toListItem(event.payload, channelId)];
      });
    });

    const offUpdated = connection.on("message.updated", (event) => {
      const payloadAttachments = event.payload.attachments;
      if (payloadAttachments?.length) {
        loadedAttachmentIdsRef.current.add(event.payload.id);
        setAttachmentsByMessage((prev) => ({
          ...prev,
          [event.payload.id]: payloadAttachments.map((att) => ({
            id: att.id,
            message_id: event.payload.id,
            file_name: att.file_name,
            mime_type: att.mime_type,
            size_bytes: att.size_bytes,
            url: att.url,
            created_at: att.created_at,
          })),
        }));
      }
    });

    const offTypingStart = connection.on("typing.start", (event) => {
      if (event.payload.user_id !== currentUserId) setIsTyping(true);
    });
    const offTypingStop = connection.on("typing.stop", (event) => {
      if (event.payload.user_id !== currentUserId) setIsTyping(false);
    });

    return () => {
      offNew();
      offUpdated();
      offTypingStart();
      offTypingStop();
    };
  }, [connection, channelId, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    const toFetch = messages.filter(
      (message) => !loadedAttachmentIdsRef.current.has(message.id),
    );
    if (toFetch.length === 0) return;

    async function loadAttachments() {
      const map: Record<number, Attachment[]> = {};
      await Promise.all(
        toFetch.map(async (message) => {
          loadedAttachmentIdsRef.current.add(message.id);
          try {
            const items = await client.attachments.listByMessage(
              workspaceId,
              channelId,
              message.id,
            );
            if (items.length > 0) map[message.id] = items;
          } catch {
            // optional
          }
        }),
      );
      if (!cancelled && Object.keys(map).length > 0) {
        setAttachmentsByMessage((prev) => ({ ...prev, ...map }));
      }
    }

    void loadAttachments();
    return () => {
      cancelled = true;
    };
  }, [messages, client, workspaceId, channelId]);

  const conversation: Conversation = useMemo(
    () => ({
      ...channelToConversation({
        ID: channelId,
        Name: channelName.replace(/^#/, "") || "support",
        OwnerID: 0,
        WorkspaceID: workspaceId,
        IsReadOnly: false,
      }),
      name: "Support",
      isTyping,
    }),
    [channelId, channelName, workspaceId, isTyping],
  );

  const uiMessages: Message[] = useMemo(
    () =>
      messages.map((m) =>
        messageToUi(m, currentUserId, attachmentsByMessage[m.id]),
      ),
    [messages, currentUserId, attachmentsByMessage],
  );

  const currentUser = useMemo(
    () =>
      profileToUiUser({
        id: currentUserId,
        email: "",
        username: currentUsername,
        created_at: "",
      }),
    [currentUserId, currentUsername],
  );

  function handleDraftChange(value: string) {
    if (connectionState !== "connected" || !connection) return;
    if (!value.trim()) {
      connection.stopTyping();
      return;
    }
    connection.startTyping();
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      if (connection.connectionState === "connected") {
        connection.stopTyping();
      }
    }, 1500);
  }

  async function handleSend(text: string, file?: File | null) {
    if (connectionState === "connected") {
      connection?.stopTyping();
    }

    try {
      if (file) {
        const uploaded = await client.attachments.uploadFile(file, {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        const content = text || `(attachment: ${uploaded.file_name})`;
        const message = await client.messages.send(workspaceId, channelId, {
          content,
        });
        const attached = await client.attachments.attachToMessage(
          workspaceId,
          channelId,
          message.id,
          [uploaded],
        );
        loadedAttachmentIdsRef.current.add(message.id);
        setAttachmentsByMessage((prev) => ({
          ...prev,
          [message.id]: attached,
        }));
        await refresh();
        return;
      }

      if (!text) return;

      if (connectionState === "connected" && connection) {
        connection.sendMessage(text);
        return;
      }
      await client.messages.send(workspaceId, channelId, { content: text });
      await refresh();
    } catch (err) {
      setError(formatError(err));
    }
  }

  return (
    <div className="flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-text">Support</p>
          <p className="text-xs text-text-muted">
            {connectionState === "connected" ? "Online" : connectionState}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-text-muted hover:bg-border hover:text-text"
          aria-label="Close support chat"
        >
          <X size={18} />
        </button>
      </div>
      {error && (
        <p className="bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <ChatArea
          currentConversation={conversation}
          messages={uiMessages}
          currentUser={currentUser}
          onMessageSend={(text, file) => void handleSend(text, file)}
          onInputChange={handleDraftChange}
          compactMode
          showReadReceipts={false}
          enableAudio={false}
          enableEmojis={false}
          enableAttachments
          enableVoiceCall={false}
          enableVideoCall={false}
          placeholderText="How can we help?"
          colors={{
            messageOwn: "bg-accent text-surface",
            messageOther: "bg-surface-muted text-text border border-border",
          }}
        />
      </div>
    </div>
  );
}

export function SupportFab(props: SupportFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <ChannelSessionProvider
      workspaceId={props.workspaceId}
      channelId={props.channelId}
    >
      <div className="pointer-events-none fixed inset-0 z-40">
        <div className="pointer-events-auto absolute bottom-6 right-6 flex flex-col items-end gap-3">
          {open && (
            <SupportChatPanel {...props} onClose={() => setOpen(false)} />
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-surface shadow-lg shadow-black/40 transition hover:bg-accent-hover"
            aria-label={open ? "Close support chat" : "Open support chat"}
            aria-expanded={open}
          >
            {open ? <X size={24} /> : <MessageCircle size={24} />}
          </button>
        </div>
      </div>
    </ChannelSessionProvider>
  );
}
