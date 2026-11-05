// Genera panel.html: el mismo index.csr.html pero ya con el manifest, el ícono y el título del
// panel. Se ejecuta después de `npm run build`; el servidor manda /admin y /admin/* a este archivo.
//
// Hace falta porque iOS lee el manifest del HTML que llega del servidor: el cambio que hace
// panel-layout.ts con JavaScript llega tarde, y "Agregar a pantalla de inicio" instalaba el sitio.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'dist/nails-ivonne/browser';
let html = readFileSync(`${dir}/index.csr.html`, 'utf8');

const cambios = [
  [/(<link rel="manifest" href=")[^"]*(")/, '$1/panel.webmanifest$2'],
  [/(<link rel="apple-touch-icon" href=")[^"]*(")/, '$1/brand/app/panel-180.png$2'],
  [/(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/, '$1Panel Ivonne$2'],
  [/(<meta name="theme-color" content=")[^"]*(")/, '$1#3e1224$2'],
  [/<title>[^<]*<\/title>/, '<title>Panel Ivonne</title>'],
];
for (const [patron, nuevo] of cambios) {
  if (!patron.test(html)) throw new Error(`panel.html: no se encontró ${patron} en index.csr.html`);
  html = html.replace(patron, nuevo);
}

writeFileSync(`${dir}/panel.html`, html);
console.log('panel.html: listo');
