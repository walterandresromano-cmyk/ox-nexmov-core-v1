import "../../styles/search.css";
import { useEffect, useMemo, useState } from "react";

import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import RadarActivationModal from "../../components/RadarActivationModal.jsx";
import {
  normalizeSearchText,
  scoreVehicleMatch,
} from "../../lib/searchEngine.js";
import { listPublicVehicles } from "../../services/vehicles.service.js";

function normalizeText(value) {
  return normalizeSearchText(value);
}

function normalizeNumberText(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function getVehicleKm(vehicle) {
  return Number(vehicle.kilometers || vehicle.km || vehicle.raw?.km || 0);
}

function getVehiclePrice(vehicle) {
  return Number(vehicle.price || vehicle.raw?.price || 0);
}

function getVehicleYear(vehicle) {
  return Number(vehicle.year || vehicle.raw?.year || 0);
}

function getVehicleField(vehicle, ...fields) {
  for (const field of fields) {
    if (vehicle[field]) return vehicle[field];
    if (vehicle.raw?.[field]) return vehicle.raw[field];
  }

  return "";
}

function vehicleHasFinancing(vehicle) {
  return Boolean(
    vehicle.hasFinancing ||
      vehicle.financing ||
      vehicle.raw?.financing ||
      vehicle.delivery ||
      vehicle.raw?.delivery ||
      vehicle.months ||
      vehicle.raw?.months
  );
}

function parseMoneyExpression(text) {
  const normalized = normalizeText(text);

  const millionMatch = normalized.match(
    /(\d+(?:[\.,]\d+)?)\s*(millon|millones|m)/
  );

  if (!millionMatch) return null;

  const rawNumber = Number(String(millionMatch[1]).replace(",", "."));

  if (!Number.isFinite(rawNumber)) return null;

  return Math.round(rawNumber * 1000000);
}

function extractNumbers(text) {
  const compactNumbers = text.match(/\d[\d\.\,]*/g) || [];

  return compactNumbers
    .map((value) => Number(normalizeNumberText(value)))
    .filter((number) => Number.isFinite(number) && number > 0)
    .map((number) => ({
      value: number,
      raw: String(number),
    }));
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function parseSmartVehicleSearch(query) {
  const text = normalizeText(query);
  const numbers = extractNumbers(query);
  const moneyExpression = parseMoneyExpression(query);

  const hasMaxIntent = hasAny(text, [
    "hasta",
    "maximo",
    "max",
    "menos",
    "menor",
    "abajo",
    "debajo",
    "inferior",
  ]);

  const hasMinIntent = hasAny(text, [
    "desde",
    "minimo",
    "min",
    "mas de",
    "mayor",
    "arriba",
    "superior",
  ]);

  const kmIntent = hasAny(text, [
    "km",
    "kilometro",
    "kilometros",
    "kilometraje",
    "menos de",
    "bajo kilometraje",
  ]);

  const priceIntent = hasAny(text, [
    "$",
    "precio",
    "pesos",
    "ars",
    "millones",
    "millon",
    "barato",
    "economico",
    "economica",
    "oportunidad",
  ]);

  const yearNumbers = numbers
    .map((item) => item.value)
    .filter((number) => number >= 1980 && number <= 2035);

  const parsed = {
    text,
    tokens: text.split(" ").filter(Boolean),
    maxPrice: null,
    minPrice: null,
    targetPrice: null,
    maxKm: null,
    minKm: null,
    targetKm: null,
    years: yearNumbers,
    wantsFinancing: hasAny(text, [
      "financiado",
      "financiada",
      "financiacion",
      "cuotas",
      "cuota",
      "entrega",
      "anticipo",
    ]),
    wantsAutomatic: hasAny(text, ["automatico", "automatica", "at"]),
    wantsManual: hasAny(text, ["manual", "mt"]),
    wantsDiesel: hasAny(text, ["diesel"]),
    wantsNafta: hasAny(text, ["nafta", "gasolina"]),
    wantsHybrid: hasAny(text, ["hibrido", "hibrida", "hybrid"]),
    wantsElectric: hasAny(text, ["electrico", "electrica", "electric"]),
    bodyTypes: [],
  };

  if (hasAny(text, ["suv", "camioneta familiar"])) parsed.bodyTypes.push("suv");

  if (hasAny(text, ["pickup", "pick up", "chata", "trabajo"])) {
    parsed.bodyTypes.push("pickup");
  }

  if (hasAny(text, ["sedan", "sedán"])) parsed.bodyTypes.push("sedan");

  if (hasAny(text, ["hatch", "hatchback", "compacto", "urbano"])) {
    parsed.bodyTypes.push("hatchback");
  }

  if (hasAny(text, ["utilitario", "furgon", "furgón"])) {
    parsed.bodyTypes.push("utilitario");
  }

  if (moneyExpression) {
    if (hasMinIntent) {
      parsed.minPrice = moneyExpression;
    } else if (hasMaxIntent) {
      parsed.maxPrice = moneyExpression;
    } else {
      parsed.targetPrice = moneyExpression;
    }
  }

  numbers.forEach(({ value }) => {
    if (value >= 1980 && value <= 2035) return;

    if (priceIntent || value >= 1000000) {
      if (hasMinIntent) {
        parsed.minPrice = value;
      } else if (hasMaxIntent) {
        parsed.maxPrice = value;
      } else {
        parsed.targetPrice = value;
      }

      return;
    }

    if (kmIntent || (value >= 1000 && value <= 500000)) {
      if (hasMinIntent) {
        parsed.minKm = value;
      } else if (hasMaxIntent) {
        parsed.maxKm = value;
      } else {
        parsed.targetKm = value;
      }
    }
  });

  return parsed;
}

function getVehicleSearchHaystack(vehicle, dealer) {
  return normalizeText(
    [
      vehicle.brand,
      vehicle.model,
      vehicle.version,
      vehicle.year,
      vehicle.city,
      vehicle.province,
      dealer?.commercialName,
      getVehicleField(vehicle, "bodyType", "body_type"),
      getVehicleField(vehicle, "transmission"),
      getVehicleField(vehicle, "fuelType", "fuel_type"),
      vehicle.details,
      vehicle.raw?.details,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function numberClosenessScore(value, target, toleranceRatio = 0.22) {
  if (!value || !target) return 0;

  const difference = Math.abs(value - target);
  const tolerance = Math.max(target * toleranceRatio, 1);

  if (difference > tolerance) return 0;

  return Math.round((1 - difference / tolerance) * 22);
}

function scoreVehicleForSearch(vehicle, dealer, parsedSearch) {
  const haystack = getVehicleSearchHaystack(vehicle, dealer);
  const price = getVehiclePrice(vehicle);
  const km = getVehicleKm(vehicle);
  const year = getVehicleYear(vehicle);

  let score = 0;
  let hardFail = false;

  parsedSearch.tokens.forEach((token) => {
    if (token.length <= 1) return;

    if (haystack.includes(token)) {
      score += 8;
    }
  });

  const fullText = parsedSearch.text;

  if (fullText && haystack.includes(fullText)) {
    score += 30;
  }

  if (parsedSearch.maxPrice && price > parsedSearch.maxPrice) hardFail = true;
  if (parsedSearch.minPrice && price < parsedSearch.minPrice) hardFail = true;
  if (parsedSearch.maxKm && km > parsedSearch.maxKm) hardFail = true;
  if (parsedSearch.minKm && km < parsedSearch.minKm) hardFail = true;

  if (parsedSearch.years.length > 0 && !parsedSearch.years.includes(year)) {
    const closeToYear = parsedSearch.years.some(
      (searchYear) => Math.abs(searchYear - year) <= 1
    );

    if (closeToYear) {
      score += 8;
    } else {
      hardFail = true;
    }
  }

  if (parsedSearch.targetPrice) {
    score += numberClosenessScore(price, parsedSearch.targetPrice, 0.28);

    if (price <= parsedSearch.targetPrice) {
      score += 8;
    }
  }

  if (parsedSearch.targetKm) {
    score += numberClosenessScore(km, parsedSearch.targetKm, 0.32);

    if (km <= parsedSearch.targetKm) {
      score += 10;
    }
  }

  if (parsedSearch.wantsFinancing) {
    if (vehicleHasFinancing(vehicle)) score += 22;
    else hardFail = true;
  }

  const transmission = normalizeText(getVehicleField(vehicle, "transmission"));

  if (parsedSearch.wantsAutomatic) {
    if (
      transmission.includes("auto") ||
      transmission.includes("cvt") ||
      transmission.includes("at")
    ) {
      score += 18;
    } else {
      hardFail = true;
    }
  }

  if (parsedSearch.wantsManual) {
    if (transmission.includes("manual") || transmission.includes("mt")) {
      score += 18;
    } else {
      hardFail = true;
    }
  }

  const fuel = normalizeText(getVehicleField(vehicle, "fuelType", "fuel_type"));

  if (parsedSearch.wantsDiesel) {
    if (fuel.includes("diesel")) score += 18;
    else hardFail = true;
  }

  if (parsedSearch.wantsNafta) {
    if (fuel.includes("nafta") || fuel.includes("gasolina")) score += 18;
    else hardFail = true;
  }

  if (parsedSearch.wantsHybrid) {
    if (fuel.includes("hibrido") || fuel.includes("hybrid")) score += 18;
    else hardFail = true;
  }

  if (parsedSearch.wantsElectric) {
    if (fuel.includes("electrico") || fuel.includes("electric")) score += 18;
    else hardFail = true;
  }

  if (parsedSearch.bodyTypes.length > 0) {
    const bodyType = normalizeText(
      getVehicleField(vehicle, "bodyType", "body_type")
    );

    const matchesBody = parsedSearch.bodyTypes.some((type) =>
      bodyType.includes(type)
    );

    if (matchesBody) {
      score += 18;
    } else {
      hardFail = true;
    }
  }

  if (price > 0) score += 2;
  if (vehicle.mainImageUrl || vehicle.imageUrl) score += 2;

  return {
    score,
    hardFail,
  };
}

function getSuggestionTypeLabel(type) {
  if (type === "brand") return "Marca";
  if (type === "model") return "Modelo";
  if (type === "version") return "Versión";
  if (type === "publication") return "Publicación";
  return "Sugerencia";
}

function getGhostCompletion(query, suggestions) {
  const rawQuery = String(query || "");
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (normalizedQuery.length < 2 || !suggestions.length) return null;

  const suggestion = suggestions.find((item) =>
    normalizeSearchText(item.searchValue || item.label).startsWith(normalizedQuery)
  );

  if (!suggestion) return null;

  const value = suggestion.searchValue || suggestion.label;
  if (value.length <= rawQuery.length) return null;

  return {
    suggestion,
    value,
    suffix: value.slice(rawQuery.length),
  };
}

function isVehicleVisibleForBuyer(vehicle) {
  const status = normalizeSearchText(
    getVehicleField(vehicle, "status", "publicationStatus", "publication_status")
  );

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

  if (blockedStatus.some((blocked) => status.includes(blocked))) return false;
  if (vehicle.isPublished === false || vehicle.raw?.is_published === false) return false;
  if (vehicle.active === false || vehicle.is_active === false) return false;
  if (vehicle.raw?.active === false || vehicle.raw?.is_active === false) return false;

  return true;
}

function getVehicleAutocompleteFields(vehicle) {
  const brand = String(
    vehicle.brand || vehicle.make || vehicle.raw?.brand || vehicle.raw?.make || ""
  ).trim();
  const model = String(vehicle.model || vehicle.raw?.model || "").trim();
  const version = String(vehicle.version || vehicle.raw?.version || "").trim();
  const year = String(vehicle.year || vehicle.raw?.year || "").trim();
  const title = String(vehicle.title || vehicle.name || vehicle.raw?.title || "").trim();

  return { brand, model, version, year, title };
}

function scoreAutocompleteSuggestion(label, haystack, query) {
  const normalizedLabel = normalizeSearchText(label);
  const normalizedHaystack = normalizeSearchText(haystack || label);
  const tokens = query.split(" ").filter(Boolean);

  let score = 0;

  if (normalizedLabel === query) score += 120;
  if (normalizedLabel.startsWith(query)) score += 80;
  if (normalizedHaystack.includes(query)) score += 45;

  tokens.forEach((token) => {
    if (token.length > 1 && normalizedHaystack.includes(token)) score += 10;
  });

  return score;
}

function buildVehicleAutocompleteSuggestions(vehicles, query, limit = 8) {
  const text = normalizeSearchText(query);
  if (text.length < 2) return [];

  const suggestions = new Map();

  function addSuggestion(suggestion) {
    if (!suggestion.label) return;

    const key = `${suggestion.type}:${normalizeSearchText(suggestion.label)}`;
    const haystack = [
      suggestion.label,
      suggestion.brand,
      suggestion.model,
      suggestion.version,
      suggestion.title,
      suggestion.year,
    ]
      .filter(Boolean)
      .join(" ");
    const score = scoreAutocompleteSuggestion(suggestion.label, haystack, text);

    if (score <= 0) return;

    const current = suggestions.get(key);
    if (!current || score > current.score) {
      suggestions.set(key, {
        ...suggestion,
        searchValue: suggestion.searchValue || suggestion.label,
        score,
      });
    }
  }

  vehicles.filter(isVehicleVisibleForBuyer).forEach((vehicle) => {
    const { brand, model, version, year, title } =
      getVehicleAutocompleteFields(vehicle);

    if (!brand) return;

    addSuggestion({
      type: "brand",
      label: brand,
      searchValue: brand,
      brand,
      title,
      year,
    });

    if (model) {
      const modelLabel = `${brand} ${model}`;

      addSuggestion({
        type: "model",
        label: modelLabel,
        searchValue: modelLabel,
        brand,
        model,
        title,
        year,
      });
    }

    if (model && version) {
      const versionLabel = `${brand} ${model} ${version}`;

      addSuggestion({
        type: "version",
        label: versionLabel,
        searchValue: versionLabel,
        brand,
        model,
        version,
        title,
        year,
      });
    }
  });

  return Array.from(suggestions.values())
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "es"))
    .slice(0, limit);
}

function formatPrice(price) {
  const n = Number(price || 0);
  if (!n) return "Consultar";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString("es-AR")}`;
}

function getVehicleStatus(vehicle) {
  return normalizeText(
    getVehicleField(
      vehicle,
      "status",
      "publicationStatus",
      "publication_status"
    )
  );
}

function getDealerRank(vehicle, dealer) {
  return normalizeText(
    dealer?.rank ||
      dealer?.plan ||
      dealer?.dealerRank ||
      vehicle.dealerRank ||
      vehicle.raw?.dealer_rank ||
      vehicle.raw?.dealer_plan
  );
}

function getUniqueOptions(vehicles, getter) {
  return Array.from(
    new Set(
      vehicles
        .map((vehicle) => String(getter(vehicle) || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));
}

function matchesAdvancedFilters(vehicle, dealer, filters) {
  const brand = normalizeText(vehicle.brand);
  const model = normalizeText(vehicle.model);
  const version = normalizeText(vehicle.version);
  const province = normalizeText(vehicle.province || vehicle.raw?.province);
  const city = normalizeText(vehicle.city || vehicle.raw?.city);
  const bodyType = normalizeText(getVehicleField(vehicle, "bodyType", "body_type"));
  const fuel = normalizeText(getVehicleField(vehicle, "fuelType", "fuel_type"));
  const transmission = normalizeText(getVehicleField(vehicle, "transmission"));
  const status = getVehicleStatus(vehicle);
  const dealerRank = getDealerRank(vehicle, dealer);

  const year = getVehicleYear(vehicle);
  const price = getVehiclePrice(vehicle);
  const km = getVehicleKm(vehicle);

  if (filters.brand && brand !== normalizeText(filters.brand)) return false;
  if (filters.model && model !== normalizeText(filters.model)) return false;
  if (filters.version && version !== normalizeText(filters.version)) return false;

  if (filters.yearFrom && year < Number(filters.yearFrom)) return false;
  if (filters.yearTo && year > Number(filters.yearTo)) return false;

  if (filters.priceMin && price < Number(filters.priceMin)) return false;
  if (filters.priceMax && price > Number(filters.priceMax)) return false;

  if (filters.kmMax && km > Number(filters.kmMax)) return false;

  if (filters.province && province !== normalizeText(filters.province)) {
    return false;
  }

  if (filters.city && city !== normalizeText(filters.city)) {
    return false;
  }

  if (filters.vehicleType && !bodyType.includes(normalizeText(filters.vehicleType))) {
    return false;
  }

  if (filters.fuel && !fuel.includes(normalizeText(filters.fuel))) {
    return false;
  }

  if (
    filters.transmission &&
    !transmission.includes(normalizeText(filters.transmission))
  ) {
    return false;
  }

  if (filters.financing === "yes" && !vehicleHasFinancing(vehicle)) return false;
  if (filters.financing === "no" && vehicleHasFinancing(vehicle)) return false;

  if (filters.status === "reserved" && !status.includes("reserv")) return false;
  if (filters.status === "available" && status.includes("reserv")) return false;

  if (filters.dealerRank && !dealerRank.includes(normalizeText(filters.dealerRank))) {
    return false;
  }

  return true;
}

const FILTER_CHIP_LABELS = {
  brand: "Marca",
  model: "Modelo",
  version: "Versión",
  yearFrom: "Año desde",
  yearTo: "Año hasta",
  priceMin: "Precio mín.",
  priceMax: "Precio máx.",
  kmMax: "Km máx.",
  province: "Provincia",
  city: "Ciudad",
  vehicleType: "Tipo",
  fuel: "Combustible",
  transmission: "Transmisión",
  financing: "Financiación",
  status: "Estado",
  dealerRank: "Dealer",
};

const FILTER_CHIP_VALUE_LABELS = {
  financing: { yes: "Con financiación", no: "Sin financiación" },
  status: { reserved: "Reservados", available: "Disponibles" },
};

const EMPTY_ADVANCED_FILTERS = {
  brand: "",
  model: "",
  version: "",
  yearFrom: "",
  yearTo: "",
  priceMin: "",
  priceMax: "",
  kmMax: "",
  province: "",
  city: "",
  vehicleType: "",
  fuel: "",
  transmission: "",
  financing: "",
  status: "",
  dealerRank: "",
};

const SEARCH_STORAGE_KEY = "ox-nexmov-search";
const SEARCH_HISTORY_KEY = "ox-nexmov-search-history";
const SEARCH_HISTORY_MAX = 5;

function readSearchHistory() {
  try {
    const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.slice(0, SEARCH_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(query) {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) return;
  try {
    const current = readSearchHistory();
    const updated = [trimmed, ...current.filter((q) => q !== trimmed)].slice(0, SEARCH_HISTORY_MAX);
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

function readSearchStorage() {
  try {
    const stored = window.sessionStorage.getItem(SEARCH_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

const SEARCH_QUERY_PARAM_TO_FILTER = {
  marca: "brand",
  modelo: "model",
  version: "version",
  provincia: "province",
  ciudad: "city",
  precio_min: "priceMin",
  precio_max: "priceMax",
  year_min: "yearFrom",
  year_max: "yearTo",
  km_max: "kmMax",
};

const SEARCH_FILTER_TO_QUERY_PARAM = Object.entries(
  SEARCH_QUERY_PARAM_TO_FILTER
).reduce(
  (acc, [param, filterKey]) => ({
    ...acc,
    [filterKey]: param,
  }),
  {}
);

function readSearchQueryParams() {
  if (typeof window === "undefined") {
    return {
      searchText: "",
      filters: EMPTY_ADVANCED_FILTERS,
      hasParams: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const nextFilters = { ...EMPTY_ADVANCED_FILTERS };
  const searchText = params.get("q") || "";
  let hasParams = Boolean(searchText);

  Object.entries(SEARCH_QUERY_PARAM_TO_FILTER).forEach(([param, filterKey]) => {
    const value = params.get(param) || "";
    if (!value) return;

    nextFilters[filterKey] = value;
    hasParams = true;
  });

  return {
    searchText,
    filters: nextFilters,
    hasParams,
  };
}

function hasSearchQueryParams() {
  return readSearchQueryParams().hasParams;
}

function buildSearchQueryString(searchText, filters) {
  const params = new URLSearchParams();
  const cleanSearchText = String(searchText || "").trim();

  if (cleanSearchText) {
    params.set("q", cleanSearchText);
  }

  Object.entries(SEARCH_FILTER_TO_QUERY_PARAM).forEach(([filterKey, param]) => {
    const value = String(filters?.[filterKey] || "").trim();
    if (!value) return;

    params.set(param, value);
  });

  return params.toString();
}

function getInitialSearchText() {
  const queryState = readSearchQueryParams();
  if (queryState.hasParams) return queryState.searchText;

  return readSearchStorage()?.searchText || "";
}

function getInitialFilters() {
  const queryState = readSearchQueryParams();
  if (queryState.hasParams) return queryState.filters;

  const stored = readSearchStorage()?.filters;
  if (!stored || typeof stored !== "object") return EMPTY_ADVANCED_FILTERS;
  return { ...EMPTY_ADVANCED_FILTERS, ...stored };
}

const SEARCH_QUICK_ACTIONS = [
  "SUV financiada",
  "Primer auto",
  "0km entrega inmediata",
  "Bajo consumo",
  "Pick up diesel",
  "Familiar 7 asientos",
];

const SEARCH_TRUST_ITEMS = [
  {
    title: "Dealers verificados",
    text: "Publican solo dealers validados por oX NEXMOV.",
  },
  {
    title: "Datos reales",
    text: "Información coherente y revisada para comparar mejor.",
  },
  {
    title: "Comparador real",
    text: "Hasta 4 vehículos lado a lado.",
  },
  {
    title: "Consultas trazables",
    text: "Cada contacto queda registrado antes del WhatsApp.",
  },
  {
    title: "Financiación clara",
    text: "Entrega, cuotas y condiciones visibles.",
  },
];

function FilterDropdown({
  label,
  value,
  placeholder,
  options,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const items = [{ value: "", label: placeholder }, ...options];
  const selected = items.find((item) => item.value === value);
  const displayLabel = selected?.label || placeholder;

  return (
    <label className="ox-filter-select-field">
      {label}
      <div
        className={`ox-filter-dropdown${isOpen ? " is-open" : ""}`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsOpen(false);
          }
        }}
      >
        <button
          type="button"
          className="ox-filter-dropdown-trigger"
          onClick={() => setIsOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{displayLabel}</span>
        </button>

        {isOpen && (
          <div className="ox-filter-dropdown-menu" role="listbox">
            {items.map((item) => (
              <button
                key={`${label}-${item.value || "all"}`}
                type="button"
                role="option"
                aria-selected={item.value === value}
                className={item.value === value ? "is-selected" : ""}
                onClick={() => {
                  onChange(item.value);
                  setIsOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}

export default function Search({
  appActions,
  onNavigate,
  initialSearchQuery = "",
}) {
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");
  const [searchText, setSearchText] = useState(getInitialSearchText);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState(getInitialFilters);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("default");
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const [searchHistory, setSearchHistory] = useState(readSearchHistory);
  const [visibleCount, setVisibleCount] = useState(20);
  const [radarModalOpen, setRadarModalOpen] = useState(false);
  const [radarActivated, setRadarActivated] = useState(false);

  function updateFilter(name, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function clearAdvancedFilters() {
    setFilters(EMPTY_ADVANCED_FILTERS);
  }

  async function loadVehicles() {
    setLoadingVehicles(true);
    setVehiclesError("");

    const { vehicles: supabaseVehicles, error } = await listPublicVehicles();

    if (error) {
      setVehicles([]);
      setVehiclesError("No pudimos cargar vehículos disponibles en este momento.");
      setLoadingVehicles(false);
      return;
    }

    if (!supabaseVehicles.length) {
      setVehicles([]);
      setVehiclesError("No hay vehículos publicados disponibles.");
      setLoadingVehicles(false);
      return;
    }

    setVehicles(supabaseVehicles);
    setLoadingVehicles(false);
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        SEARCH_STORAGE_KEY,
        JSON.stringify({ searchText, filters })
      );
    } catch {
      // sessionStorage unavailable
    }
  }, [searchText, filters]);

  useEffect(() => {
    const queryString = buildSearchQueryString(searchText, filters);
    const nextUrl = queryString ? `/buscar?${queryString}` : "/buscar";
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState({ route: "search" }, "", nextUrl);
    }
  }, [searchText, filters]);

  useEffect(() => {
    function handleSearchPopState() {
      const queryState = readSearchQueryParams();

      if (!queryState.hasParams) {
        setSearchText("");
        setFilters(EMPTY_ADVANCED_FILTERS);
        setShowSuggestions(false);
        return;
      }

      setSearchText(queryState.searchText);
      setFilters(queryState.filters);
      setShowSuggestions(false);
    }

    window.addEventListener("popstate", handleSearchPopState);

    return () => {
      window.removeEventListener("popstate", handleSearchPopState);
    };
  }, []);

  useEffect(() => {
    const nextQuery = String(initialSearchQuery || "").trim();

    if (hasSearchQueryParams()) return;
    if (!nextQuery) return;

    setSearchText(nextQuery);
    setShowSuggestions(false);
  }, [initialSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 260);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setRadarActivated(false);
  }, [searchText, filters]);

  function getDealer(vehicle) {
    if (vehicle.dealer) return vehicle.dealer;
    return null;
  }

  const parsedSearch = useMemo(
    () => parseSmartVehicleSearch(searchText),
    [searchText]
  );

  const publicSearchVehicles = useMemo(
    () => vehicles.filter(isVehicleVisibleForBuyer),
    [vehicles]
  );

  const visibleSuggestions = useMemo(
    () => buildVehicleAutocompleteSuggestions(publicSearchVehicles, debouncedSearchText, 8),
    [publicSearchVehicles, debouncedSearchText]
  );

  const ghostCompletion = useMemo(
    () => getGhostCompletion(searchText, visibleSuggestions),
    [searchText, visibleSuggestions]
  );

  function commitSearch(query) {
    const trimmed = String(query || "").trim();
    if (trimmed.length >= 2) {
      saveSearchHistory(trimmed);
      setSearchHistory(readSearchHistory());
    }
    setShowSuggestions(false);
  }

  function handleSuggestionSelect(suggestion) {
    setSearchText(suggestion.searchValue);
    commitSearch(suggestion.searchValue);

    setFilters((currentFilters) => ({
      ...currentFilters,
      brand: suggestion.brand || currentFilters.brand,
      model:
        suggestion.type === "model" || suggestion.type === "version"
          ? suggestion.model || ""
          : "",
      version: suggestion.type === "version" ? suggestion.version || "" : "",
    }));
  }

  const filterOptions = useMemo(() => {
    const filteredForModel = publicSearchVehicles.filter((vehicle) => {
      if (!filters.brand) return true;
      return normalizeText(vehicle.brand) === normalizeText(filters.brand);
    });

    const filteredForVersion = publicSearchVehicles.filter((vehicle) => {
      if (
        filters.brand &&
        normalizeText(vehicle.brand) !== normalizeText(filters.brand)
      ) {
        return false;
      }

      if (
        filters.model &&
        normalizeText(vehicle.model) !== normalizeText(filters.model)
      ) {
        return false;
      }

      return true;
    });

    const filteredForCity = publicSearchVehicles.filter((vehicle) => {
      if (!filters.province) return true;
      return (
        normalizeText(vehicle.province || vehicle.raw?.province) ===
        normalizeText(filters.province)
      );
    });

    return {
      brands: getUniqueOptions(publicSearchVehicles, (vehicle) => vehicle.brand),
      models: getUniqueOptions(filteredForModel, (vehicle) => vehicle.model),
      versions: getUniqueOptions(filteredForVersion, (vehicle) => vehicle.version),
      provinces: getUniqueOptions(
        publicSearchVehicles,
        (vehicle) => vehicle.province || vehicle.raw?.province
      ),
      cities: getUniqueOptions(
        filteredForCity,
        (vehicle) => vehicle.city || vehicle.raw?.city
      ),
      bodyTypes: getUniqueOptions(publicSearchVehicles, (vehicle) =>
        getVehicleField(vehicle, "bodyType", "body_type")
      ),
      fuels: getUniqueOptions(publicSearchVehicles, (vehicle) =>
        getVehicleField(vehicle, "fuelType", "fuel_type")
      ),
      transmissions: getUniqueOptions(publicSearchVehicles, (vehicle) =>
        getVehicleField(vehicle, "transmission")
      ),
    };
  }, [publicSearchVehicles, filters.brand, filters.model, filters.province]);

  const filteredVehicles = useMemo(() => {
    const text = searchText.trim();

    const smartSearchResults = !text
      ? publicSearchVehicles.map((vehicle) => ({
          vehicle,
          score: 0,
          hardFail: false,
        }))
      : publicSearchVehicles
          .map((vehicle) => {
            const dealer = getDealer(vehicle);
            const result = scoreVehicleMatch(vehicle, searchText, { dealer });

            return {
              vehicle,
              score: result.score,
              hardFail: !result.matched,
            };
          })
          .filter((item) => !item.hardFail && item.score > 0)
          .sort((a, b) => b.score - a.score);

    return smartSearchResults
      .filter((item) => {
        const dealer = getDealer(item.vehicle);
        return matchesAdvancedFilters(item.vehicle, dealer, filters);
      })
      .map((item) => item.vehicle);
  }, [publicSearchVehicles, searchText, filters]);

  const sortedVehicles = useMemo(() => {
    setVisibleCount(20);
    const list = [...filteredVehicles];
    if (sortOrder === "price_asc") return list.sort((a, b) => getVehiclePrice(a) - getVehiclePrice(b));
    if (sortOrder === "price_desc") return list.sort((a, b) => getVehiclePrice(b) - getVehiclePrice(a));
    if (sortOrder === "km_asc") return list.sort((a, b) => getVehicleKm(a) - getVehicleKm(b));
    if (sortOrder === "newest") return list.sort((a, b) => getVehicleYear(b) - getVehicleYear(a));
    return list;
  }, [filteredVehicles, sortOrder]);

  const activeAdvancedFiltersCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  const activeFilterChips = useMemo(() => {
    return Object.entries(filters)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => ({
        key,
        label: FILTER_CHIP_LABELS[key] || key,
        value: FILTER_CHIP_VALUE_LABELS[key]?.[value] || value,
      }));
  }, [filters]);

  const oportunidadVehicles = useMemo(() => {
    return publicSearchVehicles
      .filter((v) => v.mainImageUrl || v.imageUrl)
      .slice(0, 6);
  }, [publicSearchVehicles]);

  const radarTrigger = useMemo(() => {
    if (!loadingVehicles && sortedVehicles.length === 0 && (searchText.trim().length >= 2 || activeFilterChips.length >= 1)) {
      return "no_results";
    }
    if (!loadingVehicles && sortedVehicles.length > 0 && sortedVehicles.length <= 2 && activeFilterChips.length >= 2) {
      return "few_results";
    }
    return null;
  }, [loadingVehicles, sortedVehicles, searchText, activeFilterChips]);

  const searchSummary = useMemo(() => {
    if (!searchText.trim()) {
      if (activeAdvancedFiltersCount > 0) {
        return `Filtros aplicados: ${activeAdvancedFiltersCount}.`;
      }

      return "Escribí una marca, modelo, versión, precio, kilometraje, año, financiación o tipo de vehículo.";
    }

    const parts = [];

    if (parsedSearch.maxPrice) {
      parts.push(`precio hasta ${parsedSearch.maxPrice.toLocaleString("es-AR")}`);
    }

    if (parsedSearch.targetPrice) {
      parts.push(
        `precio cercano a ${parsedSearch.targetPrice.toLocaleString("es-AR")}`
      );
    }

    if (parsedSearch.maxKm) {
      parts.push(`hasta ${parsedSearch.maxKm.toLocaleString("es-AR")} km`);
    }

    if (parsedSearch.targetKm) {
      parts.push(
        `kilometraje cercano a ${parsedSearch.targetKm.toLocaleString("es-AR")} km`
      );
    }

    if (parsedSearch.years.length > 0) {
      parts.push(`año ${parsedSearch.years.join(", ")}`);
    }

    if (parsedSearch.wantsFinancing) parts.push("con financiación");
    if (parsedSearch.wantsAutomatic) parts.push("automático");
    if (parsedSearch.wantsManual) parts.push("manual");
    if (parsedSearch.wantsDiesel) parts.push("diésel");
    if (parsedSearch.wantsNafta) parts.push("nafta");

    if (parsedSearch.bodyTypes.length > 0) {
      parts.push(parsedSearch.bodyTypes.join(", "));
    }

    if (parts.length === 0) {
      return `Buscando coincidencias para “${searchText}”.`;
    }

    return `Interpretación: ${parts.join(" · ")}.`;
  }, [searchText, parsedSearch, activeAdvancedFiltersCount]);

  return (
    <>
    <section className="ox-search-page">
      <div className="ox-search-shell">
        <section className="ox-search-hero">
          <div className="ox-search-hero-road" aria-hidden="true" />
          <div className="ox-search-hero-main">
          <div className="ox-search-title-block">
            <p className="ox-search-eyebrow">Búsqueda inteligente</p>
            <h1>
              Buscá con más <span>claridad</span><span>.</span>
            </h1>
            <p>
              Filtrá vehículos por precio, ubicación, financiación, kilometraje
              y señales comerciales antes de contactar.
            </p>
          </div>

          <div className="ox-search-command">
            <div className="ox-search-input-wrap vehicle-autocomplete">
              <label>¿Qué vehículo estás buscando?</label>

              {ghostCompletion && (
                <span className="vehicle-autocomplete-ghost" aria-hidden="true">
                  <span>{searchText}</span>
                  {ghostCompletion.suffix}
                </span>
              )}

              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    ghostCompletion &&
                    (event.key === "Tab" || event.key === "ArrowRight") &&
                    event.currentTarget.selectionStart === searchText.length
                  ) {
                    event.preventDefault();
                    handleSuggestionSelect(ghostCompletion.suggestion);
                  }
                }}
                placeholder="Ej: SUV automática financiada en Buenos Aires"
              />
            </div>

            <button
              type="button"
              className="ox-search-primary-btn"
              onClick={() => commitSearch(searchText)}
            >
              Buscar
            </button>
          </div>


          <div className="ox-search-status">
            <span>{searchSummary}</span>
            <strong>
              {sortedVehicles.length} de {publicSearchVehicles.length} vehículos
            </strong>
          </div>

          {vehiclesError && <div className="auth-warning">{vehiclesError}</div>}
          </div>

          {oportunidadVehicles.length > 0 && (
            <div className="ox-search-hero-opor">
              <p className="ox-search-opor-label">Oportunidades</p>
              {oportunidadVehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="ox-search-opor-card"
                  onClick={() => {
                    setSearchText(`${v.brand} ${v.model}`);
                    commitSearch(`${v.brand} ${v.model}`);
                  }}
                >
                  {(v.mainImageUrl || v.imageUrl) && (
                    <img src={v.mainImageUrl || v.imageUrl} alt="" loading="lazy" decoding="async" />
                  )}
                  <div className="ox-search-opor-card-info">
                    <strong>{v.brand} {v.model}</strong>
                    <span>{v.year}</span>
                    <em>{formatPrice(v.price)}</em>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="ox-search-hero-brand" aria-hidden="true">
            <img
              className="ox-search-hero-logo"
              src="/hero-car.svg"
              alt=""
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
        </section>

        <section className="ox-search-workspace">
          <aside className="ox-search-filters">
            <button
              type="button"
              className="ox-search-mobile-filter-toggle"
              onClick={() => setIsMobileFiltersOpen((current) => !current)}
              aria-expanded={isMobileFiltersOpen}
            >
              <span>Filtros avanzados</span>
              <small>
                {activeAdvancedFiltersCount > 0
                  ? `${activeAdvancedFiltersCount} activos`
                  : "Ver opciones"}
              </small>
            </button>

            <div className={`ox-search-filters-panel${
              isMobileFiltersOpen ? " is-open" : ""
            }`}>
              <div className="ox-search-side-card ox-search-advanced-filters">
                <div className="ox-search-side-head">
                <div>
                  <h2>Filtros</h2>
                  <p>
                    {activeAdvancedFiltersCount > 0
                      ? `${activeAdvancedFiltersCount} filtros activos`
                      : "Afiná la búsqueda con datos reales."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    clearAdvancedFilters();
                    setSearchText("");
                    setShowSuggestions(false);
                  }}
                  disabled={
                    !searchText.trim() && activeAdvancedFiltersCount === 0
                  }
                >
                  Limpiar
                </button>
              </div>

              <div className="ox-filter-section">
                <strong>Vehículo</strong>

                <FilterDropdown
                  label="Marca"
                  value={filters.brand}
                  placeholder="Todas"
                  options={filterOptions.brands.map((brand) => ({
                    value: brand,
                    label: brand,
                  }))}
                  onChange={(value) => {
                    updateFilter("brand", value);
                    updateFilter("model", "");
                    updateFilter("version", "");
                  }}
                />

                <FilterDropdown
                  label="Modelo"
                  value={filters.model}
                  placeholder="Todos"
                  options={filterOptions.models.map((model) => ({
                    value: model,
                    label: model,
                  }))}
                  onChange={(value) => {
                    updateFilter("model", value);
                    updateFilter("version", "");
                  }}
                />

                <FilterDropdown
                  label="Versión"
                  value={filters.version}
                  placeholder="Todas"
                  options={filterOptions.versions.map((version) => ({
                    value: version,
                    label: version,
                  }))}
                  onChange={(value) => updateFilter("version", value)}
                />
              </div>

              <div className="ox-filter-section">
                <strong>Rango de precio y año</strong>

                <div className="ox-filter-two">
                  <label>
                    Precio mín.
                    <input
                      type="number"
                      min="0"
                      value={filters.priceMin}
                      onChange={(event) =>
                        updateFilter("priceMin", event.target.value)
                      }
                      placeholder="0"
                    />
                  </label>

                  <label>
                    Precio máx.
                    <input
                      type="number"
                      min="0"
                      value={filters.priceMax}
                      onChange={(event) =>
                        updateFilter("priceMax", event.target.value)
                      }
                      placeholder="30000000"
                    />
                  </label>
                </div>

                <div className="ox-filter-two">
                  <label>
                    Año desde
                    <input
                      type="number"
                      min="1980"
                      max="2035"
                      value={filters.yearFrom}
                      onChange={(event) =>
                        updateFilter("yearFrom", event.target.value)
                      }
                      placeholder="2015"
                    />
                  </label>

                  <label>
                    Año hasta
                    <input
                      type="number"
                      min="1980"
                      max="2035"
                      value={filters.yearTo}
                      onChange={(event) =>
                        updateFilter("yearTo", event.target.value)
                      }
                      placeholder="2026"
                    />
                  </label>
                </div>

                <label>
                  Kilometraje máximo
                  <input
                    type="number"
                    min="0"
                    value={filters.kmMax}
                    onChange={(event) =>
                      updateFilter("kmMax", event.target.value)
                    }
                    placeholder="100000"
                  />
                </label>
              </div>

              <div className="ox-filter-section">
                <strong>Provincia / ciudad</strong>

                <FilterDropdown
                  label="Provincia"
                  value={filters.province}
                  placeholder="Todas"
                  options={filterOptions.provinces.map((province) => ({
                    value: province,
                    label: province,
                  }))}
                  onChange={(value) => {
                    updateFilter("province", value);
                    updateFilter("city", "");
                  }}
                />

                <FilterDropdown
                  label="Ciudad"
                  value={filters.city}
                  placeholder="Todas"
                  options={filterOptions.cities.map((city) => ({
                    value: city,
                    label: city,
                  }))}
                  onChange={(value) => updateFilter("city", value)}
                />
              </div>

              <div className="ox-filter-section">
                <strong>Características</strong>

                <FilterDropdown
                  label="Tipo"
                  value={filters.vehicleType}
                  placeholder="Todos"
                  options={filterOptions.bodyTypes.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  onChange={(value) => updateFilter("vehicleType", value)}
                />

                <FilterDropdown
                  label="Combustible"
                  value={filters.fuel}
                  placeholder="Todos"
                  options={filterOptions.fuels.map((fuel) => ({
                    value: fuel,
                    label: fuel,
                  }))}
                  onChange={(value) => updateFilter("fuel", value)}
                />

                <FilterDropdown
                  label="Transmisión"
                  value={filters.transmission}
                  placeholder="Todas"
                  options={filterOptions.transmissions.map((transmission) => ({
                    value: transmission,
                    label: transmission,
                  }))}
                  onChange={(value) => updateFilter("transmission", value)}
                />
              </div>

              <div className="ox-filter-section">
                <strong>Comercial</strong>

                <FilterDropdown
                  label="Financiación"
                  value={filters.financing}
                  placeholder="Todas"
                  options={[
                    { value: "yes", label: "Con financiación" },
                    { value: "no", label: "Sin financiación" },
                  ]}
                  onChange={(value) => updateFilter("financing", value)}
                />

                <FilterDropdown
                  label="Estado"
                  value={filters.status}
                  placeholder="Todos"
                  options={[
                    { value: "available", label: "Disponibles" },
                    { value: "reserved", label: "Reservados" },
                  ]}
                  onChange={(value) => updateFilter("status", value)}
                />

                <FilterDropdown
                  label="Rango dealer"
                  value={filters.dealerRank}
                  placeholder="Todos"
                  options={[
                    { value: "inicio", label: "Inicio" },
                    { value: "pro", label: "Pro" },
                    { value: "elite", label: "Elite" },
                    { value: "platinum", label: "Platinum" },
                  ]}
                  onChange={(value) => updateFilter("dealerRank", value)}
                />
              </div>


              <button
                type="button"
                className="ox-search-update-btn"
                onClick={loadVehicles}
              >
                Actualizar vehículos
              </button>

              <button
                type="button"
                className="ox-search-apply-mobile-filters"
                onClick={() => setIsMobileFiltersOpen(false)}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
          </aside>

          <main className="ox-search-results">
            <div className="ox-search-results-toolbar">
              <div>
                <h2>Resultados</h2>
                <p>
                  Mostrando {Math.min(visibleCount, sortedVehicles.length)} de {sortedVehicles.length} unidades disponibles.
                </p>
              </div>

              <div className="ox-search-result-actions">
                <select
                  className="ox-search-sort-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  aria-label="Ordenar resultados"
                >
                  <option value="default">Más relevantes</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                  <option value="km_asc">Km: menor a mayor</option>
                  <option value="newest">Más recientes</option>
                </select>
              </div>
            </div>

            {activeFilterChips.length > 0 && (
              <div className="ox-search-active-chips" aria-label="Filtros activos">
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="ox-search-chip-active"
                    onClick={() => updateFilter(chip.key, "")}
                    aria-label={`Quitar filtro ${chip.label}`}
                  >
                    <span>{chip.label}: {chip.value}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
                {activeFilterChips.length > 1 && (
                  <button
                    type="button"
                    className="ox-search-chip-clear-all"
                    onClick={clearAdvancedFilters}
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
            )}

            <div className="vehicle-grid ox-search-vehicle-grid">
              {loadingVehicles
                ? Array.from({ length: 6 }, (_, n) => (
                    <div key={n} className="vehicle-card-skeleton">
                      <div className="vehicle-card-skeleton__image ox-shimmer" />
                      <div className="vehicle-card-skeleton__body">
                        <div className="vehicle-card-skeleton__line ox-shimmer" />
                        <div className="vehicle-card-skeleton__line vehicle-card-skeleton__line--short ox-shimmer" />
                        <div className="vehicle-card-skeleton__price ox-shimmer" />
                      </div>
                    </div>
                  ))
                : sortedVehicles.slice(0, visibleCount).map((vehicle) => (
                    <VehicleCardPublic
                      key={vehicle.id}
                      vehicle={vehicle}
                      dealer={getDealer(vehicle)}
                      appActions={appActions}
                      onNavigate={onNavigate}
                      vehicles={sortedVehicles}
                      getDealer={getDealer}
                    />
                  ))}
            </div>

            {!loadingVehicles && visibleCount < sortedVehicles.length && (
              <div className="ox-search-load-more">
                <button
                  type="button"
                  className="ox-search-load-more-btn"
                  onClick={() => setVisibleCount((c) => c + 20)}
                >
                  Ver más vehículos ({sortedVehicles.length - visibleCount} restantes)
                </button>
              </div>
            )}

            {sortedVehicles.length === 0 && (
              <div className="ox-search-empty-state" role="status" aria-live="polite">
                <div className="ox-search-empty-state-copy">
                  <h3>No hay resultados con esta búsqueda.</h3>
                  <p>
                    Ajustá los filtros para abrir más opciones o probá uno de estos
                    criterios sugeridos para encontrar vehículos disponibles ahora.
                  </p>
                </div>
                <div className="ox-search-empty-actions">
                  <button
                    type="button"
                    onClick={() => {
                      clearAdvancedFilters();
                      setSearchText("");
                      setShowSuggestions(false);
                    }}
                  >
                    Limpiar filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearAdvancedFilters();
                      setSearchText("");
                      setShowSuggestions(false);
                      loadVehicles();
                    }}
                  >
                    Volver a ver todos
                  </button>
                  <button type="button" onClick={() => onNavigate?.("zeroKm")}>
                    Ver 0km con financiación
                  </button>
                </div>

                {radarTrigger === "no_results" && !radarActivated && (
                  <div className="ox-radar-cta">
                    <div className="ox-radar-cta-body">
                      <span className="ox-radar-cta-badge">Radar oX</span>
                      <h4>¿Querés que te avisemos?</h4>
                      <p>
                        Registramos tu búsqueda. Cuando aparezca un vehículo
                        que coincida, lo verás en tu Garage oX.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ox-radar-cta-btn"
                      onClick={() => setRadarModalOpen(true)}
                    >
                      Activar Radar oX
                    </button>
                  </div>
                )}

                {radarActivated && (
                  <div className="ox-radar-confirmed">
                    Radar oX activado. Revisá tu Garage oX para ver el estado.
                  </div>
                )}
              </div>
            )}

            {!loadingVehicles && radarTrigger === "few_results" && !radarActivated && (
              <div className="ox-radar-few-cta">
                <div className="ox-radar-few-cta-inner">
                  <span className="ox-radar-cta-badge">Radar oX</span>
                  <p>
                    Solo {sortedVehicles.length} resultado{sortedVehicles.length !== 1 ? "s" : ""} con estos filtros.
                    Activá Radar oX para recibir alerta si aparecen más.
                  </p>
                  <button
                    type="button"
                    className="ox-radar-cta-btn ox-radar-cta-btn--inline"
                    onClick={() => setRadarModalOpen(true)}
                  >
                    Activar Radar oX
                  </button>
                </div>
              </div>
            )}
          </main>

          <aside className="ox-search-aside">
            <div className="ox-search-side-card ox-search-decision-card">
              <span>Decisión</span>
              <h2>Compará mejor</h2>
              <p>
                Seleccioná hasta 4 vehículos para revisar precio, km,
                financiación y ubicación lado a lado.
              </p>

              <button
                type="button"
                className="ox-search-compare-btn"
                onClick={() => appActions?.openCompare?.()}
              >
                Ver comparador
              </button>
            </div>

            <div className="ox-search-side-card ox-search-signal-card">
              <span>Lectura</span>
              <h2>Señales clave</h2>
              <ul>
                <li>Precio bajo referencia.</li>
                <li>Financiación disponible.</li>
                <li>Dealer verificado.</li>
                <li>Vehículo comparable.</li>
              </ul>
            </div>

            <div className="ox-search-side-card ox-search-contact-card">
              <span>Contacto</span>
              <h2>Consulta trazable</h2>
              <p>
                El contacto queda ordenado para que comprador y dealer sigan la
                oportunidad con más claridad.
              </p>
            </div>

            <div className="ox-search-side-card ox-search-tip-card">
              <span>Consejo</span>
              <h2>Abrí más opciones</h2>
              <p>
                Si hay pocos resultados, probá ampliar marca, precio o ubicación
                antes de descartar alternativas.
              </p>
            </div>
          </aside>
        </section>

        <section className="ox-search-trust-strip">
          {SEARCH_TRUST_ITEMS.map((item) => (
            <article key={item.title}>
              <span aria-hidden="true">◇</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>

    {radarModalOpen && (
      <RadarActivationModal
        searchText={searchText}
        filters={filters}
        parsedIntent={parsedSearch}
        resultsCount={sortedVehicles.length}
        triggerReason={radarTrigger || "no_results"}
        onClose={() => setRadarModalOpen(false)}
        onActivated={() => setRadarActivated(true)}
      />
    )}
    </>
  );
}
