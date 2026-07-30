import { Check, CheckCheck, FileIcon, Paperclip } from "lucide-react";
import { InitialsAvatar } from "./InitialsAvatar";
import type { MessageBubbleProps } from "./types";

const MAX_WIDTH: Record<NonNullable<MessageBubbleProps["maxWidth"]>, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

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
    messageOwn = "bg-accent text-surface",
    messageOther = "bg-surface-muted text-text",
  } = colors;

  const attachments = message.attachments ?? [];

  return (
    <div
      className={`flex ${message.isOwn ? "justify-end" : "justify-start"} gap-3`}
    >
      {!message.isOwn && showAvatars && (
        <InitialsAvatar
          name={message.sender.name}
          size={compactMode ? "sm" : "md"}
        />
      )}
      <div
        className={`flex flex-col ${message.isOwn ? "items-end" : "items-start"} ${MAX_WIDTH[maxWidth]}`}
      >
        {!message.isOwn && !compactMode && (
          <p className="mb-1 text-xs font-medium text-text-muted">
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

        {attachments.length > 0 && (
          <ul className={`mt-1.5 w-full space-y-1.5 ${message.text ? "" : ""}`}>
            {attachments.map((att) => (
              <li key={att.id}>
                {isImageMime(att.mimeType) ? (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={att.url}
                      alt={att.fileName}
                      className="max-h-56 w-full object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition hover:border-accent/50 ${
                      message.isOwn
                        ? "bg-accent/20 text-text"
                        : "bg-surface-muted text-text"
                    }`}
                  >
                    <FileIcon size={16} className="flex-shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate">{att.fileName}</span>
                    <span className="flex-shrink-0 text-xs text-text-muted">
                      {formatBytes(att.sizeBytes)}
                    </span>
                    <Paperclip size={14} className="flex-shrink-0 text-text-muted" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex items-center gap-1">
          {showTimestamps && (
            <p className="text-xs text-text-muted">{message.timestamp}</p>
          )}
          {showReadReceipts && message.isOwn && (
            <>
              {message.readStatus === "read" && (
                <CheckCheck size={14} className="text-accent" />
              )}
              {message.readStatus === "delivered" && (
                <Check size={14} className="text-text-muted" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
