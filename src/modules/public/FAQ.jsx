import "../../styles/faq.css";
import { useEffect, useState } from "react";
import { injectJsonLd, removeJsonLd, buildFaqSchema } from "../../lib/schema.js";

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " faq-item--open" : ""}`}>
      <button
        type="button"
        className="faq-item__summary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{question}</span>
      </button>
      <div className="faq-item__body" aria-hidden={!open}>
        <div className="faq-item__inner">
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
}

const faqSections = [
  {
    eyebrow: "Compradores",
    title: "Buscar, comparar y consultar vehículos.",
    text: "Podés navegar la plataforma, comparar unidades y revisar oportunidades antes de contactar a un vendedor.",
    items: [
      {
        question: "¿Necesito registrarme para buscar?",
        answer:
          "No. Podés navegar, buscar vehículos, ver información general y comparar unidades sin iniciar sesión.",
      },
      {
        question: "¿Cuándo tengo que iniciar sesión?",
        answer:
          "Solo cuando quieras enviar una consulta a un vendedor. Para explorar y comparar no hace falta.",
      },
      {
        question: "¿Qué pasa después de que envío una consulta?",
        answer:
          "Tu consulta queda registrada y se habilita el contacto por WhatsApp con el vendedor. El vendedor puede ver el contexto de tu consulta y responderte con información del vehículo.",
      },
      {
        question: "¿El vendedor me puede contactar a mí?",
        answer:
          "El vendedor recibe tu consulta con contexto. El contacto directo se maneja por WhatsApp una vez que vos iniciás la conversación desde la plataforma.",
      },
      {
        question: "¿Puedo guardar vehículos para ver después?",
        answer:
          "Sí. Podés guardar vehículos en tu lista y compararlos cuando quieras desde tu Garage oX.",
      },
      {
        question: "¿Qué es Garage oX?",
        answer:
          "Es tu espacio personal dentro de la plataforma: guardás vehículos de interés, registrás los que ya tenés, llevás el historial de servicios y vencimientos, y podés preparar una futura venta.",
      },
      {
        question: "¿oX NEXMOV cobra algo al comprador?",
        answer:
          "No. Buscar, comparar, guardar vehículos y contactar vendedores es completamente gratis para el comprador. oX NEXMOV no cobra comisión ni cargos de ningún tipo sobre la operación.",
      },
      {
        question: "¿oX NEXMOV vende autos?",
        answer:
          "No vendemos vehículos de forma directa. La plataforma conecta compradores con agencias y vendedores profesionales verificados.",
      },
      {
        question: "¿Para qué sirve comparar?",
        answer:
          "El comparador ayuda a revisar diferencias de precio, año, kilometraje, ubicación y propuesta del vendedor antes de consultar.",
      },
      {
        question: "¿Cómo sé si el precio es negociable?",
        answer:
          "El precio publicado es el precio de referencia declarado por el vendedor. La negociación final se acuerda directamente entre las partes.",
      },
    ],
  },
  {
    eyebrow: "Vendedores",
    title: "Publicar, recibir consultas y operar dentro de la red.",
    text: "Cada vendedor trabaja desde su panel con cupos, publicaciones, consultas, métricas, tickets y herramientas habilitadas según su plan.",
    items: [
      {
        question: "¿oX NEXMOV cobra comisión por cada venta cerrada?",
        answer:
          "No. Los vendedores pagan una suscripción mensual según el plan que contratan. No hay comisión por operación cerrada ni cargos adicionales sobre las ventas que cierran.",
      },
      {
        question: "¿Cómo se incorpora un vendedor a la red?",
        answer:
          "El alta se realiza con revisión administrativa. Se cargan los datos comerciales, se asigna un plan y se activa el período operativo.",
      },
      {
        question: "¿Qué pasa si vence el plan?",
        answer:
          "Las publicaciones se pausan automáticamente. El vendedor conserva un período de gracia para revisar información y comunicarse con administración.",
      },
      {
        question: "¿Los cupos son acumulativos?",
        answer:
          "No. Los cupos corresponden al período comercial vigente. Al renovar o cambiar de plan, se aplica el cupo del nuevo período.",
      },
      {
        question: "¿Qué planes existen?",
        answer:
          "Inicio, Pro, Elite y Platinum. Cada uno habilita distintos cupos, señales comerciales, presencia visual, métricas y herramientas operativas.",
      },
    ],
  },
  {
    eyebrow: "Consultas y contacto",
    title: "Cómo funciona el contacto entre comprador y vendedor.",
    text: "El contacto entre comprador y vendedor se registra dentro de la plataforma para evitar consultas anónimas y mejorar el seguimiento.",
    items: [
      {
        question: "¿Por qué necesito una cuenta para contactar?",
        answer:
          "Para que el vendedor reciba consultas identificadas y pueda responderte con contexto. Evita spam y consultas sin seguimiento.",
      },
      {
        question: "¿Tengo que cargar el DNI?",
        answer:
          "No. Para el contacto inicial se usan datos mínimos: nombre, email y teléfono. No se pide documentación.",
      },
      {
        question: "¿Qué pasa con WhatsApp?",
        answer:
          "Antes de abrir el chat con el vendedor, la plataforma registra tu consulta. Así el vendedor sabe de qué vehículo se trata y puede responderte mejor.",
      },
      {
        question: "¿Contactar implica reservar o comprar?",
        answer:
          "No. El contacto queda registrado en la plataforma, pero no implica reserva, compra ni ningún tipo de compromiso.",
      },
    ],
  },
  {
    eyebrow: "Financiación y venta particular",
    title: "Dos opciones para oportunidades distintas.",
    text: "La financiación 0km y el módulo \"Vender mi vehículo\" generan consultas específicas que puede atender el equipo de oX o vendedores habilitados.",
    items: [
      {
        question: "¿Qué es Financiación 0km?",
        answer:
          "Es un canal para consultar alternativas de financiación sobre vehículos cero kilómetro sin cargar datos sensibles al inicio.",
      },
      {
        question: "¿La financiación está aprobada por oX NEXMOV?",
        answer:
          "No. La consulta no implica aprobación crediticia. Las cuotas, tasas, entregas y condiciones finales dependen del proveedor, plan, modelo y situación del solicitante.",
      },
      {
        question: "¿Quién atiende esas consultas?",
        answer:
          "Pueden ser atendidas por el equipo de oX NEXMOV o vendedores habilitados, según el tipo de consulta y el criterio operativo.",
      },
      {
        question: "¿Qué es \"Vender mi vehículo\"?",
        answer:
          "Es un módulo para que una persona cargue su intención de venta y la plataforma pueda derivarla a vendedores habilitados.",
      },
      {
        question: "¿Cargar mi vehículo garantiza una oferta?",
        answer:
          "No. La solicitud no es tasación oficial ni garantiza venta u oferta. La evaluación depende del interés de los vendedores habilitados y de las condiciones acordadas entre las partes.",
      },
      {
        question: "¿Todos los vendedores reciben esas oportunidades?",
        answer:
          "No necesariamente. El acceso depende del plan, beneficios otorgados y criterio comercial definido por administración.",
      },
    ],
  },
  {
    eyebrow: "Publicaciones y planes",
    title: "Cupos, visibilidad y reglas claras.",
    text: "Las publicaciones dependen del plan del vendedor y de la información disponible en cada unidad.",
    items: [
      {
        question: "¿Todos los planes permiten comparar vehículos?",
        answer:
          "Sí. La comparación es una función para el comprador y no se bloquea por plan.",
      },
      {
        question: "¿Qué diferencia a los planes de vendedor?",
        answer:
          "La diferencia está en cupos, señales comerciales, presencia visual, métricas y herramientas operativas.",
      },
      {
        question: "¿oX NEXMOV garantiza consultas o ventas?",
        answer:
          "No. La plataforma ordena publicaciones, consultas y herramientas comerciales, pero no garantiza volumen de consultas, ventas ni resultados comerciales.",
      },
      {
        question: "¿Elite es ilimitado?",
        answer:
          "No. Elite tiene hasta 50 publicaciones por período. Platinum es el único plan con publicaciones ilimitadas.",
      },
      {
        question: "¿Todas las herramientas están disponibles para todos los planes?",
        answer:
          "No. Las herramientas disponibles dependen del plan contratado y los beneficios habilitados para cada nivel.",
      },
    ],
  },
  {
    eyebrow: "Seguridad y datos",
    title: "Información mínima para operar con seguridad.",
    text: "La plataforma registra los datos necesarios para ordenar consultas, soporte y operaciones.",
    items: [
      {
        question: "¿Se muestran teléfonos públicamente?",
        answer:
          "No. El contacto se habilita a través de flujos verificados y no se exponen teléfonos como dato público.",
      },
      {
        question: "¿Qué datos se usan para una consulta?",
        answer:
          "Nombre, email y teléfono, solo para gestionar la consulta. No se pide documentación.",
      },
      {
        question: "¿oX NEXMOV certifica el estado mecánico del vehículo?",
        answer:
          "No. La información publicada, incluyendo mantenimiento o estado declarado, debe verificarse con el vendedor antes de concretar una operación.",
      },
      {
        question: "¿Los costos de mantenimiento son oficiales?",
        answer:
          "No. Cuando aparecen, son datos orientativos declarados por el vendedor. oX NEXMOV no calcula, verifica ni garantiza esos importes.",
      },
      {
        question: "¿Puedo revisar políticas legales?",
        answer:
          "Sí. Las páginas legales explican términos, privacidad, cookies y canales de contacto institucional.",
      },
    ],
  },
  {
    eyebrow: "Publicaciones sospechosas",
    title: "Cómo cuidarte antes de avanzar.",
    text: "oX NEXMOV reduce el contacto anónimo y ayuda a ordenar operaciones, pero cada comprador debe verificar la información antes de concretar cualquier acuerdo.",
    security: true,
    items: [
      {
        question: "¿Cómo protege oX NEXMOV el contacto entre comprador y vendedor?",
        answer:
          "Para contactar a un vendedor, oX NEXMOV solicita registro y deja constancia de la consulta. Esto ayuda a reducir consultas falsas, spam y operaciones sospechosas. El contacto no implica reserva, compra ni obligación de operación.",
      },
      {
        question: "¿oX NEXMOV garantiza que una publicación es 100% segura?",
        answer:
          "No. oX NEXMOV organiza información y consultas, pero los datos publicados son declarados por los vendedores. Antes de concretar una operación, el comprador debe verificar documentación, estado del vehículo, titularidad y condiciones acordadas.",
      },
      {
        question: "¿Qué señales pueden indicar una publicación sospechosa?",
        answer:
          "Precio demasiado bajo sin explicación, pedido de dinero por fuera de canales claros, negativa a mostrar documentación, datos inconsistentes, presión para cerrar rápido, contacto por medios no declarados o imágenes que no coinciden.",
      },
      {
        question: "¿Qué debo hacer si veo una publicación sospechosa?",
        answer:
          "No avances con pagos ni entregas de dinero. Guardá la información de la publicación y contactá a soporte de oX NEXMOV para que pueda ser revisada.",
      },
      {
        question: "¿oX NEXMOV certifica el estado mecánico del vehículo?",
        answer:
          "No. La plataforma no certifica mecánicamente los vehículos. Los datos publicados son declarados por el vendedor y deben verificarse antes de cualquier acuerdo.",
      },
      {
        question: "¿Debo pagar una seña desde oX NEXMOV?",
        answer:
          "No existe pago de seña dentro de oX NEXMOV. Cualquier operación económica debe ser acordada directamente entre las partes, verificando identidad, documentación y condiciones.",
      },
    ],
  },
];

export default function FAQ({ onNavigate }) {
  useEffect(() => {
    const allItems = faqSections.flatMap(s => s.items);
    injectJsonLd("ox-faq-jsonld", buildFaqSchema(allItems));
    return () => removeJsonLd("ox-faq-jsonld");
  }, []);

  return (
    <section className="page-section faq-page">
      <div className="container panel faq-panel">
        <section className="faq-hero">
          <div className="faq-hero-road" aria-hidden="true" />
          <div className="faq-hero-copy">
            <p className="eyebrow ox-public-eyebrow">Centro de ayuda</p>

            <h1 className="ox-public-title">Preguntas frecuentes</h1>

            <p className="ox-public-lead">
              Resolvemos las dudas más importantes para que compradores y
              vendedores usen oX NEXMOV con claridad y confianza.
            </p>
          </div>

          <div className="faq-hero-brand" aria-hidden="true">
            <img
              className="faq-hero-logo"
              src="/hero-car.svg"
              alt=""
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
        </section>

        {faqSections.map((section) => (
          <section
            key={section.eyebrow}
            className={`faq-section${section.security ? " faq-section--security" : ""}`}
          >
            <div className="faq-section-head">
              <p className="eyebrow">{section.eyebrow}</p>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </div>

            <div className="faq-list">
              {section.items.map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </section>
        ))}

        <section className="faq-final">
          <div>
            <p className="eyebrow">Soporte</p>
            <h2>¿Todavía tenés dudas?</h2>
            <p>
              Podés explorar vehículos publicados, comparar opciones reales o
              sumarte a la red como vendedor.
            </p>
          </div>

          <div className="faq-final-actions">
            <button type="button" onClick={() => onNavigate?.("search")}>
              Buscar vehículos
            </button>
            <button type="button" onClick={() => onNavigate?.("joinNetwork")}>
              Sumate a la red
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
