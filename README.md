# Recorridos Vighi

App para que los cadetes registren en tiempo real su recorrido por
sanatorios (muestras traídas, avisos urgentes) y para que el labo lo
vea en vivo desde un dashboard.

Este repo es solo el **frontend**. Habla por API con el Worker de
Cloudflare del repo [`vighi-stock-worker`](https://github.com/tiagobacasv/vighi-stock-worker)
(carpeta `src/routes/recorridos.ts` ahí), que ya tiene el catálogo de
sanatorios, usuarios/roles y toda la lógica de negocio.

## Stack

- **Next.js (App Router)**, exportado como sitio **estático**
  (`output: "export"` en `next.config.ts`) — no corre Node en el
  servidor, se sube por FTP como cualquier página del sitio.
- **Tailwind CSS** para estilos.
- Auth por token (JWT) contra el Worker, guardado en `localStorage`
  (mismo patrón que usa WebStock, con claves distintas para no
  pisarse: `vr_token` / `vr_user`).

## Por qué exportación estática (no Vercel, no Cloudflare Pages)

Esta app no necesita renderizado en el servidor ni rutas de API
propias — toda la lógica vive en el Worker y el frontend solo hace
`fetch()`. Eso permite compilarla como archivos estáticos y subirla al
mismo hosting FTP que ya usa el resto del sitio, sin infraestructura
nueva que aprender ni mantener.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar con la URL del Worker
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Build para subir por FTP

```bash
npm run build
```

Esto genera la carpeta `out/`. Su contenido se sube **completo** a la
carpeta `/recorridos` del hosting (mismo nivel que `WebStock/` en el
sitio principal). La app vive en `https://susanavighi.com.ar/recorridos/`.

Importante: `basePath` y `assetPrefix` en `next.config.ts` están
fijados a `/recorridos` — si el subdirectorio de destino cambia algún
día, hay que actualizar eso ahí.

## Estructura

```
src/
  app/
    login/       - login (redirige segun rol: cadete o staff)
    cadete/      - pool de paradas del dia, tomar/realizar/no-realizar
    dashboard/   - vista en vivo para el labo, generar paradas del dia
  lib/
    api.ts       - fetch autenticado + manejo de sesion
    types.ts     - tipos compartidos (Parada, Sanatorio, etc.)
```

## PWA

Instalable desde el celular ("Agregar a pantalla de inicio"). El
manifest y los íconos están en `public/`; si cambia la marca, son los
archivos a reemplazar (`icon-192.png`, `icon-512.png`, `manifest.json`).
