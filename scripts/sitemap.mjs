// Genera public/sitemap.xml con la página de inicio y una URL por diseño.
// Se ejecuta solo antes de `npm run build` (script "prebuild").
import { readFileSync, writeFileSync } from 'node:fs';

const config = readFileSync('src/app/core/site.config.ts', 'utf8');
const trabajos = readFileSync('src/app/data/trabajos.ts', 'utf8');

const url = config.match(/^\s*url:\s*'([^']+)'/m)?.[1];
if (!url) throw new Error('No se encontró SITE.url en site.config.ts');

const ids = [...trabajos.matchAll(/\bid:\s*'(NI-\d+)'/g)].map((m) => m[1].toLowerCase());

const rutas = ['/', ...ids.map((id) => `/disenos/${id}`)];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((r) => `  <url><loc>${url}${r}</loc></url>`).join('\n')}
</urlset>
`;
writeFileSync('public/sitemap.xml', xml);
console.log(`sitemap.xml: ${rutas.length} URLs`);
