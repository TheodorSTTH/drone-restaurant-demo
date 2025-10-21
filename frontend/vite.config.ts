import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,            // allow external/inside-container access
    port: 5173,
    proxy: {
      "/api": "http://backend:8000",
      "/accounts": "http://backend:8000", // <-- kinda funky, but works
      "/admin": "http://backend:8000"     // <-- kinda funky, but works
    },
    watch: {
      usePolling: true,    // important for Docker
      interval: 100
    }
  },
  build: { outDir: "dist" }
});
