# MERIDA Beauty Studio — demo web

Landing page responsive para un salón de belleza de Hurlingham. El proyecto fue
creado como caso de portfolio y presenta los servicios, el equipo, trabajos,
ubicación y una simulación de reserva que prepara una consulta por WhatsApp.

> La disponibilidad es ilustrativa. La demo no crea turnos ni guarda datos de
> clientes.

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
