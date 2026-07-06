import { BrenoxError } from "@brenox/sdk";

const DEFAULT_CLIENT_ERROR_MESSAGE =
  "Something went wrong. Please try again later.";

const SENSITIVE_PATTERNS = [
  /failed to connect/i,
  /database=/i,
  /hostname resolving/i,
  /lookup .+ on .+:53/i,
  /server misbehaving/i,
  /connection refused/i,
  /dial tcp/i,
  /\bpq:/i,
  /\bpgx\b/i,
  /postgres/i,
  /\bsql:/i,
  /redis/i,
  /access denied for user/i,
  /password authentication failed/i,
  /no such host/i,
  /\.go:\d+/,
  /\/internal\//,
  /\buser=/i,
];

function sanitizeClientMessage(
  message: string,
  fallback = DEFAULT_CLIENT_ERROR_MESSAGE
): string {
  const trimmed = message.trim();
  if (!trimmed) return fallback;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(trimmed))
    ? fallback
    : message;
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("networkerror") ||
    message.includes("failed to fetch") ||
    message.includes("load failed")
  );
}

export function formatError(error: unknown): string {
  if (error instanceof BrenoxError) {
    return sanitizeClientMessage(error.body?.error ?? error.message);
  }
  if (isNetworkError(error)) {
    return "Cannot reach Brenox API. Check that the engine is running and VITE_BRENOX_API_URL is correct.";
  }
  if (error instanceof Error) {
    return sanitizeClientMessage(error.message);
  }
  return sanitizeClientMessage(String(error));
}

export function isAuthFailure(error: unknown): boolean {
  return error instanceof BrenoxError && error.status === 401;
}
