/* MERIDA: integración de ensayo. Solo opera sobre los dos calendarios PRUEBA. */
const DEMO_OWNER = 'barbydigital.dev@gmail.com';
const DEMO_ZONE = 'America/Argentina/Buenos_Aires';
const DEMO_CALENDARS = {
  Ludmila: 'a526ff1e03bf741867dc7fb979ead01ae1c6878e5d2236c10ad7bd5cdb321621@group.calendar.google.com',
  Pricila: '118d6f5198efee76f8c35fb2bcb6f303278f4ec7dd0286ba07986d38ed8b00ac@group.calendar.google.com',
};
const DEMO_SERVICES = {
  'Manicura': 30,
  'Esmaltado semipermanente': 60,
  'Kapping nivelación': 75,
  'Esculpidas': 120,
  'Belleza de pies': 45,
  'Pies + semipermanente': 75,
};

// Ejecutar UNA VEZ desde el editor, con la cuenta Barby Digital.
// No crea ni modifica turnos. La clave se copia solo al panel local de conexión.
function prepararPrueba() {
  if (Session.getEffectiveUser().getEmail() !== DEMO_OWNER) {
    throw new Error('Abrí este proyecto con ' + DEMO_OWNER);
  }
  Object.keys(DEMO_CALENDARS).forEach(calendarFor_);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('DEMO_SECRET')) {
    props.setProperty('DEMO_SECRET', Utilities.getUuid() + Utilities.getUuid());
  }
  console.log('Clave de conexión (no compartir): ' + props.getProperty('DEMO_SECRET'));
  console.log('Calendarios de ensayo verificados. Destinatario de avisos: ' + DEMO_OWNER);
}

function doGet() {
  return json_({ ok: true, message: 'MERIDA: conexión de prueba. Requiere autorización.' });
}

