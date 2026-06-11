import { useCallback, useEffect, useRef, useState } from "react";
import { submitDealerRating } from "../../services/dealerRatings.service.js";

import { buildRadarCriteriaSummary } from "../../services/radarRequests.service.js";
import { getObjectPositionXY } from "../../lib/imagePosition.js";
import {
  listBuyerNotifications,
  markBuyerNotificationRead,
  markAllBuyerNotificationsRead,
  processBuyerGarageDueAlerts,
  processBuyerRadarMatches,
} from "../../services/buyerNotifications.service.js";

import { useActivity } from "./hooks/useActivity.js";
import { useGarageVehicles } from "./hooks/useGarageVehicles.js";
import { useProfile } from "./hooks/useProfile.js";
import { useRadar } from "./hooks/useRadar.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatDateOnly(value) {
  if (!value) return "Sin fecha";
  const dateOnly = String(value).split("T")[0];
  const [year, month, day] = dateOnly.split("-");
  if (year && month && day) return `${day}/${month}/${year.slice(2)}`;
  return dateOnly;
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

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function getVehicleExpiryStatus(dateStr) {
  const d = getDaysUntil(dateStr);
  if (d === null) return null;
  if (d < 0) return "expired";
  if (d <= 30) return "soon";
  return "ok";
}

function formatDaysUntil(dateStr) {
  const d = getDaysUntil(dateStr);
  if (d === null) return "Sin cargar";
  if (d < 0) return `Vencido hace ${Math.abs(d)} día${Math.abs(d) !== 1 ? "s" : ""}`;
  if (d === 0) return "Vence hoy";
  return `${d} día${d !== 1 ? "s" : ""}`;
}

function getNextGarageHint(services) {
  if (!services.length) return "Cargá el primer servicio para iniciar el historial.";
  const last = services[0];
  const lastKm = Number(last.mileage || 0);
  if (!lastKm) return "Próximo control: revisar kilometraje y service preventivo.";
  return `Próximo control sugerido cerca de ${Number(lastKm + 10000).toLocaleString("es-AR")} km.`;
}

function getServiceTypeLabel(value) {
  const labels = {
    oil: "Aceite y filtros",
    brakes: "Frenos",
    tires: "Cubiertas",
    battery: "Batería",
    inspection: "Revisión general",
    repair: "Reparación",
    other: "Otro",
  };
  return labels[value] || value || "Servicio";
}

function getGarageStatusLabel(status) {
  const labels = {
    active: "Asignado",
    owned: "Propio",
    preparing_sale: "Preparando venta",
    listed: "Publicado",
    reserved: "Reservado",
    sold: "Vendido",
    archived: "Histórico",
  };

  return labels[status] || "Activo";
}

function getGarageVehicleSourceLabel(vehicle) {
  if (vehicle?.source === "owned" || vehicle?.source === "local") {
    return "Vehículo propio";
  }

  return "Asignado por dealer";
}

function isOwnedGarageVehicle(vehicle) {
  return vehicle?.source === "owned" || vehicle?.source === "local";
}

function getGarageVehicleFormFromVehicle(vehicle) {
  const pos = normalizeImagePositionXY(vehicle?.imagePositionX, vehicle?.imagePositionY, vehicle?.imagePosition);
  return {
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    version: vehicle?.version || "",
    year: vehicle?.year || "",
    km: vehicle?.km || "",
    plate: vehicle?.plate || "",
    province: vehicle?.province || "",
    city: vehicle?.city || "",
    expectedPrice: vehicle?.expectedPrice || vehicle?.price || "",
    condition: vehicle?.condition || "",
    vtvDueDate: vehicle?.vtvDueDate || "",
    insuranceDueDate: vehicle?.insuranceDueDate || "",
    insuranceCompany: vehicle?.insuranceCompany || "",
    policyNumber: vehicle?.policyNumber || "",
    notes: vehicle?.notes || "",
    photoUrl: vehicle?.photoUrl || "",
    imagePositionX: pos.x,
    imagePositionY: pos.y,
    saleIntent: vehicle?.status === "preparing_sale",
  };
}

const initialGarageVehicleForm = {
  brand: "",
  model: "",
  version: "",
  year: "",
  km: "",
  plate: "",
  province: "",
  city: "",
  expectedPrice: "",
  condition: "",
  vtvDueDate: "",
  insuranceDueDate: "",
  insuranceCompany: "",
  policyNumber: "",
  notes: "",
  photoUrl: "",
  imagePositionX: 50,
  imagePositionY: 50,
  saleIntent: false,
};

function DraggableImageFramer({ src, positionX, positionY, onPositionChange, disabled }) {
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const startPtr = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 50, y: 50 });

  function handlePointerDown(e) {
    if (disabled) return;
    isDragging.current = true;
    startPtr.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: positionX, y: positionY };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handlePointerMove(e) {
    if (!isDragging.current || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - startPtr.current.x;
    const dy = e.clientY - startPtr.current.y;
    const newX = Math.max(0, Math.min(100, startPos.current.x - (dx / width) * 100));
    const newY = Math.max(0, Math.min(100, startPos.current.y - (dy / height) * 100));
    onPositionChange(newX, newY);
  }

  function handlePointerUp() {
    isDragging.current = false;
  }

  return (
    <div
      ref={containerRef}
      className="garage-framing-area"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={src}
        alt=""
        className="garage-framing-image"
        style={{ objectPosition: getObjectPositionXY(positionX, positionY) }}
        draggable={false}
      />
      <div className="garage-framing-overlay">
        <span>Arrastrá para acomodar</span>
      </div>
    </div>
  );
}

