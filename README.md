# Nails Ivonne

Sitio web de Nails Ivonne hecho con Angular 22 y **prerenderizado (SSG)**: cada página
se genera como HTML estático con su SEO ya incluido.

## Requisitos

- Node.js 24 LTS (`nvm use` toma la versión de `.nvmrc`)

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en http://localhost:4200 |
| `npm run build` | Genera el sitio en `dist/nails-ivonne/browser` |
| `npx ng test` | Ejecuta las pruebas |

## SEO

- **Datos del sitio y del negocio:** `src/app/core/site.config.ts` (dominio, teléfono,
  dirección, horarios, redes sociales).
- **Título y descripción por página:** propiedades `title` y `data.seo` en `src/app/app.routes.ts`.
- `SeoTitleStrategy` aplica en cada ruta el título, la descripción, el canonical, Open Graph y
  Twitter Card. La página de inicio también agrega el JSON-LD `NailSalon`.
- `public/robots.txt` y `public/sitemap.xml`: actualiza el dominio y agrega cada página nueva.
- Imagen para compartir en redes: `public/og-image.jpg` (1200×630).

## Agregar una página

1. Crea el componente en `src/app/pages/<nombre>/<nombre>.ts` (con `export default`).
2. Agrega la ruta con su `title` y `data.seo` en `app.routes.ts`.
3. Agrega la URL a `public/sitemap.xml`.

## Despliegue

- **Vercel:** ya configurado en `vercel.json`; solo conecta el repositorio.
- **Hostinger (hosting compartido):** sube el contenido de `dist/nails-ivonne/browser` a
  `public_html`. El `.htaccess` incluido maneja las URLs.
- **SSR más adelante:** cambia `"outputMode"` a `"server"` en `angular.json` y define
  `RenderMode.Server` para las rutas dinámicas en `src/app/app.routes.server.ts`
  (necesita un hosting con Node.js).
