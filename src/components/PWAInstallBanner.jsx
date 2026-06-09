import { usePWAInstall } from "../hooks/usePWAInstall.js";

// Safari share icon — reproduced inline to avoid any icon dependency
function SafariShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function AddToHomeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M17 14v6M14 17h6" />
    </svg>
  );
}

export default function PWAInstallBanner() {
  const { isInstallable, isIOS, install, dismiss } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <div className="pwa-install-banner" role="banner" aria-label="Instalar aplicación">
      <div className="pwa-install-banner__icon">
        <img src="/icons/pwa-192x192.png" alt="oX NEXMOV" width="44" height="44" />
      </div>

      <div className="pwa-install-banner__body">
        <strong className="pwa-install-banner__title">Instalá oX NEXMOV</strong>

        {isIOS ? (
          <p className="pwa-install-banner__desc">
            Tocá <SafariShareIcon /> y luego{" "}
            <span className="pwa-install-banner__hl">
              &ldquo;Agregar a pantalla de inicio&rdquo;
            </span>
          </p>
        ) : (
          <p className="pwa-install-banner__desc">
            Accedé más rápido, sin internet y con alertas de nuevos vehículos.
          </p>
        )}
      </div>

      {!isIOS && (
        <button className="pwa-install-banner__cta" onClick={install}>
          <AddToHomeIcon />
          Instalar
        </button>
      )}

      <button
        className="pwa-install-banner__close"
        onClick={dismiss}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
