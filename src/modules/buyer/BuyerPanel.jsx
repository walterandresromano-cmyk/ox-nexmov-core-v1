import { useEffect, useMemo, useRef, useState } from "react";

import {
  createSellVehicleLead,
  listSellVehicleLeadsForCurrentBuyer,
} from "../../services/sellVehicle.service.js";

import {
  listVehicleLeadsForCurrentBuyer,
  listZeroKmLeadsForCurrentBuyer,
} from "../../services/buyer.service.js";

import { updateBuyerProfile } from "../../services/profiles.service.js";
import { getObjectPositionXY, normalizeImagePositionXY } from "../../lib/imagePosition.js";
import {
  createBuyerGarageVehicle,
  createBuyerGarageService,
  listBuyerGarageServices,
  listBuyerGarageVehicles,
  updateBuyerGarageVehicle,
  uploadBuyerGarageVehiclePhoto,
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
  const [garageServiceError, setGarageServiceError] = useState("");
  const [saleLeadSending, setSaleLeadSending] = useState(false);
  const [saleLeadSent, setSaleLeadSent] = useState(false);
  const [saleLeadError, setSaleLeadError] = useState("");
  const [garageForm, setGarageForm] = useState({
    serviceDate: new Date().toISOString().slice(0, 10),
    mileage: "",
    serviceType: "oil",
    cost: "",
    notes: "",
  });
  const [garageVehicleForm, setGarageVehicleForm] = useState(initialGarageVehicleForm);
  const [garageVehicleSaving, setGarageVehicleSaving] = useState(false);
  const [garageVehicleError, setGarageVehicleError] = useState("");
  const [garageVehicleSaved, setGarageVehicleSaved] = useState(false);
  const [showGarageVehicleForm, setShowGarageVehicleForm] = useState(false);
  const [editingGarageVehicleId, setEditingGarageVehicleId] = useState("");
  const [garageVehiclePhotoFile, setGarageVehiclePhotoFile] = useState(null);
  const [garageVehiclePhotoPreview, setGarageVehiclePhotoPreview] = useState("");
  const [garageVehiclePhotoUploading, setGarageVehiclePhotoUploading] = useState(false);
  const [garageVehiclePhotoSaved, setGarageVehiclePhotoSaved] = useState(false);
  const [activeGarageTab, setActiveGarageTab] = useState("summary");
  const [showBuyerActivityDetails, setShowBuyerActivityDetails] = useState(false);

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

    const { vehicles, error } = await listBuyerGarageVehicles({
      userId: authUser?.id || authProfile?.id || authProfile?.email,
    });

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
    if (!selectedGarageVehicleId) return;

    const selectedStillExists = garageVehicles.some(
      (vehicle) => vehicle.id === selectedGarageVehicleId
    );

    if (!selectedStillExists) {
      setSelectedGarageVehicleId("");
      setActiveGarageTab("summary");
    }
  }, [garageVehicles, selectedGarageVehicleId]);

  async function handleSaveGarageService(event) {
    event.preventDefault();
    if (!selectedGarageVehicleId) return;

    setGarageSaving(true);
    setGarageSaved(false);
    setGarageServiceError("");

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
    } else {
      setGarageServiceError("No se pudo guardar el servicio. Intentá de nuevo.");
    }

    setGarageSaving(false);
  }

  async function handleInitiateSale(vehicle) {
    if (!vehicle) return;

    setSaleLeadSending(true);
    setSaleLeadSent(false);
    setSaleLeadError("");

    const { error } = await createSellVehicleLead({
      fullName: authProfile?.full_name || authUser?.email || "Usuario Garage oX",
      email: authProfile?.email || authUser?.email || "",
      phone: authProfile?.phone_visible || authProfile?.phone_whatsapp || "",
      province: vehicle.province || "Sin provincia",
      city: vehicle.city || "Sin ciudad",
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version,
      year: vehicle.year,
      km: vehicle.km,
      expectedPrice: vehicle.expectedPrice,
      condition: vehicle.condition,
      hasDebt: false,
      hasFinancing: false,
      acceptsDealerContact: true,
      message: vehicle.notes || "Solicitud generada desde Garage oX para evaluación futura.",
    });

    if (error) {
      setSaleLeadError("No se pudo registrar la solicitud. Intentá de nuevo.");
    } else {
      setSaleLeadSent(true);
    }

    setSaleLeadSending(false);
  }

  function updateGarageVehicleField(field, value) {
    setGarageVehicleForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startGarageVehicleEdit(vehicle) {
    if (!isOwnedGarageVehicle(vehicle)) {
      setGarageVehicleError(
        "Esta unidad fue asignada por un dealer. Por ahora solo podés editar vehículos propios cargados por vos."
      );
      setShowGarageVehicleForm(true);
      return;
    }

    setGarageVehicleForm(getGarageVehicleFormFromVehicle(vehicle));
    setGarageVehiclePhotoFile(null);
    setGarageVehiclePhotoPreview(vehicle?.photoUrl || "");
    setGarageVehiclePhotoSaved(false);
    setEditingGarageVehicleId(vehicle.id);
    setGarageVehicleError("");
    setGarageVehicleSaved(false);
    setShowGarageVehicleForm(true);
  }

  function resetGarageVehicleForm() {
    setGarageVehicleForm(initialGarageVehicleForm);
    setEditingGarageVehicleId("");
    setGarageVehiclePhotoFile(null);
    setGarageVehiclePhotoPreview("");
    setGarageVehiclePhotoUploading(false);
    setGarageVehiclePhotoSaved(false);
    setGarageVehicleError("");
    setGarageVehicleSaved(false);
  }

  function handleGarageVehiclePhotoChange(event) {
    const file = event.target.files?.[0] || null;
    setGarageVehiclePhotoSaved(false);

    if (!file) {
      setGarageVehiclePhotoFile(null);
      setGarageVehiclePhotoPreview(garageVehicleForm.photoUrl || "");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setGarageVehicleError("La foto debe ser JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setGarageVehicleError("La foto no puede superar los 4 MB.");
      event.target.value = "";
      return;
    }

    setGarageVehicleError("");
    setGarageVehiclePhotoFile(file);
    setGarageVehiclePhotoPreview(URL.createObjectURL(file));
  }

  async function handleSaveGarageVehicle(event) {
    event.preventDefault();

    setGarageVehicleSaving(true);
    setGarageVehicleError("");
    setGarageVehicleSaved(false);

    if (!garageVehicleForm.brand.trim()) {
      setGarageVehicleError("Ingresá la marca del vehículo.");
      setGarageVehicleSaving(false);
      return;
    }

    if (!garageVehicleForm.model.trim()) {
      setGarageVehicleError("Ingresá el modelo del vehículo.");
      setGarageVehicleSaving(false);
      return;
    }

    const garageUserId = authUser?.id || authProfile?.id || authProfile?.email;
    const { vehicle } = editingGarageVehicleId
      ? await updateBuyerGarageVehicle({
          userId: garageUserId,
          vehicleId: editingGarageVehicleId,
          vehicle: garageVehicleForm,
        })
      : await createBuyerGarageVehicle({
          userId: garageUserId,
          vehicle: garageVehicleForm,
        });

    if (!vehicle) {
      setGarageVehicleError("No pudimos guardar el vehículo en Garage oX.");
      setGarageVehicleSaving(false);
      return;
    }

    let photoUploadError = null;

    if (garageVehiclePhotoFile) {
      setGarageVehiclePhotoUploading(true);
      const { photoUrl, error: uploadError } = await uploadBuyerGarageVehiclePhoto({
        garageVehicleId: vehicle.id,
        file: garageVehiclePhotoFile,
      });

      photoUploadError = uploadError;

      if (photoUrl && !uploadError) {
        setGarageVehiclePhotoSaved(true);
      }

      setGarageVehiclePhotoUploading(false);
    }

    if (garageVehicleForm.saleIntent && !editingGarageVehicleId) {
      const { error: sellError } = await createSellVehicleLead({
        fullName: authProfile?.full_name || authUser?.email || "Usuario Garage oX",
        email: authProfile?.email || authUser?.email || "",
        phone: authProfile?.phone_visible || authProfile?.phone_whatsapp || "",
        province: garageVehicleForm.province || "Sin provincia",
        city: garageVehicleForm.city || "Sin ciudad",
        brand: garageVehicleForm.brand,
        model: garageVehicleForm.model,
        version: garageVehicleForm.version,
        year: garageVehicleForm.year,
        km: garageVehicleForm.km,
        expectedPrice: garageVehicleForm.expectedPrice,
        condition: garageVehicleForm.condition,
        hasDebt: false,
        hasFinancing: false,
        acceptsDealerContact: true,
        message:
          garageVehicleForm.notes ||
          "Solicitud generada desde Garage oX para evaluación futura.",
      });

      if (sellError && import.meta.env.DEV) {
        console.warn("No se pudo generar solicitud de venta desde Garage oX.", sellError);
      }
    }

    await Promise.all([loadGarageVehicles(), loadSellVehicleLeads()]);
    setSelectedGarageVehicleId("");
    if (photoUploadError) {
      setGarageVehicleError(
        photoUploadError.message ||
          "Guardamos la card, pero no pudimos subir la foto."
      );
      setGarageVehicleSaved(true);
      setGarageVehicleSaving(false);
      return;
    }

    resetGarageVehicleForm();
    setGarageVehicleSaved(true);
    setShowGarageVehicleForm(false);
    setActiveGarageTab("summary");
    setGarageVehicleSaving(false);
    window.setTimeout(() => setGarageVehicleSaved(false), 2200);
  }

  const isLoading = loadingVehicleLeads || loadingZeroKmLeads || loadingSellVehicleLeads;
  const selectedGarageVehicle =
    garageVehicles.find((vehicle) => vehicle.id === selectedGarageVehicleId) || null;
  const selectedGarageServices = selectedGarageVehicle
    ? garageServices.filter(
        (service) => service.garageVehicleId === selectedGarageVehicle.id
      )
    : [];
  const lastSelectedGarageService = selectedGarageServices[0] || null;

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

          <div className="buyer-garage-hero">
            <div>
              <span>Historial premium</span>
              <strong>Unidad, servicios y recorrido en un solo lugar.</strong>
              <p>
                Registro organizado para conservar la trazabilidad del vehículo.
              </p>
            </div>
            <div className="buyer-garage-hero-metrics">
              <span>Garage</span>
              <strong>{garageVehicles.length}</strong>
              <small>unidad{garageVehicles.length !== 1 ? "es" : ""} cargada{garageVehicles.length !== 1 ? "s" : ""}</small>
            </div>
          </div>

          {showGarageVehicleForm && (
          <form className="buyer-garage-owned-form" onSubmit={handleSaveGarageVehicle}>
            <div className="buyer-garage-owned-head">
              <div>
                <span className="eyebrow">{editingGarageVehicleId ? "Editando card" : "Vehículo propio"}</span>
                <h3>{editingGarageVehicleId ? "Actualizar unidad" : "Cargar unidad familiar"}</h3>
                <p>
                  Sumá autos propios o familiares, registrá vencimientos y dejá
                  preparada la base para una futura evaluación comercial.
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
                Ciudad
                <input
                  value={garageVehicleForm.city}
                  onChange={(event) => updateGarageVehicleField("city", event.target.value)}
                  placeholder="Opcional"
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
                    Arrastrá la imagen para acomodar el vehículo dentro de la card.
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
                placeholder="Estado general, trabajos realizados, observaciones o datos útiles para conservar historial."
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
            <div className="buyer-garage-empty">
              <strong>Tu Garage todavía está esperando su primera unidad.</strong>
              <p>
                Las unidades asignadas por un dealer o cargadas por vos aparecen
                acá con su historial listo para completar.
              </p>
              <button className="primary-action" onClick={() => onNavigate?.("search")}>
                Buscar vehículos
              </button>
            </div>
          ) : (
            <div className="buyer-garage-collection">
              <div className="buyer-garage-list buyer-garage-card-grid">
                {garageVehicles.map((vehicle) => {
                  const services = garageServices.filter(
                    (service) => service.garageVehicleId === vehicle.id
                  );
                  const isSelected = selectedGarageVehicleId === vehicle.id;
                  const latestService = services[0] || null;

                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      className={`buyer-garage-vehicle-card buyer-garage-collector-card${isSelected ? " is-active" : ""}`}
                      onClick={() => {
                        setSelectedGarageVehicleId(vehicle.id);
                        setActiveGarageTab("summary");
                      }}
                    >
                      <div className="buyer-garage-card-media">
                        {vehicle.photoUrl ? (
                          <img
                            src={vehicle.photoUrl}
                            alt=""
                            loading="lazy"
                            style={{ objectPosition: getObjectPositionXY(vehicle.imagePositionX, vehicle.imagePositionY) }}
                          />
                        ) : (
                          <span>oX</span>
                        )}
                      </div>
                      <div className="buyer-garage-card-main">
                        <span>{getGarageVehicleSourceLabel(vehicle)}</span>
                        <strong>{vehicle.title}</strong>
                        <p>{vehicle.dealer} - {formatARS(vehicle.price)}</p>
                      </div>
                      <div className="buyer-garage-card-meta">
                        <span>{getGarageStatusLabel(vehicle.status)}</span>
                        <span>{services.length} servicio{services.length !== 1 ? "s" : ""}</span>
                        {vehicle.vtvDueDate && (
                          <span>VTV {formatDateTime(vehicle.vtvDueDate).split(",")[0]}</span>
                        )}
                        {vehicle.insuranceDueDate && (
                          <span>Seguro {formatDateTime(vehicle.insuranceDueDate).split(",")[0]}</span>
                        )}
                      </div>
                      <small>
                        {latestService
                          ? `Ultimo registro: ${getServiceTypeLabel(latestService.serviceType)}`
                          : getNextGarageHint(services)}
                      </small>
                      <em>Explorar card</em>
                    </button>
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
                        <h3>{selectedGarageVehicle.title}</h3>
                        <p>
                          {selectedGarageVehicle.dealer} - {formatARS(selectedGarageVehicle.price)}
                        </p>
                      </div>
                      <strong>{getGarageStatusLabel(selectedGarageVehicle.status)}</strong>
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

                  <div className="buyer-garage-tabs" role="tablist" aria-label="Secciones de Garage oX">
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

                  {activeGarageTab === "summary" && (
                    <div className="buyer-garage-tab-panel" role="tabpanel">
                      <div className="buyer-garage-summary-grid">
                        <article>
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
                        </article>
                        <article>
                          <span>Ultimo registro</span>
                          <strong>
                            {lastSelectedGarageService
                              ? getServiceTypeLabel(lastSelectedGarageService.serviceType)
                              : "Pendiente"}
                          </strong>
                        </article>
                        <article>
                          <span>Proximo paso</span>
                          <strong>{getNextGarageHint(selectedGarageServices)}</strong>
                        </article>
                      </div>
                    </div>
                  )}

                  {activeGarageTab === "services" && (
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
                  {garageServiceError && (
                    <small className="garage-inline-error">{garageServiceError}</small>
                  )}
                  {garageSource === "local" && (
                    <small>Registro local hasta activar persistencia Supabase.</small>
                  )}
                </div>
              </form>
                  )}

                  {activeGarageTab === "deadlines" && (
                    <div className="buyer-garage-tab-panel" role="tabpanel">
                      <div className="buyer-garage-summary-grid">
                        <article>
                          <span>VTV</span>
                          <strong>
                            {selectedGarageVehicle.vtvDueDate
                              ? formatDateTime(selectedGarageVehicle.vtvDueDate).split(",")[0]
                              : "Sin cargar"}
                          </strong>
                        </article>
                        <article>
                          <span>Seguro</span>
                          <strong>
                            {selectedGarageVehicle.insuranceDueDate
                              ? formatDateTime(selectedGarageVehicle.insuranceDueDate).split(",")[0]
                              : "Sin cargar"}
                          </strong>
                        </article>
                        <article>
                          <span>Estado</span>
                          <strong>{getGarageStatusLabel(selectedGarageVehicle.status)}</strong>
                        </article>
                        <article>
                          <span>Origen</span>
                          <strong>{getGarageVehicleSourceLabel(selectedGarageVehicle)}</strong>
                        </article>
                      </div>
                    </div>
                  )}

                  {activeGarageTab === "history" && (
              <div className="buyer-garage-history">
                <div>
                  <span className="eyebrow">Historial</span>
                  <h3>Servicios registrados</h3>
                </div>
                {selectedGarageServices.length === 0 ? (
                  <p className="buyer-garage-history-empty">
                    Todavia no hay servicios cargados para este vehiculo.
                  </p>
                ) : (
                  <div className="buyer-garage-service-list">
                    {selectedGarageServices.map((service) => (
                        <article key={service.id} className="buyer-garage-service-item">
                          <span>{formatDateTime(service.serviceDate)}</span>
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

                  {activeGarageTab === "sale" && (
                    <div className="buyer-garage-tab-panel buyer-garage-sale-panel">
                      <span className="eyebrow">Venta futura</span>
                      <h3>Preparación comercial</h3>
                      <p>
                        Completá los datos del vehículo para que esta card tenga valor comercial
                        al momento de publicar. Cuanto más historial, mayor contexto para el comprador.
                      </p>
                      <div className="buyer-garage-sale-readiness">
                        <span className={selectedGarageServices.length > 0 ? "is-ready" : ""}>
                          {selectedGarageServices.length > 0 ? "✓" : "·"} Historial {selectedGarageServices.length > 0 ? `iniciado (${selectedGarageServices.length} registro${selectedGarageServices.length !== 1 ? "s" : ""})` : "pendiente"}
                        </span>
                        <span className={selectedGarageVehicle.km ? "is-ready" : ""}>
                          {selectedGarageVehicle.km ? "✓" : "·"} Km {selectedGarageVehicle.km ? `cargado (${Number(selectedGarageVehicle.km).toLocaleString("es-AR")})` : "pendiente"}
                        </span>
                        <span className={selectedGarageVehicle.vtvDueDate || selectedGarageVehicle.insuranceDueDate ? "is-ready" : ""}>
                          {(selectedGarageVehicle.vtvDueDate || selectedGarageVehicle.insuranceDueDate) ? "✓" : "·"} Vencimientos {(selectedGarageVehicle.vtvDueDate || selectedGarageVehicle.insuranceDueDate) ? "cargados" : "pendientes"}
                        </span>
                        <span className={selectedGarageVehicle.expectedPrice ? "is-ready" : ""}>
                          {selectedGarageVehicle.expectedPrice ? "✓" : "·"} Precio esperado {selectedGarageVehicle.expectedPrice ? `cargado ($${Number(selectedGarageVehicle.expectedPrice).toLocaleString("es-AR")})` : "pendiente"}
                        </span>
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
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="buyer-activity-disclosure">
          <div className="buyer-activity-disclosure-head">
            <div>
              <span className="eyebrow">Actividad del comprador</span>
              <h2>Consultas, favoritos y movimientos comerciales</h2>
              <p>
                Información secundaria disponible cuando quieras revisar tu recorrido.
              </p>
            </div>
            <div className="buyer-activity-disclosure-summary" aria-hidden="true">
              <span>{favorites.length} favoritos</span>
              <span>{vehicleLeads.length} consultas</span>
              <span>{zeroKmLeads.length} 0km</span>
              <span>{sellVehicleLeads.length} ventas</span>
            </div>
            <button
              type="button"
              className="admin-refresh-btn buyer-activity-toggle"
              onClick={() => setShowBuyerActivityDetails((current) => !current)}
              aria-expanded={showBuyerActivityDetails}
            >
              {showBuyerActivityDetails ? "Ocultar actividad" : "Ver actividad"}
            </button>
          </div>

          {showBuyerActivityDetails && (
            <div className="buyer-activity-disclosure-body">
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
              <p>Vehículos que preparaste desde Garage oX para evaluación comercial.</p>
            </div>

            <button className="admin-refresh-btn" onClick={loadSellVehicleLeads}>
              Actualizar
            </button>
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
          )}
        </div>
      </div>
    </section>
  );
}
