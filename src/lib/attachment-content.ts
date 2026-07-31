import { useEffect, useState } from "react";
import { useBrenoxClient } from "@brenox/react";

function resolveContentUrl(pathOrUrl: string, apiBaseUrl: string): string {
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("blob:")
  ) {
    return pathOrUrl;
  }
  const base = apiBaseUrl.replace(/\/$/, "");
  return pathOrUrl.startsWith("/")
    ? `${base}${pathOrUrl}`
    : `${base}/${pathOrUrl}`;
}

/**
 * Fetch attachment bytes with the session JWT and return a blob: URL.
 * Hides object-storage paths from the browser address bar.
 */
export async function createAttachmentObjectUrl(
  pathOrUrl: string,
  getToken: () => Promise<string | null>,
  apiBaseUrl: string,
): Promise<string> {
  if (pathOrUrl.startsWith("blob:")) {
    return pathOrUrl;
  }

  const url = resolveContentUrl(pathOrUrl, apiBaseUrl);

  // Legacy direct storage URLs (presigned MinIO/S3) — use as-is.
  if (
    (url.startsWith("http://") || url.startsWith("https://")) &&
    !url.includes("/api/workspaces/")
  ) {
    return url;
  }

  const token = await getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to load attachment (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function useAttachmentObjectUrl(pathOrUrl: string | undefined): {
  src: string | null;
  error: string | null;
  loading: boolean;
} {
  const client = useBrenoxClient();
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(pathOrUrl));

  useEffect(() => {
    if (!pathOrUrl) {
      setSrc(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const next = await createAttachmentObjectUrl(
          pathOrUrl,
          () => client.getToken(),
          import.meta.env.VITE_BRENOX_API_URL ?? "https://api.breno-x.com",
        );
        if (cancelled) {
          if (next.startsWith("blob:")) URL.revokeObjectURL(next);
          return;
        }
        objectUrl = next.startsWith("blob:") ? next : null;
        setSrc(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file");
          setSrc(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pathOrUrl, client]);

  return { src, error, loading };
}
