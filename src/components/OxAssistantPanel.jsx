const PRIORITY_LABELS = { high: "Alta", medium: "Media", low: "Baja" };

export default function OxAssistantPanel({
  title = "Asistente comercial oX",
  subtitle = "Diagnóstico automático para mejorar la publicación.",
  insights,
  compact = false,
  showSuggestions = true,
}) {
  const panelClass = `ox-assistant-panel${compact ? " ox-assistant-panel--compact" : ""}`;

  if (!insights) {
    return (
      <div className={panelClass}>
        <p className="ox-assistant-panel__empty">
          Sin diagnóstico disponible para esta publicación.
        </p>
      </div>
    );
  }

  const {
    score,
    label,
    chipClass,
    summary,
    alerts = [],
    nextBestActions = [],
    suggestions = [],
  } = insights;

  const visibleAlerts = alerts.slice(0, 3);
  const nextBestFields = new Set(nextBestActions.map((a) => a.field));
  const visibleSuggestions = showSuggestions
    ? suggestions.filter((s) => !nextBestFields.has(s.field)).slice(0, 4)
    : [];

  return (
    <div className={panelClass}>
      <div className="ox-assistant-panel__header">
        <div className="ox-assistant-panel__header-meta">
          <span className="ox-assistant-panel__eyebrow">oX IA</span>
          <div className="ox-assistant-panel__header-title">
            <h3>{title}</h3>
            {subtitle && !compact && <p>{subtitle}</p>}
          </div>
        </div>
        <div className="ox-assistant-panel__score">
          <span className="ox-assistant-panel__score-number">
            {score}<span>/100</span>
          </span>
          <span className={`ox-assistant-panel__badge ox-assistant-panel__badge--${chipClass}`}>
            {label}
          </span>
        </div>
      </div>

      {summary && <p className="ox-assistant-panel__summary">{summary}</p>}

      <div className="ox-assistant-panel__alerts">
        <p className="ox-assistant-panel__section-label">Alertas</p>
        {visibleAlerts.length === 0 ? (
          <p className="ox-assistant-panel__alerts-empty">
            No se detectan alertas críticas en esta publicación.
          </p>
        ) : (
          <ul>
            {visibleAlerts.map((alert, i) => (
              <li
                key={i}
                className={`ox-assistant-panel__alert ox-assistant-panel__alert--${alert.type}`}
              >
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {nextBestActions.length > 0 && (
        <div className="ox-assistant-panel__actions">
          <p className="ox-assistant-panel__section-label">Próximas mejoras</p>
          <ul>
            {nextBestActions.map((action, i) => (
              <li key={i} className="ox-assistant-panel__action-item">
                <div className="ox-assistant-panel__action-head">
                  <strong>{action.title}</strong>
                  <span
                    className={`ox-assistant-panel__badge ox-assistant-panel__badge--priority-${action.priority}`}
                  >
                    {PRIORITY_LABELS[action.priority] ?? action.priority}
                  </span>
                </div>
                <p>{action.text}</p>
                {action.actionLabel && (
                  <span className="ox-assistant-panel__action-label">
                    {action.actionLabel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showSuggestions && visibleSuggestions.length > 0 && (
        <div className="ox-assistant-panel__suggestions">
          <p className="ox-assistant-panel__section-label">Más sugerencias</p>
          <ul>
            {visibleSuggestions.map((s, i) => (
              <li key={i} className="ox-assistant-panel__suggestion-item">
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
