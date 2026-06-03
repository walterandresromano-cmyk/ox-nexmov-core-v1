import { useState } from "react";
import { updateCurrentDealerVehicleData } from "../services/dealerVehicles.service.js";

const SERVICE_TYPES = [
  { value: "oil",      label: "Aceite / Lubricación" },
  { value: "brakes",   label: "Frenos" },
  { value: "tires",    label: "Neumáticos" },
  { value: "battery",  label: "Batería" },
  { value: "timing",   label: "Distribución / Correa" },
  { value: "service",  label: "Service general" },
  { value: "other",    label: "Otro" },
];

function emptyEntry() {
  return { id: Date.now(), type: "service", date: "", km: "", notes: "" };
}

function getInitialHistory(vehicle) {
  const mi = vehicle?.maintenance_info ?? vehicle?.maintenanceInfo ?? {};
  return Array.isArray(mi?.service_history) ? mi.service_history : [];
}

function getInitialNext(vehicle) {
  const mi = vehicle?.maintenance_info ?? vehicle?.maintenanceInfo ?? {};
  return {
    next_service_km:   mi?.next_service_km   ?? "",
    next_service_date: mi?.next_service_date ?? "",
  };
}

export default function DealerMaintenanceModal({ vehicle, onClose, onUpdated }) {
  const [history, setHistory]   = useState(() => getInitialHistory(vehicle));
  const [next, setNext]         = useState(() => getInitialNext(vehicle));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [saved, setSaved]       = useState(false);

  function addEntry() {
    setHistory((prev) => [...prev, emptyEntry()]);
  }

  function removeEntry(id) {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }

  function updateEntry(id, field, value) {
    setHistory((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  async function handleSave() {
    setLoading(true);
    setError("");

    const mi = vehicle?.maintenance_info ?? vehicle?.maintenanceInfo ?? {};

    const cleanHistory = history
      .filter((e) => e.type && (e.date || e.km || e.notes))
      .map(({ id: _id, ...rest }) => ({
        ...rest,
        km: rest.km !== "" ? Number(rest.km) : null,
      }));

    const updatedMi = {
      ...mi,
      service_history:  cleanHistory,
      next_service_km:   next.next_service_km !== "" ? Number(next.next_service_km) : null,
      next_service_date: next.next_service_date || null,
    };

    const { error: saveError } = await updateCurrentDealerVehicleData({
      ...vehicle,
      vehicleId:        vehicle.vehicle_id,
      maintenance_info: updatedMi,
      show_maintenance_info: vehicle.show_maintenance_info ?? false,
    });

    setLoading(false);

    if (saveError) {
      setError(saveError.message || "No se pudo guardar.");
      return;
    }

    setSaved(true);
    await onUpdated?.();
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  }

  const title = `${vehicle.brand} ${vehicle.model}${vehicle.version ? ` · ${vehicle.version}` : ""}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="dealer-maintenance-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dealer-maintenance-modal__head">
          <div>
            <p className="dealer-maintenance-modal__eyebrow">Historial de mantenimiento</p>
            <h3 className="dealer-maintenance-modal__title">{title}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Next service */}
        <div className="dealer-maintenance-modal__next">
          <p className="dealer-maintenance-modal__section-label">Próximo mantenimiento sugerido</p>
          <div className="dealer-maintenance-modal__next-row">
            <div className="dealer-maintenance-modal__field">
              <label>Km sugerido</label>
              <input
                type="number"
                placeholder="ej. 50000"
                value={next.next_service_km}
                onChange={(e) => setNext((p) => ({ ...p, next_service_km: e.target.value }))}
              />
            </div>
            <div className="dealer-maintenance-modal__field">
              <label>Fecha aproximada</label>
              <input
                type="month"
                value={next.next_service_date}
                onChange={(e) => setNext((p) => ({ ...p, next_service_date: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Service history */}
        <div className="dealer-maintenance-modal__history">
          <div className="dealer-maintenance-modal__history-head">
            <p className="dealer-maintenance-modal__section-label">
              Servicios realizados
              {history.length > 0 && <span className="dealer-maintenance-modal__count">{history.length}</span>}
            </p>
            <button
              type="button"
              className="dealer-maintenance-modal__add-btn"
              onClick={addEntry}
            >
              + Agregar
            </button>
          </div>

          {history.length === 0 ? (
            <p className="dealer-maintenance-modal__empty">
              Sin servicios cargados. Agregá el historial para transferirlo al Garage oX del comprador.
            </p>
          ) : (
            <div className="dealer-maintenance-modal__entries">
              {history.map((entry) => (
                <div key={entry.id} className="dealer-maintenance-entry">
                  <div className="dealer-maintenance-entry__row">
                    <select
                      value={entry.type}
                      onChange={(e) => updateEntry(entry.id, "type", e.target.value)}
                    >
                      {SERVICE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      type="month"
                      value={entry.date}
                      onChange={(e) => updateEntry(entry.id, "date", e.target.value)}
                      placeholder="Fecha"
                    />
                    <input
                      type="number"
                      value={entry.km}
                      onChange={(e) => updateEntry(entry.id, "km", e.target.value)}
                      placeholder="Km"
                    />
                    <button
                      type="button"
                      className="dealer-maintenance-entry__remove"
                      onClick={() => removeEntry(entry.id)}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    className="dealer-maintenance-entry__notes"
                    value={entry.notes}
                    onChange={(e) => updateEntry(entry.id, "notes", e.target.value)}
                    placeholder="Notas opcionales (taller, marca de repuesto…)"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="dealer-maintenance-modal__error">{error}</p>}

        <div className="dealer-maintenance-modal__footer">
          <button type="button" className="table-action-btn" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={handleSave}
            disabled={loading}
          >
            {saved ? "Guardado ✓" : loading ? "Guardando…" : "Guardar historial"}
          </button>
        </div>
      </div>
    </div>
  );
}
