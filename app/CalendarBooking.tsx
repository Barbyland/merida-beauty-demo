"use client";

import { useEffect, useRef, useState } from "react";

const ONLINE = process.env.NEXT_PUBLIC_CALENDAR_ONLINE === "true";
const API = ONLINE ? "/api" : "http://127.0.0.1:3001";
const services = [
  ["Manicura", 30, "Manos"], ["Esmaltado semipermanente", 60, "Manos"], ["Kapping nivelación", 75, "Manos"],
  ["Esculpidas", 120, "Manos"], ["Belleza de pies", 45, "Pies"], ["Pies + semipermanente", 75, "Pies"],
  ["Diseño y perfilado", 30, "Cejas"], ["Laminado + nutrición", 45, "Cejas"],
  ["Lifting de pestañas", 75, "Pestañas"], ["Clásicas pelo por pelo", 120, "Pestañas"],
] as const;
const professionals = [
  { name: "Ludmila", specialty: "Manos y pies", initial: "L" },
  { name: "Pricila", specialty: "Manos y pies", initial: "P" },
  { name: "Sofía", specialty: "Cejas y pestañas", initial: "S" },
] as const;
type Category = typeof services[number][2];
function isSofiaService(service: string) {
  return services.some(([name, , category]) => name === service && (category === "Cejas" || category === "Pestañas"));
}

type Booking = { id: string; status: string; professional: string; service: string; date: string; time: string; notification: string };
type FieldErrors = Partial<Record<"date" | "time" | "name" | "phone", string>>;

function dateAfter(days: number) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + days);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);
}

