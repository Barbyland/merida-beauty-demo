import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createDemoServer, validEndpoint } from '../integration/demo-server.mjs';

const source = await readFile(new URL('../integration/google-calendar/Code.gs', import.meta.url), 'utf8');
const calendarIds = {
  Ludmila: 'a526ff1e03bf741867dc7fb979ead01ae1c6878e5d2236c10ad7bd5cdb321621@group.calendar.google.com',
  Pricila: '118d6f5198efee76f8c35fb2bcb6f303278f4ec7dd0286ba07986d38ed8b00ac@group.calendar.google.com',
};
const base = { requestId: '11111111-1111-4111-8111-111111111111', professional: 'Ludmila', service: 'Esmaltado semipermanente', date: '2026-09-03', time: '10:00', name: 'Clienta de prueba', phone: '+5491100000000' };

function harness({ mailFails = false, lockBusy = false } = {}) {
  const events = { Ludmila: [], Pricila: [] };
  const properties = { DEMO_SECRET: 'test-only-secret' };
  const mails = [];
  class DemoDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-09-02T15:00:00Z'])); }
    static now() { return new Date('2026-09-02T15:00:00Z').getTime(); }
  }
  function event(professional, start, end, title = 'Manual', description = '') {
    const item = { id: `${professional}-${events[professional].length}`, start, end, title, description, transparency: 'opaque',
      getId() { return this.id; }, getStartTime() { return this.start; }, getEndTime() { return this.end; },
      getDescription() { return this.description; }, getTransparency() { return this.transparency; },
      setTransparency(value) { this.transparency = value; return this; }, setTitle(value) { this.title = value; return this; } };
    events[professional].push(item);
    return item;
  }
  const calendars = Object.fromEntries(Object.keys(events).map(name => [calendarIds[name], {
    getName: () => `PRUEBA MERIDA ${name}`,
    getEvents: (start, end) => events[name].filter(e => e.start < end && e.end > start),
    createEvent: (title, start, end, options) => event(name, start, end, title, options.description),
    getEventById: id => events[name].find(e => e.id === id) || null,
  }]));
  const context = vm.createContext({
    Date: DemoDate, console,
    Session: { getEffectiveUser: () => ({ getEmail: () => 'barbydigital.dev@gmail.com' }) },
    CalendarApp: { getCalendarById: id => calendars[id], EventTransparency: { OPAQUE: 'opaque', TRANSPARENT: 'transparent' } },
    LockService: { getScriptLock: () => ({ tryLock: () => !lockBusy, releaseLock() {}, hasLock: () => !lockBusy }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => properties[key] || null,
      setProperty: (key, value) => { properties[key] = value; },
      getProperties: () => ({ ...properties }),
    }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
    Utilities: { formatDate: date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(date) },
    MailApp: { sendEmail: data => { if (mailFails) throw new Error('quota'); mails.push(data); } },
  });
  vm.runInContext(source, context);
  const call = (action, fields = {}, secret = 'test-only-secret') => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ ...fields, action, secret }) } }).text);
  return { call, events, event, properties, mails };
}

test('pending booking blocks its full duration only for its professional, and notifies the configured owner', () => {
  const h = harness();
  const result = h.call('book', base);
  assert.equal(result.booking.status, 'pending');
  assert.match(h.events.Ludmila[0].title, /PENDIENTE/);
  assert.equal(h.events.Ludmila[0].transparency, 'opaque');
  const own = h.call('availability', base).slots;
  assert.ok(!own.includes('10:00') && !own.includes('10:45'));
  assert.ok(own.includes('11:00'));
  assert.ok(h.call('availability', { ...base, professional: 'Pricila' }).slots.includes('10:00'));
  assert.equal(h.mails.length, 1);
  assert.equal(h.mails[0].to, 'barbydigital.dev@gmail.com');
  assert.match(h.mails[0].subject, /PRUEBA MERIDA/);
});

