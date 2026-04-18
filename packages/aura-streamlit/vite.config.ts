import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: "frontend",
  resolve: {
    alias: {
      "aura-ai-chat": resolve(__dirname, "../lib/dist/index.js"),
    },
  },
  build: {
    outDir: resolve(__dirname, "src/aura_streamlit/frontend"),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 4002,
  },
});
