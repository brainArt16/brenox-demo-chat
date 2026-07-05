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

export function getDemoApiUrl(path: string): string {
  return `${demoApiBase}${path}`;
}

export async function fetchDemoConfig(): Promise<DemoConfig> {
  const response = await fetch(getDemoApiUrl("/api/config"));
  if (!response.ok) {
    throw new Error(`Demo API config failed (${response.status})`);
  }
  return response.json() as Promise<DemoConfig>;
}

export async function createEmbedSession(
  persona: DemoPersona["id"],
): Promise<DemoSessionResponse> {
  const response = await fetch(getDemoApiUrl("/api/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona }),
  });
  const body = (await response.json()) as DemoSessionResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error ?? `Session failed (${response.status})`);
  }
  return body;
}
