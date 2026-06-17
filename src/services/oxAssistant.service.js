import {
  getPublicationScore,
  getScoreLabel,
  getScoreChipClass,
} from "../lib/publicationScore.js";

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(prompt, maxTokens = 400) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("VITE_ANTHROPIC_API_KEY no configurada.");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() ?? "";
}

/**
 * Genera una descripción comercial para una publicación de vehículo.
 * Retorna { text, error }.
 */
export async function generateVehicleDescription(vehicle) {
  const v = vehicle || {};
  const parts = [
    v.brand && `Marca: ${v.brand}`,
    v.model && `Modelo: ${v.model}`,
    v.version && `Versión: ${v.version}`,
    v.year && `Año: ${v.year}`,
    v.km != null && v.km !== "" && `Kilómetros: ${Number(v.km).toLocaleString("es-AR")} km`,
    v.price && `Precio: $${Number(v.price).toLocaleString("es-AR")}`,
    v.bodyType && `Carrocería: ${v.bodyType}`,
    v.transmission && `Transmisión: ${v.transmission}`,
    v.fuelType && `Combustible: ${v.fuelType}`,
    (v.city || v.province) && `Ubicación: ${[v.city, v.province].filter(Boolean).join(", ")}`,
    v.financing && "Tiene financiación disponible",
  ].filter(Boolean).join("\n");

  const prompt = `Sos un asistente para concesionarias de vehículos argentinas.
Escribí una descripción comercial profesional y convincente para este vehículo en un marketplace online.

${parts}

Instrucciones:
- Entre 120 y 280 caracteres
- Tono profesional pero cercano, en español rioplatense
- Destacá los puntos más fuertes del vehículo
- No uses listas ni viñetas, solo texto corrido
- No repitas datos que ya se muestran en el título (marca/modelo/año)
- Terminá con una llamada a la acción sutil si hay espacio

Solo devolvé el texto de la descripción, sin comillas ni explicaciones.`;

  try {
    const text = await callClaude(prompt, 300);
    return { text, error: null };
  } catch (err) {
    return { text: null, error: err.message };
  }
}

/**
 * Genera un mensaje de WhatsApp personalizado para responder a un lead.
 * Retorna { text, error }.
 */
export async function generateLeadReply(lead) {
  const l = lead || {};
  const buyerName = `${l.buyer_first_name || ""}`.trim() || "el comprador";
  const vehicle = [l.vehicle_brand, l.vehicle_model, l.vehicle_version]
    .filter(Boolean).join(" ") || l.vehicle_title_snapshot || "el vehículo consultado";
  const price = l.vehicle_price
    ? `$${Number(l.vehicle_price).toLocaleString("es-AR")}`
    : null;

  const parts = [
    `Nombre del comprador: ${buyerName}`,
    `Vehículo de interés: ${vehicle}`,
    price && `Precio publicado: ${price}`,
    l.message && `Mensaje del comprador: "${l.message}"`,
    l.crm_status && `Estado actual del lead: ${l.crm_status}`,
  ].filter(Boolean).join("\n");

  const prompt = `Sos un vendedor de una concesionaria argentina, profesional y cercano.
Generá un mensaje de WhatsApp para responder a este lead de forma personalizada y natural.

${parts}

Instrucciones:
- Empezá con "Hola [nombre]!" usando el nombre real
- Máximo 3 oraciones cortas
- Si el comprador hizo una pregunta, hacé referencia a ella
- Tono cercano y profesional, en español rioplatense
- Terminá con una pregunta abierta para mantener el diálogo
- Máximo 1 emoji y solo si suma
- No inventes datos técnicos del vehículo

Solo devolvé el texto del mensaje, sin comillas ni explicaciones.`;

  try {
    const text = await callClaude(prompt, 250);
    return { text, error: null };
  } catch (err) {
    return { text: null, error: err.message };
  }
}

/**
 * Parsea una consulta en lenguaje natural y devuelve criterios de filtro para leads.
 * Retorna { filters, error } donde filters es un objeto con los campos detectados.
 */
