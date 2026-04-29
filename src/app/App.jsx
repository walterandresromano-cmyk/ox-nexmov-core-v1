import { useEffect, useMemo, useState } from "react";

import Layout from "../components/Layout.jsx";
import Home from "../modules/public/Home.jsx";
import Search from "../modules/public/Search.jsx";
import ZeroKm from "../modules/public/ZeroKm.jsx";
import SellVehicle from "../modules/public/SellVehicle.jsx";
import JoinNetwork from "../modules/public/JoinNetwork.jsx";
import About from "../modules/public/About.jsx";
import FAQ from "../modules/public/FAQ.jsx";
import AuthPanel from "../modules/auth/AuthPanel.jsx";
import BuyerPanel from "../modules/buyer/BuyerPanel.jsx";
import DealerPanel from "../modules/dealer/DealerPanel.jsx";
import AdminPanel from "../modules/admin/AdminPanel.jsx";
import Internal0kmPanel from "../modules/internal0km/Internal0kmPanel.jsx";
import SupportPanel from "../modules/support/SupportPanel.jsx";

import { getCurrentSession } from "../services/auth.service.js";
import { getProfileByUserId } from "../services/profiles.service.js";

const ROUTES = {
  home: Home,
  search: Search,
  zeroKm: ZeroKm,
  sellVehicle: SellVehicle,
  joinNetwork: JoinNetwork,
  about: About,
  faq: FAQ,
  login: AuthPanel,
  buyer: BuyerPanel,
  dealer: DealerPanel,
  admin: AdminPanel,
  internal0km: Internal0kmPanel,
  support: SupportPanel,
};

const PUBLIC_ROUTES = new Set([
  "home",
  "search",
  "zeroKm",
  "sellVehicle",
  "joinNetwork",
  "about",
  "faq",
  "login",
]);

function normalizeRole(role) {
  const value = String(role || "buyer").trim().toLowerCase();

  if (value === "comprador") return "buyer";
  if (value === "soporte") return "support";
  if (value === "internal_0km") return "internal0km";

  return value;
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
  const [compareItems, setCompareItems] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [authProfile, setAuthProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [searchQueryFromHome, setSearchQueryFromHome] = useState("");

  async function loadProfileForUser(user) {
    if (!user?.id) {
      setAuthProfile(null);
      return null;
    }

    const { profile, error } = await getProfileByUserId(user.id);

    if (error) {
      console.warn("No se pudo leer profile:", error.message);
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

      if (options.redirect !== false) {
        setCurrentRoute("home");
      }

      return;
    }

    const profile = await loadProfileForUser(user);

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
        const profile = await loadProfileForUser(user);
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

  function addToCompare(vehicle) {
    setCompareItems((current) => {
      const alreadyExists = current.some((item) => item.id === vehicle.id);

      if (alreadyExists) return current;

      if (current.length >= 4) {
        alert("Podés comparar hasta 4 vehículos. Quitá uno para sumar otro.");
        return current;
      }

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
    setFavoriteItems((current) => {
      const alreadyExists = current.some((item) => item.id === vehicle.id);

      if (alreadyExists) {
        return current.filter((item) => item.id !== vehicle.id);
      }

      return [...current, vehicle];
    });
  }

  function removeFavorite(vehicleId) {
    setFavoriteItems((current) =>
      current.filter((item) => item.id !== vehicleId)
    );
  }

  function isFavorite(vehicleId) {
    return favoriteItems.some((item) => item.id === vehicleId);
  }

  const safeCurrentRoute = useMemo(() => {
    if (canAccessRoute(currentRoute, authProfile?.role, authUser)) {
      return currentRoute;
    }

    return getHomeRouteForRole(authProfile?.role);
  }, [currentRoute, authProfile, authUser]);

  const CurrentPage = ROUTES[safeCurrentRoute] || Home;

  const appActions = {
    compareItems,
    addToCompare,
    removeFromCompare,
    clearCompare,

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
  };

  return (
    <Layout
      currentRoute={safeCurrentRoute}
      onNavigate={navigate}
      appActions={appActions}
    >
      <CurrentPage
        onNavigate={navigate}
        appActions={appActions}
        authUser={authUser}
        authProfile={authProfile}
        authLoading={authLoading}
        authError={authError}
        onAuthChange={handleAuthChange}
        initialSearchQuery={safeCurrentRoute === "search" ? searchQueryFromHome : ""}
      />
    </Layout>
  );
}