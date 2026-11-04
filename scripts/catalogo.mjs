// Descarga el catálogo de la API y lo guarda en src/app/data/catalogo.json.
// Se ejecuta antes de `npm run build` (script "prebuild").
//
// Esa copia es lo que se prerenderiza (HTML con SEO y vista previa para WhatsApp)
// y lo primero que ve la clienta; después el navegador pide el catálogo fresco a /api.
//
//   API_URL=https://nailsivonne.com/api npm run build    (por defecto http://127.0.0.1:8765)
//
// Si la API no responde se conserva la copia anterior, salvo con CATALOGO_ESTRICTO=1
// (para publicar: así no sale un build con un catálogo viejo sin darse cuenta).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ARCHIVO = 'src/app/data/catalogo.json';
const api = (process.env.API_URL ?? 'http://127.0.0.1:8765').replace(/\/$/, '');
const estricto = process.env.CATALOGO_ESTRICTO === '1';

function validar(datos) {
  if (!Array.isArray(datos?.categorias) || !Array.isArray(datos?.trabajos)) {
    throw new Error('la respuesta no trae categorias y trabajos');
  }
  if (datos.trabajos.length === 0) throw new Error('el catálogo viene vacío');
  for (const t of datos.trabajos) {
    if (typeof t.id !== 'string' || typeof t.titulo !== 'string' || !t.imagen?.base) {
      throw new Error(`diseño incompleto: ${JSON.stringify(t).slice(0, 80)}`);
    }
  }
  return { categorias: datos.categorias, trabajos: datos.trabajos };
}

try {
  const res = await fetch(`${api}/catalogo`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const catalogo = validar(await res.json());
  const json = JSON.stringify(catalogo, null, 2) + '\n';
  const cambio = !existsSync(ARCHIVO) || readFileSync(ARCHIVO, 'utf8') !== json;
  writeFileSync(ARCHIVO, json);
  console.log(
    `catalogo.json: ${catalogo.trabajos.length} diseños desde ${api}${cambio ? ' (actualizado)' : ' (sin cambios)'}`,
  );
} catch (error) {
  const motivo = error instanceof Error ? error.message : String(error);
  if (estricto || !existsSync(ARCHIVO)) {
    console.error(`No se pudo descargar el catálogo de ${api}/catalogo: ${motivo}`);
    process.exit(1);
  }
  console.warn(
    `⚠ No se pudo descargar el catálogo de ${api}/catalogo (${motivo}). Se usa la copia guardada.`,
  );
}
