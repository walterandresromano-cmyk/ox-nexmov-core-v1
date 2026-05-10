const faqSections = [
  {
    eyebrow: "Compradores",
    title: "Buscar, comparar y consultar vehículos.",
    text: "El comprador puede navegar la plataforma, comparar unidades y revisar oportunidades antes de iniciar un contacto comercial.",
    items: [
      {
        question: "¿Necesito registrarme para buscar?",
        answer:
          "No. Podés navegar, buscar vehículos, ver información general y comparar unidades sin iniciar sesión.",
      },
      {
        question: "¿Cuándo tengo que iniciar sesión?",
        answer:
          "Cuando quieras contactar a un dealer, enviar una consulta, iniciar una solicitud de venta o generar una acción comercial trazable.",
      },
      {
        question: "¿oX NEXMOV vende autos?",
        answer:
          "No vendemos vehículos de forma directa. La plataforma conecta compradores con dealers, agencias y vendedores profesionales.",
      },
      {
        question: "¿Para qué sirve comparar?",
        answer:
          "El comparador ayuda a revisar diferencias de precio, año, kilometraje, ubicación y propuesta comercial antes de consultar.",
      },
    ],
  },
  {
    eyebrow: "Dealers",
    title: "Publicar, recibir leads y operar dentro de la red.",
    text: "Cada dealer trabaja desde su panel con cupos, publicaciones, oportunidades, métricas, tickets y herramientas habilitadas según su plan.",
    items: [
      {
        question: "¿Cómo se incorpora un dealer?",
        answer:
          "El alta se realiza con revisión administrativa. Se cargan los datos comerciales, se asigna un plan y se activa el período operativo.",
      },
      {
        question: "¿Qué pasa si vence el plan?",
        answer:
          "Las publicaciones se pausan automáticamente. El dealer conserva un período de gracia para revisar información y comunicarse con admin.",
      },
      {
        question: "¿Los cupos son acumulativos?",
        answer:
          "No. Los cupos corresponden al período comercial vigente. Al renovar o cambiar de plan, se aplica el cupo del nuevo período.",
      },
      {
        question: "¿Qué planes existen?",
        answer:
          "Inicio, Pro, Elite y Platinum. Cada uno habilita distintos cupos, herramientas, señales comerciales y beneficios operativos.",
      },
    ],
  },
  {
    eyebrow: "Leads y contacto",
    title: "Consultas comerciales con trazabilidad.",
    text: "El contacto entre comprador y dealer se registra dentro de la plataforma para evitar consultas anónimas y mejorar el seguimiento.",
    items: [
      {
        question: "¿Qué es un lead?",
        answer:
          "Es una consulta o acción comercial generada por un comprador sobre un vehículo, una financiación o una solicitud de venta.",
      },
      {
        question: "¿Por qué se exige login para contactar?",
        answer:
          "Para que la operación tenga trazabilidad mínima y el dealer reciba consultas identificadas, no contactos anónimos sin seguimiento.",
      },
      {
        question: "¿El comprador carga DNI?",
        answer:
          "No. Para el contacto comercial inicial se usan datos mínimos no sensibles, suficientes para ordenar la consulta.",
      },
      {
        question: "¿Qué pasa con WhatsApp?",
        answer:
          "Antes de abrir un canal comercial, la plataforma registra la acción para mantener trazabilidad interna del lead.",
      },
    ],
  },
  {
    eyebrow: "Financiación y venta particular",
    title: "Dos flujos separados para oportunidades distintas.",
    text: "La financiación 0km y el módulo “Vender mi vehículo” generan oportunidades específicas que pueden ser gestionadas por admin, equipo interno o dealers habilitados.",
    items: [
      {
        question: "¿Qué es Financiación 0km?",
        answer:
          "Es un canal para consultar alternativas de financiación sobre vehículos cero kilómetro sin cargar datos sensibles al inicio.",
      },
      {
        question: "¿Quién recibe esos leads?",
        answer:
          "Pueden ser trabajados por administración, usuarios internos especiales o dealers asignados según criterio operativo.",
      },
      {
        question: "¿Qué es “Vender mi vehículo”?",
        answer:
          "Es un módulo para que una persona cargue su intención de venta y la plataforma pueda derivarla a dealers habilitados.",
      },
      {
        question: "¿Todos los dealers reciben esas oportunidades?",
        answer:
          "No necesariamente. El acceso depende del plan, beneficios otorgados y criterio comercial definido por administración.",
      },
    ],
  },
  {
    eyebrow: "Publicaciones y planes",
    title: "Cupos, visibilidad y reglas claras.",
    text: "Las publicaciones dependen del plan del dealer y de la información disponible en cada unidad.",
    items: [
      {
        question: "¿Todos los planes permiten comparar vehículos?",
        answer:
          "Sí. La comparación es una función útil para el comprador y no se bloquea por plan.",
      },
      {
        question: "¿Qué diferencia a los planes dealer?",
        answer:
          "La diferencia está en cupos, señales comerciales, presencia visual, métricas y herramientas operativas.",
      },
      {
        question: "¿Elite es ilimitado?",
        answer:
          "No. Elite tiene hasta 50 publicaciones por período. Platinum es el único plan con publicaciones ilimitadas.",
      },
    ],
  },
  {
    eyebrow: "Seguridad y datos",
    title: "Información mínima para operar con trazabilidad.",
    text: "La plataforma registra datos necesarios para ordenar consultas, soporte y oportunidades comerciales.",
    items: [
      {
        question: "¿Se muestran teléfonos públicamente?",
        answer:
          "No. El contacto se habilita mediante flujos trazables y no se exponen teléfonos como dato público innecesario.",
      },
      {
        question: "¿Qué datos se usan para una consulta?",
        answer:
          "Nombre, email, teléfono y contexto de la operación, solo para gestionar la oportunidad comercial.",
      },
      {
        question: "¿Puedo revisar políticas legales?",
        answer:
          "Sí. Las páginas legales explican términos, privacidad, cookies y canales de contacto institucional.",
      },
    ],
  },];

