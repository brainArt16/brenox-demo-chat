import { Search } from "lucide-react";
import { InitialsAvatar } from "./InitialsAvatar";
import type { SidebarProps } from "./types";

export function Sidebar({
  conversations,
  onlineUsers,
  selectedConversationId,
  onConversationSelect,
  onOnlineUserClick,
  showOnlineSection = true,
  showPinnedSection = false,
  headerTitle = "Messages",
  onlineLabel = "Online Now",
}: SidebarProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-surface md:w-80 lg:w-96">
      <div className="border-b border-border p-4 sm:p-6">
        <div className="mb-2 flex items-center justify-between sm:mb-4">
          <h1 className="text-2xl font-bold text-text sm:text-3xl">
            {headerTitle}
          </h1>
          <button
            type="button"
            className="rounded-full p-2 transition hover:bg-surface-muted"
            aria-label="Search"
          >
            <Search size={24} className="text-text-muted" />
          </button>
        </div>
      </div>

      {showOnlineSection && (
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-muted">{onlineLabel}</h3>
          </div>
          {onlineUsers.length === 0 ? (
            <p className="text-xs text-text-muted">No one else online yet</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {onlineUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onOnlineUserClick?.(user.id)}
                  className="group relative flex-shrink-0 cursor-pointer transition hover:opacity-80"
                  aria-label={`${user.name} is online`}
                >
                  <InitialsAvatar name={user.name} size="xl" ring />
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showPinnedSection && (
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h3 className="flex items-center gap-2 text-sm font-medium text-text-muted">
            Pinned Messages
          </h3>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onConversationSelect(conv.id)}
              className={`w-full cursor-pointer border-b border-border/60 px-4 py-3 text-left transition hover:bg-surface-muted ${
                selectedConversationId === conv.id
                  ? "bg-accent/10"
                  : ""
              }`}
              aria-pressed={selectedConversationId === conv.id}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <InitialsAvatar name={conv.name} size="xl" />
                  {conv.participants?.some((p) => p.isOnline) && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate font-medium text-text">
                      {conv.name}
                    </h4>
                    <span className="flex-shrink-0 text-xs text-text-muted">
                      {conv.timestamp}
                    </span>
                  </div>
                  <p className="truncate text-sm text-text-muted">
                    {conv.isTyping ? "Typing…" : conv.lastMessage}
                  </p>
                </div>
                {conv.unread ? (
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                    <span className="text-xs font-bold text-surface">
                      {conv.unread}
                    </span>
                  </div>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
