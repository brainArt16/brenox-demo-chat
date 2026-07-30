import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import type { ConnectionState, MessageListItem } from "@brenox/sdk";
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
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

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

    const offTypingStart = connection.on("typing.start", (event) => {
      if (event.payload.user_id !== currentUserId) setIsTyping(true);
    });
    const offTypingStop = connection.on("typing.stop", (event) => {
      if (event.payload.user_id !== currentUserId) setIsTyping(false);
    });

    return () => {
      offNew();
      offTypingStart();
      offTypingStop();
    };
  }, [connection, channelId, currentUserId]);

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
    () => messages.map((m) => messageToUi(m, currentUserId)),
    [messages, currentUserId],
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

  async function handleSend(text: string) {
    if (connectionState === "connected" && connection) {
      connection.stopTyping();
      connection.sendMessage(text);
      return;
    }
    await client.messages.send(workspaceId, channelId, { content: text });
    await refresh();
  }

  return (
    <div className="flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 bg-emerald-600 px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Support</p>
          <p className="text-xs text-emerald-100">
            {connectionState === "connected" ? "Online" : connectionState}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 hover:bg-emerald-500"
          aria-label="Close support chat"
        >
          <X size={18} />
        </button>
      </div>
      {error && (
        <p className="bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <ChatArea
          currentConversation={conversation}
          messages={uiMessages}
          currentUser={currentUser}
          onMessageSend={(text) => void handleSend(text)}
          onInputChange={handleDraftChange}
          compactMode
          showReadReceipts={false}
          enableAudio={false}
          enableEmojis={false}
          enableAttachments={false}
          enableVoiceCall={false}
          enableVideoCall={false}
          placeholderText="How can we help?"
          colors={{
            messageOwn: "bg-emerald-500 text-white",
            messageOther: "bg-gray-100 text-gray-900",
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
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700"
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
