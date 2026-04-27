import { useEffect, useState } from "react";

import {
  assignSellVehicleLeadToDealer,
  listDealersAvailableForSellVehicleAssignment,
} from "../services/sellVehicle.service.js";

export default function AssignSellVehicleLeadDealer({ lead, onAssigned }) {
  const [dealers, setDealers] = useState([]);
  const [dealerId, setDealerId] = useState(lead?.assigned_dealer_id || "");
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function loadDealers() {
    setLoadingDealers(true);
    setError("");

    const { dealers: availableDealers, error: dealersError } =
      await listDealersAvailableForSellVehicleAssignment();

    if (dealersError) {
      setDealers([]);
      setError(dealersError.message || "No se pudieron cargar dealers.");
      setLoadingDealers(false);
      return;
    }

    setDealers(availableDealers || []);
    setLoadingDealers(false);
  }

  useEffect(() => {
    loadDealers();
  }, []);

  useEffect(() => {
    setDealerId(lead?.assigned_dealer_id || "");
  }, [lead?.assigned_dealer_id]);

  async function handleAssign() {
    setAssigning(true);
    setSaved(false);
    setError("");

    if (!dealerId) {
      setError("Seleccioná un dealer.");
      setAssigning(false);
      return;
    }

    const { error: assignError } = await assignSellVehicleLeadToDealer({
      leadId: lead.lead_id,
      dealerId,
    });

    if (assignError) {
      setError(assignError.message || "No se pudo asignar la solicitud.");
      setAssigning(false);
      return;
    }

    setSaved(true);
    setAssigning(false);

    if (onAssigned) {
      await onAssigned();
    }

    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="assign-dealer-box">
      <label>
        Dealer asignado
        <select
          value={dealerId}
          onChange={(event) => {
            setDealerId(event.target.value);
            setError("");
            setSaved(false);
          }}
          disabled={loadingDealers || assigning}
        >
          <option value="">
            {loadingDealers ? "Cargando dealers..." : "Seleccionar dealer"}
          </option>

          {dealers.map((dealer) => (
            <option key={dealer.dealer_id} value={dealer.dealer_id}>
              {dealer.name} · {dealer.plan_code} · {dealer.city},{" "}
              {dealer.province}
              {dealer.can_receive_sell_vehicle_leads ? " · habilitado" : ""}
            </option>
          ))}
        </select>
      </label>

      <button
        className="table-action-btn"
        type="button"
        onClick={handleAssign}
        disabled={assigning || loadingDealers}
      >
        {assigning ? "Asignando..." : "Asignar dealer"}
      </button>

      {saved && <span>Dealer asignado</span>}
      {error && <small>{error}</small>}
    </div>
  );
}