import type { Channel, MessageListItem, UserProfile } from "@brenox/sdk";
import type { Conversation, Message, User } from "./types";

export function avatarFor(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function toUiUser(
  id: number | string,
  name: string,
  isOnline?: boolean,
): User {
  const display = name || `User ${id}`;
  return {
    id: String(id),
    name: display,
    avatar: avatarFor(display),
    isOnline,
  };
}

export function profileToUiUser(profile: UserProfile): User {
  return toUiUser(profile.id, profile.username);
}

export function channelToConversation(
  channel: Channel,
  opts?: {
    lastMessage?: string;
    timestamp?: string;
    isTyping?: boolean;
    participants?: User[];
  },
): Conversation {
  const name = channel.Name || `Channel ${channel.ID}`;
  return {
    id: String(channel.ID),
    name: `#${name}`,
    avatar: avatarFor(name),
    lastMessage: opts?.lastMessage ?? "No messages yet",
    timestamp: opts?.timestamp ?? "",
    isTyping: opts?.isTyping,
    participants: opts?.participants,
  };
}

export function messageToUi(
  message: MessageListItem,
  currentUserId: number,
): Message {
  const name = message.username || `User ${message.sender_id}`;
  return {
    id: String(message.id),
    sender: toUiUser(message.sender_id, name),
    text: message.content,
    timestamp: formatMessageTime(message.created_at),
    isOwn: message.sender_id === currentUserId,
  };
}
