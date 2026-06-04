import { useEffect, useState } from "react";
import {
  createBuyerGarageVehicle,
  createBuyerGarageService,
  deleteBuyerGarageVehicle,
  listBuyerGarageServices,
  listBuyerGarageVehicles,
  updateBuyerGarageVehicle,
  uploadBuyerGarageVehiclePhoto,
} from "../../../services/buyerGarage.service.js";
import { createSellVehicleLead } from "../../../services/sellVehicle.service.js";
import { normalizeImagePositionXY } from "../../../lib/imagePosition.js";

const INITIAL_VEHICLE_FORM = {
  brand: "", model: "", version: "", year: "", km: "", plate: "",
  province: "", city: "", expectedPrice: "", condition: "",
  vtvDueDate: "", insuranceDueDate: "", insuranceCompany: "",
  policyNumber: "", notes: "", photoUrl: "",
  imagePositionX: 50, imagePositionY: 50, saleIntent: false,
};

const INITIAL_SERVICE_FORM = {
  serviceDate: new Date().toISOString().slice(0, 10),
  mileage: "", serviceType: "oil", cost: "", notes: "",
};

function resolvedUserId(authUser, authProfile) {
  return authUser?.id || authProfile?.id || authProfile?.email;
}

function vehicleFormFromRecord(vehicle) {
  const pos = normalizeImagePositionXY(
    vehicle?.imagePositionX, vehicle?.imagePositionY, vehicle?.imagePosition
  );
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

function stripOwn(id) {
  return String(id || "").replace(/^own-/, "");
}

function matchesServiceVehicle(service, vehicle) {
  if (service?.vehicleRecordId && vehicle?.vehicleRecordId) {
    return (
      String(service.vehicleRecordId) === String(vehicle.vehicleRecordId) &&
      service.vehicleType === vehicle.vehicleType
    );
  }
  return stripOwn(service?.garageVehicleId) === stripOwn(vehicle?.id);
}

export function useGarageVehicles(authUser, authProfile, onSellLeadCreated) {
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesError, setVehiclesError] = useState("");
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [source, setSource] = useState("local");
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [vehicleForm, setVehicleForm] = useState(INITIAL_VEHICLE_FORM);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  const [vehicleSaved, setVehicleSaved] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [serviceForm, setServiceForm] = useState(INITIAL_SERVICE_FORM);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceSaved, setServiceSaved] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [saleLeadSending, setSaleLeadSending] = useState(false);
  const [saleLeadSent, setSaleLeadSent] = useState(false);
  const [saleLeadError, setSaleLeadError] = useState("");

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) || null;
  const selectedServices = selectedVehicle
    ? services.filter((s) => matchesServiceVehicle(s, selectedVehicle))
    : [];
  const lastService = selectedServices[0] || null;

  // Clear selection if vehicle is removed
  useEffect(() => {
    if (!selectedId) return;
    if (!vehicles.some((v) => v.id === selectedId)) {
      setSelectedId("");
      setActiveTab("summary");
    }
  }, [vehicles, selectedId]);

  async function loadVehicles() {
    setVehiclesError("");
    setLoading(true);
    const { vehicles: loaded, error } = await listBuyerGarageVehicles({
      userId: resolvedUserId(authUser, authProfile),
    });
    setVehicles(loaded || []);
    setLoading(false);
    if (error) setVehiclesError("No pudimos cargar las unidades de tu Garage oX.");
  }

  async function loadServices() {
    const { services: loaded, source: src } = await listBuyerGarageServices({
      userId: resolvedUserId(authUser, authProfile),
    });
    setServices(loaded || []);
    setSource(src || "local");
  }

  async function refresh() {
    await Promise.all([loadVehicles(), loadServices()]);
  }

  function updateVehicleField(field, value) {
    setVehicleForm((f) => ({ ...f, [field]: value }));
  }

  function resetVehicleForm() {
    setVehicleForm(INITIAL_VEHICLE_FORM);
    setEditingId("");
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoUploading(false);
    setPhotoSaved(false);
    setVehicleError("");
    setVehicleSaved(false);
  }

  function startEdit(vehicle) {
    if (vehicle?.source !== "owned" && vehicle?.source !== "local") {
      setVehicleError(
        "Esta unidad fue asignada por un dealer. Solo podés editar vehículos propios."
      );
      setShowForm(true);
      return;
    }
    setVehicleForm(vehicleFormFromRecord(vehicle));
    setPhotoFile(null);
    setPhotoPreview(vehicle?.photoUrl || "");
    setPhotoSaved(false);
    setEditingId(vehicle.id);
    setVehicleError("");
    setVehicleSaved(false);
    setShowForm(true);
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] || null;
    setPhotoSaved(false);
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(vehicleForm.photoUrl || "");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setVehicleError("La foto debe ser JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setVehicleError("La foto no puede superar los 4 MB.");
      event.target.value = "";
      return;
    }
    setVehicleError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function saveVehicle(event) {
    event.preventDefault();
    setVehicleSaving(true);
    setVehicleError("");
    setVehicleSaved(false);

    if (!vehicleForm.brand.trim()) {
      setVehicleError("Ingresá la marca del vehículo.");
      setVehicleSaving(false);
      return;
    }
    if (!vehicleForm.model.trim()) {
      setVehicleError("Ingresá el modelo del vehículo.");
      setVehicleSaving(false);
      return;
    }

    const userId = resolvedUserId(authUser, authProfile);
    const { vehicle } = editingId
      ? await updateBuyerGarageVehicle({ userId, vehicleId: editingId, vehicle: vehicleForm })
      : await createBuyerGarageVehicle({ userId, vehicle: vehicleForm });

    if (!vehicle) {
      setVehicleError("No pudimos guardar el vehículo en Garage oX.");
      setVehicleSaving(false);
      return;
    }

    let photoUploadError = null;
    if (photoFile) {
      setPhotoUploading(true);
      const { photoUrl, error: uploadError } = await uploadBuyerGarageVehiclePhoto({
        garageVehicleId: vehicle.id,
        file: photoFile,
      });
      photoUploadError = uploadError;
      if (photoUrl && !uploadError) setPhotoSaved(true);
      setPhotoUploading(false);
    }

    if (vehicleForm.saleIntent) {
      await createSellVehicleLead({
        fullName: authProfile?.full_name || authUser?.email || "Usuario Garage oX",
        email: authProfile?.email || authUser?.email || "",
        phone: authProfile?.phone_visible || authProfile?.phone_whatsapp || "",
        province: vehicleForm.province || "Sin provincia",
        city: vehicleForm.city || "Sin ciudad",
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        version: vehicleForm.version,
        year: vehicleForm.year,
        km: vehicleForm.km,
        expectedPrice: vehicleForm.expectedPrice,
        condition: vehicleForm.condition,
        hasDebt: false,
        hasFinancing: false,
        acceptsDealerContact: true,
        message: vehicleForm.notes || "Solicitud generada desde Garage oX.",
      });
      onSellLeadCreated?.();
    }

    await loadVehicles();
    setSelectedId("");

    if (photoUploadError) {
      setVehicleError("Guardamos la card, pero no pudimos subir la foto.");
      setVehicleSaved(true);
      setVehicleSaving(false);
      return;
    }

    resetVehicleForm();
    setVehicleSaved(true);
    setShowForm(false);
    setActiveTab("summary");
    setVehicleSaving(false);
    window.setTimeout(() => setVehicleSaved(false), 2200);
  }

  async function deleteVehicle(vehicleId) {
    setDeletingId(vehicleId);
    const { error } = await deleteBuyerGarageVehicle({
      userId: resolvedUserId(authUser, authProfile),
      vehicleId,
    });
    if (!error) {
      setSelectedId("");
      setDeleteConfirmId("");
      await loadVehicles();
    }
    setDeletingId("");
  }

  async function saveService(event) {
    event.preventDefault();
    if (!selectedId) return;
    setServiceSaving(true);
    setServiceSaved(false);
    setServiceError("");

    const vehicle = vehicles.find((v) => v.id === selectedId) || null;
    const vehicleType =
      vehicle?.vehicleType ||
      (vehicle?.source === "owned" ? "owned" : null) ||
      (String(vehicle?.id || "").startsWith("own-") ? "owned" : "assigned");

    const { service, error: saveError } = await createBuyerGarageService({
      userId: resolvedUserId(authUser, authProfile),
      service: {
        ...serviceForm,
        garageVehicleId: selectedId,
        vehicleType,
        vehicleRecordId:
          vehicle?.vehicleRecordId ||
          vehicle?.garageAssignmentId ||
          vehicle?.garageVehicleId ||
          vehicle?.id ||
          null,
      },
    });

    if (service) {
      await loadServices();
      setServiceForm(INITIAL_SERVICE_FORM);
      setServiceSaved(true);
      window.setTimeout(() => setServiceSaved(false), 1800);
    } else {
      setServiceError(saveError?.message || "No se pudo guardar el servicio. Intentá de nuevo.");
    }
    setServiceSaving(false);
  }

  async function initiateSale(vehicle) {
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
      onSellLeadCreated?.();
    }
    setSaleLeadSending(false);
  }

  return {
    vehicles,
    vehiclesError,
    loading,
    services,
    source,
    selectedId,
    setSelectedId,
    selectedVehicle,
    selectedServices,
    lastService,
    activeTab,
    setActiveTab,
    showForm,
    setShowForm,
    editingId,
    deletingId,
    deleteConfirmId,
    setDeleteConfirmId,
    vehicleForm,
    vehicleSaving,
    vehicleError,
    vehicleSaved,
    photoFile,
    photoPreview,
    photoUploading,
    photoSaved,
    serviceForm,
    setServiceForm,
    serviceSaving,
    serviceSaved,
    serviceError,
    saleLeadSending,
    saleLeadSent,
    setSaleLeadSent,
    saleLeadError,
    updateVehicleField,
    resetVehicleForm,
    startEdit,
    handlePhotoChange,
    saveVehicle,
    deleteVehicle,
    saveService,
    initiateSale,
    loadVehicles,
    loadServices,
    refresh,
    matchesServiceVehicle,
  };
}
