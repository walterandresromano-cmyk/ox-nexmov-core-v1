import { useEffect, useMemo, useState } from "react";

import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import { mockDealers, mockVehicles } from "../../data/mockData.js";
import { listPublicVehicles } from "../../services/vehicles.service.js";
import {
  flattenCatalogSuggestions,
  listVehicleCatalog,
} from "../../services/catalog.service.js";

function getMockDealer(vehicle) {
  return mockDealers.find((dealer) => dealer.id === vehicle.dealerId);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  return "Sugerencia";
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

export default function Search({
  appActions,
  onNavigate,
  initialSearchQuery = "",
}) {
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [catalogSuggestions, setCatalogSuggestions] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [filters, setFilters] = useState(EMPTY_ADVANCED_FILTERS);

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
      setVehicles(mockVehicles);
      setVehiclesError(
        `${error.message}. Usando vehículos mock como respaldo temporal.`
      );
      setLoadingVehicles(false);
      return;
    }

    if (!supabaseVehicles.length) {
      setVehicles(mockVehicles);
      setVehiclesError(
        "Supabase devolvió 0 vehículos públicos. Usando vehículos mock como respaldo temporal."
      );
      setLoadingVehicles(false);
      return;
    }

    setVehicles(supabaseVehicles);
    setLoadingVehicles(false);
  }

  async function loadCatalog() {
    setLoadingCatalog(true);
    setCatalogError("");

    const { catalog, error } = await listVehicleCatalog();

    if (error) {
      setCatalogSuggestions([]);
      setCatalogError(
        error.message || "No se pudo cargar el catálogo de vehículos."
      );
      setLoadingCatalog(false);
      return;
    }

    setCatalogSuggestions(flattenCatalogSuggestions(catalog || []));
    setLoadingCatalog(false);
  }

  useEffect(() => {
    loadVehicles();
    loadCatalog();
  }, []);

  useEffect(() => {
    const nextQuery = String(initialSearchQuery || "").trim();

    if (!nextQuery) return;

    setSearchText(nextQuery);
    setShowSuggestions(false);
  }, [initialSearchQuery]);

  function getDealer(vehicle) {
    if (vehicle.dealer) return vehicle.dealer;
    return getMockDealer(vehicle);
  }

  const parsedSearch = useMemo(
    () => parseSmartVehicleSearch(searchText),
    [searchText]
  );

  const visibleSuggestions = useMemo(() => {
    const text = normalizeText(searchText);

    if (text.length < 2) return [];

    return catalogSuggestions
      .map((suggestion) => {
        const label = normalizeText(suggestion.label);

        let score = 0;

        if (label === text) score += 100;
        if (label.startsWith(text)) score += 60;
        if (label.includes(text)) score += 30;

        text.split(" ").forEach((token) => {
          if (token.length > 1 && label.includes(token)) {
            score += 8;
          }
        });

        return {
          ...suggestion,
          score,
        };
      })
      .filter((suggestion) => suggestion.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [catalogSuggestions, searchText]);

  const filterOptions = useMemo(() => {
    const filteredForModel = vehicles.filter((vehicle) => {
      if (!filters.brand) return true;
      return normalizeText(vehicle.brand) === normalizeText(filters.brand);
    });

    const filteredForVersion = vehicles.filter((vehicle) => {
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

    const filteredForCity = vehicles.filter((vehicle) => {
      if (!filters.province) return true;
      return (
        normalizeText(vehicle.province || vehicle.raw?.province) ===
        normalizeText(filters.province)
      );
    });

    return {
      brands: getUniqueOptions(vehicles, (vehicle) => vehicle.brand),
      models: getUniqueOptions(filteredForModel, (vehicle) => vehicle.model),
      versions: getUniqueOptions(filteredForVersion, (vehicle) => vehicle.version),
      provinces: getUniqueOptions(
        vehicles,
        (vehicle) => vehicle.province || vehicle.raw?.province
      ),
      cities: getUniqueOptions(
        filteredForCity,
        (vehicle) => vehicle.city || vehicle.raw?.city
      ),
      bodyTypes: getUniqueOptions(vehicles, (vehicle) =>
        getVehicleField(vehicle, "bodyType", "body_type")
      ),
      fuels: getUniqueOptions(vehicles, (vehicle) =>
        getVehicleField(vehicle, "fuelType", "fuel_type")
      ),
      transmissions: getUniqueOptions(vehicles, (vehicle) =>
        getVehicleField(vehicle, "transmission")
      ),
    };
  }, [vehicles, filters.brand, filters.model, filters.province]);

  const filteredVehicles = useMemo(() => {
    const text = searchText.trim();

    const smartSearchResults = !text
      ? vehicles.map((vehicle) => ({
          vehicle,
          score: 0,
          hardFail: false,
        }))
      : vehicles
          .map((vehicle) => {
            const dealer = getDealer(vehicle);
            const result = scoreVehicleForSearch(vehicle, dealer, parsedSearch);

            return {
              vehicle,
              score: result.score,
              hardFail: result.hardFail,
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
  }, [vehicles, searchText, parsedSearch, filters]);

  const activeAdvancedFiltersCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

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
    <section className="ox-search-page">
      <div className="ox-search-shell">
        <section className="ox-search-hero">
          <div className="ox-search-title-block">
            <p className="ox-search-eyebrow">Motor avanzado</p>
            <h1>
              Buscar vehículos<span>.</span>
            </h1>
            <p>
              Encontrá el vehículo ideal con datos reales, dealers verificados y
              herramientas para decidir mejor.
            </p>
          </div>

          <div className="ox-search-command">
            <div className="ox-search-input-wrap">
              <label>¿Qué vehículo estás buscando?</label>

              <input
                value={searchText}
                onFocus={() => setShowSuggestions(true)}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Ej: SUV automática financiada en Buenos Aires"
              />

              {showSuggestions && visibleSuggestions.length > 0 && (
                <div className="ox-search-suggestions">
                  {visibleSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.type}-${suggestion.label}`}
                      type="button"
                      onClick={() => {
                        setSearchText(suggestion.searchValue);
                        setShowSuggestions(false);
                      }}
                    >
                      <strong>{suggestion.label}</strong>
                      <span>{getSuggestionTypeLabel(suggestion.type)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="ox-search-primary-btn"
              onClick={() => setShowSuggestions(false)}
            >
              Buscar
            </button>
          </div>

          <div className="ox-search-suggested">
            <span>Búsquedas sugeridas:</span>
            {SEARCH_QUICK_ACTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSearchText(item);
                  setShowSuggestions(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="ox-search-status">
            <span>{searchSummary}</span>
            <strong>
              {filteredVehicles.length} de {vehicles.length} vehículos
            </strong>
            {loadingCatalog && <em>Cargando catálogo...</em>}
          </div>

          {catalogError && <div className="auth-warning">{catalogError}</div>}
          {vehiclesError && <div className="auth-warning">{vehiclesError}</div>}

          {loadingVehicles && (
            <div className="auth-message">
              Cargando vehículos desde Supabase...
            </div>
          )}
        </section>

        <section className="ox-search-workspace">
          <aside className="ox-search-filters">
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

                <label>
                  Marca
                  <select
                    value={filters.brand}
                    onChange={(event) => {
                      updateFilter("brand", event.target.value);
                      updateFilter("model", "");
                      updateFilter("version", "");
                    }}
                  >
                    <option value="">Todas</option>
                    {filterOptions.brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Modelo
                  <select
                    value={filters.model}
                    onChange={(event) => {
                      updateFilter("model", event.target.value);
                      updateFilter("version", "");
                    }}
                  >
                    <option value="">Todos</option>
                    {filterOptions.models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Versión
                  <select
                    value={filters.version}
                    onChange={(event) =>
                      updateFilter("version", event.target.value)
                    }
                  >
                    <option value="">Todas</option>
                    {filterOptions.versions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ox-filter-section">
                <strong>Precio y año</strong>

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
                <strong>Ubicación</strong>

                <label>
                  Provincia
                  <select
                    value={filters.province}
                    onChange={(event) => {
                      updateFilter("province", event.target.value);
                      updateFilter("city", "");
                    }}
                  >
                    <option value="">Todas</option>
                    {filterOptions.provinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Ciudad
                  <select
                    value={filters.city}
                    onChange={(event) =>
                      updateFilter("city", event.target.value)
                    }
                  >
                    <option value="">Todas</option>
                    {filterOptions.cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ox-filter-section">
                <strong>Características</strong>

                <label>
                  Tipo
                  <select
                    value={filters.vehicleType}
                    onChange={(event) =>
                      updateFilter("vehicleType", event.target.value)
                    }
                  >
                    <option value="">Todos</option>
                    {filterOptions.bodyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Combustible
                  <select
                    value={filters.fuel}
                    onChange={(event) =>
                      updateFilter("fuel", event.target.value)
                    }
                  >
                    <option value="">Todos</option>
                    {filterOptions.fuels.map((fuel) => (
                      <option key={fuel} value={fuel}>
                        {fuel}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Transmisión
                  <select
                    value={filters.transmission}
                    onChange={(event) =>
                      updateFilter("transmission", event.target.value)
                    }
                  >
                    <option value="">Todas</option>
                    {filterOptions.transmissions.map((transmission) => (
                      <option key={transmission} value={transmission}>
                        {transmission}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ox-filter-section">
                <strong>Comercial</strong>

                <label>
                  Financiación
                  <select
                    value={filters.financing}
                    onChange={(event) =>
                      updateFilter("financing", event.target.value)
                    }
                  >
                    <option value="">Todas</option>
                    <option value="yes">Con financiación</option>
                    <option value="no">Sin financiación</option>
                  </select>
                </label>

                <label>
                  Estado
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      updateFilter("status", event.target.value)
                    }
                  >
                    <option value="">Todos</option>
                    <option value="available">Disponibles</option>
                    <option value="reserved">Reservados</option>
                  </select>
                </label>

                <label>
                  Rango dealer
                  <select
                    value={filters.dealerRank}
                    onChange={(event) =>
                      updateFilter("dealerRank", event.target.value)
                    }
                  >
                    <option value="">Todos</option>
                    <option value="inicio">Inicio</option>
                    <option value="pro">Pro</option>
                    <option value="elite">Elite</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </label>
              </div>

              <div className="ox-filter-section ox-filter-shortcuts">
                <strong>Atajos inteligentes</strong>

                <div>
                  {SEARCH_QUICK_ACTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setSearchText(item);
                        setShowSuggestions(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="ox-search-update-btn"
                onClick={loadVehicles}
              >
                Actualizar vehículos
              </button>
            </div>
          </aside>

          <main className="ox-search-results">
            <div className="ox-search-results-toolbar">
              <div>
                <h2>Resultados</h2>
                <p>
                  Mostrando {filteredVehicles.length} unidades disponibles con
                  lectura comercial.
                </p>
              </div>

              <div className="ox-search-result-actions">
                <button type="button">Más relevantes</button>
              </div>
            </div>

            <div className="vehicle-grid ox-search-vehicle-grid">
              {filteredVehicles.map((vehicle) => (
                <VehicleCardPublic
                  key={vehicle.id}
                  vehicle={vehicle}
                  dealer={getDealer(vehicle)}
                  appActions={appActions}
                  onNavigate={onNavigate}
                />
              ))}
            </div>

            {filteredVehicles.length === 0 && (
              <div className="empty-state">
                No hay vehículos que coincidan con la búsqueda. Probá con otra
                marca, un precio más amplio, otro kilometraje o quitá alguna
                condición.
              </div>
            )}
          </main>

          <aside className="ox-search-aside">
            <div className="ox-search-side-card">
              <h2>Comparador</h2>
              <p>Seleccioná hasta 4 vehículos para verlos lado a lado.</p>

              <button
                type="button"
                className="ox-search-compare-btn"
                onClick={() => appActions?.openCompare?.()}
              >
                Ver comparador
              </button>
            </div>

            <div className="ox-search-side-card">
              <h2>Oportunidades</h2>

              <div className="ox-search-opportunity-list">
                {filteredVehicles.slice(0, 3).map((vehicle) => (
                  <article key={`opportunity-${vehicle.id}`}>
                    <strong>
                      {vehicle.brand} {vehicle.model}
                    </strong>
                    <span>
                      {getVehiclePrice(vehicle).toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </article>
                ))}

                {filteredVehicles.length === 0 && (
                  <article>
                    <strong>Sin oportunidades visibles</strong>
                    <span>Probá ampliar la búsqueda.</span>
                  </article>
                )}
              </div>
            </div>

            <div className="ox-search-side-card">
              <h2>Búsqueda inteligente</h2>
              <p>
                Podés escribir frases naturales como “SUV financiada hasta 20
                millones” o “Toyota automático bajo kilometraje”.
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
  );
}