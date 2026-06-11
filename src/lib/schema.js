/**
 * Gestión de JSON-LD (schema.org) para rich results de Google.
 * Upsert limpio: si ya existe un script con el mismo id lo reemplaza,
 * evitando duplicados al navegar entre páginas en la SPA.
 */

const SITE_URL  = "https://www.oxnexmov.com.ar";
const SITE_NAME = "oX NEXMOV";

export function injectJsonLd(id, data) {
  if (typeof document === "undefined") return;

  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id   = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(clean(data));
}

export function removeJsonLd(id) {
  document.getElementById(id)?.remove();
}

// Elimina recursivamente claves con valor undefined / null / ""
function clean(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) =>
    v === undefined || v === null || v === "" ? undefined : v
  ));
}

// ── Builders ──────────────────────────────────────────────────────────────────

/**
 * schema.org/Car para la ficha de vehículo.
 */
export function buildCarSchema(vehicle, shareUrl) {
  const images = [
    vehicle.mainImageUrl,
    vehicle.imageUrl,
    ...(Array.isArray(vehicle.images) ? vehicle.images.map(i => i?.url ?? i) : []),
  ].filter(Boolean).slice(0, 5);

  const title = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");

  return {
    "@context": "https://schema.org",
    "@type":    "Car",
    "name":     title,
    "description": [
      title,
      vehicle.kilometers ? `${Number(vehicle.kilometers).toLocaleString("es-AR")} km` : "",
      vehicle.city ? `en ${vehicle.city}` : "",
    ].filter(Boolean).join(" · "),
    "url":   shareUrl,
    "image": images.length === 1 ? images[0] : images.length > 1 ? images : undefined,

    // Atributos del vehículo
    "brand":               vehicle.brand ? { "@type": "Brand", "name": vehicle.brand } : undefined,
    "model":               vehicle.model,
    "vehicleModelDate":    vehicle.year  ? String(vehicle.year) : undefined,
    "vehicleCondition":    "https://schema.org/UsedCondition",
    "mileageFromOdometer": vehicle.kilometers
      ? { "@type": "QuantitativeValue", "value": Number(vehicle.kilometers), "unitCode": "KMT" }
      : undefined,
    "fuelType":             vehicle.fuelType         || vehicle.raw?.fuel_type    || undefined,
    "vehicleTransmission":  vehicle.transmission     || vehicle.raw?.transmission || undefined,
    "bodyType":             vehicle.bodyType         || vehicle.raw?.body_type    || undefined,
    "numberOfDoors":        vehicle.doors            || vehicle.raw?.doors        || undefined,
    "driveWheelConfiguration": vehicle.raw?.drive_type || undefined,

    // Oferta
    "offers": {
      "@type":         "Offer",
      "price":          vehicle.price || undefined,
      "priceCurrency": "ARS",
      "availability":  vehicle.reserved
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      "itemCondition": "https://schema.org/UsedCondition",
      "url":            shareUrl,
      "seller": vehicle.dealer?.commercialName ? {
        "@type":     "AutoDealer",
        "name":       vehicle.dealer.commercialName,
        "address":    vehicle.dealer.city
          ? { "@type": "PostalAddress", "addressLocality": vehicle.dealer.city, "addressCountry": "AR" }
          : undefined,
      } : undefined,
    },
  };
}

/**
 * schema.org/AutoDealer para el perfil del dealer.
 */
export function buildDealerSchema(dealer, profileUrl) {
  return {
    "@context": "https://schema.org",
    "@type":    "AutoDealer",
    "name":      dealer.commercialName || dealer.name,
    "url":        profileUrl || SITE_URL,
    "image":      dealer.logo || dealer.imageUrl || undefined,
    "telephone":  dealer.phone || dealer.contactPhone || undefined,
    "address": dealer.city ? {
      "@type":           "PostalAddress",
      "addressLocality":  dealer.city,
      "addressRegion":    dealer.province || undefined,
      "addressCountry":  "AR",
    } : undefined,
    "areaServed": "AR",
  };
}

/**
 * schema.org/WebSite con SearchAction para Sitelinks Searchbox de Google.
 * Se inyecta en el index.html como schema estático.
 */
export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type":    "WebSite",
  "name":      SITE_NAME,
  "url":        SITE_URL,
  "inLanguage": "es-AR",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type":       "EntryPoint",
      "urlTemplate": `${SITE_URL}/?buscar={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const ORGANIZATION_SCHEMA = {
  "@context":   "https://schema.org",
  "@type":      "Organization",
  "name":        SITE_NAME,
  "url":          SITE_URL,
  "logo":         `${SITE_URL}/logo.svg`,
  "description": "Marketplace de vehículos usados verificados en Argentina.",
  "areaServed":  "AR",
  "sameAs": [
    `${SITE_URL}`,
  ],
};
