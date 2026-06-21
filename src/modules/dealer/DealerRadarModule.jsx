import { useEffect, useMemo, useState } from "react";
import {
  buildRadarCriteriaSummary,
  listRadarRequestsForDealer,
} from "../../services/radarRequests.service.js";

const TRIGGER_LABELS = {
  no_results:   "Sin resultados",
  few_results:  "Pocos resultados",
};

const SORT_OPTIONS = [
  { value: "match",    label: "Tu stock primero" },
  { value: "urgency",  label: "Mayor urgencia" },
  { value: "demand",   label: "Mayor demanda" },
  { value: "newest",   label: "Más recientes" },
];

function vehicleMatchesRequest(vehicle, req) {
  if (!vehicle.is_active) return false;

  const vBrand    = (vehicle.brand    || "").toLowerCase().trim();
  const vModel    = (vehicle.model    || "").toLowerCase().trim();
  const vProvince = (vehicle.province || "").toLowerCase().trim();
  const vYear     = Number(vehicle.year  || 0);
  const vPrice    = Number(vehicle.price || 0);
  const vKm       = Number(vehicle.km    || 0);

  const rBrand    = (req.filters?.brand    || "").toLowerCase().trim();
  const rModel    = (req.filters?.model    || "").toLowerCase().trim();
  const rProvince = (req.filters?.province || "").toLowerCase().trim();
  const rMaxPrice = req.parsed_intent?.maxPrice ? Number(req.parsed_intent.maxPrice) : null;
  const rMaxKm    = req.parsed_intent?.maxKm    ? Number(req.parsed_intent.maxKm)    : null;
  const rYears    = req.parsed_intent?.years?.length
    ? req.parsed_intent.years.map(String)
    : null;

  if (rBrand    && vBrand !== rBrand) return false;
  if (rModel    && !vModel.includes(rModel)) return false;
  if (rProvince && vProvince !== rProvince) return false;
  if (rMaxPrice && vPrice > rMaxPrice) return false;
  if (rMaxKm    && vKm > rMaxKm) return false;
  if (rYears    && !rYears.includes(String(vYear))) return false;

  // At least one filter must be defined to count as a meaningful match
  return !!(rBrand || rModel || rProvince || rMaxPrice || rMaxKm || rYears);
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(dateValue));
}

function getDemandKey(req) {
  const brand = req.filters?.brand?.toLowerCase() || "";
  const model = req.filters?.model?.toLowerCase() || "";
  return brand || model ? `${brand}::${model}` : null;
}

