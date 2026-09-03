import assert from 'node:assert/strict';
import test from 'node:test';
import { createOnlineHandler } from '../integration/online-handler.mjs';

const origin = 'https://calendar-prueba--merida-beauty-studio-demo.netlify.app';
const env = {
  MERIDA_DEMO_ORIGIN: origin,
  MERIDA_SESSION_SECRET: 's'.repeat(48),
  MERIDA_DEMO_PASSWORD: 'clave-de-ensayo-larga',
  MERIDA_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/example_123/exec',
  MERIDA_APPS_SCRIPT_SECRET: 'g'.repeat(48),
};
const request = (path, options = {}) => new Request(origin + path, options);

async function login(handler, next = 'admin') {
  const result = await handler(request('/api/login', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password: env.MERIDA_DEMO_PASSWORD, next }),
  }));
  assert.equal(result.status, 303);
  return result.headers.get('set-cookie').split(';')[0];
}

test('requires a private session and never exposes integration secrets', async () => {
  const handler = createOnlineHandler(env, async () => { throw new Error('should not call Google'); });
  const config = await handler(request('/api/public/config'));
  assert.deepEqual(await config.json(), { connected: false, loginRequired: true, demo: true });
  const panel = await handler(request('/api/admin'));
  const text = await panel.text();
  assert.equal(panel.status, 200);
  assert.match(text, /Entrar a la prueba/);
  assert.doesNotMatch(text, new RegExp(env.MERIDA_APPS_SCRIPT_SECRET));
});

test('login creates a signed, host-bound session', async () => {
  const handler = createOnlineHandler(env, async () => Response.json({ ok: true }));
  const cookie = await login(handler, 'booking');
  const config = await handler(request('/api/public/config', { headers: { Cookie: cookie } }));
  assert.deepEqual(await config.json(), { connected: true, loginRequired: false, demo: true });
  const tampered = cookie.slice(0, -1) + (cookie.endsWith('a') ? 'b' : 'a');
  const invalid = await handler(request('/api/public/config', { headers: { Cookie: tampered } }));
  assert.equal((await invalid.json()).connected, false);
});

test('same-origin session forwards only allowlisted booking fields', async () => {
  let forwarded;
  const handler = createOnlineHandler(env, async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return Response.json({ ok: true, booking: { id: forwarded.requestId, status: 'pending' } });
  });
  const cookie = await login(handler);
  const fields = { requestId: '11111111-1111-1111-1111-111111111111', name: 'Prueba', phone: '+5491100000000', professional: 'Ludmila', service: 'Manicura', date: '2026-09-05', time: '10:00', action: 'decide', secret: 'attacker', endpoint: 'https://evil.test' };
  const result = await handler(request('/api/public/book', { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(fields) }));
  assert.equal(result.status, 200);
  assert.equal(forwarded.action, 'book');
  assert.equal(forwarded.secret, env.MERIDA_APPS_SCRIPT_SECRET);
  assert.equal(forwarded.endpoint, undefined);
});

test('rejects cross-site changes and admin calls without CSRF', async () => {
  const handler = createOnlineHandler(env, async () => Response.json({ ok: true, bookings: [] }));
  const cookie = await login(handler);
  const payload = JSON.stringify({});
  const foreign = await handler(request('/api/public/availability', { method: 'POST', headers: { Origin: 'https://evil.test', Cookie: cookie, 'Content-Type': 'application/json' }, body: payload }));
  assert.equal(foreign.status, 403);
  const noCsrf = await handler(request('/api/admin/list', { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: payload }));
  assert.equal(noCsrf.status, 403);
});

test('fails closed when a required secret is missing', async () => {
  const handler = createOnlineHandler({ ...env, MERIDA_APPS_SCRIPT_SECRET: '' });
  const result = await handler(request('/api/public/config'));
  assert.equal(result.status, 503);
  assert.equal((await result.json()).connected, false);
});
