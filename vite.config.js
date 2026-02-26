// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  base: "/visor/",
  build: {
    outDir: "dist",
    sourcemap: true,
    manifest: true,
    chunkSizeWarningLimit: 100000,
    assetsInclude: ["./json/datos3857.json"],
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
  optimizeDeps: {
    include: ["ol"],
  },
  preview: {
    port: 81,
  },
  define: {
    global: "globalThis",
  },
  server: {
    host: "127.0.0.2",
    port: 5173,
  },
  proxy: {
    "/*": {
      target: "http://127.0.0.2:5000",
      changeOrigin: true,
    },
  },
});
