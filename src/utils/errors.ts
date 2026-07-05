import { BrenoxError } from "@brenox/sdk";

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
    return error.body?.error ?? error.message;
  }
  if (isNetworkError(error)) {
    return "Cannot reach Brenox API. Check that the engine is running and VITE_BRENOX_API_URL is correct.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function isAuthFailure(error: unknown): boolean {
  return error instanceof BrenoxError && error.status === 401;
}
