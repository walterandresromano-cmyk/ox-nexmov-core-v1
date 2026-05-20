const LEGAL_CONTENT = {
  terms: {
    eyebrow: "Marco de uso",
    title: "Términos y condiciones",
    sections: [
      "oX NEXMOV es una plataforma digital de búsqueda, comparación y contacto comercial entre compradores y dealers verificados.",
      "La información publicada sobre vehículos, precios, disponibilidad, financiación, documentación y condiciones comerciales es declarada por cada dealer, concesionaria o anunciante correspondiente.",
      "oX NEXMOV no es titular de los vehículos publicados y no interviene como parte vendedora en las operaciones comerciales entre compradores y dealers.",
      "Antes de avanzar con una operación, el comprador deberá confirmar con el dealer la disponibilidad del vehículo, precio final, documentación, condiciones de financiación y cualquier otro dato relevante.",
      "El uso de la plataforma puede generar registros internos de trazabilidad para ordenar consultas, contactos comerciales, leads y comunicaciones entre las partes.",
    ],
  },
  privacy: {
    eyebrow: "Datos personales",
    title: "Política de privacidad",
    sections: [
      "oX NEXMOV puede registrar datos personales mínimos necesarios para operar la plataforma, como nombre, email, teléfono, consultas realizadas, vehículo consultado, dealer contactado, origen del contacto y actividad vinculada a leads o solicitudes comerciales.",
      "Estos datos se utilizan para gestionar consultas, generar trazabilidad comercial, brindar soporte, mejorar la experiencia de uso y permitir la comunicación entre compradores, dealers y administración.",
      "oX NEXMOV no vende datos personales a terceros.",
      "Para consultas vinculadas a privacidad o uso de datos, podés escribir a soporte@oxnexmov.com.ar.",
    ],
  },
  cookies: {
    eyebrow: "Navegación",
    title: "Política de cookies",
    sections: [
      "oX NEXMOV puede utilizar cookies técnicas o tecnologías similares para permitir el funcionamiento correcto de la plataforma, mantener sesiones, recordar preferencias básicas y mejorar la experiencia de navegación.",
      "Si en el futuro se incorporan herramientas de analítica, medición o publicidad, esta política podrá actualizarse para informar su alcance correspondiente.",
    ],
  },
  consumerDefense: {
    eyebrow: "Orientación al usuario",
    title: "Defensa del consumidor",
    sections: [
      "Las operaciones comerciales vinculadas a vehículos, financiación o servicios ofrecidos por dealers o anunciantes deberán ser confirmadas directamente con el responsable comercial correspondiente.",
      "Ante dudas o reclamos relacionados con una operación, el usuario podrá comunicarse con el dealer interviniente y/o con oX NEXMOV a través de soporte@oxnexmov.com.ar para recibir orientación sobre el canal correspondiente.",
    ],
  },
  regret: {
    eyebrow: "Solicitud comercial",
    title: "Botón de arrepentimiento",
    sections: [
      "Si realizaste una contratación de servicio con oX NEXMOV y querés solicitar el arrepentimiento dentro del plazo correspondiente, podés contactarnos por email.",
    ],
    action: {
      label: "Enviar solicitud a soporte@oxnexmov.com.ar",
      href: "mailto:soporte@oxnexmov.com.ar?subject=Solicitud%20de%20arrepentimiento%20-%20oX%20NEXMOV",
    },
  },
  serviceCancel: {
    eyebrow: "Solicitud comercial",
    title: "Botón de baja de servicio",
    sections: [
      "Si querés solicitar la baja de un servicio contratado con oX NEXMOV, podés contactarnos por email indicando tus datos y el servicio asociado.",
    ],
    action: {
      label: "Solicitar baja a soporte@oxnexmov.com.ar",
      href: "mailto:soporte@oxnexmov.com.ar?subject=Solicitud%20de%20baja%20de%20servicio%20-%20oX%20NEXMOV",
    },
  },
};

const LEGAL_ORDER = [
  "terms",
  "privacy",
  "cookies",
  "consumerDefense",
  "regret",
  "serviceCancel",
];

const LEGAL_IDS = {
  terms: "terms",
  privacy: "privacy",
  cookies: "cookies",
  consumerDefense: "consumer",
  regret: "arrepentimiento",
  serviceCancel: "baja-servicio",
};

export default function LegalPage({ currentRoute = "terms", onNavigate }) {
  const activeRoute = LEGAL_CONTENT[currentRoute] ? currentRoute : "terms";

  return (
    <section className="legal-page">
      <div className="legal-shell">
        <article className="legal-card legal-card--unified">
          <p className="legal-eyebrow">Legales oX NEXMOV</p>
          <h1 className="legal-title">Términos y condiciones</h1>
          <p className="legal-intro">
            Esta página reúne el marco de uso, privacidad, cookies, defensa del
            consumidor y solicitudes comerciales vinculadas al servicio.
          </p>

          <nav className="legal-index" aria-label="Índice legal">
            {LEGAL_ORDER.map((key) => (
              <a
                key={key}
                className={activeRoute === key ? "is-active" : ""}
                href={`#${LEGAL_IDS[key]}`}
              >
                {LEGAL_CONTENT[key].title}
              </a>
            ))}
          </nav>

          <div className="legal-sections">
            {LEGAL_ORDER.map((key) => {
              const item = LEGAL_CONTENT[key];

              return (
                <section
                  key={key}
                  id={LEGAL_IDS[key]}
                  className={`legal-section${
                    activeRoute === key ? " is-active" : ""
                  }`}
                >
                  <p className="legal-eyebrow">{item.eyebrow}</p>
                  <h2>{item.title}</h2>

                  <div className="legal-copy">
                    {item.sections.map((section) => (
                      <p key={section}>{section}</p>
                    ))}
                  </div>

                  {item.action && (
                    <div className="legal-actions">
                      <a href={item.action.href}>{item.action.label}</a>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <p className="legal-review-note">
            oX NEXMOV organiza información, publicaciones y consultas
            comerciales para facilitar la comparación y el contacto entre
            compradores, vendedores y dealers. Los datos publicados pueden ser
            declarados por terceros y deben ser verificados antes de concretar
            cualquier operación. La plataforma no garantiza ventas, financiación
            aprobada, tasaciones oficiales, certificaciones mecánicas ni
            condiciones comerciales finales. Para consultas, escribinos a{" "}
            <a href="mailto:soporte@oxnexmov.com.ar">
              soporte@oxnexmov.com.ar
            </a>
            .
          </p>

          <button
            className="legal-back-button"
            type="button"
            onClick={() => onNavigate?.("home")}
          >
            Volver al inicio
          </button>
        </article>
      </div>
    </section>
  );
}
