export interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  sender: User;
  text?: string;
  timestamp: string;
  isOwn: boolean;
  hasAudio?: boolean;
  audioLength?: string;
  isTyping?: boolean;
  readStatus?: "sent" | "delivered" | "read";
}

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
  isTyping?: boolean;
  participants?: User[];
}

export interface MessagingColors {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  border?: string;
  messageOwn?: string;
  messageOther?: string;
}

export interface MessagingProps {
  conversations?: Conversation[];
  messages?: Message[];
  onlineUsers?: User[];
  currentUser?: User;
  selectedConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
  onMessageSend?: (message: string) => void;
  onInputChange?: (value: string) => void;
  onOnlineUserClick?: (userId: string) => void;
  onVoiceCallInitiated?: (recipientId: string) => void;
  onVideoCallInitiated?: (recipientId: string) => void;
  colors?: MessagingColors;
  showSidebar?: boolean;
  showOnlineSection?: boolean;
  showPinnedSection?: boolean;
  sidebarWidth?: string;
  maxMessageWidth?: "xs" | "sm" | "md" | "lg";
  enableAudio?: boolean;
  enableEmojis?: boolean;
  enableAttachments?: boolean;
  enableVoiceCall?: boolean;
  enableVideoCall?: boolean;
  placeholderText?: string;
  headerTitle?: string;
  onlineLabel?: string;
  showReadReceipts?: boolean;
  showAvatars?: boolean;
  showTimestamps?: boolean;
  showTypingIndicator?: boolean;
  compactMode?: boolean;
  className?: string;
}

export interface SidebarProps {
  conversations: Conversation[];
  onlineUsers: User[];
  selectedConversationId: string;
  onConversationSelect: (conversationId: string) => void;
  onOnlineUserClick?: (userId: string) => void;
  colors?: MessagingColors;
  showOnlineSection?: boolean;
  showPinnedSection?: boolean;
  headerTitle?: string;
  onlineLabel?: string;
}

export interface ChatAreaProps {
  currentConversation: Conversation | undefined;
  messages: Message[];
  currentUser?: User;
  onMessageSend: (message: string) => void;
  onInputChange?: (value: string) => void;
  onBack?: () => void;
  onVoiceCallInitiated?: (recipientId: string) => void;
  onVideoCallInitiated?: (recipientId: string) => void;
  colors?: MessagingColors;
  enableAudio?: boolean;
  enableEmojis?: boolean;
  enableAttachments?: boolean;
  enableVoiceCall?: boolean;
  enableVideoCall?: boolean;
  placeholderText?: string;
  maxMessageWidth?: "xs" | "sm" | "md" | "lg";
  showReadReceipts?: boolean;
  showAvatars?: boolean;
  showTimestamps?: boolean;
  showTypingIndicator?: boolean;
  compactMode?: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  colors?: MessagingColors;
  maxWidth?: "xs" | "sm" | "md" | "lg";
  showReadReceipts?: boolean;
  showAvatars?: boolean;
  showTimestamps?: boolean;
  compactMode?: boolean;
}
