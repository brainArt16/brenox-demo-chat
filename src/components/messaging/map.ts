import type { Attachment, Channel, MessageListItem, UserProfile } from "@brenox/sdk";
import type { Conversation, Message, MessageAttachment, User } from "./types";

export function initialsFromName(name: string): string {
  const cleaned = name.replace(/^#/, "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
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
    initials: initialsFromName(display),
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
  const label = `#${name}`;
  return {
    id: String(channel.ID),
    name: label,
    initials: initialsFromName(name),
    lastMessage: opts?.lastMessage ?? "No messages yet",
    timestamp: opts?.timestamp ?? "",
    isTyping: opts?.isTyping,
    participants: opts?.participants,
  };
}

export function toUiAttachments(
  items: Attachment[] | undefined,
): MessageAttachment[] | undefined {
  if (!items?.length) return undefined;
  return items.map((att) => ({
    id: String(att.id),
    fileName: att.file_name,
    mimeType: att.mime_type,
    sizeBytes: att.size_bytes,
    url: att.url,
  }));
}

export function messageToUi(
  message: MessageListItem,
  currentUserId: number,
  attachments?: Attachment[],
): Message {
  const name = message.username || `User ${message.sender_id}`;
  return {
    id: String(message.id),
    sender: toUiUser(message.sender_id, name),
    text: message.content,
    timestamp: formatMessageTime(message.created_at),
    isOwn: message.sender_id === currentUserId,
    attachments: toUiAttachments(attachments),
  };
}
