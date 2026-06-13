import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getSiteAnalytics } from "../../services/siteAnalytics.service.js";

const PERIODS = [
  { label: "7 días",  days: 7  },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
];

const COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fb923c", "#f472b6", "#a78bfa", "#facc15", "#94a3b8"];

function detectDevice(ua = "") {
  if (!ua) return "desconocido";
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return "móvil";
  if (/tablet/i.test(ua)) return "tablet";
  return "escritorio";
}

function fmtDate(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function fmtARS(n) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function KpiCard({ label, value, sub }) {
  return (
    <article className="analytics-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <p>{sub}</p>}
    </article>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <p className="analytics-tooltip__label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function AdminAnalytics({ onBack, vehicles = [] }) {
  const [days, setDays]   = useState(30);
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSiteAnalytics({ days }).then(({ data }) => {
      setRows(data || []);
      setLoading(false);
    });
  }, [days]);

  const stats = useMemo(() => {
    if (!rows.length) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRows = rows.filter((r) => new Date(r.visited_at) >= today);

    const totalVisits        = rows.length;
    const uniqueVisitors     = new Set(rows.map((r) => r.visitor_id).filter(Boolean)).size;
    const uniqueSessions     = new Set(rows.map((r) => r.session_id).filter(Boolean)).size;
    const avgPagesPerVisitor = uniqueVisitors ? (totalVisits / uniqueVisitors).toFixed(1) : 0;

    // Tendencia diaria
    const byDay = {};
    for (const r of rows) {
      const day = r.visited_at.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }
    const dailyTrend = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, visitas]) => ({ date: fmtDate(date), visitas }));

    // Top páginas
    const pageCount = {};
    for (const r of rows) {
      const key = r.page || "unknown";
      pageCount[key] = (pageCount[key] || 0) + 1;
    }
    const topPages = Object.entries(pageCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([page, visitas]) => ({ page, visitas }));

    // Fuentes UTM
    const srcCount = {};
    for (const r of rows) {
      const src = r.utm_source || "orgánico";
      srcCount[src] = (srcCount[src] || 0) + 1;
    }
    const sources = Object.entries(srcCount)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    // Dispositivos
    const devCount = {};
    for (const r of rows) {
      const dev = detectDevice(r.user_agent);
      devCount[dev] = (devCount[dev] || 0) + 1;
    }
    const devices = Object.entries(devCount)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    return { totalVisits, uniqueVisitors, uniqueSessions, avgPagesPerVisitor, dailyTrend, topPages, sources, devices, todayVisits: todayRows.length };
  }, [rows]);

  // Top publicaciones por vistas (de adminVehicles, sin filtro de período)
  const topVehicles = useMemo(() =>
    [...vehicles]
      .filter((v) => Number(v.views ?? 0) > 0)
      .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
      .slice(0, 10),
    [vehicles]
  );

  return (
    <div className="analytics-panel">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <button type="button" className="admin-back-btn" onClick={onBack}>← Volver</button>
          <h2>Analytics</h2>
          <p>Tráfico de páginas públicas · sin rutas privadas ni localhost</p>
        </div>
        <div className="analytics-period-selector">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              className={`analytics-period-btn${days === p.days ? " is-active" : ""}`}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="analytics-loading">Cargando datos…</div>}

      {!loading && !stats && (
        <div className="analytics-empty">Sin datos en el período seleccionado.</div>
      )}

      {!loading && stats && (
        <>
          {/* KPIs */}
          <div className="analytics-kpi-grid">
            <KpiCard label="Visitas totales"       value={stats.totalVisits.toLocaleString("es-AR")}    sub={`${stats.todayVisits} hoy`} />
            <KpiCard label="Visitantes únicos"     value={stats.uniqueVisitors.toLocaleString("es-AR")} />
            <KpiCard label="Sesiones"              value={stats.uniqueSessions.toLocaleString("es-AR")} />
            <KpiCard label="Páginas por visitante" value={stats.avgPagesPerVisitor} />
          </div>

          {/* Tendencia diaria */}
          <section className="analytics-chart-card analytics-chart-card--wide">
            <h3>Visitas por día</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.dailyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="visitas" name="Visitas" stroke="#38bdf8" fill="url(#areaGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* Top páginas + Fuentes + Dispositivos */}
          <div className="analytics-charts-row">
            <section className="analytics-chart-card">
              <h3>Top páginas</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topPages} layout="vertical" margin={{ top: 0, right: 12, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="page" tick={{ fontSize: 11, fill: "#94a3b8" }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="visitas" name="Visitas" radius={[0, 4, 4, 0]}>
                    {stats.topPages.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="analytics-chart-card">
              <h3>Fuentes de tráfico</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.sources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {stats.sources.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            </section>

            <section className="analytics-chart-card">
              <h3>Dispositivos</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.devices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {stats.devices.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            </section>
          </div>
        </>
      )}

      {/* Publicaciones más vistas — independiente del período */}
      {topVehicles.length > 0 && (
        <section className="analytics-chart-card analytics-chart-card--wide">
          <h3>Publicaciones más vistas <span className="analytics-chart-subtitle">· acumulado total</span></h3>
          <div className="analytics-vehicles-table">
            <div className="analytics-vehicles-header">
              <span>#</span>
              <span>Vehículo</span>
              <span>Dealer</span>
              <span>Precio</span>
              <span>Vistas</span>
            </div>
            {topVehicles.map((v, i) => (
              <div key={v.id} className="analytics-vehicles-row">
                <span className="analytics-vehicles-rank">{i + 1}</span>
                <span className="analytics-vehicles-name">
                  {v.brand} {v.model}
                  {v.year && <em> {v.year}</em>}
                </span>
                <span className="analytics-vehicles-dealer">{v.dealer_name || "—"}</span>
                <span className="analytics-vehicles-price">{v.price ? fmtARS(v.price) : "—"}</span>
                <span className="analytics-vehicles-views">
                  <strong>{Number(v.views).toLocaleString("es-AR")}</strong>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
