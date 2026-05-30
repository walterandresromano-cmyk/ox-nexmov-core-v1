const SITE_URL = "https://www.oxnexmov.com.ar";
const FALLBACK_IMAGE = `${SITE_URL}/1hero-car.png`;
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://rogqhxlqqgxgzqaycbdp.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_zT7hgBlAQvgDZ7HvGgOkrA__svhrybL";

const PUBLIC_SELECT = [
  "id",
  "brand",
  "model",
  "version",
  "year",
  "price",
  "main_image_url",
  "image_url",
  "images_json",
  "status",
  "publication_status",
  "is_active",
  "dealer_id",
].join(",");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isVehiclePublic(row) {
  if (!row || row.is_active !== true) return false;

  const status = normalizeText(row.status || row.publication_status);
  const blockedStatus = [
    "draft",
    "borrador",
    "paused",
    "pausado",
    "suspended",
    "suspendido",
    "expired",
    "vencido",
    "deleted",
    "eliminado",
    "inactive",
    "inactivo",
    "rejected",
    "rechazado",
  ];

  return !blockedStatus.some((blocked) => status.includes(blocked));
}

function formatARS(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "Precio a consultar";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function getFirstImage(imagesJson) {
  if (!Array.isArray(imagesJson)) return "";

  const image = imagesJson.find((item) => item?.url || item?.src);

  return image?.url || image?.src || "";
}

function getAbsoluteUrl(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) return "";
  if (/^https?:\/\//i.test(rawValue)) return rawValue;
  if (rawValue.startsWith("/")) return `${SITE_URL}${rawValue}`;

  return rawValue;
}

function getVehicleImage(row) {
  return (
    getAbsoluteUrl(row.main_image_url) ||
    getAbsoluteUrl(row.image_url) ||
    getAbsoluteUrl(getFirstImage(row.images_json)) ||
    FALLBACK_IMAGE
  );
}

function buildHtml({ title, description, image, url, vehicleId }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);
  const appUrl = `/vehiculo/${encodeURIComponent(vehicleId)}?app=1`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${safeImage}">
    <meta property="og:url" content="${safeUrl}">
    <meta property="og:site_name" content="oX NEXMOV">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${safeImage}">
  </head>
  <body>
    <p><a href="${appUrl}">Abrir publicaci&oacute;n</a></p>
    <script>
      window.location.replace("${appUrl}");
    </script>
  </body>
</html>`;
}

function sendHtml(res, statusCode, html) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
  res.end(html);
}

export default async function handler(req, res) {
  const vehicleId = String(req.query?.id || "").trim();
  const vehicleUrl = `${SITE_URL}/vehiculo/${encodeURIComponent(vehicleId)}`;

  if (!vehicleId) {
    return sendHtml(
      res,
      400,
      buildHtml({
        title: "Publicacion no disponible | oX NEXMOV",
        description: "La publicacion solicitada no esta disponible.",
        image: FALLBACK_IMAGE,
        url: `${SITE_URL}/buscar`,
        vehicleId: "",
      })
    );
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}&select=${encodeURIComponent(PUBLIC_SELECT)}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase responded ${response.status}`);
    }

    const data = await response.json();
    const vehicle = Array.isArray(data) ? data[0] : null;

    if (!isVehiclePublic(vehicle)) {
      return sendHtml(
        res,
        404,
        buildHtml({
          title: "Publicacion no disponible | oX NEXMOV",
          description: "Esta publicacion no existe o ya no esta disponible.",
          image: FALLBACK_IMAGE,
          url: vehicleUrl,
          vehicleId,
        })
      );
    }

    const vehicleName = [vehicle.brand, vehicle.model, vehicle.year]
      .filter(Boolean)
      .join(" ");
    const title = `${vehicleName} - ${formatARS(vehicle.price)} | oX NEXMOV`;
    const description =
      "Conoce esta unidad publicada en oX NEXMOV. Precio, datos del vehiculo y contacto del dealer.";

    return sendHtml(
      res,
      200,
      buildHtml({
        title,
        description,
        image: getVehicleImage(vehicle),
        url: vehicleUrl,
        vehicleId,
      })
    );
  } catch {
    return sendHtml(
      res,
      500,
      buildHtml({
        title: "Publicacion no disponible | oX NEXMOV",
        description: "No pudimos cargar la vista previa de esta publicacion.",
        image: FALLBACK_IMAGE,
        url: vehicleUrl,
        vehicleId,
      })
    );
  }
}