function doPost(e) {
  let lock;
  try {
    const data = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('DEMO_SECRET');
    if (!secret || data.secret !== secret) throw new Error('UNAUTHORIZED');
    if (Session.getEffectiveUser().getEmail() !== DEMO_OWNER) throw new Error('WRONG_ACCOUNT');
    const allowed = ['health', 'availability', 'book', 'list', 'decide'];
    if (allowed.indexOf(data.action) < 0) throw new Error('INVALID_ACTION');
    // Todas las reservas web pasan por el mismo bloqueo. No bloquea ediciones
    // manuales realizadas en Google Calendar por fuera de este script.
    lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) throw new Error('BUSY_RETRY');
    if (data.action === 'health') {
      Object.keys(DEMO_CALENDARS).forEach(calendarFor_);
      return json_({ ok: true, owner: DEMO_OWNER, professionals: Object.keys(DEMO_CALENDARS) });
    }
    if (data.action === 'availability') return json_({ ok: true, slots: slots_(data) });
    if (data.action === 'book') return json_(book_(data));
    if (data.action === 'list') return json_({ ok: true, bookings: list_() });
    return json_(decide_(data));
  } catch (error) {
    const known = ['UNAUTHORIZED', 'WRONG_ACCOUNT', 'INVALID_ACTION', 'BUSY_RETRY',
      'INVALID_INPUT', 'CALENDAR_UNAVAILABLE', 'SLOT_TAKEN', 'BOOKING_NOT_FOUND',
      'MANUAL_CONFLICT', 'STALE_BOOKING', 'IDEMPOTENCY_CONFLICT'];
    return json_({ ok: false, code: known.indexOf(error.message) >= 0 ? error.message : 'GOOGLE_ERROR' });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function calendarFor_(professional) {
  if (!Object.prototype.hasOwnProperty.call(DEMO_CALENDARS, professional)) throw new Error('INVALID_INPUT');
  const calendar = CalendarApp.getCalendarById(DEMO_CALENDARS[professional]);
  if (!calendar || !/^PRUEBA/i.test(calendar.getName())) throw new Error('CALENDAR_UNAVAILABLE');
  return calendar;
}

function validateSlot_(data) {
  if (!Object.prototype.hasOwnProperty.call(DEMO_SERVICES, data.service) ||
      !Object.prototype.hasOwnProperty.call(DEMO_CALENDARS, data.professional) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('INVALID_INPUT');
  const date = new Date(data.date + 'T12:00:00-03:00');
  if (isNaN(date.getTime()) || Utilities.formatDate(date, DEMO_ZONE, 'yyyy-MM-dd') !== data.date) throw new Error('INVALID_INPUT');
  const today = Utilities.formatDate(new Date(), DEMO_ZONE, 'yyyy-MM-dd');
  if (data.date <= today || date.getTime() > Date.now() + 31 * 86400000) throw new Error('INVALID_INPUT');
  const weekday = date.getUTCDay();
  if (weekday < 2 || weekday > 6) return [];
  const minutes = DEMO_SERVICES[data.service];
  const candidates = [];
  [[600, 780], [900, 1140]].forEach(function (window) {
    for (let start = window[0]; start + minutes <= window[1]; start += 15) {
      candidates.push(String(Math.floor(start / 60)).padStart(2, '0') + ':' + String(start % 60).padStart(2, '0'));
    }
  });
  return candidates;
}

function interval_(data) {
  const start = new Date(data.date + 'T' + data.time + ':00-03:00');
  return { start: start, end: new Date(start.getTime() + DEMO_SERVICES[data.service] * 60000) };
}

function overlaps_(calendar, start, end, ignoredId) {
  return calendar.getEvents(start, end).some(function (event) {
    if (event.getId() === ignoredId) return false;
    if (event.getTransparency() === CalendarApp.EventTransparency.TRANSPARENT) return false;
    return event.getStartTime().getTime() < end.getTime() && event.getEndTime().getTime() > start.getTime();
  });
}

function slots_(data) {
  const candidates = validateSlot_(data);
  const calendar = calendarFor_(data.professional);
  // Una lectura por día, no una llamada a Calendar por cada casillero.
  const events = calendar.getEvents(new Date(data.date + 'T00:00:00-03:00'), new Date(data.date + 'T23:59:59-03:00'));
  return candidates.filter(function (time) {
    const span = interval_({ date: data.date, time: time, service: data.service });
    return !events.some(function (event) {
      return event.getTransparency() !== CalendarApp.EventTransparency.TRANSPARENT &&
        event.getStartTime().getTime() < span.end.getTime() && event.getEndTime().getTime() > span.start.getTime();
    });
  });
}

function readRecord_(id) {
  if (!/^[a-f0-9-]{36}$/.test(id || '')) throw new Error('INVALID_INPUT');
  const raw = PropertiesService.getScriptProperties().getProperty('booking_' + id);
  return raw ? JSON.parse(raw) : null;
}

function saveRecord_(record) {
  PropertiesService.getScriptProperties().setProperty('booking_' + record.id, JSON.stringify(record));
}

function book_(data) {
  if (!/^[a-f0-9-]{36}$/.test(data.requestId || '') ||
      typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 80 ||
      /[\r\n<>]/.test(data.name) || !/^\+[1-9]\d{7,14}$/.test(data.phone || '') ||
      !/^\d{2}:\d{2}$/.test(data.time || '')) throw new Error('INVALID_INPUT');
  const previous = readRecord_(data.requestId);
  const fingerprint = JSON.stringify([data.name.trim(), data.phone, data.professional, data.service, data.date, data.time]);
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error('IDEMPOTENCY_CONFLICT');
    return { ok: true, booking: publicBooking_(previous) };
  }
  if (validateSlot_(data).indexOf(data.time) < 0) throw new Error('INVALID_INPUT');
  const calendar = calendarFor_(data.professional);
  const span = interval_(data);
  if (overlaps_(calendar, span.start, span.end)) throw new Error('SLOT_TAKEN');
  const title = 'PRUEBA · PENDIENTE · ' + data.name.trim() + ' · ' + data.professional + ' · ' + data.service;
  const description = 'ENSAYO MERIDA: no es un turno real.\nWhatsApp: ' + data.phone +
    '\nSolicitud: ' + data.requestId + '\nRevisar en http://127.0.0.1:3001/admin\nSin confirmación automática a la clienta.';
  // Guardar primero la intención: permite recuperar un resultado incierto sin
  // crear otro evento con el mismo identificador de solicitud.
  const record = { id: data.requestId, fingerprint: fingerprint, status: 'creating', name: data.name.trim(),
    phone: data.phone, professional: data.professional, service: data.service,
    date: data.date, time: data.time, createdAt: new Date().toISOString(), notification: 'pending' };
  saveRecord_(record);
  const event = calendar.createEvent(title, span.start, span.end, { description: description });
  record.eventId = event.getId();
  record.status = 'pending';
  // Calendar crea eventos opacos (ocupados) por defecto; lo explicitamos.
  event.setTransparency(CalendarApp.EventTransparency.OPAQUE);
  saveRecord_(record);
  try {
    MailApp.sendEmail({ to: DEMO_OWNER, subject: '[PRUEBA MERIDA] Nueva solicitud: ' + data.name.trim(),
      body: title + '\n' + data.date + ' ' + data.time + ' (Argentina)\nWhatsApp: ' + data.phone +
        '\n\nRevisar desde esta computadora: http://127.0.0.1:3001/admin\nLa solicitud está pendiente; aún no se envió ningún WhatsApp.' });
    record.notification = 'sent';
  } catch (_) { record.notification = 'failed'; }
  saveRecord_(record);
  return { ok: true, booking: publicBooking_(record) };
}

function publicBooking_(record) {
  return { id: record.id, status: record.status, professional: record.professional, service: record.service,
    date: record.date, time: record.time, notification: record.notification };
}

function list_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(props).filter(function (key) { return key.indexOf('booking_') === 0; }).map(function (key) {
    const record = JSON.parse(props[key]);
    const calendar = calendarFor_(record.professional);
    let event = record.eventId ? calendar.getEventById(record.eventId) : null;
    // Recuperación de una creación interrumpida después de escribir en Calendar.
    if (!event && record.status === 'creating') {
      const span = interval_(record);
      event = calendar.getEvents(span.start, span.end).find(function (candidate) {
        return candidate.getDescription().indexOf('Solicitud: ' + record.id) >= 0;
      });
      if (event) { record.eventId = event.getId(); record.status = 'pending'; saveRecord_(record); }
    }
    const result = Object.assign({}, record);
    delete result.fingerprint;
    result.missing = !event;
    result.conflict = event ? overlaps_(calendar, event.getStartTime(), event.getEndTime(), event.getId()) : false;
    const original = interval_(record);
    result.changed = event ? event.getStartTime().getTime() !== original.start.getTime() || event.getEndTime().getTime() !== original.end.getTime() : false;
    return result;
  }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 100);
}

