import { BrenoxError } from "@brenox/sdk";

export function formatError(error: unknown): string {
  if (error instanceof BrenoxError) {
    return error.body?.error ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
