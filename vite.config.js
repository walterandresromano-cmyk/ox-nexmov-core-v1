import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import purgecss from "@fullhuman/postcss-purgecss";

const purgecssPlugin = purgecss({
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  defaultExtractor: (content) => content.match(/[\w-:/[\].]+/g) || [],
  safelist: {
    // Clases con sufijos dinámicos (rank, status, tone, priority)
    patterns: [
      /^dealer-rank-/,
      /^rank-/,
      /^tone-/,
      /^status-/,
      /^priority-/,
      /^agenda-group--/,
      /^app-notice--/,
      /^dealer-commercial-report__recommendation--/,
      /^dealer-inv-card__health/,
      /^dealer-plan-perf__/,
      /^dealer-stock-signal--/,
      /^dealer-today-item--/,
      /^dealer-profile-logo--rank/,
      /^ox-assistant-panel__badge--/,
      /^jnp-card--/,
      /^detail-img-slide/,
      /^vd-col/,
      /^ox-hero-reveal/,
      /^ox-shimmer/,
      /^route-/,
      // Keyframes y animaciones referenciadas dinámicamente
      /^animate-/,
      /^pwa-/,
    ],
    // Selectores de atributo y pseudo-clases no detectables
    deep: [/\[data-theme/, /\[data-rank/, /\[aria-/],
    greedy: [/:root/],
  },
});

export default defineConfig(({ mode }) => ({
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
        display: "browser",
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
        // Excluir chunks lazy-loaded del precache: se cachean al primer uso.
        // Reduce el install del SW en ~500 kB sin afectar la experiencia offline.
        globIgnores: [
          "**/vendor-recharts-*.js",
          "**/vendor-sentry-*.js",
        ],
      },
    }),
  ],
  css: {
    postcss: {
      plugins: mode === "production" ? [purgecssPlugin] : [],
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@supabase")) return "vendor-supabase";
          // Recharts + D3 van con AdminPanel (lazy) — no contaminan el bundle principal
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) return "vendor-recharts";
          // Sentry siempre lazy — forzar chunk separado por si acaso
          if (id.includes("node_modules/@sentry")) return "vendor-sentry";
          if (id.includes("node_modules/react-dom")) return "vendor-react";
          if (id.includes("node_modules/react")) return "vendor-react";
          if (id.includes("node_modules/scheduler")) return "vendor-react";
          if (id.includes("node_modules/use-sync-external-store")) return "vendor-react";
        },
      },
    },
  },
}));
