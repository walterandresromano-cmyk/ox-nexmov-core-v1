import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.svg", "logo.svg"],
      manifest: {
        name: "oX NEXMOV",
        short_name: "oX NEXMOV",
        description: "Marketplace de vehículos verificados en Argentina",
        theme_color: "#020617",
        background_color: "#020617",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "es",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/favicon.ico",
            sizes: "48x48 32x32 16x16",
            type: "image/x-icon",
          },
        ],
        categories: ["shopping", "automotive"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
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