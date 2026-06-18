import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

import Layout from "../components/Layout.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
const PWAInstallBanner  = lazy(() => import("../components/PWAInstallBanner.jsx"));
const NotificationOptIn = lazy(() => import("../components/NotificationOptIn.jsx"));
import NotFound from "../modules/public/NotFound.jsx";
import Home from "../modules/public/Home.jsx";
const Search           = lazy(() => import("../modules/public/Search.jsx"));
const ZeroKm           = lazy(() => import("../modules/public/ZeroKm.jsx"));
const SellVehicle      = lazy(() => import("../modules/public/SellVehicle.jsx"));
const JoinNetwork      = lazy(() => import("../modules/public/JoinNetwork.jsx"));
const About            = lazy(() => import("../modules/public/About.jsx"));
const FAQ              = lazy(() => import("../modules/public/FAQ.jsx"));
const LegalPage        = lazy(() => import("../modules/public/LegalPage.jsx"));
const DealerProfile    = lazy(() => import("../modules/public/DealerProfile.jsx"));
const PublicVehicleDetailRoute = lazy(() => import("../modules/public/PublicVehicleDetailRoute.jsx"));
const ComparePage      = lazy(() => import("../modules/public/ComparePage.jsx"));
const AuthPanel        = lazy(() => import("../modules/auth/AuthPanel.jsx"));
const ResetPasswordPanel = lazy(() => import("../modules/auth/ResetPasswordPanel.jsx"));
const BuyerPanel       = lazy(() => import("../modules/buyer/BuyerPanel.jsx"));
const DealerPanel      = lazy(() => import("../modules/dealer/DealerPanel.jsx"));
const AdminPanel       = lazy(() => import("../modules/admin/AdminPanel.jsx"));
const Internal0kmPanel = lazy(() => import("../modules/internal0km/Internal0kmPanel.jsx"));
const SupportPanel     = lazy(() => import("../modules/support/SupportPanel.jsx"));

import { getCurrentSession, subscribeToAuthChanges } from "../services/auth.service.js";
import { getProfileByUserId, saveUserTheme } from "../services/profiles.service.js";
import { normalizeRole } from "../lib/auth.js";
import {
  listBuyerFavorites,
  addBuyerFavorite,
  removeBuyerFavorite,
} from "../services/buyerFavorites.service.js";
import { trackPageView } from "../services/siteAnalytics.service.js";

const ROUTES = {
  notFound: NotFound,
  home: Home,
  search: Search,
  zeroKm: ZeroKm,
  sellVehicle: SellVehicle,
  joinNetwork: JoinNetwork,
  about: About,
  faq: FAQ,
  terms: LegalPage,
  privacy: LegalPage,
  cookies: LegalPage,
  consumerDefense: LegalPage,
  regret: LegalPage,
  serviceCancel: LegalPage,
  login: AuthPanel,
  resetPassword: ResetPasswordPanel,
  buyer: BuyerPanel,
  dealer: DealerPanel,
  admin: AdminPanel,
  internal0km: Internal0kmPanel,
  support: SupportPanel,
  dealerProfile: DealerProfile,
  vehicleDetail: PublicVehicleDetailRoute,
  compare: ComparePage,
};

const PUBLIC_ROUTES = new Set([
  "home",
  "search",
  "zeroKm",
  "sellVehicle",
  "joinNetwork",
  "about",
  "faq",
  "terms",
  "privacy",
  "cookies",
  "consumerDefense",
  "regret",
  "serviceCancel",
  "login",
  "resetPassword",
  "dealerProfile",
  "vehicleDetail",
  "compare",
]);

const PATH_TO_ROUTE = {
  "/": "home",
  "/buscar": "search",
  "/financiacion": "zeroKm",
  "/sumate": "joinNetwork",
  "/quienes-somos": "about",
  "/faq": "faq",
  "/login": "login",
  "/reset-password": "resetPassword",
  "/legal/terminos": "terms",
  "/legal/privacidad": "privacy",
  "/legal/cookies": "cookies",
  "/legal/defensa-consumidor": "consumerDefense",
  "/legal/arrepentimiento": "regret",
  "/legal/baja-servicio": "serviceCancel",
  "/comparar": "compare",
};

