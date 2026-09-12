import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/health": "http://127.0.0.1:3000",
      "/auth": "http://127.0.0.1:3000",
      "/players": "http://127.0.0.1:3000",
      "/socket.io": { target: "http://127.0.0.1:3000", ws: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
