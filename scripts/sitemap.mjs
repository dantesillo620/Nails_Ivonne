// Genera public/sitemap.xml con la página de inicio y una URL por diseño de la copia
// de compilación (src/app/data/catalogo.json). Se ejecuta antes de `npm run build`.
//
// En Hostinger el sitemap lo sirve la API (incluye los diseños nuevos sin recompilar);
// este archivo queda como respaldo para servidores sin PHP.
import { readFileSync, writeFileSync } from 'node:fs';

const config = readFileSync('src/app/core/site.config.ts', 'utf8');
const catalogo = JSON.parse(readFileSync('src/app/data/catalogo.json', 'utf8'));

const url = config.match(/^\s*url:\s*'([^']+)'/m)?.[1];
if (!url) throw new Error('No se encontró SITE.url en site.config.ts');

const rutas = ['/', ...catalogo.trabajos.map((t) => `/disenos/${t.id.toLowerCase()}`)];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((r) => `  <url><loc>${url}${r}</loc></url>`).join('\n')}
</urlset>
`;
writeFileSync('public/sitemap.xml', xml);
console.log(`sitemap.xml: ${rutas.length} URLs`);
