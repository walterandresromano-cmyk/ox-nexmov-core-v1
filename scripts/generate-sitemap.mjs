/**
 * Genera dist/sitemap.xml con páginas estáticas + vehículos activos de Supabase.
 * Se ejecuta automáticamente después de `vite build` via el script "build" de package.json.
 *
 * Sin conexión o sin vehículos disponibles: genera el sitemap solo con páginas estáticas
 * en lugar de fallar el build completo.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_PATH = resolve(__dirname, "../dist/sitemap.xml");

const SITE_URL = "https://www.oxnexmov.com.ar";

// Credenciales públicas (anon key = publishable, sin riesgo exponer en script de build)
const SUPABASE_URL  = "https://rogqhxlqqgxgzqaycbdp.supabase.co";
const SUPABASE_KEY  = "sb_publishable_zT7hgBlAQvgDZ7HvGgOkrA__svhrybL";

// ── Páginas estáticas ────────────────────────────────────────────────────────
const STATIC_PAGES = [
  { path: "/",                         priority: "1.0", changefreq: "daily"   },
  { path: "/buscar",                   priority: "0.9", changefreq: "daily"   },
  { path: "/financiacion",             priority: "0.8", changefreq: "weekly"  },
  { path: "/sumate",                   priority: "0.8", changefreq: "weekly"  },
  { path: "/faq",                      priority: "0.7", changefreq: "monthly" },
  { path: "/legal/terminos",           priority: "0.4", changefreq: "monthly" },
  { path: "/legal/privacidad",         priority: "0.4", changefreq: "monthly" },
  { path: "/legal/cookies",            priority: "0.4", changefreq: "monthly" },
  { path: "/legal/defensa-consumidor", priority: "0.4", changefreq: "monthly" },
  { path: "/legal/arrepentimiento",    priority: "0.4", changefreq: "monthly" },
  { path: "/legal/baja-servicio",      priority: "0.4", changefreq: "monthly" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function toIsoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function xmlEscape(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUrl({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod    ? `    <lastmod>${lastmod}</lastmod>`         : "",
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : "",
    priority   ? `    <priority>${priority}</priority>`       : "",
    "  </url>",
  ].filter(Boolean).join("\n");
}

function buildSitemap(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(buildUrl),
    "</urlset>",
  ].join("\n");
}

// ── Fetch vehicles ────────────────────────────────────────────────────────────

async function fetchActiveVehicles() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase
    .from("vehicles")
    .select("id, brand, model, updated_at")
    .eq("is_active", true)
    .or("publication_status.eq.active,publication_status.is.null")
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("[sitemap] Supabase error:", error.message);
    return [];
  }

  return data || [];
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  const staticEntries = STATIC_PAGES.map(({ path, priority, changefreq }) => ({
    loc:        `${SITE_URL}${path}`,
    lastmod:    today,
    changefreq,
    priority,
  }));

  let vehicleEntries = [];

  try {
    const vehicles = await fetchActiveVehicles();

    vehicleEntries = vehicles.map((v) => ({
      loc:        `${SITE_URL}/vehiculo/${encodeURIComponent(v.id)}`,
      lastmod:    toIsoDate(v.updated_at),
      changefreq: "weekly",
      priority:   "0.6",
    }));

    console.log(`[sitemap] ${vehicles.length} vehículos activos indexados.`);
  } catch (err) {
    console.warn("[sitemap] No se pudieron cargar vehículos:", err.message);
  }

  const xml = buildSitemap([...staticEntries, ...vehicleEntries]);
  writeFileSync(DIST_PATH, xml, "utf8");

  const total = staticEntries.length + vehicleEntries.length;
  console.log(`[sitemap] dist/sitemap.xml generado — ${total} URLs (${staticEntries.length} estáticas + ${vehicleEntries.length} vehículos).`);
}

main().catch((err) => {
  console.error("[sitemap] Error fatal:", err);
  // No exit(1): no romper el build por un sitemap fallido
});
