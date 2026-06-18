/**
 * Skeleton de carga que replica la estructura visual exacta de VehicleCardPublic.
 * Prop `compact` → versión reducida para el carrusel de Home (imagen más chica, sin facts ni botones).
 * Prop `index`   → genera un stagger de animación entre cards adyacentes.
 */
export default function VehicleCardSkeleton({ compact = false, index = 0 }) {
  const delay = `${(index % 4) * 0.18}s`;

  return (
    <div
      className={`vehicle-card-skeleton${compact ? " vehicle-card-skeleton--compact" : ""}`}
      style={{ "--sk-delay": delay }}
      aria-hidden="true"
    >
      {/* ── Media ── */}
      <div className="vehicle-card-skeleton__media">
        {!compact && (
          <div className="vehicle-card-skeleton__topbar">
            <div className="vehicle-card-skeleton__pill vehicle-card-skeleton__pill--rank ox-shimmer" />
            <div className="vehicle-card-skeleton__pill vehicle-card-skeleton__pill--year ox-shimmer" />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="vehicle-card-skeleton__body">
        <div className="vehicle-card-skeleton__identity">
          <div className="vehicle-card-skeleton__sk-title ox-shimmer" />
          <div className="vehicle-card-skeleton__sk-version ox-shimmer" />
        </div>

        {!compact && (
          <div className="vehicle-card-skeleton__facts">
            <div className="vehicle-card-skeleton__fact ox-shimmer" />
            <div className="vehicle-card-skeleton__fact ox-shimmer" />
          </div>
        )}

        <div className="vehicle-card-skeleton__price-box">
          <div className="vehicle-card-skeleton__price-copy">
            <div className="vehicle-card-skeleton__sk-label ox-shimmer" />
            <div className="vehicle-card-skeleton__sk-price ox-shimmer" />
          </div>
          {!compact && (
            <div className="vehicle-card-skeleton__price-icon ox-shimmer" />
          )}
        </div>

        {!compact && (
          <>
            <div className="vehicle-card-skeleton__actions">
              <div className="vehicle-card-skeleton__sk-btn ox-shimmer" />
              <div className="vehicle-card-skeleton__sk-btn-icon ox-shimmer" />
              <div className="vehicle-card-skeleton__sk-btn-icon ox-shimmer" />
            </div>
            <div className="vehicle-card-skeleton__sk-contact ox-shimmer" />
          </>
        )}
      </div>
    </div>
  );
}
