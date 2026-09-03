import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const port = 3001;
const allowedHosts = new Set(['127.0.0.1:3001', 'localhost:3001']);
const adminOrigins = new Set(['http://127.0.0.1:3001', 'http://localhost:3001']);
const siteOrigins = new Set(['http://127.0.0.1:3000', 'http://localhost:3000']);
const csrf = randomBytes(32).toString('hex');
const localDir = new URL('../.booking-demo/', import.meta.url);
const configPath = new URL('config.json', localDir);
const messages = {
  UNAUTHORIZED: 'La clave de conexión no es válida. Revisá la configuración.',
  WRONG_ACCOUNT: 'El script debe ejecutarse con barbydigital.dev@gmail.com.',
  CALENDAR_UNAVAILABLE: 'No se pudo acceder a uno de los calendarios PRUEBA.',
  INVALID_INPUT: 'Revisá el nombre, WhatsApp, servicio y horario.',
  SLOT_TAKEN: 'Ese horario acaba de ocuparse. Elegí otro.',
  BUSY_RETRY: 'Otra solicitud se está procesando. Reintentá en un momento.',
  MANUAL_CONFLICT: 'Hay otro evento superpuesto. Revisá Calendar antes de confirmar.',
  STALE_BOOKING: 'El turno cambió o ya pasó. Revisalo en Calendar antes de continuar.',
  BOOKING_NOT_FOUND: 'El evento no está disponible. Revisá Calendar.',
  IDEMPOTENCY_CONFLICT: 'Esa solicitud ya se utilizó con otros datos. Iniciá una nueva.',
  GOOGLE_ERROR: 'Google no pudo completar la operación. Revisá la agenda antes de repetirla.',
  NOT_CONFIGURED: 'Falta conectar Google Calendar desde el panel de prueba.',
};

async function getConfig() {
  try { return JSON.parse(await readFile(configPath, 'utf8')); } catch { return null; }
}

export function validEndpoint(value) {
  return typeof value === 'string' && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value);
}

async function google(action, args = {}, override) {
  const config = override || await getConfig();
  if (!config) throw Object.assign(new Error(messages.NOT_CONFIGURED), { code: 'NOT_CONFIGURED' });
  const response = await fetch(config.endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...args, action, secret: config.secret }),
    signal: AbortSignal.timeout(45000), redirect: 'follow',
  });
  if (!response.ok) throw new Error('No se pudo contactar con Google. Revisá la implementación de Apps Script.');
  let result;
  try { result = await response.json(); } catch {
    throw new Error('Google no devolvió la conexión esperada. Revisá que sea la URL /exec de una aplicación web.');
  }
  if (!result.ok) throw Object.assign(new Error(messages[result.code] || messages.GOOGLE_ERROR), { code: result.code });
  return result;
}

function respond(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

async function body(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('Formato de solicitud no válido.');
  const buffers = [];
  let size = 0;
  for await (const buffer of req) {
    size += buffer.length;
    if (size > 8192) throw new Error('Solicitud demasiado grande.');
    buffers.push(buffer);
  }
  return JSON.parse(Buffer.concat(buffers).toString('utf8'));
}

function adminAuthorized(req) {
  const token = req.headers['x-demo-csrf'];
  return adminOrigins.has(req.headers.origin) && typeof token === 'string' && token.length === csrf.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(csrf));
}

export function createDemoServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const host = req.headers.host;
    if (!allowedHosts.has(host)) return respond(res, 403, { error: 'Solo disponible en esta computadora.' });
    const path = new URL(req.url, 'http://' + host).pathname;
    const isPublic = path.startsWith('/public/');
    const origin = req.headers.origin;
    if (isPublic && siteOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.writeHead(isPublic && siteOrigins.has(origin) ? 204 : 403); return res.end(); }
    try {
      if (req.method === 'GET' && path === '/public/config') {
        return respond(res, 200, { connected: Boolean(await getConfig()), owner: 'barbydigital.dev@gmail.com', demo: true });
      }
      if (req.method === 'GET' && (path === '/admin' || path === '/')) {
        // Los enlaces de Calendar/correo llegan desde otro sitio. Esta portada
        // no expone turnos ni tokens; el clic siguiente abre el panel desde aquí.
        if (req.headers['sec-fetch-site'] === 'cross-site') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" });
          return res.end('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MERIDA · Abrir agenda</title><link rel="stylesheet" href="/admin.css"></head><body><main><p class="eyebrow">MERIDA · Ensayo privado</p><h1>Abrir agenda de prueba</h1><p>Entrá al panel para revisar las solicitudes y confirmar los turnos. Esta prueba funciona en la computadora donde está encendida la demo.</p><a href="/admin" rel="noreferrer">Entrar al panel de solicitudes →</a></main></body></html>');
        }
        const html = (await readFile(new URL('./admin.html', import.meta.url), 'utf8')).replace('__CSRF__', csrf);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
        return res.end(html);
      }
      const files = {
        '/admin.js': ['admin.js', 'text/javascript; charset=utf-8'],
        '/admin.css': ['admin.css', 'text/css; charset=utf-8'],
        '/Code.gs': ['google-calendar/Code.gs', 'text/plain; charset=utf-8'],
      };
      if (req.method === 'GET' && files[path]) {
        const [file, mime] = files[path];
        res.writeHead(200, { 'Content-Type': mime });
        return res.end(await readFile(new URL(file, import.meta.url)));
      }
      if (req.method !== 'POST') return respond(res, 404, { error: 'No encontrado.' });
      if (isPublic ? !siteOrigins.has(origin) : !adminAuthorized(req)) return respond(res, 403, { error: 'Solicitud no autorizada.' });
      const data = await body(req);
      if (path === '/admin/connect') {
        if (!validEndpoint(data.endpoint) || typeof data.secret !== 'string' || data.secret.length < 40 || data.secret.length > 200) {
          return respond(res, 400, { error: 'Ingresá la URL /exec de Apps Script y la clave generada en prepararPrueba.' });
        }
        const config = { endpoint: data.endpoint, secret: data.secret };
        const result = await google('health', {}, config);
        if (result.owner !== 'barbydigital.dev@gmail.com') throw new Error('La cuenta no coincide con Barby Digital.');
        await mkdir(localDir, { recursive: true });
        await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
        return respond(res, 200, { ok: true, owner: result.owner });
      }
      const actions = { '/public/availability': 'availability', '/public/book': 'book', '/admin/list': 'list', '/admin/decide': 'decide', '/admin/health': 'health' };
      if (!actions[path]) return respond(res, 404, { error: 'No encontrado.' });
      return respond(res, 200, await google(actions[path], data));
    } catch (error) {
      const status = ['SLOT_TAKEN', 'MANUAL_CONFLICT', 'STALE_BOOKING', 'IDEMPOTENCY_CONFLICT'].includes(error.code) ? 409 : 503;
      // No volcar credenciales, respuestas de Google ni datos de clientas al log.
      const message = error.name === 'TimeoutError' ? 'La respuesta demoró. El turno podría haberse guardado: reintentá sin cambiar los datos y revisá el panel.' : error.message;
      return respond(res, status, { ok: false, code: error.code || 'CONNECTION_ERROR', error: message });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createDemoServer().listen(port, '127.0.0.1', () => {
    console.log('Prueba Calendar: http://127.0.0.1:3001/admin (solo esta computadora)');
  });
}
