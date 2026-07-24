"use client";

/* eslint-disable @next/next/no-img-element -- Static export uses pre-compressed local assets. */

import { useMemo, useState } from "react";

type Category = "Manos" | "Pies" | "Cejas" | "Pestañas";

type Service = {
  name: string;
  category: Category;
  price: string;
  duration: string;
  professionals: string[];
};

const services: Service[] = [
  { name: "Manicura", category: "Manos", price: "$15.000", duration: "30 min", professionals: ["Ludmila", "Pricila"] },
  { name: "Esmaltado semipermanente", category: "Manos", price: "$22.000", duration: "60 min", professionals: ["Ludmila", "Pricila"] },
  { name: "Kapping nivelación", category: "Manos", price: "$24.000", duration: "75 min", professionals: ["Ludmila", "Pricila"] },
  { name: "Esculpidas", category: "Manos", price: "desde $30.000", duration: "120 min", professionals: ["Ludmila", "Pricila"] },
  { name: "Belleza de pies", category: "Pies", price: "$20.000", duration: "45 min", professionals: ["Ludmila", "Pricila"] },
  { name: "Pies + semipermanente", category: "Pies", price: "$23.000", duration: "75 min", professionals: ["Ludmila", "Pricila"] },
  { name: "Diseño y perfilado", category: "Cejas", price: "$15.000", duration: "30 min", professionals: ["Sofía"] },
  { name: "Laminado + nutrición", category: "Cejas", price: "$19.000", duration: "45 min", professionals: ["Sofía"] },
  { name: "Lifting de pestañas", category: "Pestañas", price: "$24.000", duration: "75 min", professionals: ["Sofía"] },
  { name: "Clásicas pelo por pelo", category: "Pestañas", price: "$24.000", duration: "120 min", professionals: ["Sofía"] },
  { name: "Volumen 2D / 3D", category: "Pestañas", price: "desde $25.000", duration: "150 min", professionals: ["Sofía"] },
];

const dates = [
  { day: "MAR", number: "28" },
  { day: "MIÉ", number: "29" },
  { day: "JUE", number: "30" },
  { day: "VIE", number: "31" },
  { day: "SÁB", number: "01" },
];

const times = ["10:00", "11:30", "15:00", "16:30", "18:00"];

const nailGallery = [
  {
    image: "/nails-black-stars-v2.jpg",
    title: "Black star french",
    text: "Francesita negra y detalles plata sobre base nude.",
  },
  {
    image: "/nails-magenta-v2.jpg",
    title: "Magenta bloom",
    text: "Diseño floral en fucsias con volumen y brillo.",
  },
  {
    image: "/nails-blue-v2.jpg",
    title: "Blue aura",
    text: "Degradé azul y violeta con destellos sutiles.",
  },
];

const categories = [
  {
    title: "Manicura",
    text: "Color, estructura y terminaciones pensadas para vos.",
    image: "/nails-black-stars-v2.jpg",
    tag: "desde $15.000",
    bookingCategory: "Manos" as Category,
  },
  {
    title: "Pedicura",
    text: "Cuidado integral y esmaltado para sentirte renovada.",
    image: "/pedicura-clean-v2.jpg",
    tag: "desde $20.000",
    bookingCategory: "Pies" as Category,
  },
  {
    title: "Cejas & pestañas",
    text: "Diseños que realzan tu mirada respetando tus rasgos.",
    image: "/pestanas-clean-v2.jpg",
    tag: "desde $15.000",
    bookingCategory: "Cejas" as Category,
  },
  {
    title: "Depilación definitiva",
    text: "Tratamiento progresivo para una piel más suave.",
    image: "/depilacion-clean-v2.jpg",
    tag: "consultar zonas",
  },
];

