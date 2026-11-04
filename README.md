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
| `npm run iconos` | Vuelve a generar los íconos de las apps instalables desde `public/brand/app/*.svg` (macOS) |
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
- La agenda pide a la API los horarios libres (`/api/agenda/disponibilidad`): no ofrece las horas
  ya apartadas ni las que Ivonne bloqueó, y "hoy" se calcula con la hora de Guadalajara.
- La clienta elige día y hora, escribe su nombre y su WhatsApp y toca **Apartar mi cita**: la cita
  se guarda como *pendiente* y ese horario deja de ofrecerse. En la confirmación puede avisarle a
  Ivonne por WhatsApp con un mensaje ya armado (incluye el número de solicitud y los diseños).
  Su nombre y WhatsApp se recuerdan en ese navegador para la siguiente vez.
- Un WhatsApp de 10 dígitos se toma como de México (+52); para otro país se escribe con `+`.
- **Si la API no responde**, la agenda funciona como antes: arma un WhatsApp para Ivonne y no
  aparta nada.
- WhatsApp no permite adjuntar fotos desde un enlace, así que los mensajes incluyen la dirección
  de cada diseño (`/disenos/ni-25`). WhatsApp muestra la foto como vista previa del enlace.
- Si `contacto.whatsapp` queda vacío, la agenda y los botones de elegir se ocultan.

## Catálogo

Los diseños están en MySQL (tabla `trabajos`) y la API los entrega en `GET /api/catalogo`.

- **Al compilar**, `scripts/catalogo.mjs` descarga el catálogo y lo guarda en
  `src/app/data/catalogo.json` (se sube a git). Con esa copia se prerenderiza una página por
  diseño, con su SEO y su vista previa para WhatsApp, y es lo primero que ve la clienta.
  - `API_URL` elige la API (por defecto `http://127.0.0.1:8765`, la local).
  - Si la API no responde se usa la copia guardada. Para publicar usa la API de producción con
    `CATALOGO_ESTRICTO=1`, así el build falla en lugar de salir con un catálogo viejo (o con las
    fotos de prueba de tu computadora).
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

## Panel de Ivonne (`/admin`)

Desde el celular o la computadora, Ivonne:

- **ve su agenda por semana** (pestaña *Agenda*, la primera): las citas de cada día con el
  WhatsApp de la clienta, los diseños que eligió y su comentario. La pestaña muestra cuántas hay
  por confirmar;
- **confirma o cancela** cada cita y le avisa a la clienta por WhatsApp con el mensaje ya escrito;
- **agrega citas** que le llegaron por otro lado (a cualquier hora) y **bloquea** un día o una
  hora: deja de ofrecerse en la página, sin cancelar lo que ya estaba;
- **agrega diseños** con una foto de la galería o la cámara. El navegador la reduce antes de
  subirla y el servidor genera las WebP y la vista previa para WhatsApp. El diseño nuevo recibe
  el siguiente código (`NI-37`) y aparece primero;
- **muestra u oculta** cada diseño, lo marca como **destacado** y **cambia el orden**;
- **edita** título, descripción y categoría, o **borra** un diseño.

Los cambios se ven en el sitio al recargar, sin compilar.

- La cuenta se crea en el servidor con `bin/cake usuario crear <correo> "<nombre>"`; la
  contraseña se pide sin mostrarse (ver [`api/README.md`](api/README.md)).
- La sesión dura 30 días sin actividad. Después de 5 intentos fallidos hay que esperar 15 minutos.
- El panel no se prerenderiza, no se indexa (`noindex` y `robots.txt`) y su código solo lo
  descarga quien entra a `/admin`.

`npm run fotos` sigue sirviendo para preparar fotos a mano (imprime el `INSERT` para MySQL),
pero el camino normal es el panel.

## App instalable y avisos

El sitio compilado es una **PWA** (service worker de Angular, `ngsw-config.json`). Con
`npm start` no hay service worker: se prueba con `npm run build` y un servidor.

- **Dos apps.** Desde el sitio se instala *Nails Ivonne* (`manifest.webmanifest`, abre la
  página). Dentro de `/admin`, el panel cambia el manifest, el ícono de iPhone y el color, así
  que desde ahí se instala *Panel Ivonne* (`panel.webmanifest`, abre en la agenda, ícono ciruela).
  En Chrome, Edge y Android el panel muestra un botón **Instalar** en *Avisos*. En iPhone se instala
  desde Safari: *Compartir → Agregar a inicio*.
- **Sin internet** se siguen viendo las páginas visitadas y el catálogo guardado. Las navegaciones
  piden primero la red (`freshness`) y, sin conexión, usan `index.csr.html`.
- **Versiones nuevas.** Se descargan en segundo plano y se aplican en la siguiente navegación con
  una recarga completa, para no mezclar archivos de dos versiones.
- **Avisos (Web Push)** en la pestaña *Avisos* del panel: *Nueva cita por confirmar* cada vez que
  alguien aparta (al tocarlo abre la semana de la cita) y un resumen del día cada mañana. Se activan
  en cada dispositivo. **En iPhone y iPad solo funcionan con el panel instalado en la pantalla de
  inicio** (iOS 16.4 o más reciente): es una regla de Apple. El panel lo explica paso a paso.
- Íconos en `public/brand/app/`: el dibujo de los *maskable* va más chico porque Android lo
  recorta. Se generan con `npm run iconos`.

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