const quickTopics = [
  "Buscar vehículos",
  "Comparar unidades",
  "Contactar dealers",
  "Planes dealer",
  "Financiación 0km",
  "Vender mi vehículo",
  "Leads trazables",
  "Soporte interno",
];

export default function FAQ({ onNavigate }) {
  return (
    <section className="page-section faq-page">
      <div className="container panel faq-panel">
        <section className="faq-hero">
          <div className="faq-hero-copy">
            <p className="eyebrow">Preguntas frecuentes</p>

            <h1>
              Respuestas claras para compradores, dealers y usuarios de{" "}
              <span>la red.</span>
            </h1>

            <p>
              oX NEXMOV está pensado para ordenar la búsqueda, comparación,
              financiación, publicación y contacto comercial dentro de una misma
              plataforma.
            </p>
          </div>

          <aside className="faq-hero-card">
            <span>Centro de ayuda</span>
            <strong>Menos dudas. Más decisión.</strong>
            <p>
              Una guía rápida para entender cómo funciona la red, cuándo iniciar
              sesión y cómo se trazan las oportunidades comerciales.
            </p>
          </aside>
        </section>

        <section className="faq-topics">
          {quickTopics.map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </section>

        {faqSections.map((section) => (
          <section key={section.eyebrow} className="faq-section">
            <div className="faq-section-head">
              <p className="eyebrow">{section.eyebrow}</p>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </div>

            <div className="faq-grid">
              {section.items.map((item) => (
                <article key={item.question} className="faq-card">
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="faq-final">
          <div>
            <p className="eyebrow">Soporte</p>
            <h2>Comunicación interna ordenada.</h2>
            <p>
              oX NEXMOV cuenta con tickets internos para que dealers,
              administración y soporte puedan resolver consultas sin salir de la
              plataforma.
            </p>
          </div>

          <button type="button" onClick={() => onNavigate?.("joinNetwork")}>
            Sumarme a la red
          </button>
        </section>
      </div>
    </section>
  );
}