export function MeridaDemo() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<Category>("Manos");
  const [serviceName, setServiceName] = useState("Esmaltado semipermanente");
  const [professional, setProfessional] = useState("Cualquier profesional");
  const [date, setDate] = useState("29");
  const [time, setTime] = useState("15:00");
  const [confirmed, setConfirmed] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const categoryServices = useMemo(
    () => services.filter((service) => service.category === category),
    [category],
  );

  const selectedService =
    services.find((service) => service.name === serviceName) ?? categoryServices[0];

  const availableProfessionals = selectedService.professionals;

  function selectCategory(nextCategory: Category) {
    const firstService = services.find((service) => service.category === nextCategory);
    setCategory(nextCategory);
    if (firstService) setServiceName(firstService.name);
    setProfessional("Cualquier profesional");
    setConfirmed(false);
  }

  function startBooking(nextCategory: Category, nextProfessional?: string) {
    const firstService = services.find(
      (service) =>
        service.category === nextCategory &&
        (!nextProfessional || service.professionals.includes(nextProfessional)),
    );

    setCategory(nextCategory);
    if (firstService) setServiceName(firstService.name);
    setProfessional(nextProfessional ?? "Cualquier profesional");
    setConfirmed(false);
  }

  return (
    <main>
      <div className="demo-ribbon">
        <span>Demo de portfolio</span>
        <p>La reserva es una simulación y no genera un turno real.</p>
      </div>

      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="MERIDA, volver al inicio">
          <img src="/logo-merida.jpg" alt="" width="495" height="474" />
          <span>
            <b>MERIDA</b>
            <small>beauty studio</small>
          </span>
        </a>
        <nav
          id="primary-navigation"
          className={menuOpen ? "nav-open" : ""}
          aria-label="Navegación principal"
        >
          <a href="#servicios" onClick={() => setMenuOpen(false)}>Servicios</a>
          <a href="#equipo" onClick={() => setMenuOpen(false)}>Equipo</a>
          <a href="#estudio" onClick={() => setMenuOpen(false)}>El estudio</a>
          <a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
        </nav>
        <a className="button button-small desktop-cta" href="#reservar">Simular reserva</a>
        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
        </button>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Belleza & cuidado en Hurlingham</p>
          <h1>Tu momento.<br /><em>Tu belleza.</em></h1>
          <p className="hero-lead">
            Manicura, pedicura, cejas, pestañas y depilación en un espacio
            pensado para que te sientas cuidada.
          </p>
          <div className="hero-actions">
            <a className="button" href="#reservar">Simular reserva</a>
            <a className="text-link" href="#servicios">Explorar servicios <span>↗</span></a>
          </div>
          <div className="hero-facts">
            <div><strong>Mar — Sáb</strong><span>10–13 · 15–19 h</span></div>
            <div><strong>Solo con cita</strong><span>Roca 781, Hurlingham</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo">
            <img
              src="/local-merida.jpg"
              alt="Recepción de MERIDA Beauty Studio"
              width="449"
              height="559"
              fetchPriority="high"
            />
          </div>
          <div className="hero-inset">
            <img
              src="/nails-magenta-v2.jpg"
              alt="Diseño de uñas magenta de MERIDA"
              width="1000"
              height="1250"
              loading="lazy"
              decoding="async"
            />
            <span>Detalles que hablan de vos</span>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Beneficios de MERIDA">
        <span>Atención personalizada</span>
        <span>Profesionales especializadas</span>
        <span>Solicitud por WhatsApp</span>
        <span>En el corazón de Hurlingham</span>
      </section>

      <section className="section services-section" id="servicios">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Nuestros servicios</p>
            <h2>Todo lo que necesitás<br />para sentirte <em>increíble.</em></h2>
          </div>
          <p>
            Tratamientos personalizados, productos seleccionados y la dedicación
            de un equipo que cuida cada detalle.
          </p>
        </div>
        <div className="service-grid">
          {categories.map((item, index) => (
            <article className="service-card" key={item.title}>
              <div className="service-image">
                <img
                  src={item.image}
                  alt={item.title}
                  width="1000"
                  height="1250"
                  loading="lazy"
                  decoding="async"
                />
                <span className="service-number">0{index + 1}</span>
              </div>
              <div className="service-card-copy">
                <p>{item.tag}</p>
                <h3>{item.title}</h3>
                <span>{item.text}</span>
                <a
                  href={item.title === "Depilación definitiva" ? "https://wa.me/5491171079672?text=Hola%20MERIDA%2C%20quisiera%20consultar%20por%20depilaci%C3%B3n%20definitiva" : "#reservar"}
                  onClick={() => {
                    if (item.bookingCategory) startBooking(item.bookingCategory);
                  }}
                >
                  {item.title === "Depilación definitiva" ? "Consultar" : "Reservar"} <b>↗</b>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="nail-gallery" aria-labelledby="galeria-title">
        <div className="gallery-copy">
          <p className="eyebrow">Trabajos MERIDA</p>
          <h2 id="galeria-title">Diseños que<br /><em>inspiran.</em></h2>
          <p>
            Una selección visual recreada a partir de trabajos publicados por el
            estudio, sin textos ni elementos de redes sociales.
          </p>
          <div className="gallery-controls" aria-label="Controles del carrusel">
            <button
              type="button"
              aria-label="Diseño anterior"
              onClick={() =>
                setCarouselIndex(
                  (carouselIndex - 1 + nailGallery.length) % nailGallery.length,
                )
              }
            >
              ←
            </button>
            <span>{String(carouselIndex + 1).padStart(2, "0")} / 03</span>
            <button
              type="button"
              aria-label="Diseño siguiente"
              onClick={() =>
                setCarouselIndex((carouselIndex + 1) % nailGallery.length)
              }
            >
              →
            </button>
          </div>
        </div>
        <div className="gallery-stage">
          <div className="gallery-main">
            <img
              src={nailGallery[carouselIndex].image}
              alt={nailGallery[carouselIndex].title}
              width="1000"
              height="1250"
              loading="lazy"
              decoding="async"
            />
            <div>
              <small>DISEÑO 0{carouselIndex + 1}</small>
              <h3>{nailGallery[carouselIndex].title}</h3>
              <p>{nailGallery[carouselIndex].text}</p>
            </div>
          </div>
          <button
            className="gallery-next"
            type="button"
            aria-label={`Ver ${nailGallery[(carouselIndex + 1) % nailGallery.length].title}`}
            onClick={() => setCarouselIndex((carouselIndex + 1) % nailGallery.length)}
          >
            <img
              src={nailGallery[(carouselIndex + 1) % nailGallery.length].image}
              alt=""
              width="1000"
              height="1250"
              loading="lazy"
              decoding="async"
            />
          </button>
        </div>
      </section>

      <section className="booking-section" id="reservar">
        <div className="booking-intro">
          <p className="eyebrow light">Demo de reserva</p>
          <h2>Prepará tu solicitud,<br /><em>en pocos pasos.</em></h2>
          <p>
            Elegí el servicio, la profesional y el horario que mejor se adapte a vos.
          </p>
          <ol>
            <li><span>01</span> Elegí tu servicio</li>
            <li><span>02</span> Seleccioná profesional</li>
            <li><span>03</span> Encontrá tu horario</li>
          </ol>
        </div>

        <div className="booking-card">
          {confirmed ? (
            <div className="confirmation" role="status" aria-live="polite">
              <div className="confirmation-icon" aria-hidden="true">✓</div>
              <p className="eyebrow">Solicitud preparada</p>
              <h3>¡Tu turno está casi listo!</h3>
              <p>
                {selectedService.name} · fecha de ejemplo {date}/07 · {time} h<br />
                {professional}
              </p>
              <a
                className="button"
                href={`https://wa.me/5491171079672?text=${encodeURIComponent(
                  `Hola MERIDA, vi la demo web y quisiera consultar disponibilidad para ${selectedService.name} con ${professional}. Mi preferencia orientativa es el ${date}/07 a las ${time} h.`,
                )}`}
              >
                Confirmar por WhatsApp
              </a>
              <button className="reset-button" type="button" onClick={() => setConfirmed(false)}>
                Elegir otro horario
              </button>
              <small>Este mensaje consulta disponibilidad: no crea un turno automático.</small>
            </div>
          ) : (
            <>
              <div className="booking-topline">
                <span>Agendá tu cita</span>
                <small>Disponibilidad de ejemplo</small>
              </div>

              <fieldset>
                <legend>1. ¿Qué querés hacerte?</legend>
                <div className="category-tabs">
                  {(["Manos", "Pies", "Cejas", "Pestañas"] as Category[]).map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={category === item ? "active" : ""}
                      aria-pressed={category === item}
                      onClick={() => selectCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="service-options">
                  {categoryServices.map((service) => (
                    <label className={serviceName === service.name ? "selected" : ""} key={service.name}>
                      <input
                        type="radio"
                        name="service"
                        checked={serviceName === service.name}
                        onChange={() => {
                          setServiceName(service.name);
                          setProfessional("Cualquier profesional");
                        }}
                      />
                      <span>
                        <b>{service.name}</b>
                        <small>{service.duration}</small>
                      </span>
                      <strong>{service.price}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>2. ¿Con quién?</legend>
                <div className="professional-options">
                  {["Cualquier profesional", ...availableProfessionals].map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={professional === item ? "selected" : ""}
                      aria-pressed={professional === item}
                      onClick={() => setProfessional(item)}
                    >
                      <span>{item === "Cualquier profesional" ? "✦" : item.charAt(0)}</span>
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>3. Elegí día y horario</legend>
                <div className="date-options">
                  {dates.map((item) => (
                    <button
                      type="button"
                      key={item.number}
                      className={date === item.number ? "selected" : ""}
                      aria-pressed={date === item.number}
                      onClick={() => setDate(item.number)}
                    >
                      <small>{item.day}</small>
                      <b>{item.number}</b>
                    </button>
                  ))}
                </div>
                <div className="time-options">
                  {times.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={time === item ? "selected" : ""}
                      aria-pressed={time === item}
                      onClick={() => setTime(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="booking-summary">
                <div>
                  <small>Tu selección</small>
                  <strong>{selectedService.name}</strong>
                  <span>{selectedService.duration} · {selectedService.price}</span>
                </div>
                <button className="button" type="button" onClick={() => setConfirmed(true)}>
                  Preparar WhatsApp
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section team-section" id="equipo">
        <div className="section-heading">
          <div>
            <p className="eyebrow">El equipo</p>
            <h2>Manos expertas,<br /><em>atención cercana.</em></h2>
          </div>
          <p>Cada profesional aporta su especialidad y una misma forma de trabajar: escucharte y cuidar cada detalle.</p>
        </div>
        <div className="team-grid">
          {[
            { name: "Ludmila", role: "Fundadora · Nail artist", skills: "Manicura · Pedicura · Depilación", image: "/ludmila-demo-v2.jpg" },
            { name: "Pricila", role: "Nail artist", skills: "Manicura · Pedicura", image: "/pricila-demo-v2.jpg" },
            { name: "Sofía", role: "Lash & brow artist", skills: "Cejas · Pestañas", image: "/sofia-demo-v2.jpg" },
          ].map((person, index) => (
            <article className="team-card" key={person.name}>
              <div className={`team-portrait tone-${index + 1}`}>
                <img
                  src={person.image}
                  alt={`Retrato ilustrativo de ${person.name}`}
                  width="1000"
                  height="1586"
                  loading="lazy"
                  decoding="async"
                />
                <b>Imagen ilustrativa</b>
              </div>
              <p>{person.role}</p>
              <h3>{person.name}</h3>
              <span>{person.skills}</span>
              <a
                href="#reservar"
                onClick={() =>
                  startBooking(person.name === "Sofía" ? "Cejas" : "Manos", person.name)
                }
              >
                Reservar con {person.name} ↗
              </a>
            </article>
          ))}
        </div>
        <p className="demo-note">
          Los retratos son imágenes ilustrativas generadas para esta demo. “Sofía”
          es un nombre provisional.
        </p>
      </section>

      <section className="studio-section" id="estudio">
        <div className="studio-image">
          <img
            src="/local-interior.jpg"
            alt="Interior de MERIDA Beauty Studio"
            width="449"
            height="561"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="studio-copy">
          <p className="eyebrow">El estudio</p>
          <h2>Un espacio para<br /><em>bajar un cambio.</em></h2>
          <p>
            MERIDA nació para reunir belleza, cuidado y atención personalizada
            en un ambiente íntimo y luminoso, en pleno Hurlingham.
          </p>
          <blockquote>“Queremos que cada visita se sienta como un momento para vos.”</blockquote>
          <span>— Ludmila, fundadora de MERIDA</span>
          <a className="text-link dark" href="#contacto">Conocé cómo llegar <b>↗</b></a>
        </div>
      </section>

      <section className="care-section">
        <div>
          <p className="eyebrow">Antes de venir</p>
          <h2>Todo listo para<br />disfrutar tu cita.</h2>
        </div>
        <div className="care-cards">
          <details>
            <summary>Política de cancelación <span>+</span></summary>
            <p>
              Cancelaciones con menos de 24 horas o inasistencias: se abona el 50% del
              servicio para volver a agendar. Pasados 20 minutos de demora, la profesional
              decidirá si aún puede realizar el servicio.
            </p>
          </details>
          <details>
            <summary>Para extensiones de pestañas <span>+</span></summary>
            <p>
              Asistí sin maquillaje y con las pestañas limpias, sin productos oleosos.
              Avisanos si tuviste lifting reciente, medicación, alergias o irritación ocular.
            </p>
          </details>
          <details>
            <summary>Cuidado de uñas <span>+</span></summary>
            <p>No se realizan servicios sobre uñas con signos de micosis. Ante cualquier duda, consultanos antes del turno.</p>
          </details>
        </div>
      </section>

      <section className="contact-section" id="contacto">
        <div className="map-card">
          <iframe
            src="https://www.google.com/maps?q=Teniente+Julio+Argentino+Roca+781,+Hurlingham,+Buenos+Aires&z=16&output=embed"
            title="Ubicación de MERIDA Beauty Studio en Hurlingham"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="map-address">
            <span>MERIDA Beauty Studio</span>
            <small>Tte. Julio A. Roca 781 · Hurlingham</small>
          </div>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Teniente+Julio+Argentino+Roca+781+Hurlingham"
            target="_blank"
            rel="noreferrer"
          >
            Abrir en Google Maps ↗
          </a>
        </div>
        <div className="contact-copy">
          <p className="eyebrow light">Contacto & ubicación</p>
          <h2>Te esperamos<br /><em>en MERIDA.</em></h2>
          <div className="contact-list">
            <div><small>DIRECCIÓN</small><p>Tte. Julio A. Roca 781<br />Hurlingham, Buenos Aires</p></div>
            <div><small>HORARIOS</small><p>Martes a sábados<br />10 a 13 · 15 a 19 h</p></div>
            <div><small>WHATSAPP</small><p>+54 9 11 7107-9672<br />Solo mensajes, no llamadas</p></div>
          </div>
          <a
            className="button button-light"
            href="https://wa.me/5491171079672?text=Hola%20MERIDA%2C%20quisiera%20hacer%20una%20consulta"
          >
            Escribir por WhatsApp
          </a>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#inicio">
          <img src="/logo-merida.jpg" alt="" width="495" height="474" loading="lazy" />
          <span><b>MERIDA</b><small>beauty studio</small></span>
        </a>
        <p>Belleza y cuidado en un solo lugar.</p>
        <div>
          <a href="https://www.instagram.com/meridastudio_/" target="_blank" rel="noreferrer">Instagram ↗</a>
          <a href="https://wa.me/5491171079672">WhatsApp ↗</a>
        </div>
        <small>© 2026 MERIDA Beauty Studio · Demo conceptual para portfolio</small>
      </footer>

      <a
        className="floating-whatsapp"
        href="https://wa.me/5491171079672?text=Hola%20MERIDA%2C%20quisiera%20hacer%20una%20consulta"
        aria-label="Contactar a MERIDA por WhatsApp"
      >
        WA
      </a>
      <a className="mobile-booking-bar" href="#reservar">Simular reserva <span>↗</span></a>
    </main>
  );
}