test('a repeated request is idempotent; a different request cannot take the same slot', () => {
  const h = harness();
  h.call('book', base);
  assert.equal(h.call('book', base).booking.id, base.requestId);
  assert.equal(h.events.Ludmila.length, 1);
  assert.equal(h.mails.length, 1);
  assert.equal(h.call('book', { ...base, name: 'Otro nombre' }).code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(h.call('book', { ...base, requestId: '22222222-2222-4222-8222-222222222222' }).code, 'SLOT_TAKEN');
});

test('confirmation updates the original event and returns an unsent WhatsApp link', () => {
  const h = harness();
  h.call('book', base);
  const result = h.call('decide', { id: base.requestId, decision: 'confirm' });
  assert.equal(result.booking.status, 'confirmed');
  assert.match(h.events.Ludmila[0].title, /CONFIRMADO/);
  assert.equal(h.events.Ludmila.length, 1);
  assert.match(result.whatsappUrl, /^https:\/\/wa\.me\/5491100000000\?text=/);
  assert.equal(h.mails.length, 1);
});

test('rejection releases the time while keeping an audit event', () => {
  const h = harness();
  h.call('book', base);
  assert.equal(h.call('decide', { id: base.requestId, decision: 'reject' }).booking.status, 'rejected');
  assert.equal(h.events.Ludmila.length, 1);
  assert.equal(h.events.Ludmila[0].transparency, 'transparent');
  assert.ok(h.call('availability', base).slots.includes('10:00'));
});

test('manual overlap after booking is flagged and prevents confirmation', () => {
  const h = harness();
  h.call('book', base);
  h.event('Ludmila', new Date('2026-09-03T10:30:00-03:00'), new Date('2026-09-03T12:00:00-03:00'));
  assert.equal(h.call('list').bookings[0].conflict, true);
  assert.equal(h.call('decide', { id: base.requestId, decision: 'confirm' }).code, 'MANUAL_CONFLICT');
});

test('manual rescheduling cannot send confirmation for the old time', () => {
  const h = harness();
  h.call('book', base);
  h.events.Ludmila[0].start = new Date('2026-09-03T15:00:00-03:00');
  h.events.Ludmila[0].end = new Date('2026-09-03T16:00:00-03:00');
  assert.equal(h.call('list').bookings[0].changed, true);
  assert.equal(h.call('decide', { id: base.requestId, decision: 'confirm' }).code, 'STALE_BOOKING');
});

test('email failure does not lose the event or falsely report a delivered notification', () => {
  const h = harness({ mailFails: true });
  const result = h.call('book', base);
  assert.equal(result.booking.status, 'pending');
  assert.equal(result.booking.notification, 'failed');
  assert.equal(h.events.Ludmila.length, 1);
});

test('validates hours, calendar allowlist, name, phone, closed days and access', () => {
  const h = harness();
  for (const change of [{ time: '12:30' }, { professional: 'primary' }, { phone: '123' }, { name: '<script>' }, { date: '2026-09-02' }, { date: '2026-09-06' }, { time: '25:00' }, { date: '2026-02-30' }]) {
    assert.equal(h.call('book', { ...base, ...change }).code, 'INVALID_INPUT', JSON.stringify(change));
  }
  assert.equal(h.call('book', base, 'wrong').code, 'UNAUTHORIZED');
  assert.equal(h.events.Ludmila.length, 0);
  assert.equal(harness({ lockBusy: true }).call('book', base).code, 'BUSY_RETRY');
});

test('an all-day busy block prevents appointments, a free event does not', () => {
  const h = harness();
  const block = h.event('Ludmila', new Date('2026-09-03T00:00:00-03:00'), new Date('2026-09-04T00:00:00-03:00'));
  assert.equal(h.call('availability', base).slots.length, 0);
  block.transparency = 'transparent';
  assert.ok(h.call('availability', base).slots.length > 0);
});

test('only Google Apps Script deployment endpoints may be configured', () => {
  assert.equal(validEndpoint('https://script.google.com/macros/s/demo-id/exec'), true);
  for (const url of ['http://script.google.com/macros/s/id/exec', 'https://evil.test/exec', 'https://script.google.com.evil.test/macros/s/id/exec', 'http://127.0.0.1/exec']) assert.equal(validEndpoint(url), false);
});

test('local bridge rejects untrusted sites and unauthenticated administration', async () => {
  // Conservar Host explícito al probar en un puerto efímero.
  const fetch = (url, options) => new Promise((resolve, reject) => {
    const req = httpRequest(url, { method: options.method || 'GET', headers: options.headers }, res => {
      let content = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { content += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, text: async () => content, headers: { get: name => res.headers[name] } }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
  const server = createDemoServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    const headers = { Host: '127.0.0.1:3001', 'Content-Type': 'application/json' };
    const foreign = await fetch(url + '/public/book', { method: 'POST', headers: { ...headers, Origin: 'https://evil.test' }, body: '{}' });
    assert.equal(foreign.status, 403);
    const admin = await fetch(url + '/admin/list', { method: 'POST', headers: { ...headers, Origin: 'http://127.0.0.1:3000' }, body: '{}' });
    assert.equal(admin.status, 403);
    const wrongHost = await fetch(url + '/public/config', { headers: { Host: 'evil.test' } });
    assert.equal(wrongHost.status, 403);
    const calendarLink = await fetch(url + '/admin', { headers: { Host: '127.0.0.1:3001', 'Sec-Fetch-Site': 'cross-site' } });
    assert.equal(calendarLink.status, 200);
    const landing = await calendarLink.text();
    assert.match(landing, /href="\/admin"/);
    assert.doesNotMatch(landing, /csrf-token|id="bookings"|admin\.js/);
    assert.match(calendarLink.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    const direct = await fetch(url + '/admin', { headers: { Host: '127.0.0.1:3001', 'Sec-Fetch-Site': 'same-origin' } });
    assert.match(await direct.text(), /csrf-token/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
