import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import "../../styles/vehicle-detail-modal.css";
import { formatARS, formatKm, getMarketDelta } from "../../lib/formatters.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";
import { getVehicleImages, isVehicleReserved } from "../../lib/vehicle.js";
import { getOptimizedUrl } from "../../lib/imageUrl.js";
import {
  calcMonthly,
  FINANCING_RATES,
  DEFAULT_RATE_INDEX,
  DEFAULT_DOWN_PCT,
  DEFAULT_TERM_MONTHS,
} from "../../lib/financing.js";
import { getVehiclePriceHistory } from "../../services/priceHistory.service.js";
import { createContraoferta } from "../../services/contraofertas.service.js";
import { listDealerPublicVehicles } from "../../services/vehicles.service.js";
import ContactGate from "../../modules/public/ContactGate.jsx";
import VehicleImage from "../VehicleImage.jsx";
import { useScramble } from "../../hooks/useScramble.js";
import { HeartIcon, CompareIcon } from "../icons/VehicleIcons.jsx";


const MAINTENANCE_SOURCE_KEYS = [
  "maintenance",
  "maintenance_info",
  "maintenanceInfo",
];

function getMaintenanceValue(vehicle, ...keys) {
  const sources = [
    vehicle,
    vehicle?.raw,
    ...MAINTENANCE_SOURCE_KEYS.map((key) => vehicle?.[key]),
    ...MAINTENANCE_SOURCE_KEYS.map((key) => vehicle?.raw?.[key]),
  ].filter(Boolean);

  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];

      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
  }

  return null;
}

function getPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseFinancingNumber(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function calculateUsedVehicleFinancing({ price, downPayment, termMonths, monthlyIncome, monthlyRate }) {
  const income = parseFinancingNumber(monthlyIncome);
  const result = calcMonthly({
    price:       parseFinancingNumber(price),
    downPayment: parseFinancingNumber(downPayment),
    termMonths:  Number(termMonths) || DEFAULT_TERM_MONTHS,
    monthlyRate: monthlyRate ?? FINANCING_RATES[DEFAULT_RATE_INDEX].monthly,
  });
  if (!result) return null;
  return {
    financed:       result.financed,
    monthlyPayment: result.monthly,
    totalPaid:      result.totalPaid,
    incomePercent:  income > 0 ? Math.round((result.monthly / income) * 100) : null,
  };
}

function formatMaintenanceDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getVehicleMaintenanceInfo(vehicle) {
  const showMaintenanceInfo = getMaintenanceValue(
    vehicle,
    "show_maintenance_info",
    "showMaintenanceInfo"
  );
  const rows = [];

  function addText(label, ...keys) {
    const value = getMaintenanceValue(vehicle, ...keys);
    if (!value) return;
    rows.push({ label, value: String(value) });
  }

  function addMoney(label, ...keys) {
    const value = getPositiveNumber(getMaintenanceValue(vehicle, ...keys));
    if (!value) return;
    rows.push({ label, value: formatARS(value) });
  }

  function addNumber(label, suffix, ...keys) {
    const value = getPositiveNumber(getMaintenanceValue(vehicle, ...keys));
    if (!value) return;
    rows.push({ label, value: `${value.toLocaleString("es-AR")} ${suffix}` });
  }

  addMoney("Seguro informado", "insurance_monthly_amount", "insuranceMonthlyAmount");
  addText("Proveedor", "insurance_provider", "insuranceProvider");
  addText("Cobertura", "insurance_coverage_type", "insuranceCoverageType");
  addNumber("Tanque", "litros", "fuel_tank_liters", "fuelTankLiters");
  addMoney("Costo tanque lleno informado", "fuel_full_tank_cost", "fuelFullTankCost");
  addMoney("Service aproximado", "estimated_service_cost", "estimatedServiceCost");
  addMoney(
    "Mantenimiento mensual orientativo",
    "estimated_monthly_maintenance",
    "estimatedMonthlyMaintenance"
  );
  addText("Detalle", "maintenance_notes", "maintenanceNotes");

  const updatedAt = formatMaintenanceDate(
    getMaintenanceValue(vehicle, "maintenance_updated_at", "maintenanceUpdatedAt")
  );

  if (updatedAt) rows.push({ label: "Dato actualizado", value: updatedAt });

  return {
    rows,
    shouldShow: Boolean(showMaintenanceInfo) && rows.length > 0,
  };
}

function PriceReveal({ price, children }) {
  const display = useScramble(Number(price || 0), { duration: 700, delay: 120 });
  return (
    <div className="detail-price">
      <strong className="detail-price__number">$ {display}</strong>
      {children}
    </div>
  );
}

export default function VehicleDetailModal({
  vehicle,
  dealer,
  onClose,
  onContact,
  onCompare,
  onFavorite,
  favoriteActive,
  vehicles,
  getDealer,
  allVehicles,
  appActions,
  onNavigate,
  shareUrl,
}) {
  const [currentVehicle, setCurrentVehicle] = useState(vehicle);
  const [showContactGate, setShowContactGate]       = useState(false);
  const [showContraofertaForm, setShowContraofertaForm] = useState(false);
  const [contraofertaPrecio, setContraofertaPrecio] = useState("");
  const [contraofertaStatus, setContraofertaStatus] = useState("idle"); // idle | submitting | ok | error
  const [contraofertaError, setContraofertaError]   = useState("");
  const [shareState, setShareState]                 = useState("idle");
  const [priceHistory, setPriceHistory]       = useState([]);
  const [financingDownPayment, setFinancingDownPayment] = useState("");
  const [financingTermMonths, setFinancingTermMonths] = useState(String(DEFAULT_TERM_MONTHS));
  const [financingIncome, setFinancingIncome]         = useState("");
  const [financingRateIdx, setFinancingRateIdx]       = useState(DEFAULT_RATE_INDEX);
  const [termDropdownOpen, setTermDropdownOpen] = useState(false);
  const termDropdownRef = useRef(null);
  const [activeTab, setActiveTab] = useState("galeria");

  const currentDealer = useMemo(() => {
    if (vehicles && getDealer) return getDealer(currentVehicle) || dealer;
    return dealer;
  }, [currentVehicle, vehicles, getDealer, dealer]);

  const currentIndex = vehicles
    ? vehicles.findIndex((v) => v.id === currentVehicle.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (vehicles?.length ?? 0) - 1;

  const permissions = getEffectiveDealerPermissions(currentDealer);
  const isPlatinumDealer = permissions.rankTheme === "platinum";
  const delta = getMarketDelta(currentVehicle);
  const images = useMemo(() => getVehicleImages(currentVehicle), [currentVehicle]);

  const vehicleRates = useMemo(() => {
    if (currentVehicle.hasFinancing && currentVehicle.rate > 0) {
      return [{ label: `Tasa del vendedor (TNA ${currentVehicle.rate}%)`, monthly: currentVehicle.rate / 100 / 12 }];
    }
    return FINANCING_RATES;
  }, [currentVehicle]);

  const [dealerVehicles, setDealerVehicles] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(1); // 1 = right, -1 = left
  const modalScrollRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const mainImageRef = useRef(null);
  const dragOriginRef = useRef({ x: 0, y: 0, position: { x: 0, y: 0 } });
  const imageWasDraggedRef = useRef(false);
  // Ref to expose current zoom state to the non-passive wheel handler without stale closures
  const zoomStateRef = useRef({ scale: 1, pos: { x: 0, y: 0 } });
  const touchStartXRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsZoomScale, setFsZoomScale] = useState(1);
  const [fsZoomPos, setFsZoomPos] = useState({ x: 0, y: 0 });
  const [fsUiVisible, setFsUiVisible] = useState(true);
  const [fsDragging, setFsDragging] = useState(false);
  const fsUiTimerRef = useRef(null);
  const fsImageRef = useRef(null);
  const fsDragOriginRef = useRef({ x: 0, y: 0, pos: { x: 0, y: 0 } });
  const fsDraggedRef = useRef(false);
  const fsTouchStartRef = useRef(null);
  const fsZoomStateRef = useRef({ scale: 1, pos: { x: 0, y: 0 } });
  const selectedImage = images[selectedImageIndex];
  const reserved = isVehicleReserved(currentVehicle);
  const currentFavoriteActive = appActions
    ? appActions.isFavorite?.(currentVehicle.id)
    : favoriteActive;
  const maintenanceInfo = useMemo(
    () => getVehicleMaintenanceInfo(currentVehicle),
    [currentVehicle]
  );
  const hasDetalles = maintenanceInfo.shouldShow;

  useEffect(() => {
    if (activeTab === "detalles" && !hasDetalles) setActiveTab("galeria");
  }, [hasDetalles, activeTab]);
  const usedFinancingResult = useMemo(
    () =>
      calculateUsedVehicleFinancing({
        price:        currentVehicle.price,
        downPayment:  financingDownPayment || currentVehicle.delivery || "",
        termMonths:   financingTermMonths  || currentVehicle.months   || String(DEFAULT_TERM_MONTHS),
        monthlyIncome: financingIncome,
        monthlyRate:  vehicleRates[financingRateIdx]?.monthly,
      }),
    [
      currentVehicle.price,
      currentVehicle.delivery,
      currentVehicle.months,
      financingDownPayment,
      financingTermMonths,
      financingIncome,
      financingRateIdx,
    ]
  );

  async function handleContraofertaSubmit(e) {
    e.preventDefault();
    const precio = Number(String(contraofertaPrecio).replace(/\D/g, ""));
    if (!precio || precio <= 0) {
      setContraofertaError("Ingresá un precio válido.");
      return;
    }
    setContraofertaStatus("submitting");
    setContraofertaError("");
    const profile = appActions?.authProfile;
    const { error } = await createContraoferta({
      vehicleId:      currentVehicle.id,
      buyerName:      profile?.full_name || profile?.name || "",
      buyerPhone:     profile?.phone || profile?.whatsapp || "",
      precioOfertado: precio,
    });
    if (error) {
      setContraofertaError(error.message || "No se pudo enviar la oferta.");
      setContraofertaStatus("error");
    } else {
      setContraofertaStatus("ok");
    }
  }

  function goTo(index) {
    if (!vehicles || index < 0 || index >= vehicles.length) return;
    setCurrentVehicle(vehicles[index]);
    setSelectedImageIndex(0);
    resetImageZoom();
    setShowContactGate(false);
    setActiveTab("galeria");
  }

  function clampZoomPosition(position, scale = zoomScale) {
    const frame = mainImageRef.current;
    const fallbackOffset = 160;

    if (!frame) {
      return {
        x: Math.max(-fallbackOffset, Math.min(fallbackOffset, position.x)),
        y: Math.max(-fallbackOffset, Math.min(fallbackOffset, position.y)),
      };
    }

    const { width, height } = frame.getBoundingClientRect();
    const maxX = Math.max(0, (width * scale - width) / 2);
    const maxY = Math.max(0, (height * scale - height) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, position.x)),
      y: Math.max(-maxY, Math.min(maxY, position.y)),
    };
  }

  function resetImageZoom() {
    setIsZoomed(false);
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
    setIsDraggingImage(false);
    imageWasDraggedRef.current = false;
    zoomStateRef.current = { scale: 1, pos: { x: 0, y: 0 } };
  }

  // Keep ref in sync so the non-passive wheel handler never sees stale values
  useEffect(() => {
    zoomStateRef.current = { scale: zoomScale, pos: zoomPosition };
  }, [zoomScale, zoomPosition]);

  useEffect(() => {
    if (!termDropdownOpen) return;
    const close = (e) => {
      if (termDropdownRef.current && !termDropdownRef.current.contains(e.target))
        setTermDropdownOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [termDropdownOpen]);

  useEffect(() => {
    setSelectedImageIndex(0);
    resetImageZoom();
    const defaultDown = currentVehicle?.delivery
      ? String(currentVehicle.delivery)
      : currentVehicle?.price
        ? String(Math.round(Number(currentVehicle.price) * DEFAULT_DOWN_PCT))
        : "";
    setFinancingDownPayment(defaultDown);
    setFinancingTermMonths(currentVehicle?.months ? String(currentVehicle.months) : String(DEFAULT_TERM_MONTHS));
    setFinancingIncome("");
    setFinancingRateIdx(currentVehicle?.hasFinancing && currentVehicle?.rate > 0 ? 0 : DEFAULT_RATE_INDEX);
    setDealerVehicles([]);

    const vid = currentVehicle?.vehicle_id ?? currentVehicle?.id;
    if (vid) {
      getVehiclePriceHistory(vid).then(setPriceHistory);
    } else {
      setPriceHistory([]);
    }
  }, [currentVehicle?.id, currentVehicle?.vehicle_id, images[0]?.url]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "ArrowLeft") goTo(currentIndex - 1);
      if (event.key === "ArrowRight") goTo(currentIndex + 1);
      if (event.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, hasPrev, hasNext]);

  useEffect(() => {
    if (activeTab !== "contactar") return;
    const dealerId = currentVehicle.dealerId || currentVehicle.dealer?.id;
    if (!dealerId || dealerId === "dealer-fallback" || dealerId === "dealer-snapshot") return;
    let cancelled = false;
    listDealerPublicVehicles(dealerId, currentVehicle.id, 5).then((list) => {
      if (!cancelled) setDealerVehicles(list);
    });
    return () => { cancelled = true; };
  }, [activeTab, currentVehicle]);

  // Zoom to the point the user clicked. Formula: newTx = cx - (cx - tx) * (newScale / s)
  // where (cx, cy) is the cursor position relative to the container center.
  function zoomToPoint(cx, cy, newScale) {
    const { scale, pos } = zoomStateRef.current;
    const ratio = newScale / scale;
    const newX = cx - (cx - pos.x) * ratio;
    const newY = cy - (cy - pos.y) * ratio;
    const clamped = clampZoomPosition({ x: newX, y: newY }, newScale);
    setIsZoomed(newScale > 1);
    setZoomScale(newScale);
    setZoomPosition(clamped);
    zoomStateRef.current = { scale: newScale, pos: clamped };
  }

  function handleZoomStageClick(event) {
    if (!selectedImage?.url) return;
    if (imageWasDraggedRef.current) {
      imageWasDraggedRef.current = false;
      return;
    }
    // Second click while zoomed → reset
    if (isZoomed) {
      resetImageZoom();
      return;
    }
    // Zoom into the clicked point
    const frame = mainImageRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const cx = event.clientX - rect.left - rect.width / 2;
    const cy = event.clientY - rect.top - rect.height / 2;
    zoomToPoint(cx, cy, 2.5);
  }

  function handleZoomPointerDown(event) {
    if (!isZoomed || !selectedImage?.url) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    imageWasDraggedRef.current = false;
    dragOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      position: zoomPosition,
    };
    setIsDraggingImage(true);
  }

  function handleZoomPointerMove(event) {
    if (!isZoomed || !isDraggingImage) return;
    event.preventDefault();
    const deltaX = event.clientX - dragOriginRef.current.x;
    const deltaY = event.clientY - dragOriginRef.current.y;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      imageWasDraggedRef.current = true;
    }
    setZoomPosition(
      clampZoomPosition(
        {
          x: dragOriginRef.current.position.x + deltaX,
          y: dragOriginRef.current.position.y + deltaY,
        },
        zoomScale
      )
    );
  }

  function stopZoomDrag(event) {
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    setIsDraggingImage(false);
  }

  function handleTouchStart(event) {
    if (isZoomed) return;
    touchStartXRef.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event) {
    if (isZoomed || touchStartXRef.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0 && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex((i) => i + 1);
      resetImageZoom();
    } else if (delta > 0 && selectedImageIndex > 0) {
      setSelectedImageIndex((i) => i - 1);
      resetImageZoom();
    }
  }

  function navigateImage(dir) {
    const next = selectedImageIndex + dir;
    if (next < 0 || next >= images.length) return;
    setSlideDir(dir);
    setSelectedImageIndex(next);
    resetImageZoom();
  }

  // ── Fullscreen gallery ──────────────────────────────────────────
  function openFullscreen() {
    if (!selectedImage?.url) return;
    setIsFullscreen(true);
    setFsZoomScale(1);
    setFsZoomPos({ x: 0, y: 0 });
    fsZoomStateRef.current = { scale: 1, pos: { x: 0, y: 0 } };
    setFsUiVisible(true);
    scheduleFsUiHide();
  }

  function closeFullscreen() {
    setIsFullscreen(false);
    setFsZoomScale(1);
    setFsZoomPos({ x: 0, y: 0 });
    clearTimeout(fsUiTimerRef.current);
  }

  function scheduleFsUiHide() {
    clearTimeout(fsUiTimerRef.current);
    fsUiTimerRef.current = setTimeout(() => setFsUiVisible(false), 2500);
  }

  function showFsUi() {
    setFsUiVisible(true);
    scheduleFsUiHide();
  }

  function fsClamped(pos, scale) {
    const frame = fsImageRef.current;
    if (!frame) return pos;
    const { width, height } = frame.getBoundingClientRect();
    const maxX = Math.max(0, (width * scale - width) / 2);
    const maxY = Math.max(0, (height * scale - height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, pos.x)),
      y: Math.max(-maxY, Math.min(maxY, pos.y)),
    };
  }

  // Non-passive wheel zoom for fullscreen
  const handleFsWheel = useCallback((event) => {
    event.preventDefault();
    showFsUi();
    const { scale, pos } = fsZoomStateRef.current;
    const frame = fsImageRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const cx = event.clientX - rect.left - rect.width / 2;
    const cy = event.clientY - rect.top - rect.height / 2;
    const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    const newScale = Math.max(1, Math.min(5, scale * factor));
    if (newScale === scale) return;
    const ratio = newScale / scale;
    const clamped = fsClamped({ x: cx - (cx - pos.x) * ratio, y: cy - (cy - pos.y) * ratio }, newScale);
    setFsZoomScale(newScale);
    setFsZoomPos(clamped);
    fsZoomStateRef.current = { scale: newScale, pos: clamped };
  }, []);

  useEffect(() => {
    const frame = fsImageRef.current;
    if (!isFullscreen || !frame) return;
    frame.addEventListener("wheel", handleFsWheel, { passive: false });
    return () => frame.removeEventListener("wheel", handleFsWheel);
  }, [isFullscreen, handleFsWheel]);

  useEffect(() => {
    if (!isFullscreen) return;
    function onKey(e) {
      if (e.key === "Escape") { closeFullscreen(); return; }
      if (e.key === "ArrowLeft") { navigateImage(-1); fsZoomStateRef.current = { scale: 1, pos: { x: 0, y: 0 } }; setFsZoomScale(1); setFsZoomPos({ x: 0, y: 0 }); }
      if (e.key === "ArrowRight") { navigateImage(1); fsZoomStateRef.current = { scale: 1, pos: { x: 0, y: 0 } }; setFsZoomScale(1); setFsZoomPos({ x: 0, y: 0 }); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, selectedImageIndex, images.length]);

  useEffect(() => {
    fsZoomStateRef.current = { scale: fsZoomScale, pos: fsZoomPos };
  }, [fsZoomScale, fsZoomPos]);

  function handleFsPointerDown(e) {
    if (fsZoomScale <= 1) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    fsDraggedRef.current = false;
    fsDragOriginRef.current = { x: e.clientX, y: e.clientY, pos: fsZoomPos };
    setFsDragging(true);
  }

  function handleFsPointerMove(e) {
    if (!fsDragging || fsZoomScale <= 1) return;
    const dx = e.clientX - fsDragOriginRef.current.x;
    const dy = e.clientY - fsDragOriginRef.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) fsDraggedRef.current = true;
    const clamped = fsClamped({ x: fsDragOriginRef.current.pos.x + dx, y: fsDragOriginRef.current.pos.y + dy }, fsZoomScale);
    setFsZoomPos(clamped);
  }

  function handleFsPointerUp(e) {
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
    setFsDragging(false);
  }

  function handleFsTouchStart(e) {
    if (fsZoomScale > 1) return;
    fsTouchStartRef.current = e.touches[0].clientX;
  }

  function handleFsTouchEnd(e) {
    if (fsZoomScale > 1 || fsTouchStartRef.current === null) return;
    const delta = e.changedTouches[0].clientX - fsTouchStartRef.current;
    fsTouchStartRef.current = null;
    if (Math.abs(delta) < 50) return;
    const dir = delta < 0 ? 1 : -1;
    const next = selectedImageIndex + dir;
    if (next < 0 || next >= images.length) return;
    setSelectedImageIndex(next);
    setFsZoomScale(1); setFsZoomPos({ x: 0, y: 0 });
    fsZoomStateRef.current = { scale: 1, pos: { x: 0, y: 0 } };
  }

  // Non-passive wheel handler: zoom in/out at cursor position
  const handleWheel = useCallback((event) => {
    if (!mainImageRef.current) return;
    event.preventDefault();
    const { scale, pos } = zoomStateRef.current;
    const frame = mainImageRef.current;
    const rect = frame.getBoundingClientRect();
    const cx = event.clientX - rect.left - rect.width / 2;
    const cy = event.clientY - rect.top - rect.height / 2;
    const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    const newScale = Math.max(1, Math.min(4, scale * factor));
    if (newScale === scale) return;
    const ratio = newScale / scale;
    const newX = cx - (cx - pos.x) * ratio;
    const newY = cy - (cy - pos.y) * ratio;
    const clamped = clampZoomPosition({ x: newX, y: newY }, newScale);
    setIsZoomed(newScale > 1);
    setZoomScale(newScale);
    setZoomPosition(clamped);
    zoomStateRef.current = { scale: newScale, pos: clamped };
  }, []);

  useEffect(() => {
    const frame = mainImageRef.current;
    if (!frame) return;
    frame.addEventListener("wheel", handleWheel, { passive: false });
    return () => frame.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);


  function handleClose() {
    resetImageZoom();
    onClose();
  }

  function getVehicleShareUrl() {
    return currentVehicle?.id
      ? `${window.location.origin}/vehiculo/${encodeURIComponent(currentVehicle.id)}`
      : window.location.href;
  }

  function getVehicleShareTitle() {
    const brand = currentVehicle.brand || "";
    const model = currentVehicle.model || "";
    const year = currentVehicle.year ? ` ${currentVehicle.year}` : "";
    const title = `${brand} ${model}${year}`.trim();
    const price = formatARS(currentVehicle.price);

    return [title, price && price !== "Consultar" ? price : ""]
      .filter(Boolean)
      .join(" — ");
  }

  function handleShareWhatsApp() {
    const vehicleShareUrl = shareUrl || getVehicleShareUrl();
    const vehicleShareTitle = getVehicleShareTitle();
    const whatsappMessage = [
      "Mirá esta unidad en oX NEXMOV.",
      "",
      vehicleShareTitle,
      vehicleShareUrl,
    ]
      .filter(Boolean)
      .join("\n");
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function handleCopyShareLink() {
    const vehicleShareUrl = shareUrl || getVehicleShareUrl();

    try {
      await navigator.clipboard.writeText(vehicleShareUrl);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2200);
    } catch {
      // clipboard unavailable
    }
  }

  const modal = (
    <div className="modal-backdrop vehicle-detail-backdrop">
      <section
        ref={modalScrollRef}
        className={`vehicle-detail-modal vehicle-detail-modal--${permissions.rankTheme}`}
      >
        {vehicles && vehicles.length > 1 && (
          <div className="vehicle-detail-nav">
            <button
              type="button"
              className="vehicle-detail-nav-btn"
              disabled={!hasPrev}
              onClick={() => goTo(currentIndex - 1)}
              aria-label="Vehículo anterior"
            >
              ←
            </button>
            <span className="vehicle-detail-nav-counter">
              {currentIndex + 1} / {vehicles.length}
            </span>
            <button
              type="button"
              className="vehicle-detail-nav-btn"
              disabled={!hasNext}
              onClick={() => goTo(currentIndex + 1)}
              aria-label="Siguiente vehículo"
            >
              →
            </button>
          </div>
        )}

        {/* Identity bar — anchored */}
        <div className="vd-modal-identity">
          <div className="vd-modal-identity-info">
            <h2 className="vd-modal-identity-title">
              {currentVehicle.brand} <span className="vd-modal-identity-model">{currentVehicle.model}</span>
            </h2>
            <p className="vd-modal-identity-sub">
              {currentVehicle.version !== "Versión no informada" && <>{currentVehicle.version} · </>}
              {currentVehicle.year} · {formatKm(currentVehicle.kilometers)}
            </p>
          </div>
          <div className="vd-modal-identity-right">
            <div className="vd-modal-identity-top-row">
              <span className="vd-modal-identity-price">{formatARS(currentVehicle.price)}</span>
              <button
                type="button"
                className="vd-modal-close-inline"
                onClick={handleClose}
                aria-label="Cerrar"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {reserved && <span className="vd-modal-identity-reserved">Reservado</span>}
            {(currentVehicle.views > 0 || currentVehicle.leads_count > 0) && (
              <div className="vd-identity-signals">
                {currentVehicle.views > 0 && (
                  <span className="vd-identity-signal">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                    {currentVehicle.views >= 1000 ? `${(currentVehicle.views / 1000).toFixed(1)}k` : currentVehicle.views}
                  </span>
                )}
                {currentVehicle.leads_count > 0 && (
                  <span className="vd-identity-signal">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {currentVehicle.leads_count}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="vd-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={activeTab === "galeria"} className={`vd-tab${activeTab === "galeria" ? " is-active" : ""}`} onClick={() => setActiveTab("galeria")}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <rect x="1" y="4" width="11" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4.5 4v-1a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6.5" cy="7.8" r="1.65" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Fotos
          </button>
          {hasDetalles && (
            <button type="button" role="tab" aria-selected={activeTab === "detalles"} className={`vd-tab${activeTab === "detalles" ? " is-active" : ""}`} onClick={() => setActiveTab("detalles")}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M2 4h9M2 6.5h9M2 9h5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Detalles
            </button>
          )}
          <button type="button" role="tab" aria-selected={activeTab === "precio"} className={`vd-tab${activeTab === "precio" ? " is-active" : ""}`} onClick={() => setActiveTab("precio")}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M2 3h5.5l3.8 3.5-3.8 3.5H2V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <circle cx="9" cy="6.5" r="1.1" fill="currentColor"/>
            </svg>
            Precio
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "contactar"} className={`vd-tab${activeTab === "contactar" ? " is-active" : ""}`} onClick={() => setActiveTab("contactar")}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M2 2.8a.8.8 0 01.8-.8h7.4a.8.8 0 01.8.8V8a.8.8 0 01-.8.8H7.5L5 11V8.8H2.8A.8.8 0 012 8V2.8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Contactar
          </button>
        </div>

        {/* Tab content */}
        <div className="vd-tab-content" role="tabpanel">

          {/* ── FOTOS ── */}
          {activeTab === "galeria" && (
            <div className="vd-pane vd-pane--galeria">
            <div className="vd-galeria-left">
              <div className="detail-gallery-frame">
              {images[0]?.url && (
                <img
                  key={images[0].url}
                  className="detail-gallery-ambient"
                  src={getOptimizedUrl(images[0].url, "card")}
                  alt=""
                  aria-hidden="true"
                  draggable="false"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div
                ref={mainImageRef}
                className={`vehicle-detail-main-image detail-main-image dealer-rank-${permissions.rankTheme} ${
                  isZoomed ? "is-zoomed" : ""
                } ${isDraggingImage ? "is-dragging" : ""}`}
                onClick={(e) => { if (!imageWasDraggedRef.current) openFullscreen(); imageWasDraggedRef.current = false; }}
                onPointerDown={handleZoomPointerDown}
                onPointerMove={handleZoomPointerMove}
                onPointerUp={stopZoomDrag}
                onPointerCancel={stopZoomDrag}
                onPointerLeave={stopZoomDrag}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {selectedImage?.url ? (
                  <VehicleImage
                    key={selectedImage.url}
                    src={selectedImage.url}
                    alt={`${currentVehicle.brand} ${currentVehicle.model}`}
                    size="detail"
                    draggable={false}
                    loading="eager"
                    fetchPriority="high"
                    className={`detail-main-image__photo detail-img-slide${slideDir > 0 ? "--right" : "--left"}`}
                    style={{
                      transform: `translate3d(${zoomPosition.x}px, ${zoomPosition.y}px, 0) scale(${zoomScale})`,
                    }}
                  />
                ) : (
                  <span>
                    {currentVehicle.brand} {currentVehicle.model}
                  </span>
                )}

                {reserved && (
                  <div className="vehicle-reserved-ribbon">
                    Unidad reservada
                  </div>
                )}

                {/* Side arrows */}
                {images.length > 1 && !isZoomed && (
                  <>
                    <button
                      className="detail-image-arrow detail-image-arrow--prev"
                      type="button"
                      disabled={selectedImageIndex === 0}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); navigateImage(-1); }}
                      aria-label="Imagen anterior"
                    >
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true"><path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      className="detail-image-arrow detail-image-arrow--next"
                      type="button"
                      disabled={selectedImageIndex === images.length - 1}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); navigateImage(1); }}
                      aria-label="Siguiente imagen"
                    >
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true"><path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </>
                )}

                {/* Bottom-right: counter + zoom */}
                <div className="detail-image-toolbar">
                  {images.length > 1 && (
                    <span className="detail-image-counter">
                      {selectedImageIndex + 1} / {images.length}
                    </span>
                  )}
                  {selectedImage?.url && (
                    <>
                      <button
                        className={`vehicle-detail-zoom-button ${isZoomed ? "is-active" : ""}`}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); zoomToPoint(0, 0, Math.min(4, zoomScale * 1.5)); }}
                        aria-label="Ampliar"
                      >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true"><path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                      <button
                        className="vehicle-detail-zoom-button"
                        type="button"
                        disabled={!isZoomed}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); const s = zoomScale / 1.5; if (s <= 1) { resetImageZoom(); return; } zoomToPoint(0, 0, s); }}
                        aria-label="Reducir"
                      >
                        <svg width="9" height="2" viewBox="0 0 9 2" fill="none" aria-hidden="true"><path d="M1 1h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {images.length > 1 && (
              <div className="detail-thumb-strip" ref={(el) => {
                if (!el) return;
                const active = el.children[selectedImageIndex];
                active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}>
                {images.map((img, i) => (
                  <button
                    key={img.url || i}
                    type="button"
                    className={`detail-thumb${i === selectedImageIndex ? " is-active" : ""}`}
                    onClick={() => setSelectedImageIndex(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                  >
                    <VehicleImage src={img.url} alt="" size="thumb" loading="lazy" draggable={false} />
                  </button>
                ))}
              </div>
            )}
            </div>{/* vd-galeria-left */}

            <div className="vd-galeria-specs">
              <div className="vd-galeria-grid">
                <div className="vd-galeria-spec">
                  <span>Año</span>
                  <strong>{currentVehicle.year}</strong>
                </div>
                <div className="vd-galeria-spec">
                  <span>Kilómetros</span>
                  <strong>{formatKm(currentVehicle.kilometers)}</strong>
                </div>
                {currentVehicle.fuelType && (
                  <div className="vd-galeria-spec">
                    <span>Combustible</span>
                    <strong>{currentVehicle.fuelType}</strong>
                  </div>
                )}
                {currentVehicle.transmission && (
                  <div className="vd-galeria-spec">
                    <span>Transmisión</span>
                    <strong>{currentVehicle.transmission}</strong>
                  </div>
                )}
                {currentVehicle.bodyType && (
                  <div className="vd-galeria-spec">
                    <span>Carrocería</span>
                    <strong>{currentVehicle.bodyType}</strong>
                  </div>
                )}
                <div className="vd-galeria-spec">
                  <span>Ubicación</span>
                  <strong>{currentVehicle.city}, {currentVehicle.province}</strong>
                </div>
              </div>
              {currentVehicle.details && (
                <div className="vd-galeria-spec vd-galeria-spec--desc">
                  <span>Descripción</span>
                  <p>{currentVehicle.details}</p>
                </div>
              )}
            </div>
            </div>
          )}

          {/* ── DETALLES ── */}
          {activeTab === "detalles" && (
            <div className="vd-pane vd-pane--detalles">

            {maintenanceInfo.shouldShow && (
              <div className="vehicle-detail-maintenance-block">
                <div className="vehicle-detail-maintenance-head">
                  <span>Mantenimiento orientativo</span>
                  <strong>Datos declarados por el vendedor</strong>
                </div>

                <div className="vehicle-detail-maintenance-grid">
                  {maintenanceInfo.rows.map((row) => (
                    <div key={`${row.label}-${row.value}`}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>

                <p className="vehicle-detail-maintenance-note">
                  Información orientativa declarada por el vendedor. Los valores
                  pueden variar según uso, ubicación, proveedor, cobertura,
                  precios vigentes y condiciones particulares. oX NEXMOV no
                  calcula, verifica ni garantiza estos importes.
                </p>
              </div>
            )}

            </div>
          )}

          {/* ── PRECIO ── */}
          {activeTab === "precio" && (
            <div className="vd-pane vd-pane--precio">
            <PriceReveal price={currentVehicle.price}>
              {delta && (
                <div className="vd-price-market-ref">
                  <span>Ref. mercado</span>
                  <strong>{formatARS(currentVehicle.marketReferencePrice)}</strong>
                  <em className={delta.isBelowMarket ? "vd-delta--below" : "vd-delta--above"}>
                    {delta.isBelowMarket
                      ? `${delta.percent.toFixed(1)}% debajo del mercado`
                      : `${Math.abs(delta.percent).toFixed(1)}% por encima del mercado`}
                  </em>
                </div>
              )}
            </PriceReveal>

            {priceHistory.length >= 2 && (() => {
              const first  = priceHistory[0].price;
              const last   = priceHistory[priceHistory.length - 1].price;
              const drops  = priceHistory.slice(1).filter((e, i) => e.price < priceHistory[i].price).length;
              const pctDrop = first > 0 ? Math.round(((first - last) / first) * 100) : 0;
              return (
                <div className="detail-price-history" aria-label="Historial de precios">
                  {drops > 0 && (
                    <p className="detail-price-history__summary">
                      Bajó {drops} {drops === 1 ? "vez" : "veces"} desde su publicación
                      {pctDrop > 0 && <span> · {pctDrop}% menos</span>}
                    </p>
                  )}
                  <ol className="detail-price-history__list">
                    {priceHistory.map((entry, i) => {
                      const isLast = i === priceHistory.length - 1;
                      const prev   = priceHistory[i - 1];
                      const went   = prev ? (entry.price < prev.price ? "down" : entry.price > prev.price ? "up" : "same") : "first";
                      return (
                        <li key={i} className={`detail-price-history__entry detail-price-history__entry--${went}`}>
                          <span className="detail-price-history__price">{formatARS(entry.price)}</span>
                          <span className="detail-price-history__date">
                            {new Date(entry.recorded_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                            {isLast && " (actual)"}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })()}

            <div className="vehicle-detail-used-financing">
              <div className="vehicle-detail-used-financing-head">
                <div>
                  <span>Simulación orientativa</span>
                  <strong>Cuota estimada para este usado</strong>
                </div>
                <p>{formatARS(currentVehicle.price)}</p>
              </div>

              <div className="vehicle-detail-used-financing-rates">
                {vehicleRates.length === 1
                  ? <span className="financing-rate-declared">{vehicleRates[0].label}</span>
                  : vehicleRates.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`financing-rate-btn${financingRateIdx === i ? " is-active" : ""}`}
                    onClick={() => setFinancingRateIdx(i)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>


              <div className="vehicle-detail-used-financing-inputs">
                <label>
                  Entrega
                  <input
                    type="number"
                    min="0"
                    value={financingDownPayment}
                    onChange={(event) => setFinancingDownPayment(event.target.value)}
                    placeholder="Ej: 5000000"
                  />
                </label>

                <div
                  className={`financing-term-dropdown${termDropdownOpen ? " is-open" : ""}`}
                  ref={termDropdownRef}
                >
                  <span>Plazo</span>
                  <button
                    type="button"
                    className="financing-term-trigger"
                    onClick={() => setTermDropdownOpen((v) => !v)}
                  >
                    {financingTermMonths} meses
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {termDropdownOpen && (
                    <ul className="financing-term-options">
                      {["12","24","36","48","60","72"].map((m) => (
                        <li key={m}>
                          <button
                            type="button"
                            className={financingTermMonths === m ? "is-active" : ""}
                            onMouseDown={() => {
                              setFinancingTermMonths(m);
                              setTermDropdownOpen(false);
                            }}
                          >
                            {m} meses
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <label>
                  Ingreso mensual
                  <input
                    type="number"
                    min="0"
                    value={financingIncome}
                    onChange={(event) => setFinancingIncome(event.target.value)}
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <div className="vehicle-detail-used-financing-results" aria-live="polite">
                <div>
                  <span>Cuota estimada</span>
                  <strong>
                    {usedFinancingResult
                      ? formatARS(usedFinancingResult.monthlyPayment)
                      : "$ —"}
                  </strong>
                </div>
                <div>
                  <span>Monto financiado</span>
                  <strong>
                    {usedFinancingResult
                      ? formatARS(usedFinancingResult.financed)
                      : "$ —"}
                  </strong>
                </div>
                <div>
                  <span>% ingreso</span>
                  <strong>
                    {usedFinancingResult?.incomePercent != null
                      ? `${usedFinancingResult.incomePercent}%`
                      : "—"}
                  </strong>
                </div>
              </div>

              <p>
                Referencia no vinculante. La aprobación, tasa, gastos y condiciones
                finales dependen del proveedor, dealer y análisis crediticio.
              </p>
            </div>
            </div>
          )}

          {/* ── CONTACTAR ── */}
          {activeTab === "contactar" && (
            <div className="vd-pane vd-pane--contactar">

            {showContraofertaForm && currentVehicle.contraoferta_habilitada && (
              <div className="detail-contraoferta-panel">
                {contraofertaStatus === "ok" ? (
                  <div className="detail-contraoferta-ok">
                    <span className="detail-contraoferta-ok__icon">✓</span>
                    <p>Tu oferta fue enviada al dealer. Te contactarán a la brevedad.</p>
                  </div>
                ) : (
                  <form className="detail-contraoferta-form" onSubmit={handleContraofertaSubmit}>
                    <p className="detail-contraoferta-label">
                      Precio publicado: <strong>{formatARS(currentVehicle.price)}</strong>
                    </p>
                    <label className="detail-contraoferta-field">
                      <span>Tu oferta</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        placeholder={`Ej: ${Math.round((currentVehicle.price || 0) * 0.9).toLocaleString("es-AR")}`}
                        value={contraofertaPrecio}
                        onChange={(e) => setContraofertaPrecio(e.target.value)}
                        required
                      />
                    </label>
                    {contraofertaError && (
                      <p className="detail-contraoferta-error">{contraofertaError}</p>
                    )}
                    <button
                      type="submit"
                      className="detail-contraoferta-submit"
                      disabled={contraofertaStatus === "submitting"}
                    >
                      {contraofertaStatus === "submitting" ? "Enviando..." : "Enviar oferta"}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="detail-published-by">
              {(currentDealer.logo || currentDealer.raw?.logo_url) && (
                <img
                  className="detail-published-by-bg"
                  src={currentDealer.logo || currentDealer.raw?.logo_url}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <div className="detail-published-by-header">
                <span className="detail-published-by-label">Publicado por</span>
                <span className={`admin-chip rank-${permissions.rankTheme}`}>
                  {permissions.rankLabel}
                </span>
              </div>
              <strong className="detail-published-by-name">
                {currentDealer.commercialName}
              </strong>
              <p className="detail-published-by-location">
                {currentDealer.city}, {currentDealer.province}
              </p>
              <p className="detail-published-by-trust">
                Concesionaria verificada dentro de oX NEXMOV.
              </p>
              {onNavigate &&
                currentDealer.id &&
                currentDealer.id !== "dealer-fallback" &&
                currentDealer.id !== "dealer-snapshot" && (
                  <button
                    type="button"
                    className="dealer-profile-link-btn"
                    onClick={() =>
                      onNavigate("dealerProfile", {
                        dealerId: currentDealer.id,
                      })
                    }
                  >
                    Ver más de este dealer →
                  </button>
                )}
            </div>

            {dealerVehicles.length > 0 && (
              <div className="vd-dealer-more">
                <p className="vd-dealer-more-label">Más de este vendedor</p>
                {dealerVehicles.map((v) => {
                  const vIdx = vehicles ? vehicles.findIndex((x) => x.id === v.id) : -1;
                  const thumb = getVehicleImages(v)[0]?.url || "";
                  function handleGoToDealer() {
                    if (vIdx >= 0) { goTo(vIdx); }
                    else {
                      setCurrentVehicle(v);
                      setActiveTab("galeria");
                    }
                  }
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className="vd-dealer-more-card"
                      onClick={handleGoToDealer}
                    >
                      <div className="vd-dealer-more-thumb">
                        {thumb
                          ? <img src={thumb} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}

                      </div>
                      <div className="vd-dealer-more-info">
                        <strong>{v.brand} {v.model}</strong>
                        <span>{v.year} · {v.kilometers != null ? `${Number(v.kilometers).toLocaleString("es-AR")} km` : ""}</span>
                        <em>{formatARS(v.price)}</em>
                      </div>
                      {isVehicleReserved(v) && <span className="vd-dealer-more-reserved">Reservado</span>}
                    </button>
                  );
                })}
              </div>
            )}

            </div>
          )}

        </div>{/* /vd-tab-content */}

        {/* Persistent actions — anchored at bottom */}
        <div className="vd-actions-bar">
          <div className="detail-actions">
            <button
              type="button"
              className={`primary-action${!reserved ? " detail-cta-pulse" : ""}`}
              onClick={() => {
                if (reserved) return;
                if (appActions) setShowContactGate(true);
                else onContact?.();
              }}
              disabled={reserved}
              title={reserved ? "Esta unidad está reservada por el dealer." : "Contactar dealer"}
            >
              {reserved ? "Unidad reservada" : "Contactar dealer"}
            </button>

            {currentVehicle.contraoferta_habilitada && !reserved && (
              <button
                type="button"
                className="detail-action-contraoferta"
                onClick={() => {
                  if (!appActions?.authUser) { handleClose(); onNavigate?.("login"); return; }
                  const opening = !showContraofertaForm;
                  setShowContraofertaForm(opening);
                  setContraofertaStatus("idle");
                  setContraofertaError("");
                  if (opening) setActiveTab("contactar");
                }}
              >
                {showContraofertaForm ? "Cerrar oferta" : "Contraofertar precio"}
              </button>
            )}

            <div className="detail-actions-secondary">
              <button
                type="button"
                className="detail-action-icon-btn"
                onClick={() => { if (appActions) appActions.addToCompare?.(currentVehicle); else onCompare?.(); }}
                aria-label="Agregar a comparar"
              >
                <CompareIcon size={16} />
                <span>Comparar</span>
              </button>

              <button
                type="button"
                className={`detail-action-icon-btn${currentFavoriteActive ? " is-favorite" : ""}`}
                onClick={() => { if (appActions) appActions.toggleFavorite?.(currentVehicle); else onFavorite?.(); }}
                aria-label={currentFavoriteActive ? "Quitar de favoritos" : "Guardar en favoritos"}
              >
                <HeartIcon size={16} filled={currentFavoriteActive} />
                <span>{currentFavoriteActive ? "Guardado" : "Favorito"}</span>
              </button>

              <button
                type="button"
                className="detail-action-icon-btn detail-action-icon-btn--whatsapp"
                onClick={handleShareWhatsApp}
                aria-label="Compartir por WhatsApp"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1.5a6.5 6.5 0 00-5.42 10.1L1.5 14.5l3.02-.97A6.5 6.5 0 108 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.1 7.1c.08.62.37 1.6 1.4 2.3 1.04.72 1.86.77 2.3.62.3-.09.28-.47.05-.68l-.38-.34a.46.46 0 00-.56-.04l-.24.16a2.02 2.02 0 01-1.36-1.36l.16-.24a.46.46 0 00-.04-.56l-.34-.38c-.2-.23-.67-.25-.67-.25L6.1 7.1z" fill="currentColor"/>
                </svg>
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                className={`detail-action-icon-btn${shareState === "copied" ? " is-copied" : ""}`}
                onClick={handleCopyShareLink}
                aria-label="Copiar enlace"
              >
                {shareState === "copied" ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M7 10a3 3 0 004.24.06l2-2A3 3 0 009 4.34L8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M9 6a3 3 0 00-4.24-.06l-2 2A3 3 0 007 11.66L8 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                )}
                <span>{shareState === "copied" ? "¡Copiado!" : "Copiar"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="vehicle-detail-footer">
          <p className="vehicle-detail-legal-note">
            Datos declarados por el vendedor. Verificá disponibilidad y condiciones antes de avanzar. oX NEXMOV no certifica el estado ni garantiza la operación.
            {currentVehicle.hasFinancing && " Valores de financiación orientativos, sujetos a aprobación crediticia."}
          </p>
          <img
            className="vehicle-detail-footer-logo"
            src="/logo.svg"
            alt="oX NEXMOV"
            width="120"
            height="23"
          />
        </div>

      </section>
    </div>
  );

  const fsOverlay = isFullscreen && createPortal(
    <div
      className={`vd-fs-overlay${fsUiVisible ? " ui-visible" : ""}`}
      onMouseMove={showFsUi}
      onPointerMove={(e) => { showFsUi(); handleFsPointerMove(e); }}
    >
      {/* Close */}
      <button className="vd-fs-close" onClick={closeFullscreen} aria-label="Cerrar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <span className="vd-fs-counter">{selectedImageIndex + 1} / {images.length}</span>
      )}

      {/* Image stage */}
      <div
        ref={fsImageRef}
        className={`vd-fs-stage${fsDragging ? " is-dragging" : ""}${fsZoomScale > 1 ? " is-zoomed" : ""}`}
        onPointerDown={handleFsPointerDown}
        onPointerUp={handleFsPointerUp}
        onPointerCancel={handleFsPointerUp}
        onTouchStart={handleFsTouchStart}
        onTouchEnd={handleFsTouchEnd}
        onClick={(e) => { if (!fsDraggedRef.current && fsZoomScale <= 1) closeFullscreen(); fsDraggedRef.current = false; }}
      >
        <img
          src={images[selectedImageIndex]?.url}
          alt={`${currentVehicle.brand} ${currentVehicle.model}`}
          className="vd-fs-img"
          draggable={false}
          style={{ transform: `translate3d(${fsZoomPos.x}px, ${fsZoomPos.y}px, 0) scale(${fsZoomScale})` }}
        />
      </div>

      {/* Side arrows */}
      {images.length > 1 && fsZoomScale <= 1 && (
        <>
          <button
            className="vd-fs-arrow vd-fs-arrow--prev"
            disabled={selectedImageIndex === 0}
            onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(i => i - 1); setFsZoomScale(1); setFsZoomPos({ x: 0, y: 0 }); fsZoomStateRef.current = { scale: 1, pos: { x: 0, y: 0 } }; }}
            aria-label="Anterior"
          >
            <svg width="9" height="16" viewBox="0 0 9 16" fill="none"><path d="M8 1L1 8l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            className="vd-fs-arrow vd-fs-arrow--next"
            disabled={selectedImageIndex === images.length - 1}
            onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(i => i + 1); setFsZoomScale(1); setFsZoomPos({ x: 0, y: 0 }); fsZoomStateRef.current = { scale: 1, pos: { x: 0, y: 0 } }; }}
            aria-label="Siguiente"
          >
            <svg width="9" height="16" viewBox="0 0 9 16" fill="none"><path d="M1 1l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && images.length <= 12 && (
        <div className="vd-fs-dots">
          {images.map((_, i) => (
            <button
              key={i}
              className={`vd-fs-dot${i === selectedImageIndex ? " is-active" : ""}`}
              onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(i); setFsZoomScale(1); setFsZoomPos({ x: 0, y: 0 }); fsZoomStateRef.current = { scale: 1, pos: { x: 0, y: 0 } }; }}
              aria-label={`Imagen ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );

  return (
    <>
      {createPortal(modal, document.body)}
      {fsOverlay}
      {showContactGate && appActions && !reserved && createPortal(
        <ContactGate
          vehicle={currentVehicle}
          dealer={currentDealer}
          authUser={appActions.authUser}
          authProfile={appActions.authProfile}
          onClose={() => setShowContactGate(false)}
          onRequireLogin={() => {
            setShowContactGate(false);
            handleClose();
            onNavigate?.("login");
          }}
          onNavigate={onNavigate}
          onLeadCreated={() => setShowContactGate(false)}
        />,
        document.body
      )}
    </>
  );
}
