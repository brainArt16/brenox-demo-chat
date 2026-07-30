import { useMemo, useState } from "react";
import { ChatArea } from "./chat-area";
import { Sidebar } from "./sidebar";
import type { MessagingProps } from "./types";

export type {
  Conversation,
  Message,
  MessagingColors,
  MessagingProps,
  User,
} from "./types";
export { ChatArea } from "./chat-area";
export { MessageBubble } from "./message-bubble";
export { Sidebar } from "./sidebar";

export function Messaging({
  conversations = [],
  messages = [],
  onlineUsers = [],
  currentUser,
  selectedConversationId = "",
  onConversationSelect = () => {},
  onMessageSend = () => {},
  onInputChange,
  onOnlineUserClick = () => {},
  onVoiceCallInitiated = () => {},
  onVideoCallInitiated = () => {},
  colors = {},
  showSidebar = true,
  showOnlineSection = true,
  showPinnedSection = false,
  maxMessageWidth = "sm",
  enableAudio = false,
  enableEmojis = false,
  enableAttachments = false,
  enableVoiceCall = false,
  enableVideoCall = false,
  placeholderText = "Type a message…",
  headerTitle = "Messages",
  onlineLabel = "Online Now",
  showReadReceipts = false,
  showAvatars = true,
  showTimestamps = true,
  showTypingIndicator = true,
  compactMode = false,
  className = "",
}: MessagingProps) {
  const [internalSelected, setInternalSelected] = useState(
    selectedConversationId,
  );
  const [showChatOnMobile, setShowChatOnMobile] = useState(
    Boolean(selectedConversationId) && !showSidebar,
  );

  const selectedId = selectedConversationId || internalSelected;

  function handleConversationSelect(id: string) {
    setInternalSelected(id);
    setShowChatOnMobile(true);
    onConversationSelect(id);
  }

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  return (
    <div
      className={`flex overflow-hidden bg-gray-50 ${
        compactMode ? "h-full" : "h-full min-h-0"
      } ${className}`}
    >
      {showSidebar && (
        <div
          className={`${
            showChatOnMobile ? "hidden" : "flex"
          } h-full w-full flex-shrink-0 md:flex md:w-auto`}
        >
          <Sidebar
            conversations={conversations}
            onlineUsers={onlineUsers}
            selectedConversationId={selectedId}
            onConversationSelect={handleConversationSelect}
            onOnlineUserClick={onOnlineUserClick}
            colors={colors}
            showOnlineSection={showOnlineSection}
            showPinnedSection={showPinnedSection}
            headerTitle={headerTitle}
            onlineLabel={onlineLabel}
          />
        </div>
      )}

      <div
        className={`${
          showSidebar
            ? showChatOnMobile
              ? "flex"
              : "hidden md:flex"
            : "flex"
        } h-full min-w-0 flex-1`}
      >
        <ChatArea
          currentConversation={currentConversation}
          messages={messages}
          currentUser={currentUser}
          onMessageSend={onMessageSend}
          onInputChange={onInputChange}
          onBack={showSidebar ? () => setShowChatOnMobile(false) : undefined}
          onVoiceCallInitiated={onVoiceCallInitiated}
          onVideoCallInitiated={onVideoCallInitiated}
          colors={colors}
          enableAudio={enableAudio}
          enableEmojis={enableEmojis}
          enableAttachments={enableAttachments}
          enableVoiceCall={enableVoiceCall}
          enableVideoCall={enableVideoCall}
          placeholderText={placeholderText}
          maxMessageWidth={maxMessageWidth}
          showReadReceipts={showReadReceipts}
          showAvatars={showAvatars}
          showTimestamps={showTimestamps}
          showTypingIndicator={showTypingIndicator}
          compactMode={compactMode}
        />
      </div>
    </div>
  );
}

export default Messaging;