export default function BuyerPanel({ authUser, authProfile, appActions, onNavigate }) {
  const activity = useActivity();
  const profile = useProfile(authUser, authProfile, appActions);
  const radar = useRadar();
  const garage = useGarageVehicles(authUser, authProfile, () => activity.loadSellVehicleLeads());

  const [activeSection, setActiveSection] = useState(null);
  const [activeMovimientoTab, setActiveMovimientoTab] = useState("shortlist");
  const [garageNotifications, setGarageNotifications] = useState([]);
  const [garageNotificationsLoaded, setGarageNotificationsLoaded] = useState(false);
  // key: lead identifier (created_at+index), value: { rating, submitted, submitting }
  const [leadRatings, setLeadRatings] = useState({});

  const radarSectionRef = useRef(null);

  const favorites = appActions?.favoriteItems || [];
  const compareItems = appActions?.compareItems || [];

  const garageUnreadCount = garageNotifications.filter((n) => !n.is_read).length;

  async function refreshBuyerPanel() {
    await Promise.all([activity.refresh(), garage.refresh(), radar.load()]);
  }

  useEffect(() => { refreshBuyerPanel(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeadRating = useCallback(async (leadKey, lead, stars) => {
    setLeadRatings(prev => ({ ...prev, [leadKey]: { rating: stars, submitting: true, submitted: false } }));

    const leadId   = lead.lead_id ?? lead.id ?? null;
    const dealerId = lead.dealer_id ?? null;

    const { error } = await submitDealerRating({
      dealerId,
      leadId,
      rating:  stars,
      comment: "",
    });

    setLeadRatings(prev => ({
      ...prev,
      [leadKey]: { rating: stars, submitting: false, submitted: !error },
    }));
  }, []);

  // Dispara procesos backend una vez por sesión de usuario.
  // Falla silenciosamente si las RPCs no están instaladas todavía.
  useEffect(() => {
    if (!authUser?.id) return;
    processBuyerGarageDueAlerts();
    processBuyerRadarMatches();
  }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga notificaciones del buyer — estado local, sin duplicate polling con Header.
  useEffect(() => {
    if (!authUser?.id) return;
    listBuyerNotifications().then(({ notifications }) => {
      setGarageNotifications(notifications || []);
      setGarageNotificationsLoaded(true);
    });
  }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markOneGarageNotificationRead(dbId) {
    await markBuyerNotificationRead(dbId);
    setGarageNotifications((prev) =>
      prev.map((n) => n.id === dbId ? { ...n, is_read: true } : n)
    );
  }

  async function markAllGarageRead() {
    await markAllBuyerNotificationsRead();
    setGarageNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  function handleNotificationAction(n) {
    if (!n.is_read) markOneGarageNotificationRead(n.id);
    if (n.type === "radar_match") {
      onNavigate?.("search");
    } else if (n.type === "vtv_due" || n.type === "insurance_due") {
      setActiveSection("garage");
      if (n.entity_id) {
        const match = garageVehicles.find(
          (v) => String(v.id).replace(/^own-/, "") === String(n.entity_id)
        );
        if (match) setSelectedGarageVehicleId(match.id);
      }
    }
  }

  // ── Aliases para compatibilidad con JSX existente ─────────────
  const { vehicleLeads, zeroKmLeads, sellVehicleLeads,
          totalActivity, vehicleLeadsError, zeroKmLeadsError, sellVehicleLeadsError,
          showDetails: showBuyerActivityDetails, setShowDetails: setShowBuyerActivityDetails } = activity;

  const { editing: editingProfile, form: profileForm, saving: profileSaving,
          error: profileError, saved: profileSaved,
          startEditing: startEditingProfile, cancelEditing: cancelEditingProfile,
          save: handleSaveProfile, updateField: updateProfileField } = profile;

  const { requests: radarRequests, deletingId: radarDeletingId,
          deleteError: radarDeleteError, remove: handleDeleteRadarRequest } = radar;

  const { vehicles: garageVehicles, vehiclesError: garageVehiclesError,
          loading: loadingGarageVehicles, services: garageServices,
          selectedId: selectedGarageVehicleId, setSelectedId: setSelectedGarageVehicleId,
          selectedVehicle: selectedGarageVehicle, selectedServices: selectedGarageServices,
          lastService: lastSelectedGarageService, activeTab: activeGarageTab,
          setActiveTab: setActiveGarageTab, showForm: showGarageVehicleForm,
          setShowForm: setShowGarageVehicleForm, editingId: editingGarageVehicleId,
          deletingId: deletingGarageVehicleId, deleteConfirmId: deleteConfirmVehicleId,
          setDeleteConfirmId: setDeleteConfirmVehicleId, vehicleForm: garageVehicleForm,
          vehicleSaving: garageVehicleSaving, vehicleError: garageVehicleError,
          vehicleSaved: garageVehicleSaved, photoFile: garageVehiclePhotoFile,
          photoPreview: garageVehiclePhotoPreview, photoUploading: garageVehiclePhotoUploading,
          photoSaved: garageVehiclePhotoSaved, serviceForm: garageForm,
          setServiceForm: setGarageForm, serviceSaving: garageSaving,
          serviceSaved: garageSaved, serviceError: garageServiceError,
          saleLeadSending, saleLeadSent, setSaleLeadSent, saleLeadError,
          updateVehicleField: updateGarageVehicleField,
          resetVehicleForm: resetGarageVehicleForm,
          startEdit: startGarageVehicleEdit,
          handlePhotoChange: handleGarageVehiclePhotoChange,
          saveVehicle: handleSaveGarageVehicle,
          deleteVehicle: handleDeleteGarageVehicle,
          saveService: handleSaveGarageService,
          initiateSale: handleInitiateSale,
          matchesServiceVehicle: matchesGarageServiceVehicle } = garage;

  const isLoading = activity.isLoading || loadingGarageVehicles;

  return (
    <section className="page-section">
      <div className="container panel buyer-panel garage-ox-panel">

        <div className="buyer-hero garage-ox-hero" id="garage-ox-hero">
          <img
            src="/garage-hero-studio.webp"
            alt=""
            className="garage-ox-hero__photo"
            aria-hidden="true"
            loading="eager"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "right center", zIndex: 0, pointerEvents: "none", userSelect: "none" }}
          />
          <div
            className="garage-ox-hero__overlay"
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "var(--garage-ox-hero-overlay)" }}
          />

          <div className="buyer-hero__content garage-ox-hero__content">
            <h1 className="buyer-hero__title garage-ox-hero__title">
              Garage <span className="garage-ox-hero__brand">oX</span>
            </h1>
            <p className="buyer-hero__subtitle garage-ox-hero__subtitle">
              Tu historial automotriz privado: vehículos, servicios, vencimientos y valor futuro.
            </p>
            <div className="buyer-hero__actions garage-ox-hero__actions">
              <button
                className="primary-action"
                onClick={() => setActiveSection("garage")}
              >
                Ingresar a mi Garage
              </button>
              <button
                type="button"
                className="buyer-hero__secondary-btn garage-ox-hero__tool-btn"
                onClick={() => onNavigate?.("search")}
              >
                Explorar vehículos
              </button>
            </div>
          </div>

          <div className="garage-ox-hero__visual" aria-hidden="true" />

          {(authProfile || authUser) && (
            <>
            <div className="buyer-hero__profile-row garage-ox-hero__profile-row">
              <p className="garage-ox-hero__user-id">
                {authProfile?.full_name
                  ? <><strong>{authProfile.full_name}</strong> · {authProfile?.email || authUser?.email}</>
                  : authProfile?.email || authUser?.email}
              </p>
              <div className="buyer-hero__profile-actions garage-ox-hero__profile-tools">
                <button
                  type="button"
                  className="garage-ox-hero__tool-btn"
                  onClick={refreshBuyerPanel}
                >
                  Actualizar
                </button>
                <button
                  type="button"
                  className="buyer-edit-profile-btn garage-ox-hero__tool-btn"
                  onClick={() => editingProfile ? cancelEditingProfile() : startEditingProfile()}
                >
                  {editingProfile ? "Cancelar edición" : "Editar perfil"}
                </button>
                {profileSaved && <span className="buyer-profile-saved">Guardado</span>}
              </div>
            </div>

            {editingProfile && (
              <form className="buyer-profile-form garage-ox-hero__profile-form" onSubmit={handleSaveProfile}>
                <div className="buyer-profile-form-fields">
                  <div className="buyer-profile-field">
                    <label htmlFor="bp-fullname">Nombre completo</label>
                    <input
                      id="bp-fullname"
                      type="text"
                      autoComplete="name"
                      value={profileForm.fullName}
                      onChange={(e) => updateProfileField("fullName", e.target.value)}
                      placeholder="Tu nombre"
                      maxLength={80}
                      disabled={profileSaving}
                      autoFocus
                    />
                  </div>
                  <div className="buyer-profile-field">
                    <label htmlFor="bp-phone">Teléfono</label>
                    <input
                      id="bp-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={profileForm.phoneVisible}
                      onChange={(e) => updateProfileField("phoneVisible", e.target.value)}
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
                      autoComplete="tel"
                      inputMode="tel"
                      value={profileForm.phoneWhatsapp}
                      onChange={(e) => updateProfileField("phoneWhatsapp", e.target.value)}
                      placeholder="Ej. +54 9 11 1234-5678"
                      maxLength={30}
                      disabled={profileSaving}
                    />
                  </div>
                </div>
                <div className="buyer-profile-form-actions">
                  <button type="submit" className="primary-action" disabled={profileSaving}>
                    {profileSaving ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button type="button" className="admin-refresh-btn" onClick={cancelEditingProfile} disabled={profileSaving}>
                    Cancelar
                  </button>
                </div>
                {profileError && <p className="auth-warning">{profileError}</p>}
              </form>
            )}
            </>
          )}
        </div>

        {isLoading && (
          <div className="buyer-panel-skeleton">
            <div className="buyer-skeleton-rows">
              {[1, 2, 3].map((i) => (
                <div key={i} className="buyer-skeleton-row ox-shimmer" />
              ))}
            </div>
          </div>
        )}

        {/* ── Novedades de Garage oX ───────────────────────────── */}
        {garageNotificationsLoaded && (
          <section className="garage-ox-notifications" aria-label="Novedades de tu Garage">
            <div className="garage-ox-notifications__head">
              <div>
                <p className="eyebrow">Garage oX</p>
                <h2 className="garage-ox-notifications__title">Novedades de tu Garage</h2>
                <p className="garage-ox-notifications__summary">
                  {garageUnreadCount > 0
                    ? `Tenés ${garageUnreadCount} novedad${garageUnreadCount !== 1 ? "es" : ""} nueva${garageUnreadCount !== 1 ? "s" : ""}.`
                    : "Tu Garage está al día."}
                </p>
              </div>
              {garageUnreadCount > 0 && (
                <button
                  type="button"
                  className="admin-refresh-btn garage-ox-notifications__mark-all"
                  onClick={markAllGarageRead}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {garageNotifications.length === 0 ? (
              <div className="garage-ox-notifications__empty">
                <p>No hay novedades por ahora.</p>
                <p>Cuando Radar encuentre oportunidades o se acerque un vencimiento, vas a verlo acá.</p>
              </div>
            ) : (
              <div className="garage-ox-notifications__list">
                {garageNotifications.slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    className={[
                      "garage-ox-notification-card",
                      `garage-ox-notification-card--${n.severity || "info"}`,
                      n.is_read ? "is-read" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {!n.is_read && (
                      <span className="garage-ox-notification-card__dot" aria-hidden="true" />
                    )}
                    <div className="garage-ox-notification-card__body">
                      <strong className="garage-ox-notification-card__title">{n.title}</strong>
                      <p className="garage-ox-notification-card__text">{n.body}</p>
                      <time className="garage-ox-notification-card__time">
                        {new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(
                          new Date(n.created_at)
                        )}
                      </time>
                    </div>
                    <div className="garage-ox-notification-card__actions">
                      {(n.action_label || n.type === "radar_match" || n.type === "vtv_due" || n.type === "insurance_due") && (
                        <button
                          type="button"
                          className="buyer-stat-cta-btn"
                          onClick={() => handleNotificationAction(n)}
                        >
                          {n.action_label || "Ver detalle"}
                        </button>
                      )}
                      {!n.is_read && (
                        <button
                          type="button"
                          className="admin-refresh-btn"
                          onClick={() => markOneGarageNotificationRead(n.id)}
                        >
                          Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Nav tabs ─────────────────────────────────────────── */}
        <nav className="garage-ox-nav" aria-label="Secciones de Garage oX">
          {[
            {
              id: "garage",
              label: "Mi Garage",
              meta: garageVehicles.length > 0
                ? `${garageVehicles.length} unidad${garageVehicles.length !== 1 ? "es" : ""}`
                : "Registrá tu primer vehículo",
            },
            {
              id: "movimiento",
              label: "Mi movimiento",
              meta: (totalActivity + favorites.length) > 0
                ? `${totalActivity + favorites.length} elemento${(totalActivity + favorites.length) !== 1 ? "s" : ""}`
                : "Sin actividad aún",
            },
            {
              id: "radar",
              label: "Radar oX",
              meta: radarRequests.length > 0
                ? `${radarRequests.length} criterio${radarRequests.length !== 1 ? "s" : ""} activo${radarRequests.length !== 1 ? "s" : ""}`
                : "Sin criterios activos",
            },
          ].map(({ id, label, meta }) => (
            <button
              key={id}
              type="button"
              className={`garage-ox-nav__btn${activeSection === id ? " is-active" : ""}`}
              onClick={() => setActiveSection((prev) => prev === id ? null : id)}
              aria-expanded={activeSection === id}
            >
              <span className="garage-ox-nav__label">{label}</span>
              <span className="garage-ox-nav__meta">{meta}</span>
            </button>
          ))}
        </nav>

        {/* ── Mi Garage ─────────────────────────────────────────── */}
        {activeSection === "garage" && (
          <div className="garage-ox-section-body">
            {garageVehiclesError && (
              <div className="garage-ox-section-error">
                <span>{garageVehiclesError}</span>
                <button type="button" className="admin-refresh-btn" onClick={() => garage.loadVehicles()}>Reintentar</button>
              </div>
            )}
            {loadingGarageVehicles && !garageVehicles.length && (
              <div className="buyer-panel-skeleton">
                <div className="buyer-skeleton-rows">
                  {[1, 2, 3].map((i) => <div key={i} className="buyer-skeleton-row ox-shimmer" />)}
                </div>
              </div>
            )}
            <div className="buyer-garage-section garage-ox-garage" id="garage-ox-garage">
              <div className="buyer-section-head garage-ox-garage__head">
                <div>
                  <p className="eyebrow garage-ox-garage__eyebrow">Garage oX</p>
                  <h2 className="garage-ox-garage__title">Mi Garage</h2>
                  <p className="garage-ox-garage__subtitle">
                    Tus vehículos, servicios, vencimientos e historial dentro de oX.
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => {
                    if (showGarageVehicleForm) {
                      setShowGarageVehicleForm(false);
                      resetGarageVehicleForm();
                      return;
                    }

                    resetGarageVehicleForm();
                    setShowGarageVehicleForm(true);
                  }}
                >
                  {showGarageVehicleForm ? "Cerrar carga" : "Agregar vehículo"}
                </button>
              </div>


              {showGarageVehicleForm && (
              <form className="buyer-garage-owned-form" onSubmit={handleSaveGarageVehicle}>
                <div className="buyer-garage-owned-head">
                  <div>
                    <span className="eyebrow">{editingGarageVehicleId ? "Editando card" : "Vehículo propio"}</span>
                    <h3>{editingGarageVehicleId ? "Actualizar unidad" : "Cargar unidad familiar"}</h3>
                    <p>
                      Sumá una unidad a tu colección y mantené su historia lista para
                      evolucionar.
                    </p>
                  </div>
                  <label className="buyer-garage-sale-toggle">
                    <input
                      type="checkbox"
                      checked={garageVehicleForm.saleIntent}
                      onChange={(event) =>
                        updateGarageVehicleField("saleIntent", event.target.checked)
                      }
                    />
                    Preparar para futura venta
                  </label>
                </div>

                <div className="buyer-garage-owned-grid">
                  <label>
                    Marca
                    <input
                      value={garageVehicleForm.brand}
                      onChange={(event) => updateGarageVehicleField("brand", event.target.value)}
                      placeholder="Ej. Toyota"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Modelo
                    <input
                      value={garageVehicleForm.model}
                      onChange={(event) => updateGarageVehicleField("model", event.target.value)}
                      placeholder="Ej. Corolla"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Versión
                    <input
                      value={garageVehicleForm.version}
                      onChange={(event) => updateGarageVehicleField("version", event.target.value)}
                      placeholder="Ej. XEI 2.0"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Año
                    <input
                      type="number"
                      value={garageVehicleForm.year}
                      onChange={(event) => updateGarageVehicleField("year", event.target.value)}
                      placeholder="2021"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Kilómetros
                    <input
                      type="text"
                      inputMode="numeric"
                      value={garageVehicleForm.km}
                      onChange={(event) => updateGarageVehicleField("km", event.target.value)}
                      placeholder="62000"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Dominio
                    <input
                      value={garageVehicleForm.plate}
                      onChange={(event) => updateGarageVehicleField("plate", event.target.value)}
                      placeholder="Opcional"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    VTV
                    <input
                      type="date"
                      value={garageVehicleForm.vtvDueDate}
                      onChange={(event) => updateGarageVehicleField("vtvDueDate", event.target.value)}
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Seguro
                    <input
                      type="date"
                      value={garageVehicleForm.insuranceDueDate}
                      onChange={(event) => updateGarageVehicleField("insuranceDueDate", event.target.value)}
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Aseguradora
                    <input
                      value={garageVehicleForm.insuranceCompany}
                      onChange={(event) => updateGarageVehicleField("insuranceCompany", event.target.value)}
                      placeholder="Opcional"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Estado
                    <select
                      value={garageVehicleForm.condition}
                      onChange={(event) => updateGarageVehicleField("condition", event.target.value)}
                      disabled={garageVehicleSaving}
                    >
                      <option value="">Seleccionar</option>
                      <option value="excelente">Excelente</option>
                      <option value="muy_bueno">Muy bueno</option>
                      <option value="bueno">Bueno</option>
                      <option value="regular">Regular</option>
                      <option value="a_revisar">A revisar</option>
                    </select>
                  </label>
                  <label>
                    Valor esperado
                    <input
                      type="text"
                      inputMode="decimal"
                      value={garageVehicleForm.expectedPrice}
                      onChange={(event) => updateGarageVehicleField("expectedPrice", event.target.value)}
                      placeholder="Ej. 20.000.000"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Provincia
                    <input
                      value={garageVehicleForm.province}
                      onChange={(event) => updateGarageVehicleField("province", event.target.value)}
                      placeholder="Ej. Buenos Aires"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Ciudad
                    <input
                      value={garageVehicleForm.city}
                      onChange={(event) => updateGarageVehicleField("city", event.target.value)}
                      placeholder="Ej. Rosario"
                      disabled={garageVehicleSaving}
                    />
                  </label>
                  <label>
                    Foto principal
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleGarageVehiclePhotoChange}
                      disabled={garageVehicleSaving}
                    />
                  </label>
                </div>

                {(garageVehiclePhotoPreview || garageVehicleForm.photoUrl) && (
                  <div className="garage-framing-wrapper">
                    <DraggableImageFramer
                      src={garageVehiclePhotoPreview || garageVehicleForm.photoUrl}
                      positionX={garageVehicleForm.imagePositionX}
                      positionY={garageVehicleForm.imagePositionY}
                      onPositionChange={(x, y) =>
                        setGarageVehicleForm((f) => ({ ...f, imagePositionX: x, imagePositionY: y }))
                      }
                      disabled={garageVehicleSaving}
                    />
                    <div className="garage-framing-controls">
                      <p className="garage-framing-hint">
                        Ajustá el encuadre para que la card se vea impecable.
                      </p>
                      <button
                        type="button"
                        className="garage-framing-reset"
                        onClick={() => setGarageVehicleForm((f) => ({ ...f, imagePositionX: 50, imagePositionY: 50 }))}
                        disabled={garageVehicleSaving}
                      >
                        Centrar imagen
                      </button>
                    </div>
                    <p className="garage-framing-file-note">
                      {garageVehiclePhotoFile ? "Foto lista para subir · " : "Foto actual · "}JPG, PNG o WebP · Máx. 4 MB
                    </p>
                  </div>
                )}

                <label className="buyer-garage-notes">
                  Notas del vehículo
                  <textarea
                    value={garageVehicleForm.notes}
                    onChange={(event) => updateGarageVehicleField("notes", event.target.value)}
                    rows={3}
                    placeholder="Notas privadas, detalles de uso, trabajos realizados o próximos cuidados."
                    disabled={garageVehicleSaving}
                  />
                </label>

                <div className="buyer-garage-form-actions">
                  <button
                    type="submit"
                    className="primary-action"
                    disabled={garageVehicleSaving}
                  >
                    {garageVehicleSaving
                      ? "Guardando..."
                      : editingGarageVehicleId
                        ? "Actualizar card"
                        : "Guardar en Garage oX"}
                  </button>
                  {garageVehicleSaved && <span>Vehículo guardado</span>}
                  {garageVehiclePhotoUploading && <span>Subiendo foto...</span>}
                  {garageVehiclePhotoSaved && <span>Foto actualizada</span>}
                  {garageVehicleError && <small className="garage-inline-error">{garageVehicleError}</small>}
                </div>
              </form>
              )}

              {garageVehicles.length === 0 ? (
                <div className="buyer-garage-empty garage-ox-garage__empty">
                  <strong>Todavía no tenés vehículos en tu Garage.</strong>
                  <p>
                    Cuando compres, asignes o registres un vehículo, vas a poder seguir
                    su historial, servicios y futura reventa desde acá.
                  </p>
                  <div className="buyer-empty-radar-cta">
                    <div className="buyer-empty-radar-cta__copy">
                      <span className="buyer-empty-radar-cta__badge">Radar oX</span>
                      <p>¿Sabés qué auto buscás? Activá el Radar y te avisamos cuando aparezca uno que coincida.</p>
                    </div>
                    <button
                      type="button"
                      className="buyer-empty-radar-cta__btn"
                      onClick={() => onNavigate?.("search")}
                    >
                      Activar Radar oX
                    </button>
                  </div>
                  <div className="garage-ox-garage__empty-actions">
                    <button
                      type="button"
                      className="primary-action"
                      onClick={() => onNavigate?.("search")}
                    >
                      Buscar vehículos
                    </button>
                    <button
                      type="button"
                      className="table-action-btn"
                      onClick={() => { resetGarageVehicleForm(); setShowGarageVehicleForm(true); }}
                    >
                      Registrar vehículo propio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="buyer-garage-collection">
                  <div className="buyer-garage-list buyer-garage-card-grid">
                    {garageVehicles.map((vehicle) => {
                      const services = garageServices.filter((service) =>
                        matchesGarageServiceVehicle(service, vehicle)
                      );
                      const isSelected = selectedGarageVehicleId === vehicle.id;
                      const latestService = services[0] || null;

                      return (
                        <div
                          key={vehicle.id}
                          role="button"
                          tabIndex={0}
                          className={`vehicle-card buyer-garage-collector-card garage-ox-garage-card${isSelected ? " is-active" : ""}`}
                          onClick={() => {
                            setSelectedGarageVehicleId(vehicle.id);
                            setActiveGarageTab("summary");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedGarageVehicleId(vehicle.id);
                              setActiveGarageTab("summary");
                            }
                          }}
                        >
                          <div className="vehicle-card__media">
                            <div className="vehicle-card__topbar">
                              <span className="vehicle-card__rank">
                                {getGarageVehicleSourceLabel(vehicle)}
                              </span>
                              {vehicle.year && (
                                <span className="vehicle-card__year">{vehicle.year}</span>
                              )}
                            </div>
                            {vehicle.photoUrl ? (
                              <img
                                className="vehicle-card__image"
                                src={vehicle.photoUrl}
                                alt=""
                                loading="lazy"
                                style={{ objectPosition: getObjectPositionXY(vehicle.imagePositionX, vehicle.imagePositionY) }}
                              />
                            ) : (
                              <div className="vehicle-card__placeholder">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                  <rect x="3" y="6" width="18" height="13" rx="2"/>
                                  <circle cx="12" cy="12" r="3"/>
                                  <path d="M7 6V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"/>
                                </svg>
                                <span>Sin foto</span>
                              </div>
                            )}
                          </div>
                          <div className="vehicle-card__body">
                            <div className="vehicle-card__identity">
                              <h3 className="vehicle-card__title">
                                {vehicle.title ||
                                  [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ") ||
                                  "Vehículo"}
                              </h3>
                              {(vehicle.brand || vehicle.version) && (
                                <p className="vehicle-card__version">
                                  {[vehicle.brand, vehicle.version].filter(Boolean).join(" ")}
                                </p>
                              )}
                            </div>
                            <div className="vehicle-card__facts">
                              <div className="vehicle-card__fact">
                                <span>{getGarageStatusLabel(vehicle.status)}</span>
                              </div>
                              {vehicle.km && (
                                <div className="vehicle-card__fact">
                                  <span>{Number(vehicle.km).toLocaleString("es-AR")} km</span>
                                </div>
                              )}
                              <div className="vehicle-card__fact">
                                <span>{services.length} servicio{services.length !== 1 ? "s" : ""}</span>
                              </div>
                              {vehicle.vtvDueDate && (
                                <div className={`vehicle-card__fact${getVehicleExpiryStatus(vehicle.vtvDueDate) === "expired" ? " is-expired" : getVehicleExpiryStatus(vehicle.vtvDueDate) === "soon" ? " is-due-soon" : ""}`}>
                                  <span>VTV{getVehicleExpiryStatus(vehicle.vtvDueDate) === "expired" ? " ⚠" : getVehicleExpiryStatus(vehicle.vtvDueDate) === "soon" ? " !" : ""}</span>
                                  <strong>{formatDateTime(vehicle.vtvDueDate).split(",")[0]}</strong>
                                </div>
                              )}
                              {vehicle.insuranceDueDate && (
                                <div className={`vehicle-card__fact${getVehicleExpiryStatus(vehicle.insuranceDueDate) === "expired" ? " is-expired" : getVehicleExpiryStatus(vehicle.insuranceDueDate) === "soon" ? " is-due-soon" : ""}`}>
                                  <span>Seguro{getVehicleExpiryStatus(vehicle.insuranceDueDate) === "expired" ? " ⚠" : getVehicleExpiryStatus(vehicle.insuranceDueDate) === "soon" ? " !" : ""}</span>
                                  <strong>{formatDateTime(vehicle.insuranceDueDate).split(",")[0]}</strong>
                                </div>
                              )}
                            </div>
                            <div className="vehicle-card__price-box">
                              <div className="vehicle-card__price-copy">
                                <span className="vehicle-card__price-label">Valor estimado</span>
                                <strong className="vehicle-card__price">
                                  {formatARS(vehicle.expectedPrice || vehicle.price)}
                                </strong>
                              </div>
                              <p className="vehicle-card__price-note">
                                Dato orientativo. oX NEXMOV no calcula ni garantiza este valor.
                              </p>
                            </div>
                            <div className="vehicle-card__actions garage-ox-garage-card__actions">
                              <button
                                type="button"
                                className="vehicle-card__btn vehicle-card__btn--primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGarageVehicleId(vehicle.id);
                                  setActiveGarageTab("summary");
                                }}
                              >
                                Ver garage
                              </button>
                              <button
                                type="button"
                                className="vehicle-card__btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGarageVehicleId(vehicle.id);
                                  setActiveGarageTab("services");
                                }}
                              >
                                Agregar servicio
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedGarageVehicle && (
                    <div className="buyer-garage-detail-panel">
                      <div className="buyer-garage-passport">
                        <div className="buyer-garage-passport-media" aria-hidden="true">
                          {selectedGarageVehicle.photoUrl ? (
                            <img
                              src={selectedGarageVehicle.photoUrl}
                              alt=""
                              loading="lazy"
                              style={{ objectPosition: getObjectPositionXY(selectedGarageVehicle.imagePositionX, selectedGarageVehicle.imagePositionY) }}
                            />
                          ) : (
                            <span>oX</span>
                          )}
                        </div>
                        <div className="buyer-garage-detail-head">
                          <div>
                            <span className="eyebrow">{getGarageVehicleSourceLabel(selectedGarageVehicle)}</span>
                            <h3>
                              {selectedGarageVehicle.title ||
                                [selectedGarageVehicle.brand, selectedGarageVehicle.model, selectedGarageVehicle.year]
                                  .filter(Boolean).join(" ") ||
                                "Vehículo"}
                            </h3>
                            {(selectedGarageVehicle.dealer || selectedGarageVehicle.expectedPrice || selectedGarageVehicle.price) && (
                              <p>
                                {[
                                  selectedGarageVehicle.dealer,
                                  (selectedGarageVehicle.expectedPrice || selectedGarageVehicle.price)
                                    ? formatARS(selectedGarageVehicle.expectedPrice || selectedGarageVehicle.price)
                                    : null,
                                ].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <div className="buyer-garage-detail-actions">
                            <strong>{getGarageStatusLabel(selectedGarageVehicle.status)}</strong>
                            {isOwnedGarageVehicle(selectedGarageVehicle) && (
                              deleteConfirmVehicleId === selectedGarageVehicle.id ? (
                                <div className="buyer-garage-delete-confirm">
                                  <span>¿Eliminás esta unidad?</span>
                                  <button
                                    type="button"
                                    className="buyer-garage-delete-confirm__yes"
                                    disabled={deletingGarageVehicleId === selectedGarageVehicle.id}
                                    onClick={() => handleDeleteGarageVehicle(selectedGarageVehicle.id)}
                                  >
                                    {deletingGarageVehicleId === selectedGarageVehicle.id ? "Eliminando…" : "Sí, eliminar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="buyer-garage-delete-confirm__no"
                                    onClick={() => setDeleteConfirmVehicleId("")}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="buyer-garage-delete-btn"
                                  onClick={() => setDeleteConfirmVehicleId(selectedGarageVehicle.id)}
                                >
                                  Eliminar
                                </button>
                              )
                            )}
                          </div>
                        </div>
                        <div className="buyer-garage-passport-meta">
                          <span>
                            {selectedGarageVehicle.km
                              ? `${Number(selectedGarageVehicle.km).toLocaleString("es-AR")} km`
                              : "Km sin cargar"}
                          </span>
                          <span>{selectedGarageServices.length} registros</span>
                          <span>{getNextGarageHint(selectedGarageServices)}</span>
                        </div>
                      </div>

                      <div className="buyer-garage-tabs garage-ox-garage-tabs" role="tablist" aria-label="Secciones de Garage oX">
                        {[
                          ["summary", "Resumen"],
                          ["services", "Servicios"],
                          ["deadlines", "Vencimientos"],
                          ["history", "Historial"],
                          ["sale", "Venta futura"],
                        ].map(([tabId, label]) => (
                          <button
                            key={tabId}
                            type="button"
                            role="tab"
                            aria-selected={activeGarageTab === tabId}
                            className={activeGarageTab === tabId ? "is-active" : ""}
                            onClick={() => setActiveGarageTab(tabId)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {activeGarageTab === "summary" && (() => {
                        const totalCost = selectedGarageServices.reduce(
                          (sum, s) => sum + Number(s.cost || 0), 0
                        );
                        return (
                        <div className="buyer-garage-tab-panel" role="tabpanel">
                          <div className="buyer-garage-summary-grid">
                            <article className={!selectedGarageVehicle.km ? "is-pending" : ""}>
                              <span>Kilometraje</span>
                              <strong>
                                {selectedGarageVehicle.km
                                  ? `${Number(selectedGarageVehicle.km).toLocaleString("es-AR")} km`
                                  : "Sin cargar"}
                              </strong>
                            </article>
                            <article>
                              <span>Servicios</span>
                              <strong>{selectedGarageServices.length}</strong>
                              <small>{selectedGarageServices.length === 0 ? "Sin historial aún" : `Último: ${getServiceTypeLabel(lastSelectedGarageService?.serviceType)}`}</small>
                            </article>
                            <article className={totalCost === 0 ? "is-pending" : ""}>
                              <span>Inversión total</span>
                              <strong>{totalCost > 0 ? formatARS(totalCost) : "Sin registros"}</strong>
                              {totalCost > 0 && <small>en mantenimiento</small>}
                            </article>
                            <article className={getVehicleExpiryStatus(selectedGarageVehicle.vtvDueDate) === "expired" ? "is-expired" : getVehicleExpiryStatus(selectedGarageVehicle.vtvDueDate) === "soon" ? "is-due-soon" : !selectedGarageVehicle.vtvDueDate ? "is-pending" : ""}>
                              <span>VTV</span>
                              <strong>
                                {selectedGarageVehicle.vtvDueDate
                                  ? formatDateTime(selectedGarageVehicle.vtvDueDate).split(",")[0]
                                  : "Sin cargar"}
                              </strong>
                              {getVehicleExpiryStatus(selectedGarageVehicle.vtvDueDate) === "expired" && <small>Vencida</small>}
                              {getVehicleExpiryStatus(selectedGarageVehicle.vtvDueDate) === "soon" && <small>Próxima a vencer</small>}
                            </article>
                            <article className={getVehicleExpiryStatus(selectedGarageVehicle.insuranceDueDate) === "expired" ? "is-expired" : getVehicleExpiryStatus(selectedGarageVehicle.insuranceDueDate) === "soon" ? "is-due-soon" : !selectedGarageVehicle.insuranceDueDate ? "is-pending" : ""}>
                              <span>Seguro</span>
                              <strong>
                                {selectedGarageVehicle.insuranceDueDate
                                  ? formatDateTime(selectedGarageVehicle.insuranceDueDate).split(",")[0]
                                  : "Sin cargar"}
                              </strong>
                              {getVehicleExpiryStatus(selectedGarageVehicle.insuranceDueDate) === "expired" && <small>Vencido</small>}
                              {getVehicleExpiryStatus(selectedGarageVehicle.insuranceDueDate) === "soon" && <small>Próximo a vencer</small>}
                            </article>
                            <article className="buyer-garage-summary-hint">
                              <span>Próximo paso</span>
                              <strong>{getNextGarageHint(selectedGarageServices)}</strong>
                            </article>
                          </div>
                        </div>
                        );
                      })()}

                      {activeGarageTab === "services" && (
                        <form className="buyer-garage-service-form" role="tabpanel" aria-label="Servicios del vehículo" onSubmit={handleSaveGarageService}>
                          <div>
                            <span className="eyebrow">
                              {selectedGarageVehicle.title ||
                                [selectedGarageVehicle.brand, selectedGarageVehicle.model].filter(Boolean).join(" ") ||
                                "Vehículo seleccionado"}
                            </span>
                            <h3>Registrar servicio</h3>
                            <p>
                              Mantenimiento, kilometraje o trabajo realizado. Queda en tu historial privado.
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
                                <option value="battery">Batería</option>
                                <option value="inspection">Revisión general</option>
                                <option value="repair">Reparación</option>
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
                              placeholder="Ej. Cambio de aceite, filtros, revisión de tren delantero..."
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
                            {garageServiceError && (
                              <small className="garage-inline-error">{garageServiceError}</small>
                            )}
                          </div>
                        </form>
                      )}

                      {activeGarageTab === "deadlines" && (
                        <div className="buyer-garage-tab-panel" role="tabpanel">
                          <div className="buyer-garage-summary-grid">
                            <article className={
                              getVehicleExpiryStatus(selectedGarageVehicle.vtvDueDate) === "expired" ? "is-expired"
                              : getVehicleExpiryStatus(selectedGarageVehicle.vtvDueDate) === "soon" ? "is-due-soon"
                              : !selectedGarageVehicle.vtvDueDate ? "is-pending" : ""
                            }>
                              <span>VTV</span>
                              <strong>
                                {selectedGarageVehicle.vtvDueDate
                                  ? formatDateTime(selectedGarageVehicle.vtvDueDate).split(",")[0]
                                  : "Sin cargar"}
                              </strong>
                              {selectedGarageVehicle.vtvDueDate && (
                                <small className="buyer-garage-deadline-countdown">
                                  {formatDaysUntil(selectedGarageVehicle.vtvDueDate)}
                                </small>
                              )}
                            </article>
                            <article className={
                              getVehicleExpiryStatus(selectedGarageVehicle.insuranceDueDate) === "expired" ? "is-expired"
                              : getVehicleExpiryStatus(selectedGarageVehicle.insuranceDueDate) === "soon" ? "is-due-soon"
                              : !selectedGarageVehicle.insuranceDueDate ? "is-pending" : ""
                            }>
                              <span>Seguro</span>
                              <strong>
                                {selectedGarageVehicle.insuranceDueDate
                                  ? formatDateTime(selectedGarageVehicle.insuranceDueDate).split(",")[0]
                                  : "Sin cargar"}
                              </strong>
                              {selectedGarageVehicle.insuranceDueDate && (
                                <small className="buyer-garage-deadline-countdown">
                                  {formatDaysUntil(selectedGarageVehicle.insuranceDueDate)}
                                </small>
                              )}
                            </article>
                            <article className={!selectedGarageVehicle.vtvDueDate && !selectedGarageVehicle.insuranceDueDate ? "is-pending" : "buyer-garage-summary-hint"}>
                              <span>Estado del vehículo</span>
                              <strong>{getGarageStatusLabel(selectedGarageVehicle.status)}</strong>
                              <small>{getGarageVehicleSourceLabel(selectedGarageVehicle)}</small>
                            </article>
                          </div>
                          {(!selectedGarageVehicle.vtvDueDate || !selectedGarageVehicle.insuranceDueDate) && (
                            <p className="buyer-garage-deadline-hint">
                              Completá los vencimientos editando la card del vehículo para recibir alertas de renovación.
                            </p>
                          )}
                        </div>
                      )}

                      {activeGarageTab === "history" && (
                        <div className="buyer-garage-history" role="tabpanel" aria-label="Historial de servicios">
                          <div>
                            <span className="eyebrow">Historial</span>
                            <h3>Servicios registrados</h3>
                          </div>
                          {selectedGarageServices.length === 0 ? (
                            <div className="buyer-garage-history-empty">
                              <div className="buyer-garage-history-empty__icon" aria-hidden="true">
                                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="8" y="5" width="24" height="30" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.45"/>
                                  <line x1="13" y1="13" x2="27" y2="13" stroke="currentColor" strokeWidth="1.5" opacity="0.45"/>
                                  <line x1="13" y1="19" x2="27" y2="19" stroke="currentColor" strokeWidth="1.5" opacity="0.45"/>
                                  <line x1="13" y1="25" x2="22" y2="25" stroke="currentColor" strokeWidth="1.5" opacity="0.45"/>
                                </svg>
                              </div>
                              <strong>Todavía no hay servicios registrados.</strong>
                              <p>Cuando cargues el primero, el historial de este vehículo va a empezar a construirse.</p>
                            </div>
                          ) : (
                            <div className="buyer-garage-service-list">
                              {selectedGarageServices.map((service) => (
                                <article key={service.id} className="buyer-garage-service-item">
                                  <span>{formatDateOnly(service.serviceDate)}</span>
                                  <strong>{getServiceTypeLabel(service.serviceType)}</strong>
                                  <p>
                                    {service.mileage ? `${Number(service.mileage).toLocaleString("es-AR")} km` : "Sin km"}
                                    {service.cost ? ` - ${formatARS(service.cost)}` : ""}
                                  </p>
                                  {service.notes && <small>{service.notes}</small>}
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeGarageTab === "sale" && (() => {
                        const saleReadyCount = [
                          selectedGarageServices.length > 0,
                          !!selectedGarageVehicle.km,
                          !!(selectedGarageVehicle.vtvDueDate || selectedGarageVehicle.insuranceDueDate),
                          !!selectedGarageVehicle.expectedPrice,
                        ].filter(Boolean).length;
                        return (
                        <div className="buyer-garage-tab-panel buyer-garage-sale-panel" role="tabpanel" aria-label="Venta futura del vehículo">
                          <span className="eyebrow">Venta futura</span>
                          <div className="buyer-garage-sale-readiness-head">
                            <h3>Preparación comercial</h3>
                            <span className="buyer-garage-sale-progress">{saleReadyCount}/4 listo</span>
                          </div>
                          <p>
                            Completá los datos del vehículo para que esta card tenga valor comercial
                            al momento de publicar. Cuanto más historial, mayor contexto para el comprador.
                          </p>
                          <div className="buyer-garage-sale-readiness">
                            {[
                              {
                                done: selectedGarageServices.length > 0,
                                label: "Historial",
                                detail: selectedGarageServices.length > 0
                                  ? `${selectedGarageServices.length} registro${selectedGarageServices.length !== 1 ? "s" : ""}`
                                  : "Agregá al menos un servicio",
                              },
                              {
                                done: !!selectedGarageVehicle.km,
                                label: "Kilometraje",
                                detail: selectedGarageVehicle.km
                                  ? `${Number(selectedGarageVehicle.km).toLocaleString("es-AR")} km`
                                  : "Cargá los km actuales",
                              },
                              {
                                done: !!(selectedGarageVehicle.vtvDueDate || selectedGarageVehicle.insuranceDueDate),
                                label: "Vencimientos",
                                detail: (selectedGarageVehicle.vtvDueDate || selectedGarageVehicle.insuranceDueDate)
                                  ? "VTV y/o seguro cargados"
                                  : "Cargá VTV y seguro",
                              },
                              {
                                done: !!selectedGarageVehicle.expectedPrice,
                                label: "Precio esperado",
                                detail: selectedGarageVehicle.expectedPrice
                                  ? formatARS(selectedGarageVehicle.expectedPrice)
                                  : "Indicá un valor de referencia",
                              },
                            ].map(({ done, label, detail }) => (
                              <div key={label} className={`buyer-garage-sale-readiness__item${done ? " is-ready" : ""}`}>
                                <span className="buyer-garage-sale-readiness__icon" aria-hidden="true">
                                  {done ? "✓" : "○"}
                                </span>
                                <div>
                                  <strong>{label}</strong>
                                  <span>{detail}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="buyer-garage-sale-actions">
                            {saleLeadSent ? (
                              <div className="buyer-garage-sale-sent">
                                <strong>Solicitud registrada.</strong>
                                <span>
                                  El equipo de oX NEXMOV revisará los datos y se pondrá en contacto.
                                </span>
                                <button
                                  type="button"
                                  className="admin-refresh-btn"
                                  onClick={() => setSaleLeadSent(false)}
                                >
                                  Enviar otra solicitud
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="primary-action"
                                  disabled={saleLeadSending || !isOwnedGarageVehicle(selectedGarageVehicle)}
                                  onClick={() => handleInitiateSale(selectedGarageVehicle)}
                                >
                                  {saleLeadSending ? "Registrando..." : "Iniciar proceso de venta"}
                                </button>
                                <button
                                  type="button"
                                  className="secondary-action"
                                  onClick={() => {
                                    if (isOwnedGarageVehicle(selectedGarageVehicle)) {
                                      startGarageVehicleEdit(selectedGarageVehicle);
                                    } else {
                                      resetGarageVehicleForm();
                                      setShowGarageVehicleForm(true);
                                    }
                                  }}
                                >
                                  {isOwnedGarageVehicle(selectedGarageVehicle)
                                    ? "Completar datos"
                                    : "Cargar unidad propia"}
                                </button>
                                <button
                                  type="button"
                                  className="admin-refresh-btn"
                                  onClick={() => setActiveGarageTab("services")}
                                >
                                  Cargar servicio
                                </button>
                              </>
                            )}
                            {saleLeadError && (
                              <small className="garage-inline-error">{saleLeadError}</small>
                            )}
                            {!isOwnedGarageVehicle(selectedGarageVehicle) && (
                              <small style={{ color: "rgba(203,213,225,0.6)" }}>
                                Solo podés iniciar el proceso con vehículos propios.
                              </small>
                            )}
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Mi movimiento ─────────────────────────────────────── */}
        {activeSection === "movimiento" && (
          <div className="garage-ox-section-body">

            {/* Sub-navegación */}
            <div className="movimiento-subnav" role="tablist">
              <button
                role="tab"
                type="button"
                aria-selected={activeMovimientoTab === "shortlist"}
                className={`movimiento-subnav__btn${activeMovimientoTab === "shortlist" ? " is-active" : ""}`}
                onClick={() => setActiveMovimientoTab("shortlist")}
              >
                Shortlist
                {favorites.length > 0 && <span className="movimiento-subnav__badge">{favorites.length}</span>}
              </button>
              <button
                role="tab"
                type="button"
                aria-selected={activeMovimientoTab === "historial"}
                className={`movimiento-subnav__btn${activeMovimientoTab === "historial" ? " is-active" : ""}`}
                onClick={() => setActiveMovimientoTab("historial")}
              >
                Historial
                {totalActivity > 0 && <span className="movimiento-subnav__badge">{totalActivity}</span>}
              </button>
            </div>

            {/* Shortlist tab */}
            {activeMovimientoTab === "shortlist" && (
            <div className="buyer-shortlist">
              <div className="buyer-shortlist__head">
                <div>
                  <p className="eyebrow">Tu shortlist</p>
                  <h2>Vehículos guardados</h2>
                  <p>Candidatos que estás mirando de cerca para decidir mejor.</p>
                </div>
                <div className="buyer-shortlist__head-actions">
                  {compareItems.length >= 2 && (
                    <button
                      type="button"
                      className="primary-action"
                      onClick={() => appActions?.openCompare?.()}
                    >
                      Comparar ({compareItems.length})
                    </button>
                  )}
                  <button
                    type="button"
                    className="buyer-stat-cta-btn"
                    onClick={() => onNavigate?.("search")}
                  >
                    Buscar más
                  </button>
                  {favorites.length > 0 && (
                    <button
                      type="button"
                      className="admin-refresh-btn"
                      onClick={() => setShowBuyerActivityDetails(true)}
                    >
                      Ver todos ({favorites.length})
                    </button>
                  )}
                </div>
              </div>

              {favorites.length === 0 ? (
                <div className="buyer-shortlist__empty">
                  <strong>Todavía no guardaste vehículos</strong>
                  <p>
                    Guardá vehículos que te interesen y armá tu primera selección.
                  </p>
                  <div className="buyer-empty-radar-cta">
                    <div className="buyer-empty-radar-cta__copy">
                      <span className="buyer-empty-radar-cta__badge">Radar oX</span>
                      <p>Si ya tenés en mente marca, modelo o zona, el Radar te avisa en cuanto aparezca.</p>
                    </div>
                    <button
                      type="button"
                      className="buyer-empty-radar-cta__btn"
                      onClick={() => onNavigate?.("search")}
                    >
                      Activar Radar oX
                    </button>
                  </div>
                  <button
                    type="button"
                    className="primary-action"
                    onClick={() => onNavigate?.("search")}
                  >
                    Explorar vehículos
                  </button>
                </div>
              ) : (
                <div className="buyer-shortlist__grid">
                  {favorites.slice(0, 4).map((vehicle) => {
                    const imgUrl = vehicle.main_image_url || vehicle.mainImageUrl
                      || vehicle.imageUrl || vehicle.image_url || "";
                    const title    = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");
                    const location = [vehicle.city, vehicle.province].filter(Boolean).join(", ");
                    const price    = Number(vehicle.price || 0);
                    const isComparing = compareItems.some((item) => item.id === vehicle.id);

                    return (
                      <article key={vehicle.id} className={`buyer-shortlist-card${isComparing ? " is-comparing" : ""}`}>
                        <div className="buyer-shortlist-card__image">
                          {imgUrl ? (
                            <img src={imgUrl} alt={title} loading="lazy" />
                          ) : (
                            <div className="buyer-shortlist-card__placeholder">
                              <span>{String(vehicle.brand || "?")[0].toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="buyer-shortlist-card__body">
                          <strong className="buyer-shortlist-card__title">
                            {title || "Vehículo"}
                          </strong>
                          {price > 0 && (
                            <span className="buyer-shortlist-card__price">
                              {formatARS(price)}
                            </span>
                          )}
                          {location && (
                            <span className="buyer-shortlist-card__meta">{location}</span>
                          )}
                        </div>
                        <div className="buyer-shortlist-card__actions">
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => onNavigate?.("vehicleDetail", { vehicleId: vehicle.id })}
                          >
                            Ver →
                          </button>
                          <button
                            type="button"
                            className="buyer-shortlist-card__compare"
                            aria-pressed={isComparing}
                            onClick={() => {
                              if (isComparing) {
                                appActions?.removeFromCompare?.(vehicle.id);
                                return;
                              }

                              appActions?.addToCompare?.(vehicle);
                            }}
                          >
                            {isComparing ? "Quitar" : "Comparar"}
                          </button>
                          <button
                            type="button"
                            className="buyer-shortlist-card__remove"
                            onClick={() => appActions?.removeFavorite?.(vehicle.id)}
                            aria-label="Quitar de favoritos"
                          >
                            ×
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
            )} {/* end shortlist tab */}

            {/* Historial tab */}
            {activeMovimientoTab === "historial" && (
            <>
            {(vehicleLeadsError || zeroKmLeadsError || sellVehicleLeadsError) && (
              <div className="garage-ox-section-error">
                <span>{vehicleLeadsError || zeroKmLeadsError || sellVehicleLeadsError}</span>
                <button type="button" className="admin-refresh-btn" onClick={() => activity.refresh()}>Reintentar</button>
              </div>
            )}
            <section className="garage-ox-movement buyer-activity-disclosure" id="garage-ox-movement">
              <div className="garage-ox-movement__head buyer-activity-disclosure-head">
                <div>
                  <p className="garage-ox-movement__eyebrow">Mi movimiento</p>
                  <h2>Tu actividad en oX</h2>
                </div>
                <div className="garage-ox-movement__chips">
                  {vehicleLeads.length > 0 && <span>{vehicleLeads.length} consulta{vehicleLeads.length !== 1 ? "s" : ""}</span>}
                  {zeroKmLeads.length > 0 && <span>{zeroKmLeads.length} 0km</span>}
                  {sellVehicleLeads.length > 0 && <span>{sellVehicleLeads.length} venta{sellVehicleLeads.length !== 1 ? "s" : ""}</span>}
                </div>
                <button
                  type="button"
                  className="admin-refresh-btn buyer-activity-toggle"
                  onClick={() => setShowBuyerActivityDetails((current) => !current)}
                  aria-expanded={showBuyerActivityDetails}
                >
                  {showBuyerActivityDetails ? "Ocultar detalle" : "Ver detalle completo"}
                </button>
              </div>

              {/* Summary — últimas 3 consultas, siempre visible */}
              <div className="garage-ox-movement__summary">
                {vehicleLeads.length === 0 ? (
                  <div className="garage-ox-movement__empty">
                    <strong>Sin consultas activas</strong>
                    <p>Cuando consultés un vehículo, va a aparecer acá para hacer seguimiento.</p>
                    <button
                      type="button"
                      className="buyer-stat-cta-btn"
                      onClick={() => onNavigate?.("search")}
                    >
                      Buscar vehículos →
                    </button>
                  </div>
                ) : (
                  <>
                    {vehicleLeads.slice(0, 3).map((lead, index) => (
                      <div key={`movement-${index}`} className="garage-ox-movement-card">
                        <div className="garage-ox-movement-card__body">
                          <strong className="garage-ox-movement-card__vehicle">
                            {[lead.vehicle_brand, lead.vehicle_model].filter(Boolean).join(" ") || "Vehículo"}
                          </strong>
                          <span className="garage-ox-movement-card__dealer">
                            {lead.dealer_name || "Dealer"}
                          </span>
                          <time className="garage-ox-movement-card__date">
                            {formatDateTime(lead.created_at).split(",")[0]}
                          </time>
                        </div>
                        <span className={`admin-chip ${getVehicleLeadChipClass(lead.crm_status)}`}>
                          {getVehicleLeadStatusLabel(lead.crm_status)}
                        </span>
                      </div>
                    ))}
                    {vehicleLeads.length > 3 && (
                      <p className="garage-ox-movement__more">
                        +{vehicleLeads.length - 3} consulta{vehicleLeads.length - 3 !== 1 ? "s" : ""} más.{" "}
                        <button
                          type="button"
                          className="buyer-stat-cta-btn"
                          onClick={() => setShowBuyerActivityDetails(true)}
                        >
                          Ver todas →
                        </button>
                      </p>
                    )}
                  </>
                )}
              </div>

              {showBuyerActivityDetails && (
                <div className="buyer-activity-disclosure-body">
                  <div className="garage-ox-activity-toolbar">
                    <span>Historial completo</span>
                    <button
                      type="button"
                      className="admin-refresh-btn"
                      onClick={refreshBuyerPanel}
                    >
                      Actualizar recorrido
                    </button>
                  </div>

                  <div className="garage-ox-activity-section">
                    <div className="garage-ox-activity-section__head">
                      <div>
                        <span>Consultas</span>
                        <h2>Contactos a dealers</h2>
                        <p>Seguimiento de los vehículos que consultaste.</p>
                      </div>
                      <strong>{vehicleLeads.length}</strong>
                    </div>

                    {vehicleLeads.length === 0 ? (
                      <div className="empty-state">
                        <strong>Todavía no realizaste consultas.</strong>
                        <p>Encontrá un vehículo que te interese y contactá al dealer directamente desde la ficha.</p>
                        <div className="buyer-empty-radar-cta">
                          <div className="buyer-empty-radar-cta__copy">
                            <span className="buyer-empty-radar-cta__badge">Radar oX</span>
                            <p>¿No encontraste lo que buscás? Activá el Radar y te avisamos cuando aparezca.</p>
                          </div>
                          <button
                            type="button"
                            className="buyer-empty-radar-cta__btn"
                            onClick={() => onNavigate?.("search")}
                          >
                            Buscar y activar Radar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="garage-ox-activity-list">
                        {vehicleLeads.map((lead, index) => {
                          const leadKey    = `${lead.created_at}-${index}`;
                          const ratingState = leadRatings[leadKey];
                          const submitted  = ratingState?.submitted;
                          const selected   = ratingState?.rating ?? 0;

                          return (
                            <article
                              key={leadKey}
                              className="garage-ox-activity-card"
                            >
                              <div className="garage-ox-activity-card__main">
                                <span className="garage-ox-activity-card__eyebrow">
                                  Consulta a dealer
                                </span>
                                <strong>
                                  {[lead.vehicle_brand, lead.vehicle_model]
                                    .filter(Boolean)
                                    .join(" ") || "Vehículo consultado"}
                                </strong>
                                <p>{lead.vehicle_version || lead.vehicle_title || "Sin versión informada"}</p>
                              </div>
                              <div className="garage-ox-activity-card__meta">
                                <span>{formatDateTime(lead.created_at).split(",")[0]}</span>
                                <span>{formatARS(lead.price_snapshot)}</span>
                                <span>{lead.dealer_name || "Dealer"}</span>
                                <small>{lead.dealer_phone || "Contacto registrado"}</small>
                              </div>
                              <span className={`admin-chip ${getVehicleLeadChipClass(lead.crm_status)}`.trim()}>
                                {getVehicleLeadStatusLabel(lead.crm_status)}
                              </span>

                              <div className="dealer-rating-widget">
                                {submitted ? (
                                  <span className="dealer-rating-widget__thanks">
                                    ¡Gracias por tu calificación!
                                  </span>
                                ) : (
                                  <>
                                    <span className="dealer-rating-widget__label">
                                      ¿Cómo fue la atención?
                                    </span>
                                    <div className="dealer-rating-widget__stars" role="group" aria-label="Calificar dealer">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          className={`dealer-rating-star${star <= selected ? " is-active" : ""}`}
                                          onClick={() => handleLeadRating(leadKey, lead, star)}
                                          disabled={ratingState?.submitting}
                                          aria-label={`${star} estrella${star !== 1 ? "s" : ""}`}
                                        >
                                          ★
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="garage-ox-activity-section">
                    <div className="garage-ox-activity-section__head">
                      <div>
                        <span>0km</span>
                        <h2>Financiación 0km</h2>
                        <p>Consultas enviadas desde la sección de financiación.</p>
                      </div>
                      <strong>{zeroKmLeads.length}</strong>
                    </div>

                    {zeroKmLeads.length === 0 ? (
                      <div className="empty-state">
                        <strong>Todavía no enviaste consultas de financiación 0km.</strong>
                        <p>Explorá las opciones disponibles en la sección de financiación.</p>
                      </div>
                    ) : (
                      <div className="garage-ox-activity-list">
                        {zeroKmLeads.map((lead, index) => (
                          <article
                            key={`${lead.created_at}-${index}`}
                            className="garage-ox-activity-card"
                          >
                            <div className="garage-ox-activity-card__main">
                              <span className="garage-ox-activity-card__eyebrow">
                                Financiacion 0km
                              </span>
                              <strong>
                                {lead.brand_interest || "Marca abierta"}{" "}
                                {lead.model_interest || ""}
                              </strong>
                              <p>{lead.budget_range || "Sin rango declarado"}</p>
                            </div>
                            <div className="garage-ox-activity-card__meta">
                              <span>{formatDateTime(lead.created_at).split(",")[0]}</span>
                              <span>
                                {lead.city || "Sin ciudad"}
                                {lead.province ? `, ${lead.province}` : ""}
                              </span>
                              <span>{formatARS(lead.down_payment)}</span>
                              <small>
                                {lead.preferred_term_months
                                  ? `${lead.preferred_term_months} meses`
                                  : "Sin plazo"}
                              </small>
                            </div>
                            <span className={`admin-chip ${getZeroKmChipClass(lead.status)}`.trim()}>
                              {getZeroKmStatusLabel(lead.status)}
                            </span>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="garage-ox-activity-section">
                    <div className="garage-ox-activity-section__head">
                      <div>
                        <span>Venta</span>
                        <h2>Solicitudes de venta</h2>
                        <p>Vehículos que preparaste desde Garage oX para evaluación comercial.</p>
                      </div>
                      <strong>{sellVehicleLeads.length}</strong>
                    </div>

                    {sellVehicleLeads.length === 0 ? (
                      <div className="empty-state">
                        <strong>Todavía no preparaste una solicitud de venta.</strong>
                        <p>
                          Cargá un vehículo propio en Garage oX y marcá la opción de
                          preparación para futura venta.
                        </p>
                      </div>
                    ) : (
                      <div className="garage-ox-activity-list">
                        {sellVehicleLeads.map((lead, index) => (
                          <article
                            key={`${lead.created_at}-${index}`}
                            className="garage-ox-activity-card"
                          >
                            <div className="garage-ox-activity-card__main">
                              <span className="garage-ox-activity-card__eyebrow">
                                Solicitud de venta
                              </span>
                              <strong>
                                {lead.brand} {lead.model}
                              </strong>
                              <p>
                                {[lead.version, lead.year, `${Number(lead.km || 0).toLocaleString("es-AR")} km`]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <div className="garage-ox-activity-card__meta">
                              <span>{formatDateTime(lead.created_at).split(",")[0]}</span>
                              <span>
                                {lead.city || "Sin ciudad"}
                                {lead.province ? `, ${lead.province}` : ""}
                              </span>
                              <span>{formatARS(lead.expected_price)}</span>
                              {lead.has_debt && <small>Con deuda/prenda declarada</small>}
                            </div>
                            <span className={`admin-chip ${getSellLeadChipClass(lead.status)}`.trim()}>
                              {getSellLeadStatusLabel(lead.status)}
                            </span>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="buyer-privacy-note buyer-privacy-note--garage">
                    <strong>Tu actividad es tuya</strong>
                    <span>Solo vos podés ver este espacio de seguimiento.</span>
                  </div>
                </div>
              )}
            </section>
            </>
            )} {/* end historial tab */}
          </div>
        )}

        {/* ── Radar oX ──────────────────────────────────────────── */}
        {activeSection === "radar" && (
          <div className="garage-ox-section-body">
            <div className="buyer-radar-section" ref={radarSectionRef}>
              <div className="buyer-radar-section__head">
                <div>
                  <p className="garage-ox-search__eyebrow">Radar oX</p>
                  <span className={`buyer-radar-status${radarRequests.length > 0 ? " is-active" : ""}`}>
                    {radarRequests.length > 0 ? "Radar activo" : "Listo para activar"}
                  </span>
                  <h2>{radarRequests.length > 0 ? "oX está buscando oportunidades para vos" : "Radar oX todavía no está activo."}</h2>
                  {radarRequests.length > 0 && (
                    <p>Tus criterios activos quedan vivos para volver a buscar cuando aparezca una mejor oportunidad.</p>
                  )}
                </div>
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => onNavigate?.("search")}
                >
                  {radarRequests.length > 0 ? "Volver a buscar" : "Activar Radar"}
                </button>
              </div>

              {radarRequests.length === 0 ? (
                <div className="buyer-radar-empty">
                  <div className="buyer-radar-empty__icon" aria-hidden="true">
                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="buyer-radar-pulse-icon">
                      <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.9"/>
                      <circle cx="24" cy="24" r="11" stroke="currentColor" strokeWidth="1.5" className="buyer-radar-ring buyer-radar-ring--1"/>
                      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="1" className="buyer-radar-ring buyer-radar-ring--2"/>
                    </svg>
                  </div>
                  <p>Explorá vehículos, aplicá filtros y activá Radar para guardar una búsqueda. Cuando lo hagas, vas a ver tus criterios activos acá.</p>
                  <button
                    type="button"
                    className="buyer-stat-cta-btn"
                    onClick={() => onNavigate?.("search")}
                  >
                    Explorar y activar Radar
                  </button>
                </div>
              ) : (
                <ul className="buyer-radar-list">
                  {radarRequests.map((req) => {
                    const parts = buildRadarCriteriaSummary(
                      req.search_text,
                      req.filters,
                      req.parsed_intent
                    );
                    return (
                      <li key={req.id} className="buyer-radar-item">
                        <div className="buyer-radar-item-body">
                          <div className="buyer-radar-item-criteria">
                            {parts.length > 0 ? (
                              <div className="buyer-radar-criteria-chips">
                                {parts.map((part) => (
                                  <span key={`${req.id}-${part}`}>{part}</span>
                                ))}
                              </div>
                            ) : (
                              "Búsqueda sin criterios específicos"
                            )}
                          </div>
                          {req.notes && (
                            <p className="buyer-radar-item-notes">{req.notes}</p>
                          )}
                          <time className="buyer-radar-item-date">
                            {new Intl.DateTimeFormat("es-AR", {
                              dateStyle: "short",
                            }).format(new Date(req.created_at))}
                          </time>
                        </div>
                        <button
                          type="button"
                          className="buyer-radar-item-delete"
                          disabled={radarDeletingId === req.id}
                          onClick={() => handleDeleteRadarRequest(req.id)}
                          aria-label="Cancelar esta búsqueda activa"
                        >
                          {radarDeletingId === req.id ? "…" : "Cancelar búsqueda"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {radarDeleteError && (
                <p className="garage-inline-error" style={{ marginTop: "8px" }}>{radarDeleteError}</p>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
