import { RenderMode, ServerRoute } from '@angular/ssr';
import copia from './data/catalogo.json';

export const serverRoutes: ServerRoute[] = [
  {
    // Una página estática por diseño de la copia de compilación: /disenos/ni-01 …
    // (WhatsApp lee su vista previa). Los diseños nuevos los sirve la API (DisenosController).
    path: 'disenos/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => copia.trabajos.map((t) => ({ id: t.id.toLowerCase() })),
  },
  {
    // El panel no se prerenderiza: depende de la sesión y no debe aparecer en el sitio publicado.
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
