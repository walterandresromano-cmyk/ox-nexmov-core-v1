export default function JoinNetwork() {
  return (
    <section className="page-section">
      <div className="container panel">
        <div className="hero-panel">
          <p className="eyebrow">Red comercial oX NEXMOV</p>

          <h1>Sumate a una red pensada para dealers que quieren competir mejor.</h1>

          <p>
            oX NEXMOV conecta agencias, concesionarias y vendedores profesionales
            con compradores que buscan vehículos reales, información clara y una
            experiencia de compra más ordenada.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#/ingresar";
              }}
            >
              Iniciar contacto
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                window.location.hash = "#/buscar";
              }}
            >
              Ver publicaciones
            </button>
          </div>
        </div>

        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <span>Más visibilidad útil</span>
            <strong>Red</strong>
            <p>
              Tus vehículos se muestran dentro de una experiencia pensada para que
              el comprador compare, consulte y avance con más confianza.
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Leads trazables</span>
            <strong>Control</strong>
            <p>
              Cada consulta queda registrada dentro de la plataforma para mejorar
              el seguimiento comercial y evitar contactos perdidos.
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Planes por escala</span>
            <strong>Cupos</strong>
            <p>
              Cada dealer trabaja con un plan acorde a su volumen, con cupos,
              beneficios y herramientas habilitadas según su operación.
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Comprador primero</span>
            <strong>Confianza</strong>
            <p>
              La plataforma prioriza claridad, comparación y datos útiles. Eso
              mejora la experiencia del comprador y fortalece al dealer serio.
            </p>
          </article>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Cómo funciona</p>
              <h2>Un alta simple, con control comercial desde administración.</h2>
              <p>
                El dealer se incorpora a la red, se le asigna un plan, se activa su
                período comercial y desde su panel puede cargar vehículos, recibir
                leads, responder consultas y gestionar oportunidades.
              </p>
            </div>
          </div>

          <div className="dealer-modules-grid">
            <article className="dealer-module-card">
              <h3>1. Alta del dealer</h3>
              <p>
                Administración registra los datos comerciales principales, asigna
                el plan y deja preparada la cuenta de acceso.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>2. Activación del plan</h3>
              <p>
                El dealer queda operativo durante su período vigente. Si el plan
                vence, las publicaciones se pausan hasta renovar.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>3. Carga de vehículos</h3>
              <p>
                Cada publicación debe completar datos mínimos, precio coherente,
                fotos e información comercial clara.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>4. Gestión de oportunidades</h3>
              <p>
                Los leads, consultas, tickets y oportunidades quedan centralizados
                para que el dealer pueda trabajar con orden.
              </p>
            </article>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Planes comerciales</p>
              <h2>Un esquema pensado para distintas escalas de operación.</h2>
              <p>
                La diferencia entre planes no busca confundir al comprador: permite
                que cada dealer acceda a más herramientas, señales, métricas y
                capacidad operativa según su nivel de participación.
              </p>
            </div>
          </div>

          <div className="admin-kpi-grid">
            <article className="admin-kpi-card">
              <span>Plan Inicio</span>
              <strong>10</strong>
              <p>
                Hasta 10 publicaciones por período. Ideal para comenzar a operar
                dentro de la red con presencia controlada.
              </p>
            </article>

            <article className="admin-kpi-card">
              <span>Plan Pro</span>
              <strong>30</strong>
              <p>
                Mayor cupo, más herramientas comerciales y acceso ampliado a
                oportunidades según criterio operativo.
              </p>
            </article>

            <article className="admin-kpi-card">
              <span>Plan Elite</span>
              <strong>50</strong>
              <p>
                Pensado para dealers con mayor volumen, mejores señales comerciales
                y lectura más avanzada de operación.
              </p>
            </article>

            <article className="admin-kpi-card">
              <span>Plan Platinum</span>
              <strong>Ilimitado</strong>
              <p>
                Publicaciones ilimitadas y máximo nivel de herramientas dentro de
                la red oX NEXMOV.
              </p>
            </article>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Para quién es</p>
              <h2>Para dealers que quieren vender con más claridad y menos ruido.</h2>
              <p>
                oX NEXMOV está pensado para agencias, concesionarias y vendedores
                profesionales que necesitan una presencia digital más ordenada,
                trazabilidad de consultas y una plataforma que acompañe la decisión
                del comprador sin saturarlo de publicidad.
              </p>
            </div>
          </div>

          <div className="admin-benefits-list">
            <span>Agencias multimarca</span>
            <span>Concesionarias</span>
            <span>Vendedores profesionales</span>
            <span>Operaciones con financiación</span>
            <span>Dealers con stock real</span>
            <span>Equipos comerciales en crecimiento</span>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Próximo paso</p>
              <h2>Solicitá el alta y prepará tu operación dentro de la red.</h2>
              <p>
                El alta se realiza con revisión administrativa para mantener una red
                seria, con dealers identificados, publicaciones claras y contactos
                comerciales trazables.
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => {
                window.location.hash = "#/ingresar";
              }}
            >
              Iniciar contacto
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}