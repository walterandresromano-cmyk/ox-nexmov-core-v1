import { useEffect, useState } from "react";
import { listPublicActiveDealers } from "../../services/dealers.service.js";

function getPlanLabel(plan) {
  if (plan === "platinum") return "Platinum";
  if (plan === "elite") return "Elite";
  if (plan === "pro") return "Pro";
  return "Inicio";
}

export default function Home({ onNavigate }) {
  const [publicDealers, setPublicDealers] = useState([]);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [dealersError, setDealersError] = useState("");

  useEffect(() => {
    async function loadPublicDealers() {
      setLoadingDealers(true);
      setDealersError("");

      const { dealers, error } = await listPublicActiveDealers();

      if (error) {
        setPublicDealers([]);
        setDealersError(
          error.message || "No se pudieron cargar los dealers activos."
        );
        setLoadingDealers(false);
        return;
      }

      setPublicDealers(dealers || []);
      setLoadingDealers(false);
    }

    loadPublicDealers();
  }, []);

  return (
    <section className="page-section">
      <div className="container panel public-page-panel">
        <div className="hero-panel">
          <p className="eyebrow">Red automotriz inteligente</p>

          <h1>
            Claridad en cada <span>decisión.</span>
          </h1>

          <p className="lead">
            Buscá, compará y consultá vehículos reales de dealers verificados,
            con señales comerciales y contexto de mercado.
          </p>

          <div className="hero-search">
            <input placeholder="Ej: SUV financiada hasta 20 millones" />
            <button onClick={() => onNavigate("search")}>Buscar</button>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Red activa</p>
              <h2>Dealers que trabajan con oX NEXMOV.</h2>
              <p>
                Agencias y concesionarias activas dentro de la red, con identidad
                institucional, publicaciones reales y operación trazable.
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => onNavigate("join")}
            >
              Sumate a la red
            </button>
          </div>

          {loadingDealers && (
            <div className="auth-message">Cargando dealers activos...</div>
          )}

          {dealersError && <div className="auth-warning">{dealersError}</div>}

          {!loadingDealers && !dealersError && publicDealers.length === 0 && (
            <div className="empty-state">
              Próximamente mostraremos aquí los dealers activos de la red con su
              imagen institucional.
            </div>
          )}

          {publicDealers.length > 0 && (
            <div className="dealer-modules-grid">
              {publicDealers.slice(0, 8).map((dealer) => (
                <article
                  key={dealer.id}
                  className={`dealer-module-card rank-${dealer.plan || "inicio"}`}
                >
                  {dealer.logo ? (
                    <img
                      src={dealer.logo}
                      alt={`Imagen institucional de ${dealer.commercialName}`}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "16px",
                        border: "1px solid var(--ox-border)",
                        background: "var(--ox-card-2)",
                        marginBottom: "14px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "120px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "16px",
                        border: "1px solid var(--ox-border)",
                        background: "var(--ox-card-2)",
                        color: "var(--ox-muted)",
                        marginBottom: "14px",
                        textAlign: "center",
                        padding: "12px",
                      }}
                    >
                      Dealer activo
                    </div>
                  )}

                  <h3>{dealer.commercialName}</h3>

                  <p>
                    {dealer.city || "Ciudad no informada"}
                    {dealer.province ? `, ${dealer.province}` : ""}
                  </p>

                  <div className="admin-benefits-list">
                    <span>{getPlanLabel(dealer.plan)}</span>
                    <span>
                      {dealer.activeVehiclesCount}{" "}
                      {dealer.activeVehiclesCount === 1
                        ? "vehículo activo"
                        : "vehículos activos"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Cómo avanzar</p>
              <h2>Explorá, compará y consultá con trazabilidad.</h2>
              <p>
                La plataforma ordena la búsqueda para que puedas evaluar opciones,
                comparar vehículos y contactar dealers identificados con más
                claridad.
              </p>
            </div>
          </div>

          <div className="dealer-modules-grid">
            <article className="dealer-module-card">
              <h3>Buscar con criterio</h3>
              <p>
                Filtrá vehículos reales por marca, modelo, precio, ubicación,
                financiación y señales comerciales.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Comparar opciones</h3>
              <p>
                Revisá unidades lado a lado para entender diferencias de precio,
                año, kilometraje y propuesta comercial.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Consultar con registro</h3>
              <p>
                Al contactar, la consulta queda trazada para mejorar el seguimiento
                y evitar contactos anónimos.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Vender tu vehículo</h3>
              <p>
                También podés cargar tu intención de venta para que la plataforma
                revise oportunidades con dealers habilitados.
              </p>
            </article>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Cierre comercial</p>
              <h2>Encontrá una opción con mejor lectura.</h2>
              <p>
                oX NEXMOV no busca sumar ruido: busca ordenar datos, dealers,
                publicaciones y oportunidades para que cada decisión tenga más
                contexto.
              </p>
            </div>

            <div className="admin-action-row">
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => onNavigate("search")}
              >
                Explorar vehículos
              </button>

              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => onNavigate("zeroKm")}
              >
                Evaluar financiación
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}