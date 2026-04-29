import { useEffect, useMemo, useState } from "react";

import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import { mockDealers, mockVehicles } from "../../data/mockData.js";
import { listPublicVehicles } from "../../services/vehicles.service.js";

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
  const normalized = normalizeText(text);
  const compactNumbers = text.match(/\d[\d\.\,]*/g) || [];

  return compactNumbers
    .map((value) => Number(normalizeNumberText(value)))
    .filter((number) => Number.isFinite(number) && number > 0)
    .map((number) => {
      const before = normalized;
      return {
        value: number,
        raw: String(number),
        context: before,
      };
    });
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
    const bodyType = normalizeText(getVehicleField(vehicle, "bodyType", "body_type"));

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

export default function Search({ appActions, onNavigate }) {
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");
  const [searchText, setSearchText] = useState("");

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

  useEffect(() => {
    loadVehicles();
  }, []);

  function getDealer(vehicle) {
    if (vehicle.dealer) return vehicle.dealer;
    return getMockDealer(vehicle);
  }

  const parsedSearch = useMemo(
    () => parseSmartVehicleSearch(searchText),
    [searchText]
  );

  const filteredVehicles = useMemo(() => {
    const text = searchText.trim();

    if (!text) return vehicles;

    return vehicles
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
      .sort((a, b) => b.score - a.score)
      .map((item) => item.vehicle);
  }, [vehicles, searchText, parsedSearch]);

  const searchSummary = useMemo(() => {
    if (!searchText.trim()) {
      return "Escribí una marca, modelo, precio, kilometraje, año, financiación o tipo de vehículo.";
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
  }, [searchText, parsedSearch]);

  return (
    <section className="page-section">
      <div className="container panel">
        <p className="eyebrow">Motor avanzado</p>
        <h1>Buscar vehículos</h1>
        <p>
          Buscá por marca, modelo, versión, precio, kilometraje, año,
          financiación, transmisión, combustible o tipo de vehículo.
        </p>

        <div className="admin-toolbar">
          <div className="admin-search">
            <label>Buscar</label>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Ej: SUV financiada hasta 20 millones, Toyota automático, 100000 km..."
            />
          </div>

          <button className="admin-refresh-btn" onClick={loadVehicles}>
            Actualizar vehículos
          </button>
        </div>

        <div className="auth-message">
          {searchSummary} Resultado: {filteredVehicles.length} de{" "}
          {vehicles.length} vehículos.
        </div>

        {vehiclesError && <div className="auth-warning">{vehiclesError}</div>}

        {loadingVehicles && (
          <div className="auth-message">Cargando vehículos desde Supabase...</div>
        )}

        <div className="vehicle-grid">
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
            No hay vehículos que coincidan con la búsqueda. Probá con otra marca,
            un precio más amplio, otro kilometraje o quitá alguna condición.
          </div>
        )}
      </div>
    </section>
  );
}