export async function parseLeadsNaturalQuery(query, availableStatuses) {
  const statusList = (availableStatuses || []).join(", ");
  const prompt = `Analizá esta consulta en lenguaje natural de un dealer de vehículos y extraé los filtros de búsqueda.

Consulta: "${query}"

Estados disponibles: ${statusList || "new, seen, contacted, negotiation, sold, lost, closed"}

Devolvé SOLO un objeto JSON válido (sin markdown) con estos campos opcionales:
{
  "status": "estado exacto o null",
  "daysSince": número de días atrás o null,
  "brand": "marca o null",
  "model": "modelo o null",
  "hasFollowUp": true/false/null,
  "isNew": true/false/null,
  "keyword": "texto libre para buscar en mensaje o null"
}

Ejemplos:
- "leads sin responder" → {"status": "new", "isNew": true}
- "leads de esta semana" → {"daysSince": 7}
- "leads de Toyota" → {"brand": "Toyota"}
- "leads en negociación sin seguimiento" → {"status": "negotiation", "hasFollowUp": false}`;

  try {
    const raw = await callClaude(prompt, 200);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { filters: {}, error: null };
    const filters = JSON.parse(jsonMatch[0]);
    return { filters, error: null };
  } catch (err) {
    return { filters: {}, error: err.message };
  }
}

// Priority order for suggestions — highest impact first
const PRIORITY_ORDER = [
  "main_image",
  "description",
  "price",
  "images",
  "market_ref",
  "year",
  "km",
  "location",
  "body_type",
  "transmission",
  "fuel_type",
  "version",
];

const FIELD_SUGGESTIONS = {
  main_image: {
    field: "main_image",
    priority: "high",
    title: "Agregá una foto principal",
    text: "La foto principal es lo primero que ve un comprador. Sin ella, la publicación pierde el 20% del puntaje y reduce notablemente el interés.",
    actionLabel: "Subir foto principal",
  },
  images: {
    field: "images",
    priority: "high",
    title: "Sumá al menos 3 fotos",
    text: "Las publicaciones con 3 o más fotos generan más consultas. Mostrá exterior, interior y detalles relevantes.",
    actionLabel: "Agregar fotos",
  },
  description: {
    field: "description",
    priority: "high",
    title: "Completá la descripción",
    text: "Una descripción de 50 caracteres o más transmite seriedad y responde preguntas antes de que el comprador las haga.",
    actionLabel: "Escribir descripción",
  },
  price: {
    field: "price",
    priority: "high",
    title: "Cargá el precio",
    text: "Sin precio visible, la mayoría de los compradores descarta la publicación antes de consultar.",
    actionLabel: "Ingresar precio",
  },
  market_ref: {
    field: "market_ref",
    priority: "medium",
    title: "Agregá referencia de mercado",
    text: "El precio de referencia ayuda al comprador a entender si el precio es competitivo y genera más confianza.",
    actionLabel: "Cargar referencia",
  },
  year: {
    field: "year",
    priority: "medium",
    title: "Indicá el año del vehículo",
    text: "El año es un filtro clave en la búsqueda. Sin él, la publicación puede quedar fuera de resultados relevantes.",
    actionLabel: "Completar año",
  },
  km: {
    field: "km",
    priority: "medium",
    title: "Cargá los kilómetros",
    text: "El kilometraje es uno de los primeros datos que revisa un comprador para evaluar el estado del vehículo.",
    actionLabel: "Ingresar kilómetros",
  },
  location: {
    field: "location",
    priority: "medium",
    title: "Agregá ubicación",
    text: "Indicar ciudad o provincia permite que compradores de la zona encuentren la unidad más fácilmente.",
    actionLabel: "Cargar ubicación",
  },
  body_type: {
    field: "body_type",
    priority: "low",
    title: "Seleccioná el tipo de carrocería",
    text: "El tipo de carrocería (sedán, SUV, pickup, etc.) aparece en los filtros de búsqueda y ayuda a segmentar el interés.",
    actionLabel: "Elegir carrocería",
  },
  transmission: {
    field: "transmission",
    priority: "low",
    title: "Indicá la transmisión",
    text: "Manual o automática es un dato decisivo para muchos compradores. Completarlo mejora la relevancia en búsquedas filtradas.",
    actionLabel: "Cargar transmisión",
  },
  fuel_type: {
    field: "fuel_type",
    priority: "low",
    title: "Agregá el tipo de combustible",
    text: "Nafta, diesel, GNC o híbrido influye en la decisión de compra y en los costos operativos del comprador.",
    actionLabel: "Seleccionar combustible",
  },
  version: {
    field: "version",
    priority: "low",
    title: "Completá la versión del modelo",
    text: "La versión diferencia equipamientos dentro de una misma línea. Especificarla agrega precisión y seriedad a la publicación.",
    actionLabel: "Agregar versión",
  },
};

