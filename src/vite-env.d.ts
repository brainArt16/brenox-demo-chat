/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BRENOX_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
