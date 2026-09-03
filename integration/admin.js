const csrf = document.querySelector('meta[name="csrf-token"]').content;
const apiBase = document.querySelector('meta[name="api-base"]')?.content || '';
const status = document.querySelector('#status');
const container = document.querySelector('#bookings');
const labels = { pending: 'Pendiente', confirmed: 'Confirmado', rejected: 'Rechazado', creating: 'Resultado por verificar' };

async function call(path, data = {}) {
  const response = await fetch(apiBase + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-CSRF': csrf }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function load() {
  status.textContent = 'Consultando Google Calendar…';
  try {
    const result = await call('/admin/list');
    container.replaceChildren();
    if (!result.bookings.length) container.append(element('p', 'Todavía no hay solicitudes creadas desde la web. Los eventos manuales se consideran al comprobar disponibilidad.'));
    for (const booking of result.bookings) {
      const card = element('article', '', 'booking');
      card.append(element('p', labels[booking.status] || booking.status, 'badge'));
      card.append(element('h3', booking.name + ' · ' + booking.professional));
      card.append(element('p', booking.service + ' · ' + booking.date + ' · ' + booking.time + ' h (Argentina)'));
      card.append(element('p', 'WhatsApp: ' + booking.phone));
      card.append(element('small', 'Referencia: ' + booking.id));
      if (booking.conflict) card.append(element('p', 'Hay otro evento superpuesto. Resolver en Calendar antes de confirmar.', 'warning'));
      if (booking.changed) card.append(element('p', 'El horario cambió manualmente. Revisar en Calendar; esta pantalla no confirmará el horario anterior.', 'warning'));
      if (booking.missing) card.append(element('p', 'El evento no aparece en Calendar. Revisarlo antes de continuar.', 'warning'));
      if (booking.notification !== 'sent') card.append(element('p', 'El envío del aviso por correo no está confirmado. La solicitud permanece registrada.', 'warning'));
      if (!booking.missing) {
        const controls = element('div', '', 'controls');
        for (const decision of ['confirm', 'reject']) {
          if (booking.status === 'confirmed' && decision !== 'confirm' || booking.status === 'rejected' && decision !== 'reject') continue;
          if (!['pending', 'confirmed', 'rejected'].includes(booking.status)) continue;
          const text = booking.status === 'pending' ? (decision === 'confirm' ? 'Confirmar turno' : 'Rechazar y liberar horario') : 'Preparar WhatsApp';
          const button = element('button', text);
          button.type = 'button';
          button.disabled = decision === 'confirm' && (booking.conflict || booking.changed);
          button.addEventListener('click', async () => {
            controls.querySelectorAll('button').forEach(b => b.disabled = true);
            status.textContent = 'Actualizando el turno en Google Calendar…';
            try {
              const answer = await call('/admin/decide', { id: booking.id, decision });
              await load();
              const notice = element('div', '', 'notice');
              notice.append(element('p', decision === 'confirm' ? 'Turno confirmado en Calendar. Falta enviar el WhatsApp.' : 'Horario liberado. Falta informar a la clienta.'));
              const link = element('a', 'Abrir WhatsApp con el mensaje preparado ↗');
              link.href = answer.whatsappUrl; link.target = '_blank'; link.rel = 'noreferrer';
              notice.append(link);
              container.prepend(notice);
              status.textContent = 'Calendar actualizado. El mensaje todavía no fue enviado.';
            } catch (error) {
              status.textContent = error.message;
              controls.querySelectorAll('button').forEach(b => b.disabled = false);
            }
          });
          controls.append(button);
        }
        card.append(controls);
      }
      container.append(card);
    }
    status.textContent = 'Conectado a Google Calendar · ' + new Date().toLocaleTimeString('es-AR');
  } catch (error) { status.textContent = error.message; }
}

document.querySelector('#refresh').addEventListener('click', load);
document.querySelector('#copy-code')?.addEventListener('click', async () => {
  try {
    const response = await fetch('/Code.gs');
    if (!response.ok) throw new Error('No se pudo leer el código.');
    await navigator.clipboard.writeText(await response.text());
    status.textContent = 'Código copiado. Pegalo en Código.gs dentro del proyecto de Apps Script.';
  } catch { status.textContent = 'Abrí el enlace al código y copialo manualmente.'; }
});
document.querySelector('#connect')?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  const feedback = document.querySelector('#connect-status');
  button.disabled = true;
  button.textContent = 'Conectando…';
  feedback.hidden = false;
  feedback.className = 'notice';
  feedback.textContent = 'Verificando la cuenta y los calendarios. Puede demorar hasta 45 segundos…';
  status.textContent = feedback.textContent;
  try {
    await call('/admin/connect', { endpoint: document.querySelector('#endpoint').value.trim(), secret: document.querySelector('#secret').value.trim() });
    document.querySelector('#secret').value = '';
    feedback.textContent = 'Conexión verificada y guardada.';
    document.querySelector('#setup').open = false;
    status.textContent = feedback.textContent;
    status.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await load();
  } catch (error) {
    feedback.className = 'warning';
    feedback.textContent = error instanceof TypeError
      ? 'No se pudo contactar con el servidor local. Comprobá que la demo siga encendida y volvé a intentar.'
      : error.message;
    status.textContent = feedback.textContent;
    feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  finally { button.disabled = false; button.textContent = 'Verificar y conectar'; }
});
fetch(apiBase + '/public/config').then(r => r.json()).then(config => {
  if (config.connected) load();
  else { const setup = document.querySelector('#setup'); if (setup) setup.open = true; status.textContent = config.loginRequired ? 'La sesión venció. Volvé a entrar al panel.' : 'La conexión con Google todavía no está configurada.'; }
}).catch(() => { status.textContent = 'No se pudo acceder a la configuración local.'; });
