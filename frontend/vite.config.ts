import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,            // allow external/inside-container access
    port: 5173,
    proxy: { "/api": "http://backend:8000" },
    watch: {
      usePolling: true,    // important for Docker
      interval: 100
    }
  },
  build: { outDir: "dist" }
});