const ROUTE_TO_PATH = Object.entries(PATH_TO_ROUTE).reduce(
  (acc, [path, route]) => ({
    ...acc,
    [route]: path,
  }),
  {}
);

const ROUTE_TITLES = {
  home: "oX NEXMOV — Marketplace de vehículos verificados",
  search: "Buscar vehículos — oX NEXMOV",
  zeroKm: "Financiación 0km — oX NEXMOV",
  sellVehicle: "Vender mi vehículo — oX NEXMOV",
  joinNetwork: "Sumate a la red de vendedores — oX NEXMOV",
  about: "Quiénes somos — oX NEXMOV",
  faq: "Preguntas frecuentes — oX NEXMOV",
  terms: "Términos y condiciones — oX NEXMOV",
  privacy: "Política de privacidad — oX NEXMOV",
  cookies: "Política de cookies — oX NEXMOV",
  consumerDefense: "Defensa del consumidor — oX NEXMOV",
  regret: "Botón de arrepentimiento — oX NEXMOV",
  serviceCancel: "Cancelación del servicio — oX NEXMOV",
  login: "Ingresar — oX NEXMOV",
  resetPassword: "Crear nueva contraseña — oX NEXMOV",
  buyer: "Mi panel — oX NEXMOV",
  dealer: "Panel vendedor — oX NEXMOV",
  admin: "Panel admin — oX NEXMOV",
  internal0km: "Panel 0km — oX NEXMOV",
  support: "Panel soporte — oX NEXMOV",
  dealerProfile: "Vendedor — oX NEXMOV",
  vehicleDetail: "Detalle de vehículo — oX NEXMOV",
  compare: "Comparar vehículos — oX NEXMOV",
};

const ROUTE_DESCRIPTIONS = {
  home: "Encontrá tu próximo vehículo en oX NEXMOV. Vendedores verificados, comparador integrado y consultas registradas.",
  search: "Buscá vehículos por marca, modelo, precio, kilómetros, financiación y ubicación. Vendedores verificados en Argentina.",
  zeroKm: "Financiación 0km con entrega inmediata. Explorá opciones de cuotas y condiciones antes de contactar al vendedor.",
  sellVehicle: "Vendé mejor con un historial claro. Garage oX organiza servicios, vencimientos y documentación para que tu vehículo hable por sí solo.",
  joinNetwork: "Sumá tu agencia a oX NEXMOV. Publicaciones premium, consultas registradas y herramientas comerciales para vendedores verificados.",
  about: "Conocé quiénes somos y por qué construimos oX NEXMOV como un marketplace de vehículos verificados en Argentina.",
  faq: "Preguntas frecuentes sobre oX NEXMOV: cómo funciona, cómo publicar, cómo contactar vendedores y cómo comparar vehículos.",
  compare: "Compará hasta 4 vehículos lado a lado: precio, kilómetros, financiación y specs técnicas. Vendedores verificados en oX NEXMOV.",
};

const THEME_STORAGE_KEY = "ox-nexmov-theme";
const THEME_OPTIONS = new Set(["dark", "light"]);
const COMPARE_STORAGE_KEY = "ox-nexmov-compare";

