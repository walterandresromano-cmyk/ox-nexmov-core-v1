import { useCallback, useEffect, useState } from "react";
import { formatARS } from "../../lib/formatters.js";
import {
  listContraofertasForDealer,
  respondContraoferta,
} from "../../services/contraofertas.service.js";

const STATUS_LABEL = {
  pendiente:      "Pendiente",
  aceptada:       "Aceptada",
  rechazada:      "Rechazada",
  contraofertada: "Contraoferta enviada",
  expirada:       "Expirada",
};

const STATUS_CLASS = {
  pendiente:      "contraoferta-status--pending",
  aceptada:       "contraoferta-status--accepted",
  rechazada:      "contraoferta-status--rejected",
  contraofertada: "contraoferta-status--countered",
  expirada:       "contraoferta-status--expired",
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function DealerContraofertasModule() {
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [responding, setResponding]     = useState(null);
  const [respondMode, setRespondMode]   = useState(null); // "accept" | "reject" | "counter"
  const [noteInput, setNoteInput]       = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [respondError, setRespondError] = useState("");
  const [respondingId, setRespondingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await listContraofertasForDealer();
    setItems(data || []);
    setError(err?.message || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openRespond(id, mode) {
    setResponding(id);
    setRespondMode(mode);
    setNoteInput("");
    setCounterPrice("");
    setRespondError("");
  }

  function closeRespond() {
    setResponding(null);
    setRespondMode(null);
    setNoteInput("");
    setCounterPrice("");
    setRespondError("");
  }

  async function handleRespond(id, status) {
    setRespondError("");
    let dealerPrecio = null;
    if (status === "contraofertada") {
      dealerPrecio = Number(String(counterPrice).replace(/\D/g, ""));
      if (!dealerPrecio || dealerPrecio <= 0) {
        setRespondError("Ingresá un precio válido para la contraoferta.");
        return;
      }
    }
    setRespondingId(id);
    const { error: err } = await respondContraoferta({
      id, status, dealerNote: noteInput || null, dealerPrecio,
    });
    setRespondingId(null);
    if (err) { setRespondError(err.message || "Error al responder."); return; }
    closeRespond();
    load();
  }

  const pendientes = items.filter((i) => i.status === "pendiente");
  const activas    = items.filter((i) => i.status === "contraofertada");
  const resueltas  = items.filter((i) => !["pendiente", "contraofertada"].includes(i.status));

  if (loading) return <p className="contraoferta-module-loading">Cargando contraofertas...</p>;
  if (error)   return <p className="contraoferta-module-error">{error}</p>;
  if (!items.length) return (
    <p className="contraoferta-module-empty">No hay contraofertas recibidas todavía.</p>
  );

  function renderRespondForm(item) {
    if (responding !== item.id) return null;
    const isSending = respondingId === item.id;

    if (respondMode === "counter") {
      return (
        <div className="contraoferta-card__respond-form">
          <p className="contraoferta-card__respond-hint">
            Oferta del comprador: <strong>{formatARS(item.precio_ofertado)}</strong>
          </p>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Tu precio de contraoferta"
            value={counterPrice}
            onChange={(e) => { setCounterPrice(e.target.value); setRespondError(""); }}
            className="contraoferta-card__note-input"
            disabled={isSending}
          />
          <input
            type="text"
            placeholder="Nota para el comprador (opcional)"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            className="contraoferta-card__note-input"
            disabled={isSending}
          />
          {respondError && <p className="contraoferta-card__error">{respondError}</p>}
          <div className="contraoferta-card__respond-btns">
            <button
              type="button"
              className="contraoferta-card__btn contraoferta-card__btn--counter"
              onClick={() => handleRespond(item.id, "contraofertada")}
              disabled={isSending}
            >
              {isSending ? "Enviando…" : "Enviar contraoferta"}
            </button>
            <button
              type="button"
              className="contraoferta-card__btn contraoferta-card__btn--cancel"
              onClick={closeRespond}
              disabled={isSending}
            >
              Cancelar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="contraoferta-card__respond-form">
        <input
          type="text"
          placeholder="Nota para el comprador (opcional)"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          className="contraoferta-card__note-input"
          disabled={isSending}
        />
        {respondError && <p className="contraoferta-card__error">{respondError}</p>}
        <div className="contraoferta-card__respond-btns">
          <button
            type="button"
            className="contraoferta-card__btn contraoferta-card__btn--accept"
            onClick={() => handleRespond(item.id, "aceptada")}
            disabled={isSending}
          >
            {isSending ? "Guardando…" : "Aceptar"}
          </button>
          <button
            type="button"
            className="contraoferta-card__btn contraoferta-card__btn--reject"
            onClick={() => handleRespond(item.id, "rechazada")}
            disabled={isSending}
          >
            Rechazar
          </button>
          <button
            type="button"
            className="contraoferta-card__btn contraoferta-card__btn--cancel"
            onClick={closeRespond}
            disabled={isSending}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  function renderPendingCard(item) {
    const days = daysUntil(item.expires_at);
    const expiryWarning = days !== null && days <= 5;

    return (
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
            {item.buyer_phone && (
              <a
                href={`https://wa.me/${item.buyer_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contraoferta-card__wa-btn"
              >
                WhatsApp
              </a>
            )}
          </div>
        )}
        <div className="contraoferta-card__date">
          {new Date(item.created_at).toLocaleDateString("es-AR", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
          {days !== null && (
            <span className={`contraoferta-card__expiry${expiryWarning ? " contraoferta-card__expiry--warn" : ""}`}>
              {days <= 0 ? " · Expira hoy" : ` · Expira en ${days}d`}
            </span>
          )}
        </div>

        {responding === item.id ? renderRespondForm(item) : (
          <div className="contraoferta-card__action-btns">
            <button
              type="button"
              className="contraoferta-card__btn contraoferta-card__btn--accept"
              onClick={() => openRespond(item.id, "accept")}
            >
              Aceptar
            </button>
            <button
              type="button"
              className="contraoferta-card__btn contraoferta-card__btn--counter"
              onClick={() => openRespond(item.id, "counter")}
            >
              Contraofertar
            </button>
            <button
              type="button"
              className="contraoferta-card__btn contraoferta-card__btn--reject"
              onClick={() => openRespond(item.id, "reject")}
            >
              Rechazar
            </button>
          </div>
        )}
      </li>
    );
  }

  function renderActivaCard(item) {
    return (
      <li key={item.id} className="contraoferta-card contraoferta-card--countered">
        <span className={`contraoferta-status ${STATUS_CLASS.contraofertada}`}>
          {STATUS_LABEL.contraofertada}
        </span>
        <div className="contraoferta-card__vehicle">
          {item.vehicle_brand} {item.vehicle_model} · {item.vehicle_year}
        </div>
        <div className="contraoferta-card__prices">
          <span className="contraoferta-card__pub">Oferta comprador: {formatARS(item.precio_ofertado)}</span>
          <span className="contraoferta-card__offer">Tu contraoferta: <strong>{formatARS(item.dealer_precio_contraoferta)}</strong></span>
        </div>
        {item.buyer_phone && (
          <a
            href={`https://wa.me/${item.buyer_phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="contraoferta-card__wa-btn"
          >
            Contactar por WhatsApp
          </a>
        )}
      </li>
    );
  }

  function renderResueltaCard(item) {
    return (
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
        {item.status === "aceptada" && item.buyer_phone && (
          <a
            href={`https://wa.me/${item.buyer_phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="contraoferta-card__wa-btn contraoferta-card__wa-btn--primary"
          >
            Coordinar por WhatsApp
          </a>
        )}
        {item.dealer_note && (
          <p className="contraoferta-card__dealer-note">"{item.dealer_note}"</p>
        )}
      </li>
    );
  }

  return (
    <div className="contraoferta-module">
      {pendientes.length > 0 && (
        <section className="contraoferta-module__section">
          <h3 className="contraoferta-module__section-title">
            Pendientes ({pendientes.length})
          </h3>
          <ul className="contraoferta-module__list">
            {pendientes.map(renderPendingCard)}
          </ul>
        </section>
      )}

      {activas.length > 0 && (
        <section className="contraoferta-module__section">
          <h3 className="contraoferta-module__section-title">
            Contraofertas enviadas ({activas.length})
          </h3>
          <ul className="contraoferta-module__list">
            {activas.map(renderActivaCard)}
          </ul>
        </section>
      )}

      {resueltas.length > 0 && (
        <section className="contraoferta-module__section">
          <h3 className="contraoferta-module__section-title">Historial</h3>
          <ul className="contraoferta-module__list">
            {resueltas.map(renderResueltaCard)}
          </ul>
        </section>
      )}
    </div>
  );
}
