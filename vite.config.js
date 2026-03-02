// vite.config.js
import { defineConfig } from "vite";

import {logo_light, logo_dark, logo_container} from ./assets/js/configuracion.js;

export default defineConfig({
  base: "/visor/",
  build: {
    outDir: "dist",
    sourcemap: true,
    manifest: true,
    chunkSizeWarningLimit: 100000,
    assetsInclude: ["./json/datos3857.json", logo_light, logo_dark, logo_container],
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
