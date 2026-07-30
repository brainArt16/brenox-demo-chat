import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Channel, ConnectionState, MessageListItem } from "@brenox/sdk";
import { useBrenoxClient } from "@brenox/react";
import { ChannelSessionProvider, useChannelSession } from "../context/channel-session";
import { asArray } from "../utils/asArray";
import { formatError } from "../utils/errors";
import { CallPanel } from "./CallPanel";
import { Messaging } from "./messaging";
import {
  channelToConversation,
  formatMessageTime,
  messageToUi,
  profileToUiUser,
  toUiUser,
} from "./messaging/map";
import type { Conversation, Message, User } from "./messaging/types";

interface BrenoxMultiChatProps {
  workspaceId: number;
  initialChannelId: number;
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

function ActiveChannelChat({
  workspaceId,
  channelId,
  channels,
  currentUserId,
  currentUsername,
  onSelectChannel,
  onConnectionStateChange,
}: {
  workspaceId: number;
  channelId: number;
  channels: Channel[];
  currentUserId: number;
  currentUsername: string;
  onSelectChannel: (channelId: number) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}) {
  const client = useBrenoxClient();
  const { connection, connectionState } = useChannelSession();
  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<Set<number>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [lastByChannel, setLastByChannel] = useState<
    Record<number, { content: string; created_at: string }>
  >({});
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  const refresh = useCallback(async () => {
    const items = asArray(
      await client.messages.list(workspaceId, channelId, { limit: 50 }),
    );
    setMessages(items);
    const last = items[items.length - 1];
    if (last) {
      setLastByChannel((prev) => ({
        ...prev,
        [channelId]: { content: last.content, created_at: last.created_at },
      }));
    }
  }, [client, workspaceId, channelId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    refresh()
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(formatError(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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
      setLastByChannel((prev) => ({
        ...prev,
        [channelId]: {
          content: event.payload.content,
          created_at: event.payload.created_at,
        },
      }));
    });

    const offUpdated = connection.on("message.updated", (event) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.payload.id
            ? { ...m, content: event.payload.content }
            : m,
        ),
      );
    });

    const offTypingStart = connection.on("typing.start", (event) => {
      const userId = event.payload.user_id;
      setTypingUserIds((prev) => new Set(prev).add(userId));
    });

    const offTypingStop = connection.on("typing.stop", (event) => {
      const userId = event.payload.user_id;
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    const offOnline = connection.on("presence.online", (event) => {
      const userId = event.payload.user_id;
      if (userId === currentUserId) return;
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.id === String(userId))) return prev;
        return [...prev, toUiUser(userId, `User ${userId}`, true)];
      });
    });

    const offOffline = connection.on("presence.offline", (event) => {
      const userId = event.payload.user_id;
      setOnlineUsers((prev) => prev.filter((u) => u.id !== String(userId)));
    });

    return () => {
      offNew();
      offUpdated();
      offTypingStart();
      offTypingStop();
      offOnline();
      offOffline();
    };
  }, [connection, channelId, currentUserId]);

  const othersTyping = useMemo(
    () => [...typingUserIds].filter((id) => id !== currentUserId),
    [typingUserIds, currentUserId],
  );

  const conversations: Conversation[] = useMemo(
    () =>
      channels.map((channel) => {
        const last = lastByChannel[channel.ID];
        return channelToConversation(channel, {
          lastMessage: last?.content,
          timestamp: last ? formatMessageTime(last.created_at) : "",
          isTyping: channel.ID === channelId && othersTyping.length > 0,
        });
      }),
    [channels, lastByChannel, channelId, othersTyping.length],
  );

  const uiMessages: Message[] = useMemo(
    () => messages.map((m) => messageToUi(m, currentUserId)),
    [messages, currentUserId],
  );

  const currentUser = useMemo(
    () => profileToUiUser({
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
    <div className="flex min-h-0 flex-1 flex-col">
      <CallPanel currentUserId={currentUserId} />
      {error && (
        <p
          className="border-b border-danger/20 bg-danger/10 px-4 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {loading && messages.length === 0 && (
        <p className="border-b border-border px-4 py-2 text-sm text-text-muted">
          Loading messages…
        </p>
      )}
      <div className="min-h-0 flex-1">
        <Messaging
          conversations={conversations}
          messages={uiMessages}
          onlineUsers={onlineUsers}
          currentUser={currentUser}
          selectedConversationId={String(channelId)}
          onConversationSelect={(id) => onSelectChannel(Number(id))}
          onMessageSend={(text) => void handleSend(text)}
          onInputChange={handleDraftChange}
          headerTitle="Channels"
          onlineLabel="In this channel"
          showPinnedSection={false}
          showReadReceipts={false}
          enableAudio={false}
          enableEmojis={false}
          enableAttachments={false}
          enableVoiceCall={false}
          enableVideoCall={false}
          placeholderText="Type a message…"
          colors={{
            messageOwn: "bg-emerald-500 text-white",
            messageOther: "bg-gray-100 text-gray-900",
          }}
        />
      </div>
    </div>
  );
}

export function BrenoxMultiChat({
  workspaceId,
  initialChannelId,
  currentUserId,
  currentUsername,
  onConnectionStateChange,
}: BrenoxMultiChatProps) {
  const client = useBrenoxClient();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState(initialChannelId);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    setChannelId(initialChannelId);
  }, [initialChannelId]);

  useEffect(() => {
    let cancelled = false;
    client.channels
      .list(workspaceId)
      .then((items) => {
        if (cancelled) return;
        const list = asArray(items);
        setChannels(list);
        setChannelId((current) => {
          if (list.some((c) => c.ID === current)) return current;
          return list[0]?.ID ?? current;
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setListError(formatError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client, workspaceId]);

  if (listError) {
    return (
      <p className="p-4 text-sm text-danger" role="alert">
        {listError}
      </p>
    );
  }

  return (
    <ChannelSessionProvider workspaceId={workspaceId} channelId={channelId}>
      <ActiveChannelChat
        workspaceId={workspaceId}
        channelId={channelId}
        channels={channels}
        currentUserId={currentUserId}
        currentUsername={currentUsername}
        onSelectChannel={setChannelId}
        onConnectionStateChange={onConnectionStateChange}
      />
    </ChannelSessionProvider>
  );
}
