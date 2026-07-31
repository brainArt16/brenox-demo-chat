import { Check, CheckCheck, FileIcon, Paperclip } from "lucide-react";
import type { MouseEvent } from "react";
import { useAttachmentObjectUrl } from "../../lib/attachment-content";
import { InitialsAvatar } from "./InitialsAvatar";
import type { MessageAttachment, MessageBubbleProps } from "./types";

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

function AttachmentItem({
  att,
  isOwn,
}: {
  att: MessageAttachment;
  isOwn: boolean;
}) {
  const { src, error, loading } = useAttachmentObjectUrl(att.url);

  function openAttachment(event: MouseEvent) {
    event.preventDefault();
    if (!src) return;
    window.open(src, "_blank", "noopener,noreferrer");
  }

  if (isImageMime(att.mimeType)) {
    return (
      <button
        type="button"
        onClick={openAttachment}
        disabled={!src}
        className="block w-full overflow-hidden rounded-xl border border-border text-left disabled:opacity-60"
      >
        {loading && !src && (
          <div className="flex h-32 items-center justify-center bg-surface-muted text-xs text-text-muted">
            Loading…
          </div>
        )}
        {error && (
          <div className="flex h-24 items-center justify-center bg-surface-muted px-3 text-xs text-danger">
            {error}
          </div>
        )}
        {src && (
          <img
            src={src}
            alt={att.fileName}
            className="max-h-56 w-full object-cover"
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openAttachment}
      disabled={!src}
      className={`flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm transition hover:border-accent/50 disabled:opacity-60 ${
        isOwn ? "bg-accent/20 text-text" : "bg-surface-muted text-text"
      }`}
    >
      <FileIcon size={16} className="flex-shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate">{att.fileName}</span>
      <span className="flex-shrink-0 text-xs text-text-muted">
        {loading ? "…" : error ? "!" : formatBytes(att.sizeBytes)}
      </span>
      <Paperclip size={14} className="flex-shrink-0 text-text-muted" />
    </button>
  );
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
          <ul className="mt-1.5 w-full space-y-1.5">
            {attachments.map((att) => (
              <li key={att.id}>
                <AttachmentItem att={att} isOwn={message.isOwn} />
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
