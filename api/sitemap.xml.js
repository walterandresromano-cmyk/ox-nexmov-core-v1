const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BASE_URL = "https://www.oxnexmov.com.ar";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/buscar", priority: "0.9", changefreq: "daily" },
  { path: "/financiacion", priority: "0.8", changefreq: "weekly" },
  { path: "/sumate", priority: "0.8", changefreq: "weekly" },
  { path: "/quienes-somos", priority: "0.6", changefreq: "monthly" },
  { path: "/faq", priority: "0.7", changefreq: "monthly" },
  { path: "/legal/terminos", priority: "0.4", changefreq: "monthly" },
  { path: "/legal/privacidad", priority: "0.4", changefreq: "monthly" },
  { path: "/legal/cookies", priority: "0.4", changefreq: "monthly" },
  { path: "/legal/defensa-consumidor", priority: "0.4", changefreq: "monthly" },
  { path: "/legal/arrepentimiento", priority: "0.4", changefreq: "monthly" },
  { path: "/legal/baja-servicio", priority: "0.4", changefreq: "monthly" },
];

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : "",
    priority ? `    <priority>${priority}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const urls = [];

  // Static pages
  for (const page of STATIC_PAGES) {
    urls.push(
      urlEntry({
        loc: `${BASE_URL}${page.path}`,
        changefreq: page.changefreq,
        priority: page.priority,
      })
    );
  }

  // Active vehicles — only if Supabase is configured
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    try {
      const vehicleRes = await fetch(
        `${SUPABASE_URL}/rest/v1/vehicles?is_active=eq.true&publication_status=eq.active&select=id,updated_at&limit=5000`,
        {
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (vehicleRes.ok) {
        const vehicles = await vehicleRes.json();
        for (const v of vehicles || []) {
          const lastmod = v.updated_at
            ? v.updated_at.slice(0, 10)
            : undefined;
          urls.push(
            urlEntry({
              loc: `${BASE_URL}/vehiculo/${encodeURIComponent(v.id)}`,
              lastmod,
              changefreq: "daily",
              priority: "0.8",
            })
          );
        }
      }
    } catch {
      // Non-fatal — static pages are still returned
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(xml);
}
