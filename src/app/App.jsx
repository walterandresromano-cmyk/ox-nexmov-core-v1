import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import Layout from "../components/Layout.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
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
const AuthPanel        = lazy(() => import("../modules/auth/AuthPanel.jsx"));
const BuyerPanel       = lazy(() => import("../modules/buyer/BuyerPanel.jsx"));
const DealerPanel      = lazy(() => import("../modules/dealer/DealerPanel.jsx"));
const AdminPanel       = lazy(() => import("../modules/admin/AdminPanel.jsx"));
const Internal0kmPanel = lazy(() => import("../modules/internal0km/Internal0kmPanel.jsx"));
const SupportPanel     = lazy(() => import("../modules/support/SupportPanel.jsx"));

import { getCurrentSession } from "../services/auth.service.js";
import { getProfileByUserId } from "../services/profiles.service.js";
import { normalizeRole } from "../lib/auth.js";
import {
  listBuyerFavorites,
  addBuyerFavorite,
  removeBuyerFavorite,
} from "../services/buyerFavorites.service.js";

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
  buyer: BuyerPanel,
  dealer: DealerPanel,
  admin: AdminPanel,
  internal0km: Internal0kmPanel,
  support: SupportPanel,
  dealerProfile: DealerProfile,
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
  "dealerProfile",
]);

const ROUTE_TITLES = {
  home: "oX NEXMOV — Marketplace de vehículos verificados",
  search: "Buscar vehículos — oX NEXMOV",
  zeroKm: "Financiación 0km — oX NEXMOV",
  sellVehicle: "Garage oX — oX NEXMOV",
  joinNetwork: "Sumate a la red de dealers — oX NEXMOV",
  about: "Quiénes somos — oX NEXMOV",
  faq: "Preguntas frecuentes — oX NEXMOV",
  terms: "Términos y condiciones — oX NEXMOV",
  privacy: "Política de privacidad — oX NEXMOV",
  cookies: "Política de cookies — oX NEXMOV",
  consumerDefense: "Defensa del consumidor — oX NEXMOV",
  regret: "Botón de arrepentimiento — oX NEXMOV",
  serviceCancel: "Cancelación del servicio — oX NEXMOV",
  login: "Ingresar — oX NEXMOV",
  buyer: "Mi panel — oX NEXMOV",
  dealer: "Panel dealer — oX NEXMOV",
  admin: "Panel admin — oX NEXMOV",
  internal0km: "Panel 0km — oX NEXMOV",
  support: "Panel soporte — oX NEXMOV",
  dealerProfile: "Dealer — oX NEXMOV",
};

const ROUTE_DESCRIPTIONS = {
  home: "Encontrá tu próximo vehículo en oX NEXMOV. Publicaciones de dealers verificados con datos reales, comparador y consultas trazables.",
  search: "Buscá vehículos por marca, modelo, precio, kilómetros, financiación y ubicación. Dealers verificados en Argentina.",
  zeroKm: "Financiación 0km con entrega inmediata. Explorá opciones de cuotas y condiciones antes de contactar al dealer.",
  sellVehicle: "Garage oX organiza tus vehículos, servicios, vencimientos y el camino para una futura reventa dentro de oX NEXMOV.",
  joinNetwork: "Sumá tu agencia a oX NEXMOV. Publicaciones premium, leads trazables y herramientas comerciales para dealers verificados.",
  about: "Conocé quiénes somos y por qué construimos oX NEXMOV como un marketplace de vehículos verificados en Argentina.",
  faq: "Preguntas frecuentes sobre oX NEXMOV: cómo funciona, cómo publicar, cómo contactar dealers y cómo comparar vehículos.",
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
  const [currentRoute, setCurrentRoute] = useState("home");
  const [routeParams, setRouteParams] = useState({});
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

    return normalizedProfile;
  }

  function navigate(nextRoute, payload = {}) {
    const safeNextRoute = String(nextRoute || "home").trim();
    const role = authProfile?.role;

    if (safeNextRoute === "search") {
      setSearchQueryFromHome(String(payload?.query || "").trim());
    }

    if (!canAccessRoute(safeNextRoute, role, authUser)) {
      setCurrentRoute(getHomeRouteForRole(role));
      return;
    }

    setRouteParams(payload || {});
    setCurrentRoute(safeNextRoute);
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

    const [profile] = await Promise.all([
      loadProfileForUser(user),
      listBuyerFavorites().then(({ favorites }) => setFavoriteItems(favorites)),
    ]);

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
        const [profile] = await Promise.all([
          loadProfileForUser(user),
          listBuyerFavorites().then(({ favorites }) => setFavoriteItems(favorites)),
        ]);
        setCurrentRoute(getHomeRouteForRole(profile?.role));
      }

      setAuthLoading(false);
    }

    loadSession();
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

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
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
    const description = ROUTE_DESCRIPTIONS[safeCurrentRoute] || "Encontrá tu próximo vehículo en oX NEXMOV. Publicaciones de dealers verificados con datos reales.";
    const url = window.location.origin;

    document.title = title;

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
  }, [safeCurrentRoute]);

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
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
