const DEFAULT_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function getIceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_ICE_SERVERS;
  if (!raw) {
    return DEFAULT_STUN;
  }

  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    console.warn("VITE_ICE_SERVERS is invalid JSON — using default STUN servers");
  }

  return DEFAULT_STUN;
}
