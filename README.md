# Nails Ivonne

Sitio web de Nails Ivonne hecho con Angular 22 y **prerenderizado (SSG)**: la página se
genera como HTML estático con su SEO incluido y se puede publicar en Vercel o en cualquier
hosting (Hostinger, Apache).

El backend (CakePHP 5 + MySQL) está en [`api/`](api/README.md). Por ahora solo guarda el
catálogo; el sitio todavía lee los diseños de `src/app/data/trabajos.ts`.

## Requisitos

- Node.js 24 LTS (`nvm use` toma la versión de `.nvmrc`)

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en http://localhost:4200 |
| `npm run build` | Genera el sitio en `dist/nails-ivonne/browser` |
| `npx ng test` | Ejecuta las pruebas |
| `npm run fotos -- "<archivo>" ni-37` | Genera las copias WebP y la vista previa JPEG de una foto nueva (macOS) |

## Datos del negocio y textos

Todo está en **`src/app/core/site.config.ts`**:

- `contacto.whatsapp`: número internacional, solo dígitos (EE. UU.: `1` + 10 dígitos; México: `52` + 10 dígitos).
  Mientras esté vacío no se muestra ningún enlace de WhatsApp.
- `contacto.instagram`: usuario sin `@`.
- `contacto.direccion`, `contacto.mapsUrl`, `contacto.horarios`: se muestran solo si se llenan.
- `agenda`: días que se atiende (`0` domingo … `6` sábado), horas de inicio de cita,
  semanas visibles y anticipación mínima para el mismo día.
- `textos`: titulares y textos de cada sección y los mensajes de WhatsApp.
- `url`: dominio definitivo (también en `public/robots.txt`; `public/sitemap.xml` se genera
  al compilar). Los enlaces que llegan por WhatsApp usan este dominio.

## Agenda y selección de diseños

- En el catálogo, el visor y la página de cada diseño hay un botón **+ / Elegir para mi
  cita**. Lo elegido se guarda en el navegador de la clienta y aparece en la sección **Agenda**.
- En la agenda elige día (lunes a sábado), hora y, si quiere, nombre y comentarios. El botón
  abre WhatsApp con el mensaje armado para Ivonne. **No reserva nada**: Ivonne confirma por
  mensaje. La página no sabe qué horas están ocupadas.
- WhatsApp no permite adjuntar fotos desde un enlace, así que el mensaje incluye la dirección
  de cada diseño (`/disenos/ni-25`). WhatsApp muestra la foto como vista previa del enlace.
- Si `contacto.whatsapp` queda vacío, la agenda y los botones de elegir se ocultan.

## Agregar fotos al catálogo

1. Copia el original a `public/images/trabajos/` (los originales no se publican).
2. Ejecuta `npm run fotos -- "public/images/trabajos/<archivo>" ni-37` (requiere
   `brew install webp`). Crea las versiones en `public/images/trabajos/web/`.
   También crea la vista previa para WhatsApp en `public/images/trabajos/og/`.
3. Pega la línea que imprime en `TRABAJOS` (`src/app/data/trabajos.ts`) y completa
   título, categoría (`clasicos`, `brillo` o `arte`) y un texto alternativo que describa la foto.
   Su página `/disenos/ni-37` y su entrada en `sitemap.xml` se generan solas al compilar.
4. Para mostrarla en destacados, agrega `destacado: true`.

El orden del arreglo `TRABAJOS` es el orden del catálogo. La foto de portada y la de
"Experiencia" se eligen al final del mismo archivo.

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

## Despliegue

- **Vercel:** configurado en `vercel.json`; solo conecta el repositorio.
- **Hostinger (hosting compartido):** sube el contenido de `dist/nails-ivonne/browser` a
  `public_html`. El `.htaccess` incluido maneja las URLs.
- **SSR más adelante:** cambia `"outputMode"` a `"server"` en `angular.json` y define
  `RenderMode.Server` en `src/app/app.routes.server.ts` (necesita un hosting con Node.js).
