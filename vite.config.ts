import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: "client",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@server": path.resolve(__dirname, "server"),
      "@db": path.resolve(__dirname, "drizzle"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/trpc": "http://localhost:4000",
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
});
