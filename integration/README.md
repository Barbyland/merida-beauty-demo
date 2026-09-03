# Prueba local: MERIDA + Google Calendar

Esta integración de ensayo conserva la exportación estática del portfolio. En
`localhost` / `127.0.0.1`, el formulario de reservas usa un puente local en el
puerto 3001. En un dominio público se mantiene el flujo ilustrativo anterior.
No publicar el puente como servidor de producción.

## Arranque

En dos terminales, desde `site`:

```powershell
npm.cmd run dev -- --hostname 127.0.0.1
npm.cmd run demo:calendar
```

Formulario: http://127.0.0.1:3000/#reservar

Conexión y revisión: http://127.0.0.1:3001/admin

El panel incluye las instrucciones de Apps Script. Cuenta esperada:
`barbydigital.dev@gmail.com`. Solo los dos calendarios existentes con nombre
PRUEBA (Ludmila y Pricila) están en la lista permitida de `Code.gs`.

El proyecto de Apps Script requiere autorización de Google para Calendar y envío
de correo. `prepararPrueba` verifica la cuenta y agendas y genera una clave en
Script Properties. La clave se pega en el panel local junto a la URL `/exec` de
la aplicación web. No pegarla en el chat, código, repositorio o navegador público.
La aplicación se ejecuta como Barby Digital; aun cuando su endpoint acepte
peticiones sin sesión de Google, todas las operaciones exigen esa clave.
El puente almacena la conexión en `.booking-demo/config.json`, ignorado por Git.
La configuración se guarda solamente después de validar la conexión real.

## Rama de ensayo online

La rama `codex/calendar-online-demo` añade una Netlify Function para probar desde
otros dispositivos sin modificar la web pública de `main`. La vista previa usa
un dominio separado y exige una clave antes de consultar horarios, crear una
solicitud o abrir el panel. URL de Apps Script, secreto de conexión, clave de la
demo y secreto de sesión se configuran exclusivamente como variables secretas
del despliegue; nunca se guardan en Git ni se incorporan al JavaScript público.

El acceso dura 12 horas en cada navegador. El panel y las operaciones de agenda
validan la sesión, el origen y un token CSRF; la función limita solicitudes por
IP y dominio. El formulario sigue trabajando únicamente con Ludmila y Pricila.
Sofía aparece con sus servicios, pero sin horarios hasta crear y conectar su
calendario de prueba.

## Comportamiento

- Horarios de ensayo: martes a sábado, 10–13 y 15–19 (Argentina). Servicios
  y duraciones provienen de la demo y deben ser acordados antes de uso comercial.
- Reservas de mañana hasta 30 días. Candidatos cada 15 minutos y duración íntegra.
- Sin acceso a Google, falla cerrado: no muestra disponibilidad ficticia ni éxito.
- Turno pendiente opaco/ocupado, correo a Barby Digital y referencia única.
- El aviso por correo es independiente de la creación: su fallo se muestra en el
  panel. El ensayo no envía WhatsApp automáticamente.
- Confirmar actualiza el mismo evento y genera un enlace `wa.me` con texto de
  PRUEBA. Rechazar lo marca como libre y conserva un evento RECHAZADO.
- Los pendientes permanecen ocupados hasta revisión. No hay vencimiento automático.
- Todos los turnos por este script usan `ScriptLock`. Un identificador de solicitud
  impide duplicados al reintentar; una creación interrumpida se recupera buscando
  su referencia en el panel. Si no se puede recuperar, no se crea otra a ciegas.
- Las cargas manuales en Google Calendar no participan del bloqueo del script.
  Se detectan superposiciones al revisar y antes de confirmar; no se garantiza la
  ausencia absoluta de carreras con ediciones simultáneas externas.
- Si cambian manualmente inicio/fin o borran el evento, el panel exige revisión.
- Los avisos enlazan al panel local: funcionan en esta computadora con ambos
  procesos activos. No constituyen una instalación productiva para el salón.

## Verificación

`npm.cmd run test:calendar` ejecuta contratos con servicios de Google simulados:
duración, disponibilidad por profesional, solapamientos manuales, reintentos,
confirmación sobre el mismo evento, rechazo, fallo del correo y accesos al puente.
Esas pruebas NO acreditan una conexión real con Google.

Para comprobar E2E después de autorizar: enviar una solicitud desde el formulario
con nombre ficticio y WhatsApp propio, verificar el evento en Calendar y el aviso
en Barby Digital, comprobar que el horario ya no se ofrece para la misma
profesional, confirmar desde el panel y comprobar que el mismo evento cambia.
Abrir el enlace WhatsApp solo si se desea enviar el mensaje de prueba al número
propio. Registrar evidencia del envío por separado: abrir `wa.me` no demuestra
que el mensaje se haya enviado.
