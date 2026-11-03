import { RenderMode, ServerRoute } from '@angular/ssr';
import { TRABAJOS } from './data/trabajos';

export const serverRoutes: ServerRoute[] = [
  {
    // Una página estática por diseño: /disenos/ni-01 … (WhatsApp lee su vista previa).
    path: 'disenos/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => TRABAJOS.map((t) => ({ id: t.id.toLowerCase() })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
