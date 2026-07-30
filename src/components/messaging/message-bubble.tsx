import { Check, CheckCheck } from "lucide-react";
import type { MessageBubbleProps } from "./types";

const MAX_WIDTH: Record<NonNullable<MessageBubbleProps["maxWidth"]>, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function MessageBubble({
  message,
  colors = {},
  maxWidth = "sm",
  showReadReceipts = true,
  showAvatars = true,
  showTimestamps = true,
  compactMode = false,
}: MessageBubbleProps) {
  const {
    messageOwn = "bg-emerald-500 text-white",
    messageOther = "bg-gray-100 text-gray-900",
  } = colors;

  return (
    <div
      className={`flex ${message.isOwn ? "justify-end" : "justify-start"} gap-3`}
    >
      {!message.isOwn && showAvatars && (
        <img
          src={message.sender.avatar}
          alt={message.sender.name}
          className={`flex-shrink-0 rounded-full border border-gray-200 ${
            compactMode ? "h-6 w-6" : "h-8 w-8"
          }`}
        />
      )}
      <div
        className={`flex flex-col ${message.isOwn ? "items-end" : "items-start"} ${MAX_WIDTH[maxWidth]}`}
      >
        {!message.isOwn && !compactMode && (
          <p className="mb-1 text-xs font-medium text-gray-500">
            {message.sender.name}
          </p>
        )}

        {message.text && (
          <div
            className={`rounded-2xl px-4 py-2 ${
              message.isOwn ? messageOwn : messageOther
            }`}
          >
            <p className="whitespace-pre-wrap text-sm">{message.text}</p>
          </div>
        )}

        <div className="mt-1 flex items-center gap-1">
          {showTimestamps && (
            <p className="text-xs text-gray-500">{message.timestamp}</p>
          )}
          {showReadReceipts && message.isOwn && (
            <>
              {message.readStatus === "read" && (
                <CheckCheck size={14} className="text-emerald-500" />
              )}
              {message.readStatus === "delivered" && (
                <Check size={14} className="text-gray-400" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
