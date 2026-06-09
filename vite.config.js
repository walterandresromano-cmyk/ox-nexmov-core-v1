import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.svg", "logo.svg", "apple-touch-icon.png", "icons/pwa-192x192.png", "icons/pwa-512x512.png"],
      manifest: {
        name: "oX NEXMOV",
        short_name: "oX NEXMOV",
        description: "Marketplace de vehículos verificados en Argentina",
        theme_color: "#020617",
        background_color: "#020617",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "es",
        icons: [
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
        categories: ["shopping", "automotive"],
        screenshots: [
          {
            src: "/1hero-car.png",
            sizes: "1200x630",
            type: "image/png",
            form_factor: "wide",
            label: "oX NEXMOV — Marketplace de vehículos",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,svg,png,webp}"],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@supabase")) return "vendor-supabase";
          if (id.includes("node_modules/react-dom")) return "vendor-react";
          if (id.includes("node_modules/react")) return "vendor-react";
        },
      },
    },
  },
});
