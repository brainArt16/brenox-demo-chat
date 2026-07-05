import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const basePath = process.env.VITE_APP_BASE_PATH ?? "/";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: basePath,
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