function getInitialCompareItems() {
  try {
    const stored = window.sessionStorage.getItem(COMPARE_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getInitialRouteFromHash() {
  if (typeof window === "undefined") return "home";
  const hash = getRouteFromHash();
  return PUBLIC_ROUTES.has(hash) ? hash : "home";
}

function getInitialRouteFromLocation() {
  if (typeof window === "undefined") return "home";

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const vehicleId = getVehicleIdFromPath(pathname);

  if (vehicleId) {
    return "vehicleDetail";
  }

  const pathRoute = PATH_TO_ROUTE[pathname];
  const hashRoute = getRouteFromHash();
  const hasLegacyHashRoute = PUBLIC_ROUTES.has(hashRoute);

  if (pathRoute && (pathname !== "/" || !hasLegacyHashRoute)) {
    return pathRoute;
  }

  if (hasLegacyHashRoute) {
    return hashRoute;
  }

  return "home";
}

function getInitialRouteParamsFromLocation() {
  if (typeof window === "undefined") return {};

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const vehicleId = getVehicleIdFromPath(pathname);

  if (vehicleId) {
    return { vehicleId };
  }

  const search = new URLSearchParams(window.location.search);
  if (search.get("openForm") === "true") {
    return { openForm: true };
  }

  return {};
}

function getVehicleIdFromPath(pathname) {
  const normalizedPathname = String(pathname || "").replace(/\/+$/, "") || "/";

  if (!normalizedPathname.startsWith("/vehiculo/")) return "";

  return decodeURIComponent(normalizedPathname.slice("/vehiculo/".length)).trim();
}

function getRouteUrl(route, payload = {}) {
  if (route === "vehicleDetail" && payload?.vehicleId) {
    return `/vehiculo/${encodeURIComponent(payload.vehicleId)}`;
  }

  if (route === "search") {
    const params = new URLSearchParams();
    const query = String(payload?.query || "").trim();
    const filters = payload?.filters || {};
    const filterParams = {
      brand: "marca",
      model: "modelo",
      version: "version",
      province: "provincia",
      city: "ciudad",
      priceMin: "precio_min",
      priceMax: "precio_max",
      yearFrom: "year_min",
      yearTo: "year_max",
      kmMin: "km_min",
      kmMax: "km_max",
      vehicleType: "tipo",
      fuel: "combustible",
      transmission: "transmision",
      financing: "financiacion",
      status: "estado",
      dealerRank: "dealer_rank",
      dealer: "dealer",
      hasImages: "fotos",
    };

    if (query) params.set("q", query);

    Object.entries(filterParams).forEach(([key, param]) => {
      const value = String(filters?.[key] || "").trim();
      if (value) params.set(param, value);
    });

    const queryString = params.toString();
    return queryString ? `/buscar?${queryString}` : "/buscar";
  }

  if (route === "compare" && payload?.ids) {
    return `/comparar?ids=${encodeURIComponent(payload.ids)}`;
  }

  return ROUTE_TO_PATH[route] || `/#/${route}`;
}

function getRouteFromHash() {
  const rawHash = window.location.hash.replace(/^#\/?/, "").trim();
  const hashRoute = rawHash.split(/[?#]/)[0].trim();

  if (hashRoute === "reset-password") return "resetPassword";

  return hashRoute;
}

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (THEME_OPTIONS.has(storedTheme)) return storedTheme;

  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}


function getHomeRouteForRole(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "admin";
  if (normalizedRole === "dealer") return "dealer";
  if (normalizedRole === "internal0km") return "internal0km";
  if (normalizedRole === "support") return "support";
  if (normalizedRole === "buyer") return "buyer";

  return "home";
}

function canAccessRoute(route, role, authUser) {
  const normalizedRoute = String(route || "home").trim();
  const normalizedRole = normalizeRole(role);

  if (PUBLIC_ROUTES.has(normalizedRoute)) {
    return true;
  }

  if (!authUser?.id) {
    return normalizedRoute === "home" || normalizedRoute === "login";
  }

  const allowedPrivateRoute = getHomeRouteForRole(normalizedRole);

  return normalizedRoute === allowedPrivateRoute;
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(getInitialRouteFromLocation);
  const [routeParams, setRouteParams] = useState(getInitialRouteParamsFromLocation);
  const [compareItems, setCompareItems] = useState(getInitialCompareItems);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [authProfile, setAuthProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [searchQueryFromHome, setSearchQueryFromHome] = useState("");
  const [compareOpenRequest, setCompareOpenRequest] = useState(0);
  const [appNotice, setAppNotice] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);

  async function loadProfileForUser(user) {
    if (!user?.id) {
      setAuthProfile(null);
      return null;
    }

    const { profile, error } = await getProfileByUserId(user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.warn("No se pudo leer profile:", error.message);
      }
      setAuthError(error.message || "No se pudo leer el perfil.");
      setAuthProfile(null);
      return null;
    }

    const normalizedProfile = {
      ...profile,
      role: normalizeRole(profile?.role),
    };

    setAuthProfile(normalizedProfile);
    setAuthError("");

    // Aplicar tema guardado en el perfil (sincroniza entre dispositivos)
    if (normalizedProfile.theme === "dark" || normalizedProfile.theme === "light") {
      setTheme(normalizedProfile.theme);
    }

    return normalizedProfile;
  }

  function navigate(nextRoute, payload = {}) {
    const safeNextRoute = String(nextRoute || "home").trim();
    const role = authProfile?.role;

    if (safeNextRoute === "search") {
      setSearchQueryFromHome(String(payload?.query || "").trim());
    }

    if (!canAccessRoute(safeNextRoute, role, authUser)) {
      const fallbackRoute = getHomeRouteForRole(role);
      setCurrentRoute(fallbackRoute);
      window.history.replaceState(
        { route: fallbackRoute },
        "",
        getRouteUrl(fallbackRoute)
      );
      return;
    }

    const nextUrl = getRouteUrl(safeNextRoute, payload || {});
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) {
      window.history.pushState({ route: safeNextRoute }, "", nextUrl);
    }
    if (ROUTE_TITLES[safeNextRoute]) {
      document.title = ROUTE_TITLES[safeNextRoute];
    }

    const doUpdate = () => {
      setRouteParams(payload || {});
      setCurrentRoute(safeNextRoute);
    };

    if (document.startViewTransition) {
      document.startViewTransition(() => flushSync(doUpdate));
    } else {
      doUpdate();
    }
  }

  async function refreshAuthProfile(options = {}) {
    if (!authUser?.id) return null;

    const profile = await loadProfileForUser(authUser);

    if (options.redirectByRole && profile?.role) {
      setCurrentRoute(getHomeRouteForRole(profile.role));
    }

    return profile;
  }

  async function handleAuthChange(user, options = {}) {
    setAuthUser(user || null);

    if (!user) {
      setAuthProfile(null);
      setAuthError("");
      setFavoriteItems([]);

      if (options.redirect !== false) {
        setCurrentRoute("home");
      }

      return;
    }

    const [profile, favResult] = await Promise.all([
      loadProfileForUser(user),
      listBuyerFavorites(),
    ]);

    if (normalizeRole(profile?.role) === "buyer") {
      setFavoriteItems(favResult.favorites || []);
    }

    if (options.redirectByRole) {
      setCurrentRoute(getHomeRouteForRole(profile?.role));
    }
  }

  useEffect(() => {
    async function loadSession() {
      setAuthLoading(true);

      const { session } = await getCurrentSession();
      const user = session?.user || null;

      setAuthUser(user);

      if (user) {
        const [profile, favResult] = await Promise.all([
          loadProfileForUser(user),
          listBuyerFavorites(),
        ]);
        if (normalizeRole(profile?.role) === "buyer") {
          setFavoriteItems(favResult.favorites || []);
        }
        if (!["resetPassword", "vehicleDetail"].includes(getInitialRouteFromLocation())) {
          setCurrentRoute(getHomeRouteForRole(profile?.role));
        }
      }

      setAuthLoading(false);
    }

    loadSession();

    // Reaccionar a cambios de sesión en otras pestañas o refrescos de token
    const subscription = subscribeToAuthChanges((event, session) => {
      if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setAuthProfile(null);
        setAuthError("");
        setFavoriteItems([]);
        setCurrentRoute("home");
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setAuthUser(session.user);
      }
    });

    return () => subscription.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!canAccessRoute(currentRoute, authProfile?.role, authUser)) {
      setCurrentRoute(getHomeRouteForRole(authProfile?.role));
    }
  }, [authLoading, authUser, authProfile, currentRoute]);

  useEffect(() => {
    if (!appNotice) return;

    const timeoutId = window.setTimeout(() => {
      setAppNotice(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [appNotice]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareItems));
    } catch {
      // sessionStorage unavailable
    }
  }, [compareItems]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Actualiza title, meta description, canonical y OG tags al cambiar de ruta.
  // "search" y "vehicleDetail" gestionan sus propias metas — se omiten aquí.
  useEffect(() => {
    const ORIGIN    = "https://www.oxnexmov.com.ar";
    const PRIV      = new Set(["buyer", "dealer", "admin", "internal0km", "support"]);
    const SELF_META = new Set(["search", "vehicleDetail"]);

    if (SELF_META.has(currentRoute)) return;

    const title = ROUTE_TITLES[currentRoute];
    const desc  = ROUTE_DESCRIPTIONS[currentRoute];
    const path  = ROUTE_TO_PATH[currentRoute];

    if (title) {
      document.title = title;
      document.querySelector("meta[property='og:title']")?.setAttribute("content", title);
      document.querySelector("meta[name='twitter:title']")?.setAttribute("content", title);
    }

    if (desc) {
      document.querySelector("meta[name='description']")?.setAttribute("content", desc);
      document.querySelector("meta[property='og:description']")?.setAttribute("content", desc);
      document.querySelector("meta[name='twitter:description']")?.setAttribute("content", desc);
    }

    if (!PRIV.has(currentRoute) && path) {
      const url = `${ORIGIN}${path}`;
      const canonEl = document.querySelector("link[rel='canonical']");
      if (canonEl) canonEl.href = url;
      document.querySelector("meta[property='og:url']")?.setAttribute("content", url);
    }
  }, [currentRoute]);

  // Sincronizar con cambios del sistema operativo mientras la app está abierta.
  // Solo aplica si el usuario no fijó una preferencia manualmente (localStorage vacío).
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;

    function handleSystemChange(e) {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!THEME_OPTIONS.has(stored)) {
        setTheme(e.matches ? "light" : "dark");
      }
    }

    mq.addEventListener("change", handleSystemChange);
    return () => mq.removeEventListener("change", handleSystemChange);
  }, []);

  useEffect(() => {
    function onRippleClick(e) {
      const btn = e.target.closest("button, .primary-action, .admin-refresh-btn, .table-action-btn");
      if (!btn || btn.disabled) return;

      const { left, top, width, height } = btn.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      const size = Math.max(width, height) * 2;

      const ripple = document.createElement("span");
      ripple.className = "ox-ripple";
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;

      if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
      btn.style.overflow = "hidden";
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    }

    document.addEventListener("click", onRippleClick);
    return () => document.removeEventListener("click", onRippleClick);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;

    let activeBtn = null;

    function onMouseMove(e) {
      const btn = e.target.closest(".primary-action");

      if (!btn) {
        if (activeBtn) {
          activeBtn.style.transform = "";
          activeBtn = null;
        }
        return;
      }

      activeBtn = btn;
      const { left, top, width, height } = btn.getBoundingClientRect();
      const cx = left + width / 2;
      const cy = top + height / 2;
      const dx = (e.clientX - cx) / width  * 10;
      const dy = (e.clientY - cy) / height * 6;
      btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) translateY(-1px)`;
    }

    function onMouseLeave(e) {
      if (!(e.target instanceof Element)) return;
      const btn = e.target.closest(".primary-action");
      if (btn) {
        btn.style.transform = "";
        activeBtn = null;
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave, true);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave, true);
    };
  }, []);

  useEffect(() => {
    function syncRouteFromLocation() {
      const target = getInitialRouteFromLocation();
      setRouteParams(getInitialRouteParamsFromLocation());
      setCurrentRoute(target);
      if (ROUTE_TITLES[target]) document.title = ROUTE_TITLES[target];
    }

    window.addEventListener("hashchange", syncRouteFromLocation);
    window.addEventListener("popstate", syncRouteFromLocation);

    return () => {
      window.removeEventListener("hashchange", syncRouteFromLocation);
      window.removeEventListener("popstate", syncRouteFromLocation);
    };
  }, []);

  function toggleTheme() {
    setTheme((currentTheme) => {
      const next = currentTheme === "dark" ? "light" : "dark";
      // Sync al perfil si hay sesión (fire-and-forget)
      if (authUser?.id) saveUserTheme(next);
      return next;
    });
  }

  function addToCompare(vehicle) {
    setCompareItems((current) => {
      const alreadyExists = current.some((item) => item.id === vehicle.id);

      if (alreadyExists) {
        setAppNotice({
          scope: "compare",
          tone: "info",
          message: "Ese vehículo ya está en el comparador.",
        });
        return current;
      }

      if (current.length >= 4) {
        setAppNotice({
          scope: "compare",
          tone: "warning",
          message: "Podés comparar hasta 4 vehículos. Quitá uno para sumar otro.",
        });
        return current;
      }

      setAppNotice({
        scope: "compare",
        tone: "success",
          message:
            current.length === 0
            ? "Vehículo agregado. Sumá otro para comparar."
            : "Vehículo agregado al comparador.",
      });

      return [...current, vehicle];
    });
  }

  function removeFromCompare(vehicleId) {
    setCompareItems((current) =>
      current.filter((item) => item.id !== vehicleId)
    );
  }

  function clearCompare() {
    setCompareItems([]);
  }

  function toggleFavorite(vehicle) {
    const alreadyExists = favoriteItems.some((item) => item.id === vehicle.id);

    if (alreadyExists) {
      setFavoriteItems((current) => current.filter((item) => item.id !== vehicle.id));
      if (authUser?.id) removeBuyerFavorite(vehicle.id);
    } else {
      setFavoriteItems((current) => [...current, vehicle]);
      if (authUser?.id) {
        addBuyerFavorite({
          vehicleId: vehicle.id,
          vehicleSnapshot: {
            brand: vehicle.brand || "",
            model: vehicle.model || "",
            version: vehicle.version || "",
            year: vehicle.year || null,
            kilometers: vehicle.kilometers || 0,
            price: vehicle.price || 0,
            city: vehicle.city || "",
            province: vehicle.province || "",
          },
        });
      }
    }
  }

  function removeFavorite(vehicleId) {
    setFavoriteItems((current) => current.filter((item) => item.id !== vehicleId));
    if (authUser?.id) removeBuyerFavorite(vehicleId);
  }

  function isFavorite(vehicleId) {
    return favoriteItems.some((item) => item.id === vehicleId);
  }

  function openCompare() {
    if (compareItems.length < 2) {
      setAppNotice({
        scope: "compare",
        tone: "info",
        message: "Seleccioná al menos 2 vehículos para comparar.",
      });
      return;
    }

    setCompareOpenRequest((current) => current + 1);
  }

  const safeCurrentRoute = useMemo(() => {
    const routeKnown = currentRoute in ROUTES;

    if (!routeKnown) return "notFound";

    if (canAccessRoute(currentRoute, authProfile?.role, authUser)) {
      return currentRoute;
    }

    return getHomeRouteForRole(authProfile?.role);
  }, [currentRoute, authProfile, authUser]);

  useEffect(() => {
    const title = ROUTE_TITLES[safeCurrentRoute] || "oX NEXMOV";
    const description = ROUTE_DESCRIPTIONS[safeCurrentRoute] || "Encontrá tu próximo vehículo en oX NEXMOV. Vendedores verificados con datos reales.";
    const url = window.location.href;

    document.title = title;

    // Analytics: track cada cambio de ruta pública
    trackPageView(safeCurrentRoute, authProfile?.role ?? null);

    function setMetaContent(attr, attrValue, content) {
      let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    setMetaContent("name", "description", description);
    setMetaContent("property", "og:title", title);
    setMetaContent("property", "og:description", description);
    setMetaContent("property", "og:url", url);
    setMetaContent("name", "twitter:title", title);
    setMetaContent("name", "twitter:description", description);

    // Update canonical link
    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url.split("?")[0]);
  }, [safeCurrentRoute, authProfile?.role]);

  const CurrentPage = ROUTES[safeCurrentRoute] || NotFound;

  const appActions = {
    compareItems,
    addToCompare,
    removeFromCompare,
    clearCompare,
    openCompare,
    compareOpenRequest,

    favoriteItems,
    toggleFavorite,
    removeFavorite,
    isFavorite,

    authUser,
    authProfile,
    authLoading,
    authError,

    handleAuthChange,
    refreshAuthProfile,

    setAuthUser,
    setAuthProfile,

    navigate,

    appNotice,
    dismissAppNotice: () => setAppNotice(null),

    theme,
    toggleTheme,
  };

  return (
    <Layout
      currentRoute={safeCurrentRoute}
      onNavigate={navigate}
      appActions={appActions}
    >
      <ErrorBoundary onNavigate={navigate}>
        <Suspense fallback={<div className="route-loading" />}>
          <div key={safeCurrentRoute} className="route-transition">
            <CurrentPage
              onNavigate={navigate}
              appActions={appActions}
              authUser={authUser}
              authProfile={authProfile}
              authLoading={authLoading}
              authError={authError}
              onAuthChange={handleAuthChange}
              initialSearchQuery={safeCurrentRoute === "search" ? searchQueryFromHome : ""}
              currentRoute={safeCurrentRoute}
              routeParams={routeParams}
            />
          </div>
        </Suspense>
      </ErrorBoundary>

      <Suspense fallback={null}>
        <PWAInstallBanner />
        <NotificationOptIn authUser={authUser} />
      </Suspense>
    </Layout>
  );
}
