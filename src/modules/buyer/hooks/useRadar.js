import { useState } from "react";
import {
  listRadarRequests,
  deleteRadarRequest,
} from "../../../services/radarRequests.service.js";

export function useRadar() {
  const [requests, setRequests] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  async function load() {
    const { requests: loaded, error } = await listRadarRequests();
    if (!error) setRequests(loaded || []);
  }

  async function remove(id) {
    if (deletingId) return;
    setDeletingId(id);
    setDeleteError("");
    const { error } = await deleteRadarRequest(id);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } else {
      setDeleteError("No se pudo cancelar la búsqueda. Intentá de nuevo.");
    }
    setDeletingId(null);
  }

  return {
    requests,
    deletingId,
    deleteError,
    load,
    remove,
  };
}
