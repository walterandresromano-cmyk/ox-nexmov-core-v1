import { getPublicationScore, getScoreBand, getScoreHealthLabel } from "./publicationScore.js";

const MIN_DESCRIPTION_LENGTH   = 50;
const IDEAL_DESCRIPTION_LENGTH = 150;

function norm(v) {
  return String(v ?? "").trim();
}

function hasNumericValue(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

// Normalize form (camelCase) and DB object (snake_case) to a unified shape
// so publicationScore.js checks work correctly with form state.
function normalizeForScore(raw) {
  return {
    ...raw,
    body_type:              raw.body_type || raw.bodyType || "",
    fuel_type:              raw.fuel_type || raw.fuelType || "",
    market_reference_price: Number(raw.market_reference_price || raw.marketReferencePrice || 0),
  };
}

export function getVehicleQualityChecklist(raw) {
  const v = normalizeForScore(raw || {});

  const { score } = getPublicationScore(v);
  const band       = getScoreBand(score);
  const label      = getScoreHealthLabel(score);

  const description = norm(v.description || v.details);
  const descLen     = description.length;
  const price       = Number(v.price || 0);
  const ref         = Number(v.market_reference_price || 0);

  const categories = [];

  // A — Datos básicos
  categories.push({
    id: "basic",
    title: "Datos básicos",
    items: [
      { id: "brand",   label: "Marca",      status: norm(v.brand)   ? "ok" : "missing", tip: null },
      { id: "model",   label: "Modelo",     status: norm(v.model)   ? "ok" : "missing", tip: null },
      { id: "version", label: "Versión",    status: norm(v.version) ? "ok" : "missing", tip: null },
      { id: "year",    label: "Año",        status: v.year          ? "ok" : "missing", tip: null },
      {
        id: "km",
        label: "Kilómetros",
        status: (v.km !== null && v.km !== undefined && String(v.km) !== "") ? "ok" : "missing",
        tip: null,
      },
      {
        id: "location",
        label: "Ubicación",
        status: (norm(v.city) || norm(v.province)) ? "ok" : "missing",
        tip: "Completá provincia y ciudad.",
      },
    ],
  });

  // B — Datos técnicos
  categories.push({
    id: "technical",
    title: "Datos técnicos",
    items: [
      { id: "body_type",    label: "Carrocería",  status: norm(v.body_type)    ? "ok" : "missing", tip: null },
      { id: "transmission", label: "Transmisión", status: norm(v.transmission) ? "ok" : "missing", tip: null },
      { id: "fuel_type",    label: "Combustible", status: norm(v.fuel_type)    ? "ok" : "missing", tip: null },
    ],
  });

  // C — Precio y referencia
  const priceItems = [
    {
      id: "price",
      label: "Precio publicado",
      status: price > 0 ? "ok" : "missing",
      tip: null,
    },
    {
      id: "market_ref",
      label: "Precio de referencia",
      status: ref > 0 ? "ok" : "missing",
      tip: "Ayuda al comprador a entender el valor de mercado.",
    },
  ];

  if (price > 0 && ref > 0 && price < ref * 0.4) {
    priceItems.push({
      id: "price_coherence",
      label: "Revisar coherencia de precio",
      status: "suggested",
      tip: "El precio publicado parece muy bajo respecto al de referencia. Verificá que no sea una entrega o anticipo.",
    });
  }

  categories.push({ id: "price", title: "Precio y referencia", items: priceItems });

  // D — Descripción comercial
  let descStatus, descTip;
  if (descLen === 0) {
    descStatus = "missing";
    descTip = "Incluí estado general, detalles visibles, condiciones de entrega y aclaraciones importantes.";
  } else if (descLen < MIN_DESCRIPTION_LENGTH) {
    descStatus = "missing";
    descTip = `Mínimo ${MIN_DESCRIPTION_LENGTH} caracteres. Actual: ${descLen}.`;
  } else if (descLen < IDEAL_DESCRIPTION_LENGTH) {
    descStatus = "suggested";
    descTip = `Con más detalle (${descLen}/${IDEAL_DESCRIPTION_LENGTH} recomendados) el comprador puede decidir mejor.`;
  } else {
    descStatus = "ok";
    descTip = null;
  }

  categories.push({
    id: "description",
    title: "Descripción comercial",
    items: [{ id: "description", label: "Descripción del vehículo", status: descStatus, tip: descTip }],
  });

  // E — Financiación
  const financingItems = v.financing
    ? [
        {
          id: "fin_delivery",
          label: "Entrega / anticipo",
          status: hasNumericValue(v.delivery) ? "ok" : "suggested",
          tip: "El monto de entrada ayuda al comprador a evaluar la operación.",
        },
        {
          id: "fin_months",
          label: "Cantidad de cuotas",
          status: hasNumericValue(v.months) ? "ok" : "suggested",
          tip: null,
        },
        {
          id: "fin_rate",
          label: "Tasa anual",
          status: hasNumericValue(v.rate) ? "ok" : "suggested",
          tip: null,
        },
      ]
    : [
        {
          id: "fin_info",
          label: "Informar si acepta financiación",
          status: "suggested",
          tip: "Si aceptás financiación, completar los datos ayuda al comprador a evaluar la operación.",
        },
      ];

  categories.push({ id: "financing", title: "Financiación", items: financingItems });

  // F — Mantenimiento orientativo
  const maintenanceItems = !v.show_maintenance_info
    ? [
        {
          id: "maint_enable",
          label: "Mantenimiento orientativo",
          status: "suggested",
          tip: "Compartir datos de mantenimiento orientativo aumenta la confianza del comprador.",
        },
      ]
    : (() => {
        const hasAnyData = [
          v.insurance_monthly_amount,
          v.fuel_consumption,
          v.patent_cost,
          v.estimated_service_cost,
          v.estimated_monthly_maintenance,
        ].some(hasNumericValue);

        return [
          {
            id: "maint_data",
            label: "Datos orientativos cargados",
            status: hasAnyData ? "ok" : "missing",
            tip: hasAnyData
              ? null
              : "Activaste mantenimiento orientativo pero no cargaste ningún dato.",
          },
        ];
      })();

  categories.push({ id: "maintenance", title: "Mantenimiento orientativo", items: maintenanceItems });

  // G — Fotos (leídas del vehicle original, no del form)
  const hasMainImage = !!(v.main_image_url || v.mainImageUrl);
  const imageCount   = Array.isArray(v.images) ? v.images.length : 0;

  categories.push({
    id: "photos",
    title: "Fotos",
    items: [
      {
        id: "main_image",
        label: "Foto principal",
        status: hasMainImage ? "ok" : "missing",
        tip: hasMainImage ? null : "Editá las fotos desde el botón Fotos del inventario.",
      },
      {
        id: "more_images",
        label: "3 o más fotos",
        status: imageCount >= 3 ? "ok" : "suggested",
        tip: imageCount >= 3
          ? null
          : "Más fotos aumentan la confianza. Editá desde el botón Fotos del inventario.",
      },
    ],
  });

  const allItems = categories.flatMap((c) => c.items);
  const summary = {
    ok:        allItems.filter((i) => i.status === "ok").length,
    missing:   allItems.filter((i) => i.status === "missing").length,
    suggested: allItems.filter((i) => i.status === "suggested").length,
  };

  return { score, band, label, categories, summary };
}
