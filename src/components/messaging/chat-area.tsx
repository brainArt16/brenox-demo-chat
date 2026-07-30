import { useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
  Smile,
  Video,
  X,
} from "lucide-react";
import { InitialsAvatar } from "./InitialsAvatar";
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSendMessage() {
    const text = messageInput.trim();
    if (!text && !pendingFile) return;
    onMessageSend(text, pendingFile);
    setMessageInput("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      <div className="flex flex-1 items-center justify-center bg-surface-muted">
        <p className="text-text-muted">Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <div
        className={`flex items-center justify-between gap-2 border-b border-border px-3 sm:px-6 lg:px-8 ${
          compactMode ? "py-2" : "py-3 sm:py-4"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 flex-shrink-0 rounded-full p-2 transition hover:bg-surface-muted md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={22} className="text-text" />
            </button>
          )}
          <div className="relative flex-shrink-0">
            <InitialsAvatar
              name={currentConversation.name}
              size={compactMode ? "md" : "lg"}
            />
            {currentConversation.participants?.some((p) => p.isOnline) && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success" />
            )}
          </div>
          <div className="min-w-0">
            <h2
              className={`truncate font-semibold text-text ${compactMode ? "text-sm" : "text-base"}`}
            >
              {currentConversation.name}
            </h2>
            {currentConversation.isTyping && showTypingIndicator && (
              <p
                className={`truncate text-accent ${compactMode ? "text-xs" : "text-sm"}`}
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
                  <InitialsAvatar
                    key={p.id}
                    name={p.name}
                    size="md"
                    className="ring-2 ring-surface"
                    title={p.name}
                  />
                ))}
                {currentConversation.participants.length > 3 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-accent ring-2 ring-surface">
                    +{currentConversation.participants.length - 3}
                  </div>
                )}
              </div>
            )}

          {enableVoiceCall && (
            <button
              type="button"
              onClick={() => onVoiceCallInitiated?.(currentConversation.id)}
              className="rounded-full p-2 transition hover:bg-surface-muted"
              aria-label="Voice call"
              title="Start voice call"
            >
              <Phone size={20} className="text-text-muted hover:text-accent" />
            </button>
          )}
          {enableVideoCall && (
            <button
              type="button"
              onClick={() => onVideoCallInitiated?.(currentConversation.id)}
              className="rounded-full p-2 transition hover:bg-surface-muted"
              aria-label="Video call"
              title="Start video call"
            >
              <Video size={20} className="text-text-muted hover:text-accent" />
            </button>
          )}
          <button
            type="button"
            className="hidden rounded-full p-2 transition hover:bg-surface-muted sm:inline-flex"
            aria-label="More options"
          >
            <MoreVertical size={20} className="text-text-muted" />
          </button>
        </div>
      </div>

      <div
        className={`flex-1 space-y-4 overflow-y-auto bg-surface-muted/40 px-3 sm:space-y-6 sm:px-6 lg:px-8 ${
          compactMode ? "space-y-3 py-4" : "py-4 sm:py-6"
        }`}
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-text-muted">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((message) =>
          message.isTyping && showTypingIndicator ? (
            <div key={message.id} className="flex gap-2">
              <span className="text-xs text-text-muted">
                {message.sender.name} is typing
              </span>
              <div className="flex gap-1">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:100ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:200ms]" />
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
        className={`border-t border-border px-3 sm:px-6 lg:px-8 ${
          compactMode ? "py-2" : "py-3 sm:py-4"
        }`}
      >
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-text">
            <Paperclip size={14} className="text-accent" />
            <span className="min-w-0 flex-1 truncate">{pendingFile.name}</span>
            <button
              type="button"
              onClick={() => {
                setPendingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="rounded p-0.5 text-text-muted hover:text-text"
              aria-label="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          {enableAttachments && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 rounded-full p-1 transition hover:bg-border"
                aria-label="Attach file"
                title="Attach file"
              >
                <Paperclip size={20} className="text-text-muted" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              />
            </>
          )}

          <input
            type="text"
            value={messageInput}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          />

          {enableEmojis && (
            <button
              type="button"
              className="hidden flex-shrink-0 rounded-full p-1 transition hover:bg-border sm:inline-flex"
              aria-label="Add emoji"
            >
              <Smile size={20} className="text-text-muted" />
            </button>
          )}

          {enableAudio && (
            <span className="sr-only">Audio messages unavailable</span>
          )}

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() && !pendingFile}
            className="flex-shrink-0 rounded-full p-1 transition hover:bg-border disabled:opacity-40"
            aria-label="Send message"
          >
            <Send size={20} className="text-accent" />
          </button>
        </div>
      </div>
    </div>
  );
}
