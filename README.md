# MERIDA Beauty Studio — proyecto web

Landing page responsive para un salón de belleza de Hurlingham. El proyecto fue
creado como caso de portfolio y presenta los servicios, el equipo, trabajos,
ubicación y una simulación de reserva que prepara una consulta por WhatsApp.

> La disponibilidad es ilustrativa. Esta versión no crea turnos ni guarda datos de
> clientes.

La prueba local de integración con Google Calendar está documentada en
[`integration/README.md`](integration/README.md). Solo se muestra en localhost;
requiere conectar el proyecto de Apps Script antes de registrar turnos reales
en los calendarios de ensayo. La versión pública mantiene el flujo de portfolio.

## Imágenes del estudio

Las imágenes `local-merida-restored-v3.jpg` y `local-interior-restored-v3.jpg`
son versiones retocadas con IA de las capturas originales de 449 px de ancho.
Se retiraron los controles de Instagram y se reconstruyó detalle visual; no son
fotografías originales de mayor resolución. Los originales `local-merida.jpg`
y `local-interior.jpg` se conservan. Para uso comercial, priorizar las fotos
originales que proporcione el estudio.

## Tecnologías

- React 19 y Next.js 16
- TypeScript
- CSS responsive personalizado
- Exportación estática lista para Netlify

## Desarrollo local

Requiere Node.js 22.13 o superior.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Verificaciones

```bash
npm run lint
npm test
```

## Publicación

El archivo `netlify.toml` contiene la configuración de compilación. Al importar
el repositorio desde Netlify, la plataforma ejecuta `npm run build` y publica la
carpeta `out`.

## Alcance

Esta versión incluye una simulación de selección de servicio, profesional, fecha
y horario. El último paso abre WhatsApp con una consulta prearmada. Un sistema
productivo requeriría base de datos, autenticación, permisos y control real de
disponibilidad.
