import { useState } from "react";
import { createPortal } from "react-dom";
import { assignVehicleToBuyerGarage } from "../services/buyerGarage.service.js";
import { formatARS, formatKm } from "../lib/formatters.js";

const SERVICE_LABEL = {
  oil:     "Aceite / Lubricación",
  brakes:  "Frenos",
  tires:   "Neumáticos",
  battery: "Batería",
  timing:  "Distribución / Correa",
  service: "Service general",
  other:   "Otro",
};

function getServiceHistory(vehicle) {
  const mi = vehicle?.maintenance_info ?? vehicle?.maintenanceInfo ?? {};
  return Array.isArray(mi?.service_history) ? mi.service_history : [];
}

function getNextService(vehicle) {
  const mi = vehicle?.maintenance_info ?? vehicle?.maintenanceInfo ?? {};
  return {
    km:   mi?.next_service_km   ?? null,
    date: mi?.next_service_date ?? null,
  };
}

function formatMonth(ym) {
  if (!ym) return null;
  const [y, m] = ym.split("-");
  const names = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${names[Number(m) - 1] ?? m} ${y}`;
}

export default function DealerTransferGarageModal({ vehicle, vehicleLeads, dealerName, onClose, onTransferred }) {
  const [selectedLeadId, setSelectedLeadId] = useState(vehicleLeads[0]?.lead_id ?? "");
  const [note, setNote]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  const serviceHistory = getServiceHistory(vehicle);
  const nextService    = getNextService(vehicle);
  const transferDate   = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  async function handleTransfer() {
    if (!selectedLeadId) {
      setError("Seleccioná el lead del comprador para realizar la transferencia.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: transferError } = await assignVehicleToBuyerGarage({
      leadId:    Number(selectedLeadId),
      vehicleId: vehicle.vehicle_id,
      note:      note.trim() || null,
    });

    setLoading(false);

    if (transferError) {
      setError(transferError.message || "No se pudo transferir. Verificá que el lead esté activo.");
      return;
    }

    setDone(true);
    setTimeout(() => { onTransferred?.(); onClose(); }, 1800);
  }

  if (done) {
    return createPortal(
      <div className="modal-backdrop">
        <div className="dealer-transfer-modal dealer-transfer-modal--done">
          <div className="dealer-transfer-modal__done-icon">✓</div>
          <h3>Transferencia realizada</h3>
          <p>El vehículo y su historial ahora forman parte del Garage oX del comprador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="dealer-transfer-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dealer-transfer-modal__head">
          <div>
            <p className="dealer-transfer-modal__eyebrow">Transferir al Garage oX</p>
            <h3 className="dealer-transfer-modal__title">Pasaporte digital del vehículo</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Passport card */}
        <div className="dealer-transfer-passport">
          <div className="dealer-transfer-passport__header">
            <div>
              <p className="dealer-transfer-passport__vehicle">
                {vehicle.brand} {vehicle.model}
                {vehicle.version ? <span> · {vehicle.version}</span> : null}
              </p>
              <p className="dealer-transfer-passport__meta">
                {vehicle.year && <span>{vehicle.year}</span>}
                {vehicle.km != null && <span>{formatKm(vehicle.km)}</span>}
                {vehicle.price && <span>{formatARS(vehicle.price)}</span>}
              </p>
            </div>
            <div className="dealer-transfer-passport__badge">oX GARAGE</div>
          </div>

          <div className="dealer-transfer-passport__rows">
            <div className="dealer-transfer-passport__row">
              <span>Agencia vendedora</span>
              <strong>{dealerName || "—"}</strong>
            </div>
            <div className="dealer-transfer-passport__row">
              <span>Fecha de transferencia</span>
              <strong>{transferDate}</strong>
            </div>
            <div className="dealer-transfer-passport__row">
              <span>Servicios declarados</span>
              <strong>{serviceHistory.length > 0 ? `${serviceHistory.length} registro${serviceHistory.length !== 1 ? "s" : ""}` : "Sin registros"}</strong>
            </div>
            {nextService.km && (
              <div className="dealer-transfer-passport__row">
                <span>Próximo mantenimiento</span>
                <strong>
                  {nextService.km ? `${Number(nextService.km).toLocaleString("es-AR")} km` : ""}
                  {nextService.date ? ` · ${formatMonth(nextService.date)}` : ""}
                </strong>
              </div>
            )}
          </div>

          {serviceHistory.length > 0 && (
            <div className="dealer-transfer-passport__history">
              <p className="dealer-transfer-passport__history-label">Historial incluido</p>
              <ul>
                {serviceHistory.map((s, i) => (
                  <li key={i}>
                    <span className="dealer-transfer-passport__service-type">
                      {SERVICE_LABEL[s.type] ?? s.type}
                    </span>
                    {s.date && <span>{formatMonth(s.date)}</span>}
                    {s.km  && <span>{Number(s.km).toLocaleString("es-AR")} km</span>}
                    {s.notes && <span className="dealer-transfer-passport__service-notes">{s.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Lead selector */}
        <div className="dealer-transfer-modal__lead-section">
          <p className="dealer-maintenance-modal__section-label">Comprador</p>
          {vehicleLeads.length === 0 ? (
            <p className="dealer-maintenance-modal__empty">
              Este vehículo no tiene leads activos. La transferencia automática se activa cuando hay un lead asociado al comprador.
            </p>
          ) : (
            <>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="">Seleccioná el comprador…</option>
                {vehicleLeads.map((l) => (
                  <option key={l.lead_id} value={l.lead_id}>
                    {l.buyer_email || l.buyer_name || `Lead #${l.lead_id}`}
                    {l.crm_status ? ` · ${l.crm_status}` : ""}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nota opcional (entregado, financiado, etc.)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </>
          )}
        </div>

        {error && <p className="dealer-maintenance-modal__error">{error}</p>}

        <div className="dealer-maintenance-modal__footer">
          <button type="button" className="table-action-btn" onClick={onClose} disabled={loading}>
            Cerrar
          </button>
          {vehicleLeads.length > 0 && (
            <button
              type="button"
              className="primary-action"
              onClick={handleTransfer}
              disabled={loading || !selectedLeadId}
            >
              {loading ? "Transfiriendo…" : "Transferir al Garage oX"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
