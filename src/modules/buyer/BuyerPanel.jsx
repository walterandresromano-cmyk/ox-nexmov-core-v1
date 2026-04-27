import { useEffect, useMemo, useState } from "react";

import { listSellVehicleLeadsForCurrentBuyer } from "../../services/sellVehicle.service.js";

import {
  listVehicleLeadsForCurrentBuyer,
  listZeroKmLeadsForCurrentBuyer,
} from "../../services/buyer.service.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatARS(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "Sin precio informado";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function getVehicleLeadStatusLabel(status) {
  const labels = {
    new: "Recibida",
    seen: "Vista",
    contacted: "Contactado",
    negotiation: "En seguimiento",
    reserved: "Reservado",
    sold: "Cerrado",
    lost: "Finalizada",
    no_response: "Sin respuesta",
    closed: "Cerrada",
  };

  return labels[status] || "Recibida";
}

function getZeroKmStatusLabel(status) {
  const labels = {
    new: "Recibida",
    seen: "Vista",
    contacted: "Contactado",
    prequalified: "En evaluación",
    documents_requested: "Documentación solicitada",
    approved: "Aprobada",
    rejected: "No aprobada",
    lost: "Finalizada",
    closed: "Cerrada",
  };

  return labels[status] || "Recibida";
}

function getVehicleTitle(vehicle) {
  return [vehicle.brand, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");
}

export default function BuyerPanel({ authUser, authProfile, appActions }) {
  const [vehicleLeads, setVehicleLeads] = useState([]);
  const [zeroKmLeads, setZeroKmLeads] = useState([]);
  const [loadingVehicleLeads, setLoadingVehicleLeads] = useState(true);
  const [loadingZeroKmLeads, setLoadingZeroKmLeads] = useState(true);
  const [vehicleLeadsError, setVehicleLeadsError] = useState("");
  const [zeroKmLeadsError, setZeroKmLeadsError] = useState("");
const [sellVehicleLeads, setSellVehicleLeads] = useState([]);
const [loadingSellVehicleLeads, setLoadingSellVehicleLeads] = useState(true);
const [sellVehicleLeadsError, setSellVehicleLeadsError] = useState("");


  const favorites = appActions?.favoriteItems || [];
  const compareItems = appActions?.compareItems || [];

  async function loadVehicleLeads() {
    setLoadingVehicleLeads(true);
    setVehicleLeadsError("");

    const { leads, error } = await listVehicleLeadsForCurrentBuyer();

    if (error) {
      setVehicleLeads([]);
      setVehicleLeadsError(
        error.message || "No se pudieron cargar tus consultas."
      );
      setLoadingVehicleLeads(false);
      return;
    }

    setVehicleLeads(leads || []);
    setLoadingVehicleLeads(false);
  }

async function loadSellVehicleLeads() {
  setLoadingSellVehicleLeads(true);
  setSellVehicleLeadsError("");

  const { leads, error } = await listSellVehicleLeadsForCurrentBuyer();

  if (error) {
    setSellVehicleLeads([]);
    setSellVehicleLeadsError(
      error.message || "No se pudieron cargar tus solicitudes de venta."
    );
    setLoadingSellVehicleLeads(false);
    return;
  }

  setSellVehicleLeads(leads || []);
  setLoadingSellVehicleLeads(false);
}

  async function loadZeroKmLeads() {
    setLoadingZeroKmLeads(true);
    setZeroKmLeadsError("");

    const { leads, error } = await listZeroKmLeadsForCurrentBuyer();

    if (error) {
      setZeroKmLeads([]);
      setZeroKmLeadsError(
        error.message || "No se pudieron cargar tus consultas 0km."
      );
      setLoadingZeroKmLeads(false);
      return;
    }

    setZeroKmLeads(leads || []);
    setLoadingZeroKmLeads(false);
  }
    
     async function refreshBuyerPanel() {
  await Promise.all([
    loadVehicleLeads(),
    loadZeroKmLeads(),
    loadSellVehicleLeads(),
  ]);
}

  useEffect(() => {
    refreshBuyerPanel();
  }, []);

  const totalActivity = useMemo(() => {
    return vehicleLeads.length + zeroKmLeads.length;
  }, [vehicleLeads.length, zeroKmLeads.length]);

  return (
    <section className="page-section">
      <div className="container panel buyer-panel">
        <div className="panel-head-row">
          <div>
            <p className="eyebrow">Panel comprador</p>
            <h1>Mi actividad</h1>
            <p>
              Favoritos, comparaciones y consultas realizadas dentro de oX
              NEXMOV. Esta vista no muestra datos internos de gestión.
            </p>

            {(authProfile || authUser) && (
              <p className="admin-session-note">
                Sesión actual: {authProfile?.email || authUser?.email}
              </p>
            )}
          </div>

          <button className="admin-refresh-btn" onClick={refreshBuyerPanel}>
            Actualizar actividad
          </button>
        </div>

        {vehicleLeadsError && (
          <div className="auth-warning">{vehicleLeadsError}</div>
        )}

        {sellVehicleLeadsError && (
  <div className="auth-warning">{sellVehicleLeadsError}</div>
)}

        {zeroKmLeadsError && (
          <div className="auth-warning">{zeroKmLeadsError}</div>
        )}

        {(loadingVehicleLeads || loadingZeroKmLeads) && (
          <div className="auth-message">
            Cargando actividad del comprador...
          </div>
        )}

         {(loadingVehicleLeads || loadingZeroKmLeads || loadingSellVehicleLeads) && (
  <div className="auth-message">
    Cargando actividad del comprador...
  </div>
)}

        <div className="dealer-status-grid">
          <article className="dealer-status-card">
            <span>Favoritos</span>
            <strong>{favorites.length}</strong>
            <p>Vehículos guardados para revisar más tarde.</p>
          </article>

          <article className="dealer-status-card">
            <span>Comparación actual</span>
            <strong>{compareItems.length} / 4</strong>
            <p>Vehículos seleccionados para comparar.</p>
          </article>

            <article className="dealer-status-card">
            <span>Vender mi vehículo</span>
            <strong>{sellVehicleLeads.length}</strong>
            <p>Solicitudes enviadas para que dealers evalúen tu unidad.</p>
          </article>

          <article className="dealer-status-card">
            <span>Consultas a dealers</span>
            <strong>{vehicleLeads.length}</strong>
            <p>Contactos comerciales generados.</p>
          </article>

          <article className="dealer-status-card">
            <span>Financiación 0km</span>
            <strong>{zeroKmLeads.length}</strong>
            <p>Consultas enviadas al equipo interno.</p>
          </article>
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Comparación actual</h2>
              <p>
                Podés comparar hasta 4 vehículos. La comparación se arma desde
                las cards públicas.
              </p>
            </div>

            {compareItems.length > 0 && (
              <button
                className="admin-refresh-btn"
                onClick={appActions?.clearCompare}
              >
                Limpiar comparación
              </button>
            )}
          </div>

          {compareItems.length < 2 ? (
            <div className="empty-state">
              Seleccioná al menos 2 vehículos desde Buscar para comparar.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Precio</th>
                    <th>Ubicación</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {compareItems.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>
                        <strong>{getVehicleTitle(vehicle)}</strong>
                        <span>{vehicle.year}</span>
                        <span>
                          {Number(vehicle.kilometers || 0).toLocaleString(
                            "es-AR"
                          )}{" "}
                          km
                        </span>
                      </td>

                      <td>
                        <strong>{formatARS(vehicle.price)}</strong>
                        <span>
                          Ref. {formatARS(vehicle.marketReferencePrice)}
                        </span>
                      </td>

                      <td>
                        <strong>{vehicle.city || "Sin ciudad"}</strong>
                        <span>{vehicle.province || "Sin provincia"}</span>
                      </td>

                      <td>
                        <button
                          className="table-action-btn"
                          onClick={() =>
                            appActions?.removeFromCompare?.(vehicle.id)
                          }
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Mis favoritos</h2>
              <p>Vehículos guardados para revisar más tarde.</p>
            </div>
          </div>

          {favorites.length === 0 ? (
            <div className="empty-state">
              Todavía no guardaste vehículos favoritos.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Precio</th>
                    <th>Ubicación</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {favorites.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>
                        <strong>{getVehicleTitle(vehicle)}</strong>
                        <span>{vehicle.year}</span>
                        <span>
                          {Number(vehicle.kilometers || 0).toLocaleString(
                            "es-AR"
                          )}{" "}
                          km
                        </span>
                      </td>

                      <td>
                        <strong>{formatARS(vehicle.price)}</strong>
                        <span>
                          Ref. {formatARS(vehicle.marketReferencePrice)}
                        </span>
                      </td>

                      <td>
                        <strong>{vehicle.city || "Sin ciudad"}</strong>
                        <span>{vehicle.province || "Sin provincia"}</span>
                      </td>

                      <td>
                        <button
                          className="table-action-btn"
                          onClick={() =>
                            appActions?.removeFavorite?.(vehicle.id)
                          }
                        >
                          Quitar favorito
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Consultas a dealers</h2>
              <p>
                Contactos comerciales que generaste desde publicaciones. Solo se
                muestran datos necesarios para tu seguimiento.
              </p>
            </div>

            <button className="admin-refresh-btn" onClick={loadVehicleLeads}>
              Actualizar consultas
            </button>
          </div>

          {vehicleLeads.length === 0 ? (
            <div className="empty-state">
              Todavía no realizaste consultas a dealers.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vehículo</th>
                    <th>Dealer</th>
                    <th>Mensaje</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {vehicleLeads.map((lead, index) => (
                    <tr key={`${lead.created_at}-${index}`}>
                      <td>
                        <strong>{formatDateTime(lead.created_at)}</strong>
                      </td>

                      <td>
                        <strong>
                          {lead.vehicle_brand || ""} {lead.vehicle_model || ""}
                        </strong>
                        <span>
                          {lead.vehicle_version ||
                            lead.vehicle_title ||
                            "Sin versión"}
                        </span>
                        <span>{formatARS(lead.price_snapshot)}</span>
                      </td>

                      <td>
                        <strong>{lead.dealer_name || "Dealer no informado"}</strong>
                        <span>
                          {lead.dealer_phone || "Contacto registrado"}
                        </span>
                      </td>

                      <td>
                        <span>{lead.message || "Sin mensaje."}</span>
                      </td>

                      <td>
                        <span className="admin-chip success">
                          {getVehicleLeadStatusLabel(lead.crm_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Consultas Financiación 0km</h2>
              <p>
                Solicitudes enviadas desde la sección Financiación 0km. No se
                muestran datos internos ni notas operativas.
              </p>
            </div>

            <button className="admin-refresh-btn" onClick={loadZeroKmLeads}>
              Actualizar 0km
            </button>
          </div>

          {zeroKmLeads.length === 0 ? (
            <div className="empty-state">
              Todavía no enviaste consultas de financiación 0km.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Interés</th>
                    <th>Ubicación</th>
                    <th>Condición</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {zeroKmLeads.map((lead, index) => (
                    <tr key={`${lead.created_at}-${index}`}>
                      <td>
                        <strong>{formatDateTime(lead.created_at)}</strong>
                      </td>

                      <td>
                        <strong>
                          {lead.brand_interest || "Marca abierta"}{" "}
                          {lead.model_interest || ""}
                        </strong>
                        <span>
                          {lead.budget_range || "Sin rango declarado"}
                        </span>
                        <span>{lead.message || "Sin mensaje adicional"}</span>
                      </td>

                      <td>
                        <strong>{lead.city || "Sin ciudad"}</strong>
                        <span>{lead.province || "Sin provincia"}</span>
                      </td>

                      <td>
                        <strong>{formatARS(lead.down_payment)}</strong>
                        <span>
                          {lead.preferred_term_months
                            ? `${lead.preferred_term_months} meses`
                            : "Sin plazo preferido"}
                        </span>
                      </td>

                      <td>
                        <span className="admin-chip success">
                          {getZeroKmStatusLabel(lead.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dealer-leads-section">
  <div className="buyer-section-head">
    <div>
      <h2>Mis solicitudes de venta</h2>
      <p>
        Vehículos que cargaste desde “Vender mi vehículo”. Esta vista muestra
        solo el seguimiento visible para comprador.
      </p>
    </div>

    <button className="admin-refresh-btn" onClick={loadSellVehicleLeads}>
      Actualizar solicitudes
    </button>
  </div>

  {sellVehicleLeads.length === 0 ? (
    <div className="empty-state">
      Todavía no solicitaste vender un vehículo.
    </div>
  ) : (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Vehículo</th>
            <th>Ubicación</th>
            <th>Precio esperado</th>
            <th>Condición</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {sellVehicleLeads.map((lead, index) => (
            <tr key={`${lead.created_at}-${index}`}>
              <td>
                <strong>{formatDateTime(lead.created_at)}</strong>
              </td>

              <td>
                <strong>
                  {lead.brand} {lead.model}
                </strong>
                <span>{lead.version || "Sin versión"}</span>
                <span>
                  {lead.year || "Sin año"} ·{" "}
                  {Number(lead.km || 0).toLocaleString("es-AR")} km
                </span>
              </td>

              <td>
                <strong>{lead.city || "Sin ciudad"}</strong>
                <span>{lead.province || "Sin provincia"}</span>
              </td>

              <td>
                <strong>{formatARS(lead.expected_price)}</strong>
              </td>

              <td>
                <span>{lead.condition || "Sin condición declarada"}</span>
                {lead.has_debt && <span>Con deuda/prenda declarada</span>}
                {lead.has_financing && <span>Con financiación vigente</span>}
              </td>

              <td>
                <span className="admin-chip success">
                  {lead.status === "new"
                    ? "Recibida"
                    : lead.status === "seen"
                      ? "Vista"
                      : lead.status === "assigned"
                        ? "En evaluación"
                        : lead.status === "contacted"
                          ? "Contactado"
                          : lead.status === "negotiation"
                            ? "En negociación"
                            : lead.status === "closed"
                              ? "Cerrada"
                              : lead.status === "lost"
                                ? "Finalizada"
                                : "Recibida"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

        <div className="buyer-privacy-note">
          <strong>Privacidad operativa</strong>
          <span>
            Este panel muestra solo información útil para el comprador. Los IDs
            internos, notas de gestión, asignaciones y decisiones operativas son
            visibles únicamente para los roles autorizados.
          </span>
        </div>
      </div>
    </section>
  );
}