// Mirrors publicationScore checks to derive field key names (not labels)
function _deriveMissingKeys(v) {
  const keys = [];
  if (!v.main_image_url) keys.push("main_image");
  if (!(Array.isArray(v.images) && v.images.length >= 3)) keys.push("images");
  if ((v.description || v.details || "").trim().length < 50) keys.push("description");
  if (!(Number(v.price || 0) > 0)) keys.push("price");
  if (!(Number(v.avg || v.market_reference_price || 0) > 0)) keys.push("market_ref");
  if (!v.year) keys.push("year");
  if (v.km === null || v.km === undefined || Number(v.km) < 0) keys.push("km");
  if (!v.body_type) keys.push("body_type");
  if (!v.transmission) keys.push("transmission");
  if (!v.fuel_type) keys.push("fuel_type");
  if (!v.version) keys.push("version");
  if (!(v.city || v.province)) keys.push("location");
  return keys;
}

export function getMissingFieldSuggestion(field) {
  return (
    FIELD_SUGGESTIONS[field] ?? {
      field,
      priority: "low",
      title: `Completá ${field}`,
      text: "Completar este campo mejora la calidad de la publicación.",
      actionLabel: "Completar",
    }
  );
}

function getVehicleAssistantSummary({ score, missing }) {
  if (score >= 90) {
    return "Publicación excelente. Está lista para promocionar con toda su fuerza.";
  }
  if (score >= 70) {
    const count = missing?.length ?? 0;
    return count > 0
      ? `Publicación buena. Con ${count} mejora${count !== 1 ? "s" : ""} podés alcanzar el nivel Excelente.`
      : "Publicación buena. Está en buen estado para generar consultas.";
  }
  if (score >= 50) {
    return "Publicación regular. Conviene completar los datos clave antes de promocionarla.";
  }
  return "Publicación incompleta. Faltan datos importantes que reducen su visibilidad y credibilidad.";
}

function getVehicleAssistantAlerts(vehicle, scoreData) {
  const v = vehicle || {};
  const { score } = scoreData || { score: 0 };
  const alerts = [];

  if (!v.main_image_url) {
    alerts.push({
      type: "error",
      field: "main_image",
      message: "Sin foto principal la publicación pierde impacto visual inmediato.",
    });
  }

  if (!(Number(v.price || 0) > 0)) {
    alerts.push({
      type: "error",
      field: "price",
      message: "Sin precio cargado, la mayoría de compradores descarta la publicación.",
    });
  }

  if ((v.description || v.details || "").trim().length < 50) {
    alerts.push({
      type: "warning",
      field: "description",
      message: "La descripción está ausente o es muy corta.",
    });
  }

  if (!(Number(v.avg || v.market_reference_price || 0) > 0)) {
    alerts.push({
      type: "warning",
      field: "market_ref",
      message: "Sin referencia de mercado, el comprador no puede evaluar si el precio es competitivo.",
    });
  }

  if (score < 50) {
    alerts.push({
      type: "critical",
      field: null,
      message:
        "El puntaje es bajo. Completar los campos principales mejorará significativamente la visibilidad.",
    });
  }

  return alerts;
}

export function getVehicleAssistantInsights(vehicle) {
  const v = vehicle || {};
  const scoreData = getPublicationScore(v);
  const { score, missing } = scoreData;
  const label = getScoreLabel(score);
  const chipClass = getScoreChipClass(score);

  const missingKeys = _deriveMissingKeys(v).sort((a, b) => {
    const ia = PRIORITY_ORDER.indexOf(a);
    const ib = PRIORITY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const suggestions = missingKeys.map(getMissingFieldSuggestion);
  const alerts = getVehicleAssistantAlerts(v, scoreData);

  const highSuggestions = suggestions.filter((s) => s.priority === "high");
  const nextBestActions = (highSuggestions.length > 0 ? highSuggestions : suggestions).slice(0, 3);

  const summary = getVehicleAssistantSummary({ score, missing });

  return {
    score,
    label,
    chipClass,
    missing,
    suggestions,
    alerts,
    nextBestActions,
    summary,
  };
}
