import { useEffect, useRef } from "react";
import type { CallMode } from "@brenox/sdk";
import { useWebRtcCall } from "../hooks/useWebRtcCall";

interface CallPanelProps {
  currentUserId: number;
}

function VideoTile({
  stream,
  label,
  mirrored = false,
}: {
  stream: MediaStream | null;
  label: string;
  mirrored?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black/80">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={mirrored}
        className={`h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
      />
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {label}
      </span>
    </div>
  );
}

export function CallPanel({ currentUserId }: CallPanelProps) {
  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStreams,
    muted,
    cameraOff,
    busy,
    error,
    inCall,
    startCall,
    acceptIncoming,
    declineIncoming,
    hangUp,
    toggleMute,
    toggleCamera,
    clearError,
  } = useWebRtcCall(currentUserId);

  const remoteEntries = [...remoteStreams.entries()];
  const showVideo =
    inCall &&
    (activeCall?.mode === "video" ||
      localStream?.getVideoTracks().some((track) => track.enabled));

  return (
    <section className="border-b border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Voice &amp; video</h2>
          <p className="text-xs text-text-muted">
            {inCall
              ? `${activeCall?.mode === "video" ? "Video" : "Voice"} call · ${activeCall?.status ?? "active"}`
              : "Start a call — the other user joins from their tab"}
          </p>
        </div>

        {!inCall && !incomingCall && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCall("voice")}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-muted disabled:opacity-60"
            >
              Start voice
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCall("video" satisfies CallMode)}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              Start video
            </button>
          </div>
        )}

        {inCall && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            {activeCall?.mode === "video" && (
              <button
                type="button"
                onClick={toggleCamera}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
              >
                {cameraOff ? "Camera on" : "Camera off"}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void hangUp()}
              className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-60"
            >
              Leave call
            </button>
          </div>
        )}
      </div>

      {incomingCall && !inCall && (
        <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="text-sm text-text">
            Incoming {incomingCall.mode} call from user {incomingCall.fromUserId}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void acceptIncoming()}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              Join call
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={declineIncoming}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-muted disabled:opacity-60"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="mx-4 mb-3 flex items-start justify-between gap-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="shrink-0 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {inCall && showVideo && (
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
          <VideoTile stream={localStream} label="You" mirrored />
          {remoteEntries.length === 0 ? (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted text-sm text-text-muted">
              Waiting for the other participant…
            </div>
          ) : (
            remoteEntries.map(([userId, stream]) => (
              <VideoTile
                key={userId}
                stream={stream}
                label={`User ${userId}`}
              />
            ))
          )}
        </div>
      )}

      {inCall && activeCall?.mode === "voice" && !showVideo && (
        <div className="mx-4 mb-4 space-y-3">
          <div className="rounded-lg border border-border bg-surface-muted px-4 py-6 text-center text-sm text-text-muted">
            Voice call active
            {remoteEntries.length > 0
              ? ` · connected to user ${remoteEntries[0][0]}`
              : " · waiting for peer audio…"}
          </div>
          {remoteEntries.map(([userId, stream]) => (
            <RemoteAudio key={userId} stream={stream} />
          ))}
        </div>
      )}
    </section>
  );
}

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.srcObject = stream;
    void audio.play().catch(() => {
      // Autoplay may require a user gesture in some browsers.
    });
  }, [stream]);

  return <audio ref={ref} autoPlay playsInline className="sr-only" />;
}
