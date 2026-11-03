# Nails Ivonne

Sitio web de Nails Ivonne hecho con Angular 22 y **prerenderizado (SSG)**: la página se
genera como HTML estático con su SEO incluido y se puede publicar en Vercel o en cualquier
hosting (Hostinger, Apache).

## Requisitos

- Node.js 24 LTS (`nvm use` toma la versión de `.nvmrc`)

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en http://localhost:4200 |
| `npm run build` | Genera el sitio en `dist/nails-ivonne/browser` |
| `npx ng test` | Ejecuta las pruebas |
| `npm run fotos -- "<archivo>" ni-37` | Genera las copias WebP de una foto nueva (macOS) |

## Datos del negocio y textos

Todo está en **`src/app/core/site.config.ts`**:

- `contacto.whatsapp`: número internacional, solo dígitos (México: `52` + 10 dígitos).
  Mientras esté vacío no se muestra ningún enlace de WhatsApp.
- `contacto.instagram`: usuario sin `@`.
- `contacto.direccion`, `contacto.mapsUrl`, `contacto.horarios`: se muestran solo si se llenan.
- `textos`: titulares y textos de cada sección y los mensajes de WhatsApp.
- `url`: dominio definitivo (también en `public/robots.txt` y `public/sitemap.xml`).

## Agregar fotos al catálogo

1. Copia el original a `public/images/trabajos/` (los originales no se publican).
2. Ejecuta `npm run fotos -- "public/images/trabajos/<archivo>" ni-37` (requiere
   `brew install webp`). Crea las versiones en `public/images/trabajos/web/`.
3. Pega la línea que imprime en `TRABAJOS` (`src/app/data/trabajos.ts`) y completa
   título, categoría (`clasicos`, `brillo` o `arte`) y un texto alternativo que describa la foto.
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
  sections/      portada, destacados, catálogo, experiencia, contacto
  shared/        imagen responsiva, aparición al hacer scroll, visor de fotos
  pages/         inicio y 404
```

## Despliegue

- **Vercel:** configurado en `vercel.json`; solo conecta el repositorio.
- **Hostinger (hosting compartido):** sube el contenido de `dist/nails-ivonne/browser` a
  `public_html`. El `.htaccess` incluido maneja las URLs.
- **SSR más adelante:** cambia `"outputMode"` a `"server"` en `angular.json` y define
  `RenderMode.Server` en `src/app/app.routes.server.ts` (necesita un hosting con Node.js).
