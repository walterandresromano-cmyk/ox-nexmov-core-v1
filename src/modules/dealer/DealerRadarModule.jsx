import { useEffect, useMemo, useState } from "react";
import {
  buildRadarCriteriaSummary,
  listRadarRequestsForDealer,
} from "../../services/radarRequests.service.js";

const TRIGGER_LABELS = {
  no_results: "Sin resultados",
  few_results: "Pocos resultados",
};

function formatDate(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(
    new Date(dateValue)
  );
}

export default function DealerRadarModule({ onBack }) {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
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
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return allRequests;
    return allRequests.filter((req) => {
      const text = [
        req.search_text,
        req.notes,
        ...buildRadarCriteriaSummary(req.search_text, req.filters, req.parsed_intent),
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [allRequests, filterText]);

  return (
    <div className="dealer-leads-section dealer-radar-module">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Radar oX</h2>
          <p>
            Búsquedas activas registradas por compradores. Cada señal representa
            intención real sin contacto activo todavía.
          </p>
        </div>

        {!loading && !loadError && (
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={async () => {
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
            }}
          >
            Actualizar
          </button>
        )}
      </div>

      {loading && (
        <div className="auth-message">Cargando señales Radar oX…</div>
      )}

      {!loading && loadError && (
        <div className="auth-warning">{loadError}</div>
      )}

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
          <div className="dealer-radar-toolbar">
            <input
              type="text"
              className="dealer-radar-filter-input"
              placeholder="Filtrar por marca, modelo, precio…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <span className="dealer-radar-count">
              {filtered.length} señal{filtered.length !== 1 ? "es" : ""}
            </span>
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">Sin resultados para este filtro.</div>
          )}

          <ul className="dealer-radar-list">
            {filtered.map((req) => {
              const parts = buildRadarCriteriaSummary(
                req.search_text,
                req.filters,
                req.parsed_intent
              );
              return (
                <li key={req.id} className="dealer-radar-item">
                  <div className="dealer-radar-item-head">
                    <span className="dealer-radar-trigger-badge">
                      {TRIGGER_LABELS[req.trigger_reason] || "Búsqueda activa"}
                    </span>
                    <time className="dealer-radar-item-date">
                      {formatDate(req.created_at)}
                    </time>
                  </div>

                  <div className="dealer-radar-criteria">
                    {parts.length > 0 ? (
                      <ul className="dealer-radar-criteria-chips">
                        {parts.map((part, i) => (
                          <li key={i} className="dealer-radar-chip">
                            {part}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="dealer-radar-no-criteria">
                        Sin criterios específicos registrados
                      </span>
                    )}
                  </div>

                  {req.notes && (
                    <p className="dealer-radar-notes">"{req.notes}"</p>
                  )}

                  <div className="dealer-radar-item-footer">
                    <span className="dealer-radar-results-hint">
                      {req.results_count === 0
                        ? "Buscó y no encontró ningún vehículo"
                        : `Solo ${req.results_count} resultado${req.results_count !== 1 ? "s" : ""} en su búsqueda`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="dealer-radar-disclaimer">
            Las señales Radar oX son intención de búsqueda sin datos de contacto
            del comprador. No reemplazan las consultas reales. Usá esta información para evaluar
            tu inventario.
          </p>
        </>
      )}
    </div>
  );
}