function decide_(data) {
  if (['confirm', 'reject'].indexOf(data.decision) < 0) throw new Error('INVALID_INPUT');
  const record = readRecord_(data.id);
  if (!record || !record.eventId) throw new Error('BOOKING_NOT_FOUND');
  if (record.status !== 'pending' && record.status !== (data.decision === 'confirm' ? 'confirmed' : 'rejected')) throw new Error('STALE_BOOKING');
  const calendar = calendarFor_(record.professional);
  const event = calendar.getEventById(record.eventId);
  if (!event) throw new Error('BOOKING_NOT_FOUND');
  const span = interval_(record);
  if (data.decision === 'confirm') {
    if (span.start.getTime() <= Date.now() || event.getStartTime().getTime() !== span.start.getTime() ||
        event.getEndTime().getTime() !== span.end.getTime()) throw new Error('STALE_BOOKING');
    if (overlaps_(calendar, span.start, span.end, event.getId())) throw new Error('MANUAL_CONFLICT');
    event.setTitle('PRUEBA · CONFIRMADO · ' + record.name + ' · ' + record.professional + ' · ' + record.service);
    event.setTransparency(CalendarApp.EventTransparency.OPAQUE);
    record.status = 'confirmed';
  } else {
    // Conservar el rastro del ensayo, liberando el horario sin borrar el evento.
    event.setTransparency(CalendarApp.EventTransparency.TRANSPARENT);
    event.setTitle('PRUEBA · RECHAZADO · ' + record.name + ' · ' + record.professional + ' · ' + record.service);
    record.status = 'rejected';
  }
  saveRecord_(record);
  const message = record.status === 'confirmed'
    ? 'Hola ' + record.name + ', confirmamos tu turno de PRUEBA para ' + record.service + ' con ' + record.professional + ' el ' + record.date + ' a las ' + record.time + ' h. Es un ensayo, no un turno real.'
    : 'Hola ' + record.name + ', no podemos confirmar el horario solicitado en esta PRUEBA. Podemos coordinar otra opción. Es un ensayo, no un turno real.';
  return { ok: true, booking: publicBooking_(record), whatsappUrl: 'https://wa.me/' + record.phone.slice(1) + '?text=' + encodeURIComponent(message) };
}
