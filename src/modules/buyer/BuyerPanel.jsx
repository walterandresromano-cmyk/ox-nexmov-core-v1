import { useEffect, useMemo, useState } from "react";

import { listSellVehicleLeadsForCurrentBuyer } from "../../services/sellVehicle.service.js";

import {
  listVehicleLeadsForCurrentBuyer,
  listZeroKmLeadsForCurrentBuyer,
} from "../../services/buyer.service.js";

import { updateBuyerProfile } from "../../services/profiles.service.js";
import {
  createBuyerGarageService,
  listBuyerGarageServices,
  listBuyerGarageVehicles,
} from "../../services/buyerGarage.service.js";

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

function getSellLeadStatusLabel(status) {
  const labels = {
    new: "Recibida",
    seen: "Vista",
    assigned: "En evaluación",
    contacted: "Contactado",
    negotiation: "En negociación",
    closed: "Cerrada",
    lost: "Finalizada",
  };

  return labels[status] || "Recibida";
}

function getVehicleLeadChipClass(status) {
  if (["sold", "closed"].includes(status)) return "success";
  if (["negotiation", "reserved"].includes(status)) return "warning";
  if (["lost", "no_response"].includes(status)) return "danger";
  return "";
}

function getZeroKmChipClass(status) {
  if (["approved", "closed"].includes(status)) return "success";
  if (["prequalified", "documents_requested"].includes(status)) return "warning";
  if (["rejected", "lost"].includes(status)) return "danger";
  return "";
}

function getSellLeadChipClass(status) {
  if (status === "closed") return "success";
  if (["assigned", "negotiation"].includes(status)) return "warning";
  if (status === "lost") return "danger";
  return "";
}

