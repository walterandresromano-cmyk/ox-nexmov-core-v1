export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES = {
  fiat: ["fiat", "fíat", "fiiat", "fiatt", "fita"],
  chevrolet: ["chevrolet", "chevrole", "chebrolet", "chevy", "chevro"],
  volkswagen: ["volkswagen", "vw", "wv", "wolkswagen", "volks", "vokswagen"],
  renault: ["renault", "reno", "renaul", "renol"],
  toyota: ["toyota", "toy", "tojota"],
  "mercedes benz": ["mercedes-benz", "mercedez", "mercedes", "mercedes benz"],
  cronos: ["cronos", "crono"],
  onix: ["onix", "onixs"],
  hilux: ["hilux", "hilu", "hiluxx"],
  s10: ["s10", "s 10"],
  amarok: ["amarok", "amarock"],
  sandero: ["sandero", "sendero"],
  cruze: ["cruze", "cru", "cruzee", "vro"],
  classic: ["classic", "clas", "clasic"],
  logan: ["logan", "log"],
  pickup: ["pickup", "pick up", "chata"],
  "pickup suv utilitario": ["camioneta"],
  "sedan hatchback": ["auto", "autito"],
  "suv rural monovolumen": ["familiar"],
  "furgon utilitario": ["utilitario"],
  nafta: ["nafta", "naftero", "naftera", "gasolina"],
  diesel: ["diesel", "gasoil"],
  automatico: ["automatico", "automatica"],
  manual: ["manual"],
  barato: ["barato", "barata", "economico", "economica", "oportunidad"],
};

const ALIAS_LOOKUP = Object.entries(ALIASES).reduce((acc, [target, values]) => {
  const normalizedTarget = normalizeSearchText(target);
  const targetTerms = normalizedTarget.split(" ").filter(Boolean);

  acc[normalizedTarget] = targetTerms;

  values.forEach((value) => {
    acc[normalizeSearchText(value)] = targetTerms;
  });

  return acc;
}, {});

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getVehicleField(vehicle, ...fields) {
  for (const field of fields) {
    if (vehicle?.[field] !== undefined && vehicle?.[field] !== null) {
      return vehicle[field];
    }

    if (vehicle?.raw?.[field] !== undefined && vehicle?.raw?.[field] !== null) {
      return vehicle.raw[field];
    }
  }

  return "";
}

