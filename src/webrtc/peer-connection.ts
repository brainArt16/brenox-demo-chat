import { getIceServers } from "./ice-servers";

export function parseSessionDescription(raw: string): RTCSessionDescriptionInit {
  return JSON.parse(raw) as RTCSessionDescriptionInit;
}

export function parseIceCandidate(raw: string): RTCIceCandidateInit {
  return JSON.parse(raw) as RTCIceCandidateInit;
}

export function createPeerConnection(input: {
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onRemoteStream: (stream: MediaStream) => void;
}): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: getIceServers() });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      input.onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    const stream = event.streams[0] ?? new MediaStream([event.track]);
    input.onRemoteStream(stream);
  };

  return pc;
}

export function attachLocalTracks(
  pc: RTCPeerConnection,
  stream: MediaStream,
): void {
  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream);
  }
}

export async function acquireLocalMedia(mode: "voice" | "video"): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video",
  });
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
