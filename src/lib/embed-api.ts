import type { UserProfile } from "@brenox/sdk";

export interface DemoPersona {
  id: "alice" | "bob";
  label: string;
  description: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "alice",
    label: "Alice",
    description: "Your app's end user — opens chat from your product UI.",
  },
  {
    id: "bob",
    label: "Bob",
    description: "Another end user in the same conversation room.",
  },
];

export interface DemoConfig {
  workspace_id: number;
  channel_id: number;
  channel_name: string;
  personas: string[];
}

export interface DemoSessionResponse {
  token: string;
  workspace_id: number;
  channel_id: number;
  user: UserProfile & { external_id?: string };
  persona: string;
}

const demoApiBase =
  import.meta.env.VITE_DEMO_API_URL?.replace(/\/$/, "") ?? "";

export const DEMO_SERVER_HINT =
  "Start the embed API in another terminal: npm run dev:server";

export function getDemoApiUrl(path: string): string {
  return `${demoApiBase}${path}`;
}

function isDemoServerUnreachable(error: unknown): boolean {
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

export function formatDemoApiError(error: unknown): string {
  if (isDemoServerUnreachable(error)) {
    return DEMO_SERVER_HINT;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function readDemoJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new Error(DEMO_SERVER_HINT);
    }
    throw new Error("Empty response from embed demo API");
  }

  let body: T & { error?: string };
  try {
    body = JSON.parse(text) as T & { error?: string };
  } catch {
    if (!response.ok) {
      throw new Error(DEMO_SERVER_HINT);
    }
    throw new Error("Invalid response from embed demo API");
  }

  if (!response.ok) {
    throw new Error(body.error ?? `Demo API failed (${response.status})`);
  }

  return body;
}

export async function fetchDemoConfig(): Promise<DemoConfig> {
  try {
    const response = await fetch(getDemoApiUrl("/api/config"));
    return readDemoJson<DemoConfig>(response);
  } catch (error) {
    throw new Error(formatDemoApiError(error));
  }
}

export async function createEmbedSession(
  persona: DemoPersona["id"],
): Promise<DemoSessionResponse> {
  try {
    const response = await fetch(getDemoApiUrl("/api/session"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
    });
    return readDemoJson<DemoSessionResponse>(response);
  } catch (error) {
    throw new Error(formatDemoApiError(error));
  }
}
