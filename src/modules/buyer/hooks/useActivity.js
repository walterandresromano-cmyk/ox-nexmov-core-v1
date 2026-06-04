import { useMemo, useState } from "react";
import {
  listVehicleLeadsForCurrentBuyer,
  listZeroKmLeadsForCurrentBuyer,
} from "../../../services/buyer.service.js";
import { listSellVehicleLeadsForCurrentBuyer } from "../../../services/sellVehicle.service.js";

export function useActivity() {
  const [vehicleLeads, setVehicleLeads] = useState([]);
  const [zeroKmLeads, setZeroKmLeads] = useState([]);
  const [sellVehicleLeads, setSellVehicleLeads] = useState([]);
  const [loadingVehicleLeads, setLoadingVehicleLeads] = useState(true);
  const [loadingZeroKmLeads, setLoadingZeroKmLeads] = useState(true);
  const [loadingSellVehicleLeads, setLoadingSellVehicleLeads] = useState(true);
  const [vehicleLeadsError, setVehicleLeadsError] = useState("");
  const [zeroKmLeadsError, setZeroKmLeadsError] = useState("");
  const [sellVehicleLeadsError, setSellVehicleLeadsError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const isLoading = loadingVehicleLeads || loadingZeroKmLeads || loadingSellVehicleLeads;

  const totalActivity = useMemo(
    () => vehicleLeads.length + zeroKmLeads.length + sellVehicleLeads.length,
    [vehicleLeads.length, zeroKmLeads.length, sellVehicleLeads.length]
  );

  async function loadVehicleLeads() {
    setLoadingVehicleLeads(true);
    setVehicleLeadsError("");
    const { leads, error } = await listVehicleLeadsForCurrentBuyer();
    setVehicleLeads(error ? [] : (leads || []));
    if (error) setVehicleLeadsError(error.message || "No se pudieron cargar tus consultas.");
    setLoadingVehicleLeads(false);
  }

  async function loadZeroKmLeads() {
    setLoadingZeroKmLeads(true);
    setZeroKmLeadsError("");
    const { leads, error } = await listZeroKmLeadsForCurrentBuyer();
    setZeroKmLeads(error ? [] : (leads || []));
    if (error) setZeroKmLeadsError(error.message || "No se pudieron cargar tus consultas 0km.");
    setLoadingZeroKmLeads(false);
  }

  async function loadSellVehicleLeads() {
    setLoadingSellVehicleLeads(true);
    setSellVehicleLeadsError("");
    const { leads, error } = await listSellVehicleLeadsForCurrentBuyer();
    setSellVehicleLeads(error ? [] : (leads || []));
    if (error) setSellVehicleLeadsError(error.message || "No se pudieron cargar tus solicitudes de venta.");
    setLoadingSellVehicleLeads(false);
  }

  async function refresh() {
    await Promise.all([loadVehicleLeads(), loadZeroKmLeads(), loadSellVehicleLeads()]);
  }

  return {
    vehicleLeads,
    zeroKmLeads,
    sellVehicleLeads,
    isLoading,
    totalActivity,
    vehicleLeadsError,
    zeroKmLeadsError,
    sellVehicleLeadsError,
    showDetails,
    setShowDetails,
    loadVehicleLeads,
    loadZeroKmLeads,
    loadSellVehicleLeads,
    refresh,
  };
}