function tokenize(value) {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

export function expandQuery(query) {
  const normalizedQuery = normalizeSearchText(query);
  const originalTokens = normalizedQuery.split(" ").filter(Boolean);
  const tokenExpansions = {};
  const expandedTerms = [];

  originalTokens.forEach((token) => {
    const expansions = [token, ...(ALIAS_LOOKUP[token] || [])];
    tokenExpansions[token] = unique(expansions);
    expandedTerms.push(...tokenExpansions[token]);
  });

  Object.entries(ALIAS_LOOKUP).forEach(([alias, terms]) => {
    if (!alias.includes(" ")) return;
    if (!normalizedQuery.includes(alias)) return;

    expandedTerms.push(...terms);
  });

  return {
    normalizedQuery,
    normalized: normalizedQuery,
    tokens: unique(expandedTerms),
    originalTokens,
    correctedTokens: unique(
      originalTokens.flatMap((token) => ALIAS_LOOKUP[token] || [token])
    ),
    expandedTerms: unique(expandedTerms),
    tokenExpansions,
  };
}

function normalizeField(...values) {
  const text = normalizeSearchText(values.filter(Boolean).join(" "));

  return {
    text,
    words: tokenize(text),
  };
}

function normalizeArrayField(value) {
  if (!Array.isArray(value)) return "";
  return value.filter(Boolean).join(" ");
}

export function buildVehicleSearchIndex(vehicle, options = {}) {
  const dealerOption =
    options.dealer || options.commercialName || options.name
      ? options.dealer || options
      : null;
  const dealer = dealerOption || vehicle?.dealer || {};
  const raw = vehicle?.raw || {};

  const fields = {
    brand: normalizeField(vehicle?.brand, vehicle?.make, raw.brand, raw.make),
    model: normalizeField(vehicle?.model, raw.model),
    version: normalizeField(vehicle?.version, raw.version),
    year: normalizeField(vehicle?.year, raw.year),
    price: normalizeField(vehicle?.price, raw.price),
    commercialIntent: normalizeField(
      vehicle?.price || raw.price
        ? "precio valor barato economico oportunidad"
        : "",
      vehicle?.hasFinancing ||
        vehicle?.financing ||
        raw.financing ||
        vehicle?.delivery ||
        raw.delivery ||
        vehicle?.months ||
        raw.months
        ? "financiacion financiado financiada cuotas cuota entrega anticipo"
        : ""
    ),
    city: normalizeField(vehicle?.city, raw.city),
    province: normalizeField(vehicle?.province, raw.province),
    bodyType: normalizeField(
      getVehicleField(vehicle, "bodyType", "body_type", "body")
    ),
    fuelType: normalizeField(getVehicleField(vehicle, "fuelType", "fuel_type")),
    transmission: normalizeField(getVehicleField(vehicle, "transmission")),
    dealerName: normalizeField(
      dealer?.commercialName,
      dealer?.name,
      getVehicleField(vehicle, "dealerName", "dealer_name")
    ),
    title: normalizeField(vehicle?.title, vehicle?.name, raw.title, raw.name),
    details: normalizeField(
      vehicle?.details,
      vehicle?.description,
      raw.details,
      raw.description
    ),
    status: normalizeField(
      getVehicleField(vehicle, "status", "publicationStatus", "publication_status")
    ),
    tags: normalizeField(
      normalizeArrayField(vehicle?.tags),
      normalizeArrayField(vehicle?.badges),
      normalizeArrayField(raw.tags),
      normalizeArrayField(raw.badges)
    ),
  };

  const normalizedText = Object.values(fields)
    .map((field) => field.text)
    .filter(Boolean)
    .join(" ");

  return {
    fields,
    normalizedText,
    words: unique(Object.values(fields).flatMap((field) => field.words)),
  };
}

export function levenshteinDistance(a, b) {
  const left = normalizeSearchText(a);
  const right = normalizeSearchText(b);

  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[right.length];
}

function fuzzyLimit(token) {
  if (token.length <= 2) return 0;
  if (token.length === 3) return 1;
  if (token.length <= 5) return 1;
  return 2;
}

function fuzzyWordMatch(token, words) {
  const limit = fuzzyLimit(token);
  if (!limit) return false;

  return words.some((word) => {
    if (Math.abs(word.length - token.length) > limit) return false;
    return levenshteinDistance(token, word) <= limit;
  });
}

function fieldContainsFragment(token, field) {
  if (!field?.text || token.length <= 1) return false;

  if (token.length === 2) {
    return field.words.some((word) => word.includes(token));
  }

  return field.text.includes(token);
}

function scoreTokenInField(token, field, exactScore, fragmentScore, fuzzyScore) {
  if (!field?.text || token.length <= 1) return null;

  if (field.words.includes(token)) {
    return { score: exactScore, reason: "exact" };
  }

  if (fieldContainsFragment(token, field)) {
    return { score: fragmentScore, reason: "fragment" };
  }

  if (fuzzyScore > 0 && fuzzyWordMatch(token, field.words)) {
    return { score: fuzzyScore, reason: "fuzzy" };
  }

  return null;
}

function scoreToken(token, index) {
  const fields = [
    ["brand", 100, 60, 45],
    ["model", 90, 60, 45],
    ["version", 80, 60, 45],
    ["bodyType", 20, 20, 12],
    ["fuelType", 20, 20, 12],
    ["transmission", 20, 20, 12],
    ["city", 15, 15, 10],
    ["province", 15, 15, 10],
    ["dealerName", 35, 35, 20],
    ["title", 35, 35, 20],
    ["details", 35, 35, 20],
    ["tags", 35, 35, 20],
    ["status", 20, 20, 10],
    ["year", 25, 25, 0],
    ["price", 15, 15, 0],
    ["commercialIntent", 12, 12, 0],
  ];

  return fields.reduce((best, [key, exactScore, fragmentScore, fuzzyScore]) => {
    const result = scoreTokenInField(
      token,
      index.fields[key],
      exactScore,
      fragmentScore,
      fuzzyScore
    );

    if (!result) return best;
    if (best && best.score >= result.score) return best;

    return { ...result, field: key };
  }, null);
}

function scoreQueryExactMatches(query, index, reasons) {
  let score = 0;

  if (index.fields.brand.text && query === index.fields.brand.text) {
    score += 200;
    reasons.push("brand exacta");
  }

  if (index.fields.model.text && query === index.fields.model.text) {
    score += 160;
    reasons.push("modelo exacto");
  }

  if (index.fields.version.text && query === index.fields.version.text) {
    score += 120;
    reasons.push("version exacta");
  }

  if (query && index.normalizedText.includes(query)) {
    score += 140;
    reasons.push("query completa incluida");
  }

  return score;
}

export function scoreVehicleMatch(vehicle, query, options = {}) {
  const expandedQuery = expandQuery(query);
  const index = buildVehicleSearchIndex(vehicle, options);
  const reasons = [];

  if (!expandedQuery.normalizedQuery) {
    return { score: 0, matched: true, reasons };
  }

  let score = scoreQueryExactMatches(
    expandedQuery.normalizedQuery,
    index,
    reasons
  );
  let matchedOriginalTokens = 0;
  let weakOnlyMatches = 0;

  expandedQuery.originalTokens
    .filter((token) => token.length > 1)
    .forEach((originalToken) => {
      const variants = expandedQuery.tokenExpansions[originalToken] || [
        originalToken,
      ];
      let best = null;

      variants.forEach((variant) => {
        const result = scoreToken(variant, index);
        if (!result) return;
        if (!best || result.score > best.score) {
          best = { ...result, token: variant };
        }
      });

      if (!best) return;

      matchedOriginalTokens += 1;
      if (best.score <= 35) weakOnlyMatches += 1;
      score += best.score;
      reasons.push(`${best.token}:${best.field}:${best.reason}`);
    });

  const meaningfulTokens = expandedQuery.originalTokens.filter(
    (token) => token.length > 1
  );

  if (
    meaningfulTokens.length > 0 &&
    matchedOriginalTokens === meaningfulTokens.length
  ) {
    score += 80;
    reasons.push("todos los tokens matchean");
  }

  if (
    meaningfulTokens.length >= 3 &&
    matchedOriginalTokens <= 1 &&
    weakOnlyMatches > 0
  ) {
    score -= 45;
    reasons.push("penalizacion match debil");
  }

  const roundedScore = Math.max(0, Math.round(score));

  return {
    score: roundedScore,
    matched: roundedScore > 0,
    reasons,
  };
}
