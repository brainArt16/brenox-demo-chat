interface EmbedRoomBarProps {
  channelName: string;
  workspaceId: number;
  channelId: number;
  personaLabel: string;
}

export function EmbedRoomBar({
  channelName,
  workspaceId,
  channelId,
  personaLabel,
}: EmbedRoomBarProps) {
  return (
    <aside className="flex w-full flex-col gap-2 border-r border-border bg-surface p-4 lg:w-72">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Embedded room
      </h2>
      <div className="rounded-md border border-border bg-surface-muted p-3 text-sm">
        <p className="font-medium text-text">#{channelName}</p>
        <p className="mt-1 text-xs text-text-muted">
          Signed in as <span className="text-text">{personaLabel}</span>
        </p>
        <p className="mt-2 font-mono text-[11px] text-text-muted">
          ws {workspaceId} · ch {channelId}
        </p>
      </div>
    </aside>
  );
}
