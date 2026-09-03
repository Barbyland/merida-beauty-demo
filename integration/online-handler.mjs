import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = '__Host-merida_demo';
const TTL = 12 * 60 * 60;
const OWNER = 'barbydigital.dev@gmail.com';
const errors = {
  INVALID_INPUT: 'Revisá el nombre, WhatsApp, servicio y horario.',
  SLOT_TAKEN: 'Ese horario acaba de ocuparse. Elegí otro.',
  BUSY_RETRY: 'Otra solicitud se está procesando. Reintentá en un momento.',
  MANUAL_CONFLICT: 'Hay otro evento superpuesto. Revisá Calendar antes de confirmar.',
  STALE_BOOKING: 'El turno cambió o ya pasó. Revisalo en Calendar.',
  BOOKING_NOT_FOUND: 'El evento no está disponible. Revisá Calendar.',
  IDEMPOTENCY_CONFLICT: 'La referencia ya se utilizó con otros datos. Iniciá otra solicitud.',
  UNAUTHORIZED: 'La conexión con Google necesita revisión.',
  WRONG_ACCOUNT: 'La cuenta de Google no coincide con la cuenta de ensayo.',
  CALENDAR_UNAVAILABLE: 'No se pudo acceder a los calendarios PRUEBA.',
};
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
const response = (status, data) => Response.json(data, { status, headers });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const equal = (a, b) => timingSafeEqual(createHash('sha256').update(String(a)).digest(), createHash('sha256').update(String(b)).digest());
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url');
function html(content, meta = '') {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${meta}<title>MERIDA · Prueba privada</title><link rel="stylesheet" href="/booking-admin.css"></head><body><main>${content}</main></body></html>`;
}
function page(content, status = 200, extra = {}) {
  return new Response(content, { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', ...extra } });
}
function loginPage(next, error = '') {
  return html(`<header><p class="eyebrow">MERIDA · Ensayo online</p><h1>Entrar a la prueba</h1><p>Ingresá la clave de acceso para probar turnos y revisar las solicitudes desde este dispositivo.</p></header>${error ? `<p role="alert" class="warning">${escape(error)}</p>` : ''}<form method="post" action="/api/login"><input type="hidden" name="next" value="${next}"><label>Clave de la demo<input type="password" name="password" required autocomplete="current-password" maxlength="200"></label><button type="submit">Entrar</button></form><p class="notice">Solo agendas PRUEBA de Ludmila y Pricila. No son turnos reales.</p><a href="/#reservar">Volver a la web</a>`);
}
function adminPage(csrf) {
  return html(`<header><p class="eyebrow">MERIDA · Ensayo online</p><h1>Solicitudes de turno</h1><p>Cuenta responsable: <strong>${OWNER}</strong></p><a href="/#reservar">Probar una solicitud ↗</a></header><p class="notice">Solo calendarios PRUEBA de Ludmila y Pricila. Los WhatsApp se preparan para que vos los envíes.</p><p id="status" role="status" aria-live="polite">Comprobando conexión…</p><section aria-labelledby="requests-title"><div class="toolbar"><h2 id="requests-title">Agenda de solicitudes</h2><button id="refresh" type="button">Actualizar</button></div><p>Los pendientes bloquean el horario hasta que los confirmes o rechaces. No vencen automáticamente.</p><div id="bookings"></div></section><form method="post" action="/api/logout"><input type="hidden" name="csrf" value="${csrf}"><button type="submit">Cerrar sesión</button></form>`, `<meta name="csrf-token" content="${csrf}"><meta name="api-base" content="/api"><script src="/booking-admin.js" defer></script>`);
}
async function body(request, form = false) {
  const type = request.headers.get('content-type') || '';
  if (!type.startsWith(form ? 'application/x-www-form-urlencoded' : 'application/json')) throw new Error('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_INPUT');
  let size = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new Error('INVALID_INPUT'); }
    chunks.push(Buffer.from(value));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    const data = form ? Object.fromEntries(new URLSearchParams(text)) : JSON.parse(text);
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error();
    return data;
  } catch { throw new Error('INVALID_INPUT'); }
}

export function createOnlineHandler(env, fetchGoogle = fetch, now = Date.now) {
  const origin = env.MERIDA_DEMO_ORIGIN;
  const secret = env.MERIDA_SESSION_SECRET;
  const password = env.MERIDA_DEMO_PASSWORD;
  const endpoint = env.MERIDA_APPS_SCRIPT_URL;
  const googleSecret = env.MERIDA_APPS_SCRIPT_SECRET;
  const ready = /^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin || '') &&
    secret?.length >= 40 && password?.length >= 20 && googleSecret?.length >= 40 &&
    /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint || '');
  function session(request) {
    const token = (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    if (!token || token.length > 1500) return null;
    const [payload, signature, extra] = token.split('.');
    if (extra || !payload || !signature || !equal(signature, sign(payload, secret))) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (data.aud !== origin || !Number.isFinite(data.exp) || data.exp <= now() || data.exp > now() + TTL * 1000) return null;
      return { csrf: sign('csrf:' + token, secret) };
    } catch { return null; }
  }
  async function google(action, data) {
    // Never forward caller-provided actions, secrets, URLs or unknown fields.
    const fields = {
      health: [], list: [], decide: ['id', 'decision'],
      availability: ['professional', 'service', 'date'],
      book: ['professional', 'service', 'date', 'time', 'name', 'phone', 'requestId'],
    }[action];
    const input = Object.fromEntries(fields.filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]]));
    const answer = await fetchGoogle(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, action, secret: googleSecret }),
      signal: AbortSignal.timeout(45000), redirect: 'follow',
    });
    if (!answer.ok) throw new Error('CONNECTION_ERROR');
    let result;
    try { result = await answer.json(); } catch { throw new Error('CONNECTION_ERROR'); }
    if (!result.ok) throw new Error(Object.hasOwn(errors, result.code) ? result.code : 'GOOGLE_ERROR');
    if (action === 'health' && (result.owner !== OWNER || result.professionals?.join(',') !== 'Ludmila,Pricila')) throw new Error('WRONG_ACCOUNT');
    return result;
  }
  return async request => {
    const url = new URL(request.url);
    if (!ready || url.origin !== origin) return response(503, { ok: false, connected: false, code: 'NOT_CONFIGURED', error: 'Esta prueba online todavía no está habilitada.' });
    const loggedIn = session(request);
    if (request.method === 'GET' && url.pathname === '/api/public/config') return response(200, { connected: !!loggedIn, loginRequired: !loggedIn, demo: true });
    if (request.method === 'GET' && url.pathname === '/api/admin') {
      const next = url.searchParams.get('next') === 'booking' ? 'booking' : 'admin';
      if (!loggedIn) return page(loginPage(next));
      if (next === 'booking') return new Response(null, { status: 303, headers: { ...headers, Location: '/#reservar' } });
      return page(adminPage(loggedIn.csrf));
    }
    if (request.method !== 'POST') return response(404, { ok: false, error: 'No encontrado.' });
    if (request.headers.get('origin') !== origin) return response(403, { ok: false, error: 'Solicitud no autorizada.' });
    try {
      if (url.pathname === '/api/login') {
        const data = await body(request, true);
        const next = data.next === 'booking' ? 'booking' : 'admin';
        if (typeof data.password !== 'string' || !equal(data.password, password)) return page(loginPage(next, 'La clave no es correcta.'), 401);
        const payload = Buffer.from(JSON.stringify({ aud: origin, exp: now() + TTL * 1000, nonce: randomBytes(24).toString('base64url') })).toString('base64url');
        return new Response(null, { status: 303, headers: { ...headers, Location: next === 'booking' ? '/#reservar' : '/api/admin', 'Set-Cookie': `${COOKIE}=${payload}.${sign(payload, secret)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${TTL}` } });
      }
      if (!loggedIn) return response(401, { ok: false, code: 'LOGIN_REQUIRED', error: 'La sesión venció. Volvé a entrar a la prueba.' });
      if (url.pathname === '/api/logout') {
        const data = await body(request, true);
        if (!equal(data.csrf || '', loggedIn.csrf)) return response(403, { ok: false, error: 'Solicitud no autorizada.' });
        return new Response(null, { status: 303, headers: { ...headers, Location: '/api/admin', 'Set-Cookie': `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0` } });
      }
      const actions = { '/api/public/availability': 'availability', '/api/public/book': 'book', '/api/admin/list': 'list', '/api/admin/decide': 'decide', '/api/admin/health': 'health' };
      const action = actions[url.pathname];
      if (!action) return response(404, { ok: false, error: 'No encontrado.' });
      if (url.pathname.startsWith('/api/admin/') && !equal(request.headers.get('x-demo-csrf') || '', loggedIn.csrf)) return response(403, { ok: false, error: 'Solicitud no autorizada.' });
      return response(200, await google(action, await body(request)));
    } catch (error) {
      const code = error.message;
      const status = code === 'INVALID_INPUT' ? 400 : ['SLOT_TAKEN', 'MANUAL_CONFLICT', 'STALE_BOOKING', 'IDEMPOTENCY_CONFLICT'].includes(code) ? 409 : 503;
      return response(status, { ok: false, code: Object.hasOwn(errors, code) ? code : 'CONNECTION_ERROR', error: errors[code] || 'No pudimos verificar la respuesta de Google. La solicitud podría haberse guardado: reintentá con los mismos datos y revisá el panel.' });
    }
  };
}
