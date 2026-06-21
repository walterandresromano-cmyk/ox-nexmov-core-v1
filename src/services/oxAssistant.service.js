import {
  getPublicationScore,
  getScoreLabel,
  getScoreChipClass,
} from "../lib/publicationScore.js";
import { supabase } from "../lib/supabaseClient.js";

async function callAssistantAPI(action, data) {
  // Send the current session token so the server can verify the caller
  const { data: sessionData } = supabase
    ? await supabase.auth.getSession()
    : { data: {} };
  const token = sessionData?.session?.access_token;

  const res = await fetch("/api/ai-assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, data }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.json();
}

/**
 * Genera una descripción comercial para una publicación de vehículo.
 * Retorna { text, error }.
 */
export async function generateVehicleDescription(vehicle) {
  try {
    const { text } = await callAssistantAPI("generate_description", vehicle || {});
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
  try {
    const { text } = await callAssistantAPI("generate_lead_reply", lead || {});
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
  try {
    const { filters } = await callAssistantAPI("parse_leads_query", { query, availableStatuses });
    return { filters: filters ?? {}, error: null };
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