export function CalendarBooking({ initialProfessional, initialService }: { initialProfessional: string; initialService: string }) {
  const startsWithSofia = initialProfessional === "Sofía" || isSofiaService(initialService);
  const [service, setService] = useState(startsWithSofia ? isSofiaService(initialService) ? initialService : "Diseño y perfilado" : services.some(([name]) => name === initialService) ? initialService : "Esmaltado semipermanente");
  const [professional, setProfessional] = useState(startsWithSofia ? "Sofía" : initialProfessional === "Pricila" ? "Pricila" : "Ludmila");
  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState(() => dateAfter(1));
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [reload, setReload] = useState(0);
  const [booking, setBooking] = useState<Booking | null>(null);
  const attempt = useRef<{ id: string; data: string } | null>(null);
  const busy = submitting || uncertain;
  const calendarUnavailable = professional === "Sofía";
  const selectedService = services.find(([name]) => name === service)!;
  const category = selectedService[2];
  const categories: Category[] = calendarUnavailable ? ["Cejas", "Pestañas"] : ["Manos", "Pies"];
  const quickDates = Array.from({ length: 10 }, (_, index) => dateAfter(index + 1)).filter(day => {
    const weekday = new Date(`${day}T12:00:00-03:00`).getUTCDay();
    return weekday >= 2 && weekday <= 6;
  }).slice(0, 5);
  const readableDate = date ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(`${date}T12:00:00-03:00`)) : "Elegí una fecha";

  function selectProfessional(next: string) {
    if (next === professional) return;
    setProfessional(next);
    if (next === "Sofía" && !isSofiaService(service)) setService("Diseño y perfilado");
    if (next !== "Sofía" && isSofiaService(service)) setService("Esmaltado semipermanente");
    setTime(""); setSlots([]); setLoading(false); setError(""); setFieldErrors({});
  }

  function selectService(next: string) {
    if (next === service) return;
    setService(next); setTime(""); setSlots([]); setFieldErrors({});
  }

  function selectDate(next: string) {
    if (next === date) return;
    setDate(next); setTime(""); setSlots([]);
    setFieldErrors(current => ({ ...current, date: undefined, time: undefined }));
  }

  function goToStep(next: 1 | 2) {
    setStep(next);
    requestAnimationFrame(() => {
      const heading = document.getElementById("calendar-form-top");
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function resetRequest(goHome = false) {
    setBooking(null);
    setStep(1);
    attempt.current = null;
    setTime("");
    setName("");
    setPhone("");
    setError("");
    setFieldErrors({});
    setUncertain(false);
    setReload(value => value + 1);
    if (goHome) {
      window.location.hash = "inicio";
      document.querySelector<HTMLAnchorElement>('a[href="#inicio"]')?.focus({ preventScroll: true });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/public/config`, { signal: controller.signal }).then(r => r.json()).then(result => {
      setConnected(result.connected === true);
      setLoginRequired(result.loginRequired === true);
      setChecking(false);
    }).catch(() => {
      if (!controller.signal.aborted) { setConnected(false); setChecking(false); }
    });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (!connected || professional === "Sofía" || isSofiaService(service)) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setTime("");
      setSlots([]);
      try {
        const response = await fetch(`${API}/public/availability`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service, professional, date }), signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo consultar la agenda.");
        if (!controller.signal.aborted) setSlots(result.slots);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "No se pudo consultar la agenda.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [service, professional, date, connected, reload]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || loading || !connected || calendarUnavailable || isSofiaService(service)) return;
    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    const invalid: FieldErrors = {};
    if (!date || date < dateAfter(1) || date > dateAfter(30)) invalid.date = "Elegí una fecha entre mañana y los próximos 30 días.";
    if (!time) invalid.time = "Elegí un horario para solicitar tu turno.";
    if (step === 2) {
      if (!name.trim()) invalid.name = "Completá tu nombre.";
      else if (name.trim().length < 2 || name.trim().length > 80 || /[<>]/.test(name)) invalid.name = "Ingresá un nombre válido de 2 a 80 caracteres.";
      if (!normalizedPhone) invalid.phone = "Completá tu número de WhatsApp.";
      else if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) invalid.phone = "Revisá el número e incluí el código de país: +54 9, código de área y número.";
    }
    setFieldErrors(invalid);
    const firstMissing = (["date", "time", "name", "phone"] as const).find(field => invalid[field]);
    if (firstMissing) {
      if (firstMissing === "date" || firstMissing === "time") setStep(1);
      requestAnimationFrame(() => {
        const field = document.getElementById(`calendar-${firstMissing}`);
        field?.focus({ preventScroll: true });
        field?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    if (step === 1) { goToStep(2); return; }
    const fields = { name: name.trim(), phone: normalizedPhone, service, professional, date, time };
    const serialized = JSON.stringify(fields);
    if (!attempt.current || attempt.current.data !== serialized) attempt.current = { id: crypto.randomUUID(), data: serialized };
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API}/public/book`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, requestId: attempt.current.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        const definitive = ["INVALID_INPUT", "SLOT_TAKEN", "NOT_CONFIGURED", "UNAUTHORIZED", "WRONG_ACCOUNT", "CALENDAR_UNAVAILABLE", "LOGIN_REQUIRED"].includes(result.code);
        setUncertain(!definitive);
        if (definitive) attempt.current = null;
        if (result.code === "SLOT_TAKEN") { setTime(""); goToStep(1); setReload(value => value + 1); }
        if (result.code === "LOGIN_REQUIRED") { setConnected(false); setLoginRequired(true); }
        throw new Error(result.error || "No se pudo completar la solicitud.");
      }
      if (result.booking.status === "creating") {
        setUncertain(true);
        setError("La creación quedó por verificar. Revisá el panel antes de iniciar otra solicitud; este reintento conserva la misma referencia.");
      } else {
        setBooking(result.booking);
        setUncertain(false);
      }
    } catch (error) {
      if (error instanceof TypeError) setUncertain(true);
      setError(error instanceof Error ? error.message : "No pudimos verificar el resultado. Revisá la agenda antes de repetirlo.");
    } finally { setSubmitting(false); }
  }

  if (booking) return <div className="calendar-demo calendar-result">
    <button className="calendar-close" type="button" onClick={() => resetRequest(true)} aria-label="Cerrar resultado y volver al inicio">×</button>
    <div className="calendar-result-heading" role="status" aria-live="polite">
      <span className="calendar-result-icon" aria-hidden="true">{booking.status === "rejected" ? "–" : "✓"}</span>
      <p className="calendar-kicker">{booking.status === "pending" ? "Recibimos tu solicitud" : "Solicitud de prueba"}</p>
      <h3>{booking.status === "pending" ? "Un paso más para tu cita" : booking.status === "confirmed" ? "Tu turno está confirmado" : "Solicitud rechazada"}</h3>
      <span className="calendar-status">{booking.status === "pending" ? "Pendiente de confirmación" : booking.status === "confirmed" ? "Confirmado" : "Rechazado"}</span>
    </div>
    <div className="calendar-receipt">
      <h4>{booking.service}</h4>
      <dl><div><dt>Profesional</dt><dd>{booking.professional}</dd></div><div><dt>Fecha y hora</dt><dd>{booking.date.split("-").reverse().join("/")} · {booking.time} h</dd></div></dl>
    </div>
    <p className="calendar-result-copy">{booking.status === "pending" ? "La responsable revisará tu solicitud y te responderá por WhatsApp. Puede demorar mientras está atendiendo." : booking.status === "confirmed" ? "La responsable confirmó el horario en la agenda. El mensaje de WhatsApp se envía por separado." : "El horario quedó liberado. Podés elegir otra opción."}</p>
    <p className="calendar-test-note">Esto es un ensayo, no un turno real. Todavía no se envió ningún WhatsApp desde este formulario.</p>
    {booking.notification !== "sent" && <p className="calendar-error">El aviso por correo no quedó confirmado. Revisá la solicitud en el panel.</p>}
    <div className="calendar-result-actions"><button className="button" type="button" onClick={() => resetRequest(true)}>Listo, volver al inicio ↗</button><button className="calendar-text-button" type="button" onClick={() => resetRequest()}>Prueba Solicitar Turno</button></div>
    <p className="calendar-close-help">Cerrar esta pantalla no cancela la solicitud.</p>
    <details className="calendar-reference"><summary>Ver referencia de la solicitud</summary><small>{booking.id}</small></details>
    <div className="calendar-demo-footer"><a href={`${API}/admin`} target="_blank" rel="noreferrer">Revisar como responsable ↗</a></div>
  </div>;

  return <div className="calendar-demo calendar-editorial">
    <div id="calendar-form-top" className="calendar-header" tabIndex={-1}><div><p className="calendar-kicker">Un espacio para vos</p><h3>Agendá tu <em>cita.</em></h3></div><span className="calendar-demo-badge">Demo</span></div>
    <p className="calendar-test-note">No genera turnos reales. Usá tu propio WhatsApp para probar.</p>
    {!connected ? <div className="calendar-connection" role="status">
      <h3>{checking ? "Comprobando conexión…" : loginRequired ? "Entrá a la prueba privada" : "Falta conectar la agenda"}</h3>
      <p>{ONLINE ? loginRequired ? "Usá la clave de la demo para probar solicitudes y revisar la agenda desde este dispositivo." : "La conexión de esta prueba todavía no está disponible. Volvé a comprobar en un momento." : "El formulario podrá consultar horarios y registrar solicitudes cuando autorices la conexión con Google."}</p>
      <a href={`${API}/admin${ONLINE ? "?next=booking" : ""}`}>{ONLINE ? "Entrar a la prueba ↗" : "Abrir configuración de la prueba ↗"}</a>
      <button className="reset-button" type="button" onClick={() => setReload(value => value + 1)}>Volver a comprobar</button>
    </div> : <form onSubmit={submit} className="calendar-form" noValidate>
      <ol className="calendar-progress" aria-label="Pasos de la solicitud"><li aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "current" : "complete"}><span>{step === 2 ? "✓" : "01"}</span> Tu cita</li><li aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "current" : ""}><span>02</span> Tus datos</li></ol>
      {step === 1 ? <>
      <fieldset disabled={busy} className="calendar-step">
        <legend>¿Con quién te gustaría?</legend>
        <div className="calendar-professionals" role="group" aria-label="Profesional">
          {professionals.map(person => <button type="button" key={person.name} aria-pressed={professional === person.name} className={professional === person.name ? "chosen" : ""} onClick={() => selectProfessional(person.name)}><span className="calendar-initial" aria-hidden="true">{person.initial}</span><span className="calendar-person-name">{person.name}</span><small>{person.specialty}</small><span className="calendar-choice-check" aria-hidden="true">{professional === person.name ? "✓" : ""}</span></button>)}
        </div>
      </fieldset>
      <fieldset disabled={busy} className="calendar-step">
        <legend>Elegí tu cuidado</legend>
        <div className="calendar-categories" role="group" aria-label="Tipo de servicio">{categories.map(item => <button type="button" key={item} aria-pressed={category === item} className={category === item ? "chosen" : ""} onClick={() => selectService(services.find(([, , group]) => group === item)![0])}>{item}</button>)}</div>
        <div className="calendar-services" role="group" aria-label="Servicio">{services.filter(([, , group]) => group === category).map(([title, minutes]) => <button type="button" key={title} className={service === title ? "chosen" : ""} aria-pressed={service === title} onClick={() => selectService(title)}><span className="calendar-service-radio" aria-hidden="true">{service === title ? "●" : ""}</span><span><strong>{title}</strong><small>{minutes} min</small></span></button>)}</div>
      </fieldset>
      {calendarUnavailable ? <div className="calendar-unavailable" role="status"><span className="calendar-unavailable-label">Agenda por conectar</span><h4>Los turnos de Sofía, próximamente</h4><p>Podés explorar sus servicios. Para consultar horarios y reservar con ella, falta conectar su calendario a esta demo.</p><button type="button" className="calendar-text-button" onClick={() => selectProfessional("Ludmila")}>Probar un turno de manos o pies ↗</button></div> : <fieldset disabled={busy} className="calendar-step calendar-date-step">
        <legend>Un día para vos</legend>
        <div className="calendar-date-strip" role="group" aria-label="Fechas próximas">{quickDates.map(day => <button key={day} type="button" className={date === day ? "chosen" : ""} aria-pressed={date === day} aria-label={new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00-03:00`))} onClick={() => selectDate(day)}><small>{new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(new Date(`${day}T12:00:00-03:00`)).replace(".", "")}</small><strong>{Number(day.slice(-2))}</strong></button>)}</div>
        <div className="calendar-date-picker"><span>{readableDate}</span><div><label htmlFor="calendar-date">Otra fecha</label><input id="calendar-date" type="date" required min={dateAfter(1)} max={dateAfter(30)} value={date} onChange={e => selectDate(e.target.value)} aria-invalid={!!fieldErrors.date} aria-describedby={fieldErrors.date ? "calendar-date-error" : undefined} /></div></div>
        {fieldErrors.date && <p id="calendar-date-error" className="calendar-field-error" role="alert">{fieldErrors.date}</p>}
        <div className="calendar-slot-heading"><span>Horarios disponibles</span><small>Hora de Argentina</small></div>
        <p className="calendar-slot-help" aria-live="polite">{loading ? "Buscando un lugar para vos…" : slots.length ? time ? `Elegiste las ${time} h` : "Tocá un horario para seleccionarlo." : error ? "No se pudo verificar la disponibilidad." : "No hay horarios para ese día. Probá otra fecha de martes a sábado."}</p>
        <div id="calendar-time" className="time-options" role="group" aria-label="Horario obligatorio" tabIndex={-1} aria-describedby={fieldErrors.time ? "calendar-time-error" : undefined}>{slots.map(slot => <button key={slot} type="button" aria-pressed={time === slot} className={time === slot ? "selected" : ""} onClick={() => { setTime(slot); setFieldErrors(current => ({ ...current, time: undefined })); }}>{slot}</button>)}</div>
        {fieldErrors.time && <p id="calendar-time-error" className="calendar-field-error" role="alert">{fieldErrors.time}</p>}
      </fieldset>}
      {!calendarUnavailable && <div className="calendar-selection-line"><span>{service}</span><small>{selectedService[1]} min · {professional}{time ? ` · ${time} h` : ""}</small></div>}
      </> : <>
      <button type="button" className="calendar-back" disabled={busy} onClick={() => goToStep(1)}>← Volver a mi cita</button>
      <div className="calendar-selected-receipt"><p className="calendar-kicker">Tu elección</p><h4>{service}</h4><p>{professional} · {selectedService[1]} min</p><strong>{readableDate} · {time} h</strong></div>
      <fieldset disabled={busy} className="calendar-step">
        <legend>¿Cómo te contactamos?</legend>
        <p className="calendar-required-note">Los dos campos son obligatorios.</p>
        <div className="calendar-fields"><div className="calendar-field">
        <label htmlFor="calendar-name">Nombre de la clienta *</label>
        <input id="calendar-name" required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e => { setName(e.target.value); setFieldErrors(current => ({ ...current, name: undefined })); }} placeholder="Tu nombre" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "calendar-name-error" : undefined} />
        {fieldErrors.name && <p id="calendar-name-error" className="calendar-field-error" role="alert">{fieldErrors.name}</p>}
        </div><div className="calendar-field">
        <label htmlFor="calendar-phone">WhatsApp con código de país *</label>
        <input id="calendar-phone" type="tel" required autoComplete="tel" value={phone} maxLength={24} onChange={e => { setPhone(e.target.value); setFieldErrors(current => ({ ...current, phone: undefined })); }} placeholder="+54 9 …" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? "phone-help calendar-phone-error" : "phone-help"} />
        {fieldErrors.phone && <p id="calendar-phone-error" className="calendar-field-error" role="alert">{fieldErrors.phone}</p>}
        </div></div>
        <small id="phone-help">Incluí +54 9, el código de área y tu número. La respuesta se prepara para este WhatsApp; no se envía automáticamente.</small>
      </fieldset>
      <div className="calendar-request-summary"><span>{time ? `${professional} · ${date.split("-").reverse().join("/")} · ${time} h` : "Falta elegir un horario"}</span><p>El horario se aparta como pendiente hasta que la responsable revise tu solicitud.</p></div>
      </>}
      {error && <p className="calendar-error" role="alert">{error}</p>}
      {uncertain && <p role="alert">No cambies los datos ni hagas otra reserva hasta verificar el resultado. Podés reintentar esta misma solicitud.</p>}
      {!calendarUnavailable && <button className="button calendar-submit" type="submit" disabled={loading || submitting}>{submitting ? "Registrando en Calendar…" : uncertain ? "Verificar la misma solicitud" : step === 1 ? "Continuar con mis datos" : "Solicitar turno"}<span aria-hidden="true">↗</span></button>}
      <div className="calendar-demo-footer"><a href={`${API}/admin`} target="_blank" rel="noreferrer">Panel de la responsable ↗</a></div>
    </form>}
  </div>;
}
