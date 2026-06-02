const SCORE_FACTORS = [
  {
    key: "main_image",
    pts: 20,
    label: "Foto principal",
    check: (v) => !!v.main_image_url,
  },
  {
    key: "more_images",
    pts: 10,
    label: "3 o más fotos",
    check: (v) => Array.isArray(v.images) && v.images.length >= 3,
  },
  {
    key: "description",
    pts: 15,
    label: "Descripción (50+ caracteres)",
    check: (v) => (v.description || v.details || "").trim().length >= 50,
  },
  {
    key: "price",
    pts: 10,
    label: "Precio cargado",
    check: (v) => Number(v.price || 0) > 0,
  },
  {
    key: "market_ref",
    pts: 10,
    label: "Precio de referencia de mercado",
    check: (v) => Number(v.avg || v.market_reference_price || 0) > 0,
  },
  {
    key: "year",
    pts: 5,
    label: "Año del vehículo",
    check: (v) => !!v.year,
  },
  {
    key: "km",
    pts: 5,
    label: "Kilómetros",
    check: (v) => v.km !== null && v.km !== undefined && Number(v.km) >= 0,
  },
  {
    key: "body_type",
    pts: 5,
    label: "Tipo de carrocería",
    check: (v) => !!v.body_type,
  },
  {
    key: "transmission",
    pts: 5,
    label: "Transmisión",
    check: (v) => !!v.transmission,
  },
  {
    key: "fuel_type",
    pts: 5,
    label: "Tipo de combustible",
    check: (v) => !!v.fuel_type,
  },
  {
    key: "version",
    pts: 5,
    label: "Versión del modelo",
    check: (v) => !!v.version,
  },
  {
    key: "location",
    pts: 5,
    label: "Ubicación (ciudad/provincia)",
    check: (v) => !!(v.city || v.province),
  },
];

export function getPublicationScore(vehicle) {
  let score = 0;
  const missing = [];

  for (const factor of SCORE_FACTORS) {
    if (factor.check(vehicle)) {
      score += factor.pts;
    } else {
      missing.push(factor.label);
    }
  }

  return { score, missing };
}

export function getScoreLabel(score) {
  if (score >= 90) return "Excelente";
  if (score >= 70) return "Buena";
  if (score >= 50) return "Regular";
  return "Incompleta";
}

export function getScoreChipClass(score) {
  if (score >= 90) return "success";
  if (score >= 70) return "info";
  if (score >= 50) return "warning";
  return "danger";
}

export function getScoreBand(score) {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "weak";
}

export function getScoreHealthLabel(score) {
  if (score >= 90) return "Excelente publicación";
  if (score >= 70) return "Publicación sólida";
  if (score >= 50) return "Puede mejorar";
  return "Publicación débil";
}
