import { useCallback, useEffect, useState } from "react";
import { formatARS } from "../../lib/formatters.js";
import {
  listContraofertasForDealer,
  respondContraoferta,
} from "../../services/contraofertas.service.js";

const STATUS_LABEL = {
  pendiente: "Pendiente",
  aceptada:  "Aceptada",
  rechazada: "Rechazada",
};

const STATUS_CLASS = {
  pendiente: "contraoferta-status--pending",
  aceptada:  "contraoferta-status--accepted",
  rechazada: "contraoferta-status--rejected",
};

export default function DealerContraofertasModule() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [responding, setResponding] = useState(null); // id being responded to
  const [noteInput, setNoteInput]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await listContraofertasForDealer();
    setItems(data || []);
    setError(err?.message || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRespond(id, status) {
    const { error: err } = await respondContraoferta({
      id,
      status,
      dealerNote: noteInput || null,
    });
    if (err) {
      alert(err.message || "Error al responder.");
      return;
    }
    setResponding(null);
    setNoteInput("");
    load();
  }

  const pendientes = items.filter((i) => i.status === "pendiente");
  const resueltas  = items.filter((i) => i.status !== "pendiente");

  if (loading) return <p className="contraoferta-module-loading">Cargando contraofertas...</p>;
  if (error)   return <p className="contraoferta-module-error">{error}</p>;
  if (!items.length) return (
    <p className="contraoferta-module-empty">No hay contraofertas recibidas todavía.</p>
  );

  return (
    <div className="contraoferta-module">
      {pendientes.length > 0 && (
        <section className="contraoferta-module__section">
          <h3 className="contraoferta-module__section-title">Pendientes ({pendientes.length})</h3>
          <ul className="contraoferta-module__list">
            {pendientes.map((item) => (
              <li key={item.id} className="contraoferta-card">
                <div className="contraoferta-card__vehicle">
                  {item.vehicle_brand} {item.vehicle_model} {item.vehicle_version} · {item.vehicle_year}
                </div>
                <div className="contraoferta-card__prices">
                  <span className="contraoferta-card__pub">Publicado: {formatARS(item.vehicle_price)}</span>
                  <span className="contraoferta-card__offer">Oferta: <strong>{formatARS(item.precio_ofertado)}</strong></span>
                </div>
                {(item.buyer_name || item.buyer_phone) && (
                  <div className="contraoferta-card__buyer">
                    {item.buyer_name && <span>{item.buyer_name}</span>}
                    {item.buyer_phone && <span>{item.buyer_phone}</span>}
                  </div>
                )}
                <div className="contraoferta-card__date">
                  {new Date(item.created_at).toLocaleDateString("es-AR", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </div>

                {responding === item.id ? (
                  <div className="contraoferta-card__respond-form">
                    <input
                      type="text"
                      placeholder="Nota para el comprador (opcional)"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="contraoferta-card__note-input"
                    />
                    <div className="contraoferta-card__respond-btns">
                      <button
                        type="button"
                        className="contraoferta-card__btn contraoferta-card__btn--accept"
                        onClick={() => handleRespond(item.id, "aceptada")}
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        className="contraoferta-card__btn contraoferta-card__btn--reject"
                        onClick={() => handleRespond(item.id, "rechazada")}
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        className="contraoferta-card__btn contraoferta-card__btn--cancel"
                        onClick={() => { setResponding(null); setNoteInput(""); }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="contraoferta-card__btn contraoferta-card__btn--primary"
                    onClick={() => { setResponding(item.id); setNoteInput(""); }}
                  >
                    Responder oferta
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {resueltas.length > 0 && (
        <section className="contraoferta-module__section">
          <h3 className="contraoferta-module__section-title">Historial</h3>
          <ul className="contraoferta-module__list">
            {resueltas.map((item) => (
              <li key={item.id} className="contraoferta-card contraoferta-card--resolved">
                <span className={`contraoferta-status ${STATUS_CLASS[item.status] || ""}`}>
                  {STATUS_LABEL[item.status] || item.status}
                </span>
                <div className="contraoferta-card__vehicle">
                  {item.vehicle_brand} {item.vehicle_model} · {item.vehicle_year}
                </div>
                <div className="contraoferta-card__prices">
                  <span className="contraoferta-card__pub">{formatARS(item.vehicle_price)}</span>
                  <span className="contraoferta-card__offer">→ {formatARS(item.precio_ofertado)}</span>
                </div>
                {item.dealer_note && (
                  <p className="contraoferta-card__dealer-note">"{item.dealer_note}"</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