export default function DealerRadarModule({ onBack, onPublishSimilar, dealerVehicles = [] }) {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterText, setFilterText]   = useState("");
  const [sortBy, setSortBy]           = useState("match");

  async function load() {
    setLoading(true);
    setLoadError("");
    const { requests, error } = await listRadarRequestsForDealer();
    if (error) {
      setLoadError("No pudimos cargar las señales Radar oX en este momento.");
      setAllRequests([]);
    } else {
      setAllRequests(requests || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Unique brands for filter chips
  const brandChips = useMemo(() => {
    const seen = new Set();
    const brands = [];
    for (const req of allRequests) {
      const b = req.filters?.brand;
      if (b && !seen.has(b)) { seen.add(b); brands.push(b); }
    }
    return brands.sort();
  }, [allRequests]);

  // Demand map: how many signals share the same brand+model
  const demandMap = useMemo(() => {
    const counts = {};
    for (const req of allRequests) {
      const key = getDemandKey(req);
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [allRequests]);

  // Match map: for each radar request, which of the dealer's active vehicles match
  const matchMap = useMemo(() => {
    if (!dealerVehicles.length) return {};
    const map = {};
    for (const req of allRequests) {
      const matches = dealerVehicles.filter((v) => vehicleMatchesRequest(v, req));
      if (matches.length) map[req.id] = matches;
    }
    return map;
  }, [allRequests, dealerVehicles]);

  const filtered = useMemo(() => {
    let result = allRequests;

    if (filterBrand) {
      result = result.filter((r) => r.filters?.brand === filterBrand);
    }

    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      result = result.filter((req) => {
        const text = [
          req.search_text,
          req.notes,
          ...buildRadarCriteriaSummary(req.search_text, req.filters, req.parsed_intent),
        ].join(" ").toLowerCase();
        return text.includes(q);
      });
    }

    if (sortBy === "match") {
      result = [...result].sort((a, b) => {
        const hasA = matchMap[a.id] ? 0 : 1;
        const hasB = matchMap[b.id] ? 0 : 1;
        if (hasA !== hasB) return hasA - hasB;
        const urgA = a.results_count === 0 ? 0 : 1;
        const urgB = b.results_count === 0 ? 0 : 1;
        if (urgA !== urgB) return urgA - urgB;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (sortBy === "urgency") {
      result = [...result].sort((a, b) => {
        const urgA = a.results_count === 0 ? 0 : a.trigger_reason === "no_results" ? 0 : 1;
        const urgB = b.results_count === 0 ? 0 : b.trigger_reason === "no_results" ? 0 : 1;
        if (urgA !== urgB) return urgA - urgB;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (sortBy === "demand") {
      result = [...result].sort((a, b) => {
        const dA = demandMap[getDemandKey(a)] || 1;
        const dB = demandMap[getDemandKey(b)] || 1;
        if (dB !== dA) return dB - dA;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else {
      result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return result;
  }, [allRequests, filterBrand, filterText, sortBy, demandMap, matchMap]);

  return (
    <div className="dealer-leads-section dealer-radar-module">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Radar oX</h2>
          <p>
            Búsquedas activas de compradores que no encontraron lo que buscaban.
            Cada señal es intención real sin contacto activo todavía.
          </p>
        </div>
        {!loading && !loadError && (
          <button type="button" className="admin-refresh-btn" onClick={load}>
            Actualizar
          </button>
        )}
      </div>

      {loading && <div className="auth-message">Cargando señales Radar oX…</div>}
      {!loading && loadError && <div className="auth-warning">{loadError}</div>}

      {!loading && !loadError && allRequests.length === 0 && (
        <div className="empty-state dealer-radar-empty">
          <strong>Sin señales activas por ahora</strong>
          <p>
            Cuando compradores no encuentren vehículos con sus criterios,
            activarán Radar oX. Las señales aparecen aquí.
          </p>
        </div>
      )}

      {!loading && !loadError && allRequests.length > 0 && (
        <>
          {/* Brand filter chips */}
          {brandChips.length > 0 && (
            <div className="dealer-radar-brand-chips">
              <button
                type="button"
                className={`dealer-radar-chip-btn${!filterBrand ? " dealer-radar-chip-btn--active" : ""}`}
                onClick={() => setFilterBrand("")}
              >
                Todas
              </button>
              {brandChips.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  className={`dealer-radar-chip-btn${filterBrand === brand ? " dealer-radar-chip-btn--active" : ""}`}
                  onClick={() => setFilterBrand(filterBrand === brand ? "" : brand)}
                >
                  {brand}
                  {demandMap[`${brand.toLowerCase()}::`] > 1 && (
                    <span className="dealer-radar-chip-count">
                      {demandMap[`${brand.toLowerCase()}::`]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Toolbar: text filter + sort */}
          <div className="dealer-radar-toolbar">
            <input
              type="text"
              className="dealer-radar-filter-input"
              placeholder="Buscar por modelo, precio, provincia…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <select
              className="dealer-radar-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="dealer-radar-count">
              {filtered.length} señal{filtered.length !== 1 ? "es" : ""}
            </span>
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">Sin resultados para este filtro.</div>
          )}

          <ul className="dealer-radar-list">
            {filtered.map((req) => {
              const parts       = buildRadarCriteriaSummary(req.search_text, req.filters, req.parsed_intent);
              const demandKey   = getDemandKey(req);
              const demandCount = demandKey ? demandMap[demandKey] || 1 : 1;
              const isUrgent    = req.results_count === 0 || req.trigger_reason === "no_results";
              const canPublish  = !!(req.filters?.brand || req.filters?.model);
              const stockMatch  = matchMap[req.id] || null;

              return (
                <li
                  key={req.id}
                  className={[
                    "dealer-radar-item",
                    isUrgent   ? "dealer-radar-item--urgent" : "",
                    stockMatch ? "dealer-radar-item--match"  : "",
                  ].filter(Boolean).join(" ")}
                >
                  <div className="dealer-radar-item-head">
                    <span className="dealer-radar-trigger-badge">
                      {TRIGGER_LABELS[req.trigger_reason] || "Búsqueda activa"}
                    </span>
                    {stockMatch && (
                      <span className="dealer-radar-match-badge">
                        En tu stock
                      </span>
                    )}
                    {demandCount > 1 && (
                      <span className="dealer-radar-demand-badge">
                        {demandCount} señales similares
                      </span>
                    )}
                    <time className="dealer-radar-item-date">{formatDate(req.created_at)}</time>
                  </div>

                  {stockMatch && (
                    <div className="dealer-radar-stock-match">
                      {stockMatch.slice(0, 3).map((v) => (
                        <span key={v.vehicle_id} className="dealer-radar-stock-vehicle">
                          {[v.brand, v.model, v.year].filter(Boolean).join(" ")}
                        </span>
                      ))}
                      {stockMatch.length > 3 && (
                        <span className="dealer-radar-stock-vehicle dealer-radar-stock-vehicle--more">
                          +{stockMatch.length - 3} más
                        </span>
                      )}
                    </div>
                  )}

                  <div className="dealer-radar-criteria">
                    {parts.length > 0 ? (
                      <ul className="dealer-radar-criteria-chips">
                        {parts.map((part, i) => (
                          <li key={i} className="dealer-radar-chip">{part}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="dealer-radar-no-criteria">Sin criterios específicos</span>
                    )}
                  </div>

                  {req.notes && <p className="dealer-radar-notes">"{req.notes}"</p>}

                  <div className="dealer-radar-item-footer">
                    <span className={`dealer-radar-results-hint${isUrgent ? " dealer-radar-results-hint--urgent" : ""}`}>
                      {req.results_count === 0
                        ? "No encontró ningún vehículo — oportunidad sin competencia"
                        : `Solo ${req.results_count} resultado${req.results_count !== 1 ? "s" : ""} en su búsqueda`}
                    </span>

                    {canPublish && onPublishSimilar && (
                      <button
                        type="button"
                        className="dealer-radar-publish-btn"
                        onClick={() =>
                          onPublishSimilar({
                            brand: req.filters?.brand || "",
                            model: req.filters?.model || "",
                            year:  req.parsed_intent?.years?.[0] || "",
                            bodyType: req.filters?.bodyType || "",
                            transmission: req.filters?.transmission || "",
                            fuelType: req.filters?.fuel || "",
                          })
                        }
                      >
                        + Publicar vehículo similar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="dealer-radar-disclaimer">
            Las señales Radar oX son intención de búsqueda anónima. No incluyen datos de
            contacto del comprador y no reemplazan las consultas directas.
          </p>
        </>
      )}
    </div>
  );
}