function getVehicleTitle(vehicle) {
  return [vehicle.brand, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");
}

function getNextGarageHint(services) {
  if (!services.length) return "Carga el primer servicio para iniciar el historial.";
  const last = services[0];
  const lastKm = Number(last.mileage || 0);
  if (!lastKm) return "Proximo control: revisar kilometraje y service preventivo.";
  return `Proximo control sugerido cerca de ${Number(lastKm + 10000).toLocaleString("es-AR")} km.`;
}

function getServiceTypeLabel(value) {
  const labels = {
    oil: "Aceite y filtros",
    brakes: "Frenos",
    tires: "Cubiertas",
    battery: "Bateria",
    inspection: "Revision general",
    repair: "Reparacion",
    other: "Otro",
  };
  return labels[value] || value || "Servicio";
}

export default function BuyerPanel({ authUser, authProfile, appActions, onNavigate }) {
  const [vehicleLeads, setVehicleLeads] = useState([]);
  const [zeroKmLeads, setZeroKmLeads] = useState([]);
  const [loadingVehicleLeads, setLoadingVehicleLeads] = useState(true);
  const [loadingZeroKmLeads, setLoadingZeroKmLeads] = useState(true);
  const [vehicleLeadsError, setVehicleLeadsError] = useState("");
  const [zeroKmLeadsError, setZeroKmLeadsError] = useState("");
  const [sellVehicleLeads, setSellVehicleLeads] = useState([]);
  const [loadingSellVehicleLeads, setLoadingSellVehicleLeads] = useState(true);
  const [sellVehicleLeadsError, setSellVehicleLeadsError] = useState("");

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: authProfile?.full_name || "",
    phoneVisible: authProfile?.phone_visible || "",
    phoneWhatsapp: authProfile?.phone_whatsapp || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [garageVehicles, setGarageVehicles] = useState([]);
  const [garageVehiclesError, setGarageVehiclesError] = useState("");
  const [garageServices, setGarageServices] = useState([]);
  const [garageSource, setGarageSource] = useState("local");
  const [selectedGarageVehicleId, setSelectedGarageVehicleId] = useState("");
  const [garageSaving, setGarageSaving] = useState(false);
  const [garageSaved, setGarageSaved] = useState(false);
  const [garageForm, setGarageForm] = useState({
    serviceDate: new Date().toISOString().slice(0, 10),
    mileage: "",
    serviceType: "oil",
    cost: "",
    notes: "",
  });

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
      loadGarageVehicles(),
      loadGarageServices(),
    ]);
  }

  async function loadGarageVehicles() {
    setGarageVehiclesError("");

    const { vehicles, error } = await listBuyerGarageVehicles();

    setGarageVehicles(vehicles || []);

    if (error) {
      setGarageVehiclesError(
        "No pudimos cargar las unidades asignadas a tu Garage oX."
      );
    }
  }

  async function loadGarageServices() {
    const { services, source } = await listBuyerGarageServices({
      userId: authUser?.id || authProfile?.id || authProfile?.email,
    });
    setGarageServices(services || []);
    setGarageSource(source || "local");
  }

  useEffect(() => {
    refreshBuyerPanel();
  }, []);

  useEffect(() => {
    setProfileForm({
      fullName: authProfile?.full_name || "",
      phoneVisible: authProfile?.phone_visible || "",
      phoneWhatsapp: authProfile?.phone_whatsapp || "",
    });
  }, [authProfile?.full_name, authProfile?.phone_visible, authProfile?.phone_whatsapp]);

  async function handleSaveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSaved(false);

    const { error } = await updateBuyerProfile({
      fullName: profileForm.fullName,
      phoneVisible: profileForm.phoneVisible,
      phoneWhatsapp: profileForm.phoneWhatsapp,
    });

    if (error) {
      setProfileError(error.message || "No se pudo guardar el perfil.");
      setProfileSaving(false);
      return;
    }

    setProfileSaved(true);
    setProfileSaving(false);
    setEditingProfile(false);

    if (appActions?.refreshAuthProfile) {
      appActions.refreshAuthProfile();
    }

    window.setTimeout(() => setProfileSaved(false), 1800);
  }

  const totalActivity = useMemo(() => {
    return vehicleLeads.length + zeroKmLeads.length;
  }, [vehicleLeads.length, zeroKmLeads.length]);

  useEffect(() => {
    if (!selectedGarageVehicleId && garageVehicles.length > 0) {
      setSelectedGarageVehicleId(garageVehicles[0].id);
    }
  }, [garageVehicles, selectedGarageVehicleId]);

  async function handleSaveGarageService(event) {
    event.preventDefault();
    if (!selectedGarageVehicleId) return;

    setGarageSaving(true);
    setGarageSaved(false);

    const { service } = await createBuyerGarageService({
      userId: authUser?.id || authProfile?.id || authProfile?.email,
      service: {
        ...garageForm,
        garageVehicleId: selectedGarageVehicleId,
      },
    });

    if (service) {
      await loadGarageServices();
      setGarageForm({
        serviceDate: new Date().toISOString().slice(0, 10),
        mileage: "",
        serviceType: "oil",
        cost: "",
        notes: "",
      });
      setGarageSaved(true);
      window.setTimeout(() => setGarageSaved(false), 1800);
    }

    setGarageSaving(false);
  }

  const isLoading = loadingVehicleLeads || loadingZeroKmLeads || loadingSellVehicleLeads;

  return (
    <section className="page-section">
      <div className="container panel buyer-panel">

        <div className="panel-head-row">
          <div>
            <p className="eyebrow">Panel comprador</p>
            <h1>Mi actividad</h1>
            <p>
              Seguí tus consultas, comparaciones y vehículos guardados desde un
              solo lugar.
            </p>

            {(authProfile || authUser) && (
              <div className="buyer-profile-summary">
                <p className="admin-session-note">
                  {authProfile?.full_name
                    ? <><strong>{authProfile.full_name}</strong> · {authProfile?.email || authUser?.email}</>
                    : authProfile?.email || authUser?.email}
                </p>
                {authProfile?.phone_visible && (
                  <p className="buyer-profile-phone">{authProfile.phone_visible}</p>
                )}
                <button
                  type="button"
                  className="buyer-edit-profile-btn"
                  onClick={() => {
                    setEditingProfile((prev) => !prev);
                    setProfileError("");
                  }}
                >
                  {editingProfile ? "Cancelar edición" : "Editar perfil"}
                </button>
                {profileSaved && <span className="buyer-profile-saved">Guardado</span>}
              </div>
            )}
          </div>

          <div className="buyer-panel-head-actions">
            <button className="admin-refresh-btn" onClick={refreshBuyerPanel}>
              Actualizar
            </button>
            <button className="primary-action" onClick={() => onNavigate?.("search")}>
              Buscar vehículos
            </button>
          </div>
        </div>

        {editingProfile && (
          <form className="buyer-profile-form" onSubmit={handleSaveProfile}>
            <div className="buyer-profile-form-fields">
              <div className="buyer-profile-field">
                <label htmlFor="bp-fullname">Nombre completo</label>
                <input
                  id="bp-fullname"
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                  placeholder="Tu nombre"
                  maxLength={80}
                  disabled={profileSaving}
                />
              </div>
              <div className="buyer-profile-field">
                <label htmlFor="bp-phone">Teléfono</label>
                <input
                  id="bp-phone"
                  type="tel"
                  value={profileForm.phoneVisible}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, phoneVisible: e.target.value }))
                  }
                  placeholder="Ej. +54 9 11 1234-5678"
                  maxLength={30}
                  disabled={profileSaving}
                />
              </div>
              <div className="buyer-profile-field">
                <label htmlFor="bp-whatsapp">WhatsApp</label>
                <input
                  id="bp-whatsapp"
                  type="tel"
                  value={profileForm.phoneWhatsapp}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      phoneWhatsapp: e.target.value,
                    }))
                  }
                  placeholder="Ej. +54 9 11 1234-5678"
                  maxLength={30}
                  disabled={profileSaving}
                />
              </div>
            </div>
            <div className="buyer-profile-form-actions">
              <button
                type="submit"
                className="primary-action"
                disabled={profileSaving}
              >
                {profileSaving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => {
                  setEditingProfile(false);
                  setProfileError("");
                }}
                disabled={profileSaving}
              >
                Cancelar
              </button>
            </div>
            {profileError && <p className="auth-warning">{profileError}</p>}
          </form>
        )}

        {vehicleLeadsError && (
          <div className="auth-warning">{vehicleLeadsError}</div>
        )}
        {sellVehicleLeadsError && (
          <div className="auth-warning">{sellVehicleLeadsError}</div>
        )}
        {zeroKmLeadsError && (
          <div className="auth-warning">{zeroKmLeadsError}</div>
        )}
        {garageVehiclesError && (
          <div className="auth-warning">{garageVehiclesError}</div>
        )}

        {isLoading && (
          <div className="auth-message">Cargando actividad...</div>
        )}

        <div className="dealer-status-grid">
          <article className="dealer-status-card buyer-stat--leads">
            <span>Consultas activas</span>
            <strong>{vehicleLeads.length}</strong>
            <p>
              {vehicleLeads.length === 0
                ? "Todavía no realizaste consultas."
                : "Contactos con dealers registrados."}
            </p>
          </article>

          <article className="dealer-status-card buyer-stat--compare">
            <span>Comparaciones</span>
            <strong>{compareItems.length} / 4</strong>
            <p>
              {compareItems.length === 0
                ? "Seleccioná vehículos para comparar."
                : "Vehículos seleccionados para comparar."}
            </p>
          </article>

          <article className="dealer-status-card buyer-stat--favorites">
            <span>Favoritos</span>
            <strong>{favorites.length}</strong>
            <p>
              {favorites.length === 0
                ? "Todavía no guardaste vehículos."
                : "Vehículos guardados para revisar."}
            </p>
          </article>

          <article className="dealer-status-card buyer-stat--financing">
            <span>Financiación 0km</span>
            <strong>{zeroKmLeads.length}</strong>
            <p>
              {zeroKmLeads.length === 0
                ? "Todavía no enviaste consultas."
                : "Consultas de financiación enviadas."}
            </p>
          </article>
        </div>

        <div className="buyer-activity-strip">
          <div>
            {totalActivity === 0 ? (
              <>
                <strong>Empezá buscando vehículos</strong>
                <span>
                  Guardá favoritos, compará hasta 4 unidades y consultá dealers verificados.
                </span>
              </>
            ) : (
              <>
                <strong>Retomá tu actividad</strong>
                <span>
                  {vehicleLeads.length} consulta{vehicleLeads.length !== 1 ? "s" : ""} activa{vehicleLeads.length !== 1 ? "s" : ""} con dealers
                  {favorites.length > 0 ? ` · ${favorites.length} favorito${favorites.length !== 1 ? "s" : ""}` : ""}.
                </span>
              </>
            )}
          </div>
          <button
            className="primary-action"
            onClick={() => onNavigate?.("search")}
          >
            {totalActivity === 0 ? "Buscar vehículos" : "Ver más vehículos"}
          </button>
        </div>

        <div className="dealer-leads-section buyer-garage-section">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Garage oX</p>
              <h2>Garage oX</h2>
              <p>
                Historial privado de tus unidades dentro de la plataforma.
              </p>
            </div>
          </div>

          <div className="buyer-garage-hero">
            <div>
              <span>Historial premium</span>
              <strong>Unidad, servicios y recorrido en un solo lugar.</strong>
              <p>
                Registro organizado para conservar la trazabilidad del vehiculo.
              </p>
            </div>
            <div className="buyer-garage-hero-metrics">
              <span>Historial</span>
              <strong>{garageServices.length}</strong>
              <small>registros cargados</small>
            </div>
          </div>

          {garageVehicles.length === 0 ? (
            <div className="buyer-garage-empty">
              <strong>Tu garage todavia esta esperando su primera unidad.</strong>
              <p>
                Las unidades asignadas por el dealer aparecen aca con su historial listo para completar.
              </p>
              <button className="primary-action" onClick={() => onNavigate?.("search")}>
                Buscar vehiculos
              </button>
            </div>
          ) : (
            <div className="buyer-garage-layout">
              <div className="buyer-garage-list">
                {garageVehicles.map((vehicle) => {
                  const services = garageServices.filter(
                    (service) => service.garageVehicleId === vehicle.id
                  );
                  const isSelected = selectedGarageVehicleId === vehicle.id;

                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      className={`buyer-garage-vehicle-card${isSelected ? " is-active" : ""}`}
                      onClick={() => setSelectedGarageVehicleId(vehicle.id)}
                    >
                      <span>Vehiculo comprado</span>
                      <strong>{vehicle.title}</strong>
                      <p>{vehicle.dealer} · {formatARS(vehicle.price)}</p>
                      <div className="buyer-garage-card-meta">
                        <span>{vehicle.status}</span>
                        <span>{services.length} servicio{services.length !== 1 ? "s" : ""}</span>
                      </div>
                      <small>{getNextGarageHint(services)}</small>
                    </button>
                  );
                })}
              </div>

              <form className="buyer-garage-service-form" onSubmit={handleSaveGarageService}>
                <div>
                  <span className="eyebrow">Nuevo registro</span>
                  <h3>Agregar servicio</h3>
                  <p>
                    Registro privado de mantenimiento, kilometraje y trabajos realizados.
                  </p>
                </div>

                <div className="buyer-garage-form-grid">
                  <label>
                    Fecha
                    <input
                      type="date"
                      value={garageForm.serviceDate}
                      onChange={(e) =>
                        setGarageForm((f) => ({ ...f, serviceDate: e.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Kilometraje
                    <input
                      type="number"
                      min="0"
                      value={garageForm.mileage}
                      onChange={(e) =>
                        setGarageForm((f) => ({ ...f, mileage: e.target.value }))
                      }
                      placeholder="Ej. 45000"
                    />
                  </label>
                  <label>
                    Tipo
                    <select
                      value={garageForm.serviceType}
                      onChange={(e) =>
                        setGarageForm((f) => ({ ...f, serviceType: e.target.value }))
                      }
                    >
                      <option value="oil">Aceite y filtros</option>
                      <option value="brakes">Frenos</option>
                      <option value="tires">Cubiertas</option>
                      <option value="battery">Bateria</option>
                      <option value="inspection">Revision general</option>
                      <option value="repair">Reparacion</option>
                      <option value="other">Otro</option>
                    </select>
                  </label>
                  <label>
                    Costo
                    <input
                      type="number"
                      min="0"
                      value={garageForm.cost}
                      onChange={(e) =>
                        setGarageForm((f) => ({ ...f, cost: e.target.value }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                </div>

                <label className="buyer-garage-notes">
                  Detalle
                  <textarea
                    value={garageForm.notes}
                    onChange={(e) =>
                      setGarageForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={3}
                    placeholder="Ej. Cambio de aceite, filtros, revision de tren delantero..."
                  />
                </label>

                <div className="buyer-garage-form-actions">
                  <button
                    type="submit"
                    className="primary-action"
                    disabled={garageSaving || !selectedGarageVehicleId}
                  >
                    {garageSaving ? "Guardando..." : "Guardar servicio"}
                  </button>
                  {garageSaved && <span>Servicio guardado</span>}
                  {garageSource === "local" && (
                    <small>Registro local hasta activar persistencia Supabase.</small>
                  )}
                </div>
              </form>

              <div className="buyer-garage-history">
                <div>
                  <span className="eyebrow">Historial</span>
                  <h3>Servicios registrados</h3>
                </div>
                {garageServices.filter((service) => service.garageVehicleId === selectedGarageVehicleId).length === 0 ? (
                  <p className="buyer-garage-history-empty">
                    Todavia no hay servicios cargados para este vehiculo.
                  </p>
                ) : (
                  <div className="buyer-garage-service-list">
                    {garageServices
                      .filter((service) => service.garageVehicleId === selectedGarageVehicleId)
                      .map((service) => (
                        <article key={service.id} className="buyer-garage-service-item">
                          <span>{formatDateTime(service.serviceDate)}</span>
                          <strong>{getServiceTypeLabel(service.serviceType)}</strong>
                          <p>
                            {service.mileage ? `${Number(service.mileage).toLocaleString("es-AR")} km` : "Sin km"}
                            {service.cost ? ` · ${formatARS(service.cost)}` : ""}
                          </p>
                          {service.notes && <small>{service.notes}</small>}
                        </article>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Vehículos favoritos</h2>
              <p>Guardados para revisar más tarde.</p>
            </div>
          </div>

          {favorites.length === 0 ? (
            <div className="empty-state">
              <strong>Todavía no guardaste vehículos.</strong>
              <p>Usá el botón Favorito desde las cards para guardarlos acá.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Precio</th>
                    <th>Ubicación</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {favorites.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>
                        <strong>{getVehicleTitle(vehicle)}</strong>
                        <span>
                          {vehicle.year} ·{" "}
                          {Number(vehicle.kilometers || 0).toLocaleString("es-AR")} km
                        </span>
                      </td>

                      <td>
                        <strong>{formatARS(vehicle.price)}</strong>
                      </td>

                      <td>
                        <strong>{vehicle.city || "—"}</strong>
                        <span>{vehicle.province || ""}</span>
                      </td>

                      <td>
                        <button
                          className="table-action-btn"
                          onClick={() => appActions?.removeFavorite?.(vehicle.id)}
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

        <div className="dealer-leads-section" id="buyer-consultas">
          <div className="buyer-section-head">
            <div>
              <h2>Consultas a dealers</h2>
              <p>Contactos comerciales generados desde publicaciones.</p>
            </div>

            <button className="admin-refresh-btn" onClick={loadVehicleLeads}>
              Actualizar
            </button>
          </div>

          {vehicleLeads.length === 0 ? (
            <div className="empty-state">
              <strong>Todavía no realizaste consultas.</strong>
              <p>Abrí un vehículo desde Buscar y usá el botón Contactar.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vehículo</th>
                    <th>Dealer</th>
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
                          {lead.vehicle_brand || ""}{" "}
                          {lead.vehicle_model || ""}
                        </strong>
                        <span>
                          {lead.vehicle_version || lead.vehicle_title || ""}
                        </span>
                        <span>{formatARS(lead.price_snapshot)}</span>
                      </td>

                      <td>
                        <strong>{lead.dealer_name || "Dealer"}</strong>
                        <span>{lead.dealer_phone || "Contacto registrado"}</span>
                      </td>

                      <td>
                        <span className={`admin-chip ${getVehicleLeadChipClass(lead.crm_status)}`.trim()}>
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
              <h2>Comparación actual</h2>
              <p>Hasta 4 vehículos lado a lado. Se arma desde las cards en Buscar.</p>
            </div>

            {compareItems.length > 0 && (
              <button
                className="admin-refresh-btn"
                onClick={appActions?.clearCompare}
              >
                Limpiar
              </button>
            )}
          </div>

          {compareItems.length < 2 ? (
            <div className="empty-state">
              <strong>Todavía no armaste comparaciones.</strong>
              <p>
                Seleccioná al menos 2 vehículos desde Buscar usando el botón
                Comparar.
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Precio</th>
                    <th>Ubicación</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {compareItems.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>
                        <strong>{getVehicleTitle(vehicle)}</strong>
                        <span>
                          {vehicle.year} ·{" "}
                          {Number(vehicle.kilometers || 0).toLocaleString("es-AR")} km
                        </span>
                      </td>

                      <td>
                        <strong>{formatARS(vehicle.price)}</strong>
                        <span>Ref. {formatARS(vehicle.marketReferencePrice)}</span>
                      </td>

                      <td>
                        <strong>{vehicle.city || "—"}</strong>
                        <span>{vehicle.province || ""}</span>
                      </td>

                      <td>
                        <button
                          className="table-action-btn"
                          onClick={() => appActions?.removeFromCompare?.(vehicle.id)}
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
              <h2>Financiación 0km</h2>
              <p>Consultas enviadas desde la sección de financiación.</p>
            </div>

            <button className="admin-refresh-btn" onClick={loadZeroKmLeads}>
              Actualizar
            </button>
          </div>

          {zeroKmLeads.length === 0 ? (
            <div className="empty-state">
              <strong>Todavía no enviaste consultas de financiación 0km.</strong>
              <p>Explorá las opciones disponibles en la sección de financiación.</p>
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
                        <span>{lead.budget_range || "Sin rango declarado"}</span>
                        <span>{lead.message || ""}</span>
                      </td>

                      <td>
                        <strong>{lead.city || "Sin ciudad"}</strong>
                        <span>{lead.province || ""}</span>
                      </td>

                      <td>
                        <strong>{formatARS(lead.down_payment)}</strong>
                        <span>
                          {lead.preferred_term_months
                            ? `${lead.preferred_term_months} meses`
                            : "Sin plazo"}
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
              <h2>Solicitudes de venta</h2>
              <p>Vehículos que publicaste para que dealers evalúen tu unidad.</p>
            </div>

            <button className="admin-refresh-btn" onClick={loadSellVehicleLeads}>
              Actualizar
            </button>
          </div>

          {sellVehicleLeads.length === 0 ? (
            <div className="empty-state">
              <strong>Todavía no publicaste una solicitud de venta.</strong>
              <p>
                Si querés vender tu vehículo, usá la opción "Vender mi
                vehículo" desde el menú.
              </p>
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
                        <span>{lead.version || ""}</span>
                        <span>
                          {lead.year || ""} ·{" "}
                          {Number(lead.km || 0).toLocaleString("es-AR")} km
                        </span>
                      </td>

                      <td>
                        <strong>{lead.city || "—"}</strong>
                        <span>{lead.province || ""}</span>
                      </td>

                      <td>
                        <strong>{formatARS(lead.expected_price)}</strong>
                        {lead.has_debt && (
                          <span>Con deuda/prenda declarada</span>
                        )}
                      </td>

                      <td>
                        <span className="admin-chip success">
                          {getSellLeadStatusLabel(lead.status)}
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
          <strong>Privacidad</strong>
          <span>
            Este panel muestra solo tu actividad como comprador. Los datos de
            gestión interna son visibles únicamente para roles autorizados.
          </span>
        </div>
      </div>
    </section>
  );
}
