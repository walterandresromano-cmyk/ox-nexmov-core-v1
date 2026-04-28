export default function About() {
  return (
    <section className="page-section">
        <div className="container panel public-page-panel">  
        <div className="hero-panel">
          <p className="eyebrow">Quiénes somos</p>

          <h1>Una red automotriz inteligente para comprar y vender con más claridad.</h1>

          <p>
            oX NEXMOV nace para ordenar la experiencia de búsqueda, comparación y
            contacto dentro del mercado automotor. Nuestro objetivo es que el
            comprador pueda decidir mejor y que los dealers serios tengan una
            herramienta más justa para mostrar su propuesta.
          </p>
        </div>

        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <span>Comprador primero</span>
            <strong>Claridad</strong>
            <p>
              La plataforma prioriza información útil, comparación real y contacto
              trazable antes que publicidad invasiva o publicaciones confusas.
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Dealers verificados</span>
            <strong>Red</strong>
            <p>
              Trabajamos con agencias, concesionarias y vendedores profesionales
              que buscan operar con datos, orden y responsabilidad comercial.
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Datos para decidir</span>
            <strong>Contexto</strong>
            <p>
              El vehículo no se muestra aislado: se acompaña con señales,
              comparación, referencias y herramientas para entender mejor cada
              oportunidad.
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Operación trazable</span>
            <strong>Confianza</strong>
            <p>
              Las consultas, leads, solicitudes y contactos comerciales quedan
              ordenados para reducir pérdidas de información y mejorar el
              seguimiento.
            </p>
          </article>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Nuestra mirada</p>
              <h2>No queremos sumar ruido. Queremos ordenar la decisión.</h2>
              <p>
                Comprar un vehículo implica comparar precios, estado, financiación,
                ubicación, confianza del vendedor y oportunidad real. oX NEXMOV
                busca reunir esos elementos en una experiencia clara, moderna y
                pensada para que cada paso tenga sentido.
              </p>
            </div>
          </div>

          <div className="dealer-modules-grid">
            <article className="dealer-module-card">
              <h3>Búsqueda simple</h3>
              <p>
                El comprador puede explorar, filtrar, comparar y consultar sin
                perderse entre información innecesaria.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Comparación real</h3>
              <p>
                La plataforma permite evaluar vehículos lado a lado para entender
                diferencias de precio, año, kilometraje y propuesta comercial.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Contactos cuidados</h3>
              <p>
                El contacto comercial se registra para mejorar la trazabilidad y
                evitar consultas anónimas o desordenadas.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Red profesional</h3>
              <p>
                El dealer cuenta con panel, cupos, leads, tickets y herramientas
                para gestionar su operación dentro de la red.
              </p>
            </article>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Qué nos diferencia</p>
              <h2>Una plataforma construida alrededor de la confianza.</h2>
              <p>
                La diferencia no está solo en publicar vehículos. Está en ordenar
                la relación entre quien busca, quien vende y la información que
                permite tomar una buena decisión.
              </p>
            </div>
          </div>

          <div className="admin-benefits-list">
            <span>Vehículos reales</span>
            <span>Dealers identificados</span>
            <span>Leads trazables</span>
            <span>Comparador integrado</span>
            <span>Financiación 0km</span>
            <span>Solicitudes de venta</span>
            <span>Paneles operativos</span>
            <span>Soporte interno</span>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Quiénes trabajan con nosotros</p>
              <h2>Una red de dealers que iremos mostrando con identidad propia.</h2>
              <p>
                Este espacio estará destinado a presentar agencias, concesionarias y
                vendedores profesionales activos dentro de oX NEXMOV. Cada dealer
                podrá contar con su imagen institucional, ubicación y presencia
                dentro de la red.
              </p>
            </div>
          </div>

          <div className="admin-kpi-grid">
            <article className="admin-kpi-card">
              <span>Próxima integración</span>
              <strong>Imagen</strong>
              <p>
                El admin podrá cargar la imagen institucional del dealer y esa
                identidad se verá en su panel y en futuras secciones públicas.
              </p>
            </article>

            <article className="admin-kpi-card">
              <span>Perfil dealer</span>
              <strong>Datos</strong>
              <p>
                La red podrá mostrar nombre comercial, zona de atención, plan,
                estado operativo e información institucional relevante.
              </p>
            </article>

            <article className="admin-kpi-card">
              <span>Red activa</span>
              <strong>Confianza</strong>
              <p>
                Mostrar quiénes forman parte de la red ayuda a construir respaldo,
                transparencia y presencia comercial.
              </p>
            </article>

            <article className="admin-kpi-card">
              <span>Crecimiento</span>
              <strong>Escala</strong>
              <p>
                A medida que se incorporen dealers reales, esta sección podrá
                transformarse en una vidriera institucional de la red.
              </p>
            </article>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Nuestra promesa</p>
              <h2>Comprar mejor. Vender mejor. Decidir con más información.</h2>
              <p>
                oX NEXMOV busca convertirse en una nueva forma de trabajar en el
                rubro automotriz: más clara para el comprador, más ordenada para el
                dealer y más inteligente para toda la red.
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => {
                window.location.hash = "#/buscar";
              }}
            >
              Explorar vehículos
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}