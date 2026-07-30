import { useState, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
  Smile,
  Video,
} from "lucide-react";
import { MessageBubble } from "./message-bubble";
import type { ChatAreaProps } from "./types";

export function ChatArea({
  currentConversation,
  messages,
  onMessageSend,
  onInputChange,
  onBack,
  onVoiceCallInitiated,
  onVideoCallInitiated,
  colors = {},
  enableAudio = false,
  enableEmojis = false,
  enableAttachments = false,
  enableVoiceCall = false,
  enableVideoCall = false,
  placeholderText = "Type a message…",
  maxMessageWidth = "sm",
  showReadReceipts = false,
  showAvatars = true,
  showTimestamps = true,
  showTypingIndicator = true,
  compactMode = false,
}: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState("");

  function handleSendMessage() {
    const text = messageInput.trim();
    if (!text) return;
    onMessageSend(text);
    setMessageInput("");
    onInputChange?.("");
  }

  function handleDraftChange(value: string) {
    setMessageInput(value);
    onInputChange?.(value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  if (!currentConversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <div
        className={`flex items-center justify-between gap-2 border-b border-gray-200 px-3 sm:px-6 lg:px-8 ${
          compactMode ? "py-2" : "py-3 sm:py-4"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 flex-shrink-0 rounded-full p-2 transition hover:bg-gray-100 md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={22} className="text-gray-700" />
            </button>
          )}
          <div className="relative flex-shrink-0">
            <img
              src={currentConversation.avatar}
              alt={currentConversation.name}
              className={`rounded-full ${compactMode ? "h-8 w-8" : "h-10 w-10 sm:h-12 sm:w-12"}`}
            />
            {currentConversation.participants?.some((p) => p.isOnline) && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div className="min-w-0">
            <h2
              className={`truncate font-semibold text-gray-900 ${compactMode ? "text-sm" : "text-base"}`}
            >
              {currentConversation.name}
            </h2>
            {currentConversation.isTyping && showTypingIndicator && (
              <p
                className={`truncate text-emerald-600 ${compactMode ? "text-xs" : "text-sm"}`}
              >
                Someone is typing…
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          {currentConversation.participants &&
            currentConversation.participants.length > 0 && (
              <div className="-space-x-2 mr-1 hidden lg:flex">
                {currentConversation.participants.slice(0, 3).map((p) => (
                  <img
                    key={p.id}
                    src={p.avatar}
                    alt={p.name}
                    className="h-8 w-8 rounded-full border-2 border-white"
                    title={p.name}
                  />
                ))}
                {currentConversation.participants.length > 3 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-xs font-bold text-emerald-700">
                    +{currentConversation.participants.length - 3}
                  </div>
                )}
              </div>
            )}

          {enableVoiceCall && (
            <button
              type="button"
              onClick={() =>
                onVoiceCallInitiated?.(currentConversation.id)
              }
              className="rounded-full p-2 transition hover:bg-gray-100"
              aria-label="Voice call"
              title="Start voice call"
            >
              <Phone size={20} className="text-gray-600 hover:text-emerald-600" />
            </button>
          )}
          {enableVideoCall && (
            <button
              type="button"
              onClick={() =>
                onVideoCallInitiated?.(currentConversation.id)
              }
              className="rounded-full p-2 transition hover:bg-gray-100"
              aria-label="Video call"
              title="Start video call"
            >
              <Video size={20} className="text-gray-600 hover:text-emerald-600" />
            </button>
          )}
          <button
            type="button"
            className="hidden rounded-full p-2 transition hover:bg-gray-100 sm:inline-flex"
            aria-label="More options"
          >
            <MoreVertical size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div
        className={`flex-1 space-y-4 overflow-y-auto px-3 sm:space-y-6 sm:px-6 lg:px-8 ${
          compactMode ? "space-y-3 py-4" : "py-4 sm:py-6"
        }`}
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-400">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((message) =>
          message.isTyping && showTypingIndicator ? (
            <div key={message.id} className="flex gap-2">
              <span className="text-xs text-gray-500">
                {message.sender.name} is typing
              </span>
              <div className="flex gap-1">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:100ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:200ms]" />
              </div>
            </div>
          ) : (
            <MessageBubble
              key={message.id}
              message={message}
              colors={colors}
              maxWidth={maxMessageWidth}
              showReadReceipts={showReadReceipts}
              showAvatars={showAvatars}
              showTimestamps={showTimestamps}
              compactMode={compactMode}
            />
          ),
        )}
      </div>

      <div
        className={`border-t border-gray-200 px-3 sm:px-6 lg:px-8 ${
          compactMode ? "py-2" : "py-3 sm:py-4"
        }`}
      >
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          {enableAttachments && (
            <button
              type="button"
              className="flex-shrink-0 rounded-full p-1 transition hover:bg-gray-200"
              aria-label="Attach file"
            >
              <Paperclip size={20} className="text-gray-600" />
            </button>
          )}

          <input
            type="text"
            value={messageInput}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />

          {enableEmojis && (
            <button
              type="button"
              className="hidden flex-shrink-0 rounded-full p-1 transition hover:bg-gray-200 sm:inline-flex"
              aria-label="Add emoji"
            >
              <Smile size={20} className="text-gray-600" />
            </button>
          )}

          {enableAudio && (
            <span className="sr-only">Audio messages unavailable</span>
          )}

          <button
            type="button"
            onClick={handleSendMessage}
            className="flex-shrink-0 rounded-full p-1 transition hover:bg-gray-200"
            aria-label="Send message"
          >
            <Send size={20} className="text-emerald-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
