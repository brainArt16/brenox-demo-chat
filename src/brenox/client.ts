import { BrenoxClient, type TokenStore } from "@brenox/sdk";

export const DEMO_TOKEN_KEY = "brenox_demo_chat_token";

/** Per-tab storage so Alice and Bob can run in separate browser tabs. */
function sessionStorageTokenStore(key: string): TokenStore {
  return {
    getToken() {
      if (typeof sessionStorage === "undefined") {
        return null;
      }
      return sessionStorage.getItem(key);
    },
    setToken(value) {
      if (typeof sessionStorage === "undefined") {
        return;
      }
      if (value === null) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
      }
    },
  };
}

export const brenoxClient = new BrenoxClient({
  baseUrl: import.meta.env.VITE_BRENOX_API_URL ?? "https://api.breno-x.com",
  tokenStore: sessionStorageTokenStore(DEMO_TOKEN_KEY),
});
