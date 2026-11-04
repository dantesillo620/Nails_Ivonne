# Nails Ivonne

Sitio web de Nails Ivonne hecho con Angular 22 y **prerenderizado (SSG)**: la página se
genera como HTML estático con su SEO incluido y se puede publicar en Vercel o en cualquier
hosting (Hostinger, Apache).

El backend (CakePHP 5 + MySQL) está en [`api/`](api/README.md): el catálogo vive en la base de
datos y el sitio lo lee de `/api` (ver [Catálogo](#catálogo)).

## Requisitos

- Node.js 24 LTS (`nvm use` toma la versión de `.nvmrc`)

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en http://localhost:4200; `/api` va a la API local |
| `npm run build` | Descarga el catálogo de la API y genera el sitio en `dist/nails-ivonne/browser` |
| `npx ng test` | Ejecuta las pruebas |
| `npm run fotos -- "<archivo>" ni-37` | Genera las copias WebP y la vista previa JPEG de una foto nueva (macOS) |

## Datos del negocio y textos

Todo está en **`src/app/core/site.config.ts`**:

- `contacto.whatsapp`: número internacional, solo dígitos (EE. UU.: `1` + 10 dígitos; México: `52` + 10 dígitos).
  Mientras esté vacío no se muestra ningún enlace de WhatsApp.
- `contacto.instagram`: usuario sin `@`.
- `contacto.direccion`, `contacto.mapsUrl`, `contacto.horarios`: se muestran solo si se llenan.
- `agenda`: zona horaria del estudio (`America/Mexico_City`, Guadalajara), horas de inicio de
  cita por día (`0` domingo … `6` sábado; un día sin horas no se atiende), semanas visibles y
  anticipación mínima para el mismo día. "Hoy" se calcula con la hora de Guadalajara, no con la
  del celular de la clienta.
- `textos`: titulares y textos de cada sección y los mensajes de WhatsApp.
- `url`: dominio definitivo (también en `public/robots.txt`; `public/sitemap.xml` se genera
  al compilar). Los enlaces que llegan por WhatsApp usan este dominio.

## Agenda y selección de diseños

- En el catálogo, el visor y la página de cada diseño hay un botón **+ / Elegir para mi
  cita**. Lo elegido se guarda en el navegador de la clienta y aparece en la sección **Agenda**.
- En la agenda elige día (lunes a sábado), hora (cambian entre semana y sábado) y, si quiere,
  nombre y comentarios. El botón
  abre WhatsApp con el mensaje armado para Ivonne. **No reserva nada**: Ivonne confirma por
  mensaje. La página no sabe qué horas están ocupadas.
- WhatsApp no permite adjuntar fotos desde un enlace, así que el mensaje incluye la dirección
  de cada diseño (`/disenos/ni-25`). WhatsApp muestra la foto como vista previa del enlace.
- Si `contacto.whatsapp` queda vacío, la agenda y los botones de elegir se ocultan.

## Catálogo

Los diseños están en MySQL (tabla `trabajos`) y la API los entrega en `GET /api/catalogo`.

- **Al compilar**, `scripts/catalogo.mjs` descarga el catálogo y lo guarda en
  `src/app/data/catalogo.json` (se sube a git). Con esa copia se prerenderiza una página por
  diseño, con su SEO y su vista previa para WhatsApp, y es lo primero que ve la clienta.
  - `API_URL` elige la API (por defecto `http://127.0.0.1:8765`, la local).
  - Si la API no responde se usa la copia guardada. Para publicar usa `CATALOGO_ESTRICTO=1`,
    así el build falla en lugar de salir con un catálogo viejo.
- **En el navegador**, `CatalogoService` pide el catálogo fresco a `/api/catalogo` después
  del primer render. Lo que se agregue u oculte en la base aparece **sin volver a compilar**.
- **Un diseño nuevo** no tiene página prerenderizada. En Hostinger, el `.htaccess` manda
  `/disenos/ni-37` a la API, que devuelve el sitio con el título y la foto del diseño en las meta
  tags (WhatsApp y Google no ejecutan JavaScript). Lo mismo con `/sitemap.xml`, que incluye
  todos los diseños visibles.
- **Un diseño oculto** que todavía tiene página prerenderizada pasa a la página 404 en cuanto
  llega el catálogo fresco. Desaparece del todo con el siguiente build.

La portada y la foto de "Experiencia" se eligen por código en `SITE.fotos`
(`site.config.ts`). Si alguno se oculta, se usa otro diseño.

### Agregar una foto (hasta que exista el panel)

1. Copia el original a `public/images/trabajos/` (los originales no se publican).
2. Ejecuta `npm run fotos -- "public/images/trabajos/<archivo>" ni-37` (requiere
   `brew install webp`). Crea las versiones en `public/images/trabajos/web/` y la vista previa
   para WhatsApp en `public/images/trabajos/og/`.
3. Ejecuta en MySQL el `INSERT` que imprime, con título, categoría y un texto alternativo que
   describa la foto. `orden` define la posición en el catálogo y `destacado = 1` la muestra en
   destacados.

## Identidad visual

En `public/brand/`, en SVG con las letras convertidas a trazos (no dependen de fuentes instaladas):

| Archivo | Uso |
|---|---|
| `logo-nails-ivonne.svg` | Logo principal, fondos claros |
| `logo-nails-ivonne-claro.svg` | Logo para fondos oscuros |
| `isotipo-nails-ivonne.svg` / `-claro.svg` | Monograma NI en silueta de uña |
| `favicon.svg`, `apple-touch-icon.png`, `/favicon.ico` | Iconos del sitio |
| `og-nails-ivonne.jpg` | Imagen para compartir en redes (1200×630) |

Tipografías (licencia OFL, autoalojadas con Fontsource): **Cormorant Garamond** para títulos
y **Jost** para textos. Colores en `src/styles.scss` (`--marfil`, `--rosa`, `--nude`, `--vino`,
`--ciruela`, `--dorado`).

## Estructura

```
src/app/
  core/          configuración, enlaces de contacto y SEO
  data/          catálogo de trabajos
  layout/        encabezado (con menú móvil) y pie de página
  sections/      portada, destacados, catálogo, agenda, experiencia, contacto
  shared/        imagen responsiva, aparición al hacer scroll, visor de fotos
  pages/         inicio, página de cada diseño y 404
```

## Desarrollo local

1. Enciende MySQL en MAMP y levanta la API (ver [`api/README.md`](api/README.md)):
   `cd api && $PHP /opt/homebrew/bin/composer serve`.
2. En otra terminal, `npm start`. El proxy (`proxy.conf.json`) manda `/api/*` a la API.

Sin la API el sitio también funciona: muestra la copia de `catalogo.json`.

## Despliegue

- **Hostinger (hosting compartido):** sube el contenido de `dist/nails-ivonne/browser` a
  `public_html` y la API a `public_html/api`. El `.htaccess` del sitio sirve las páginas
  prerenderizadas y manda a la API los diseños nuevos y el sitemap. Los pasos completos se
  definirán al rentar el hosting.
- **Vercel:** `vercel.json` sigue sirviendo el sitio estático, pero Vercel no ejecuta PHP:
  sin la API no hay catálogo fresco ni páginas para los diseños nuevos.
- **SSR más adelante:** cambia `"outputMode"` a `"server"` en `angular.json` y define
  `RenderMode.Server` en `src/app/app.routes.server.ts` (necesita un hosting con Node.js).
