import { useCallback, useEffect, useRef, useState } from "react";
import type { Call, CallMode } from "@brenox/sdk";
import { useChannelSession } from "../context/channel-session";
import { formatError } from "../utils/errors";
import {
  acquireLocalMedia,
  attachLocalTracks,
  createPeerConnection,
  parseIceCandidate,
  parseSessionDescription,
  stopMediaStream,
} from "../webrtc/peer-connection";

export interface IncomingCall {
  callId: number;
  mode: CallMode;
  fromUserId: number;
}

export function useWebRtcCall(currentUserId: number) {
  const { signaling, initiate, join, leave } = useChannelSession();

  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(
    new Map(),
  );
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const pendingOffersRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const setRemoteStream = useCallback((userId: number, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.set(userId, stream);
      return next;
    });
  }, []);

  const closePeer = useCallback((userId: number) => {
    const pc = peersRef.current.get(userId);
    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
    }
    setRemoteStreams((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const cleanupCall = useCallback(() => {
    for (const pc of peersRef.current.values()) {
      pc.close();
    }
    peersRef.current.clear();
    pendingOffersRef.current.clear();
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setActiveCall(null);
    setIncomingCall(null);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const ensureLocalMedia = useCallback(async (mode: CallMode) => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }
    const stream = await acquireLocalMedia(mode);
    localStreamRef.current = stream;
    setLocalStream(stream);
    setCameraOff(mode === "voice");
    return stream;
  }, []);

  const createPeerForUser = useCallback(
    (remoteUserId: number, callId: number) => {
      if (remoteUserId === currentUserId || peersRef.current.has(remoteUserId)) {
        return peersRef.current.get(remoteUserId) ?? null;
      }

      if (!signaling || !localStreamRef.current) {
        return null;
      }

      const pc = createPeerConnection({
        onIceCandidate: (candidate) => {
          signaling.sendIce({
            call_id: callId,
            to_user_id: remoteUserId,
            candidate: JSON.stringify(candidate.toJSON()),
          });
        },
        onRemoteStream: (stream) => {
          setRemoteStream(remoteUserId, stream);
        },
      });

      attachLocalTracks(pc, localStreamRef.current);
      peersRef.current.set(remoteUserId, pc);
      return pc;
    },
    [currentUserId, signaling, setRemoteStream],
  );

  const offerToPeer = useCallback(
    async (remoteUserId: number, callId: number) => {
      const pc = createPeerForUser(remoteUserId, callId);
      if (!pc || !signaling) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signaling.sendOffer({
        call_id: callId,
        to_user_id: remoteUserId,
        sdp: JSON.stringify(offer),
      });
    },
    [createPeerForUser, signaling],
  );

  const handleRemoteOffer = useCallback(
    async (callId: number, fromUserId: number, sdpRaw: string) => {
      if (!signaling) return;

      const call = activeCallRef.current;
      if (!call || call.id !== callId) {
        pendingOffersRef.current.set(fromUserId, sdpRaw);
        return;
      }

      await ensureLocalMedia(call.mode);

      let pc = peersRef.current.get(fromUserId);
      if (!pc) {
        const created = createPeerForUser(fromUserId, callId);
        if (!created) return;
        pc = created;
      }

      await pc.setRemoteDescription(parseSessionDescription(sdpRaw));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signaling.sendAnswer({
        call_id: callId,
        to_user_id: fromUserId,
        sdp: JSON.stringify(answer),
      });
    },
    [createPeerForUser, ensureLocalMedia, signaling],
  );

  useEffect(() => {
    if (!signaling) return;

    const offJoin = signaling.on("call.join", (event) => {
      const { call_id, user_id, mode } = event.payload;
      if (user_id === currentUserId) return;

      const call = activeCallRef.current;
      if (!call || call.id !== call_id) {
        setIncomingCall({
          callId: call_id,
          mode: mode ?? "voice",
          fromUserId: user_id,
        });
        return;
      }

      void (async () => {
        try {
          await ensureLocalMedia(call.mode);
          await offerToPeer(user_id, call_id);
        } catch (err) {
          setError(formatError(err));
        }
      })();
    });

    const offOffer = signaling.on("call.offer", (event) => {
      const { call_id, from_user_id, sdp } = event.payload;
      if (!call_id || !from_user_id || !sdp) return;
      void handleRemoteOffer(call_id, from_user_id, sdp).catch((err: unknown) => {
        setError(formatError(err));
      });
    });

    const offAnswer = signaling.on("call.answer", async (event) => {
      const { call_id, from_user_id, sdp } = event.payload;
      if (!call_id || !from_user_id || !sdp) return;

      const pc = peersRef.current.get(from_user_id);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(parseSessionDescription(sdp));
      } catch (err) {
        setError(formatError(err));
      }
    });

    const offIce = signaling.on("call.ice", async (event) => {
      const { from_user_id, candidate } = event.payload;
      if (!from_user_id || !candidate) return;

      const pc = peersRef.current.get(from_user_id);
      if (!pc) return;

      try {
        await pc.addIceCandidate(parseIceCandidate(candidate));
      } catch (err) {
        setError(formatError(err));
      }
    });

    const offLeave = signaling.on("call.leave", (event) => {
      closePeer(event.payload.user_id);
    });

    const offEnd = signaling.on("call.end", () => {
      cleanupCall();
    });

    return () => {
      offJoin();
      offOffer();
      offAnswer();
      offIce();
      offLeave();
      offEnd();
    };
  }, [
    signaling,
    currentUserId,
    cleanupCall,
    closePeer,
    ensureLocalMedia,
    handleRemoteOffer,
    offerToPeer,
  ]);

  const startCall = useCallback(
    async (mode: CallMode) => {
      setBusy(true);
      setError(null);
      try {
        const call = await initiate(mode);
        setActiveCall(call);
        activeCallRef.current = call;
        await ensureLocalMedia(mode);
      } catch (err) {
        setError(formatError(err));
      } finally {
        setBusy(false);
      }
    },
    [ensureLocalMedia, initiate],
  );

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall) return;

    setBusy(true);
    setError(null);
    try {
      const call = await join(incomingCall.callId);
      setActiveCall(call);
      activeCallRef.current = call;
      setIncomingCall(null);
      await ensureLocalMedia(incomingCall.mode ?? call.mode);

      const pending = pendingOffersRef.current.get(incomingCall.fromUserId);
      if (pending) {
        pendingOffersRef.current.delete(incomingCall.fromUserId);
        await handleRemoteOffer(call.id, incomingCall.fromUserId, pending);
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  }, [ensureLocalMedia, handleRemoteOffer, incomingCall, join]);

  const declineIncoming = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const hangUp = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;

    setBusy(true);
    setError(null);
    try {
      await leave(call.id);
    } catch (err) {
      setError(formatError(err));
    } finally {
      cleanupCall();
      setBusy(false);
    }
  }, [cleanupCall, leave]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !next;
    }
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    for (const track of stream.getVideoTracks()) {
      track.enabled = !next;
    }
    setCameraOff(next);
    if (activeCallRef.current && signaling) {
      if (next) {
        signaling.videoOff(activeCallRef.current.id);
      } else {
        signaling.videoOn(activeCallRef.current.id);
      }
    }
  }, [cameraOff, signaling]);

  return {
    activeCall,
    incomingCall,
    localStream,
    remoteStreams,
    muted,
    cameraOff,
    busy,
    error,
    inCall: activeCall !== null,
    startCall,
    acceptIncoming,
    declineIncoming,
    hangUp,
    toggleMute,
    toggleCamera,
    clearError: () => setError(null),
  };
}
