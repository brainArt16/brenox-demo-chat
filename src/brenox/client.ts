import { BrenoxClient, localStorageTokenStore } from "@brenox/sdk";

export const DEMO_TOKEN_KEY = "brenox_demo_chat_token";

export const brenoxClient = new BrenoxClient({
  baseUrl: import.meta.env.VITE_BRENOX_API_URL ?? "https://api.breno-x.com",
  tokenStore: localStorageTokenStore(DEMO_TOKEN_KEY),
});
