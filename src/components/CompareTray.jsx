export default function CompareTray({ appActions, onNavigate }) {
  const { compareItems, removeFromCompare, clearCompare } = appActions;

  if (!compareItems.length) return null;

  return (
    <aside className="compare-tray">
      <div className="compare-tray-head">
        <div>
          <strong>Comparador</strong>
          <span>{compareItems.length} / 4 vehículos</span>
        </div>

        <button onClick={clearCompare}>Limpiar</button>
      </div>

      <div className="compare-tray-list">
        {compareItems.map((vehicle) => (
          <div className="compare-tray-item" key={vehicle.id}>
            <span>
              {vehicle.brand} {vehicle.model}
            </span>

            <button onClick={() => removeFromCompare(vehicle.id)}>×</button>
          </div>
        ))}
      </div>

      {compareItems.length >= 2 && (
        <button
          className="compare-open-btn"
          onClick={() => onNavigate("buyer")}
        >
          Ver comparación
        </button>
      )}
    </aside>
  );
}