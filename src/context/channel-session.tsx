import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Call, CallMode, CallSignaling, ChannelConnection, ConnectionState } from "@brenox/sdk";
import { useCallSignaling } from "@brenox/react";

export interface ChannelSessionValue {
  connection: ChannelConnection | null;
  signaling: CallSignaling | null;
  connectionState: ConnectionState;
  initiate: (mode?: CallMode) => Promise<Call>;
  join: (callId: number) => Promise<Call>;
  leave: (callId: number) => Promise<Call>;
}

const ChannelSessionContext = createContext<ChannelSessionValue | null>(null);

export function ChannelSessionProvider({
  workspaceId,
  channelId,
  children,
}: {
  workspaceId: number;
  channelId: number;
  children: ReactNode;
}) {
  const { signaling, connectionState, initiate, join, leave } = useCallSignaling(
    workspaceId,
    channelId,
    { autoConnect: true },
  );

  const value = useMemo<ChannelSessionValue>(
    () => ({
      connection: signaling?.channel ?? null,
      signaling,
      connectionState,
      initiate,
      join,
      leave,
    }),
    [signaling, connectionState, initiate, join, leave],
  );

  return (
    <ChannelSessionContext.Provider value={value}>
      {children}
    </ChannelSessionContext.Provider>
  );
}

export function useChannelSession(): ChannelSessionValue {
  const value = useContext(ChannelSessionContext);
  if (!value) {
    throw new Error("useChannelSession must be used within ChannelSessionProvider");
  }
  return value;
}
