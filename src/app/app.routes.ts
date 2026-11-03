import { Routes } from '@angular/router';
import { SeoData } from './core/seo/seo.service';
import { disenoRoute } from './pages/diseno/diseno.routes';

/**
 * El sitio es una sola página con secciones (#inicio, #trabajos, #catalogo,
 * #experiencia, #contacto). Cada ruta define `title` y `data.seo`;
 * SeoTitleStrategy los convierte en <title>, description, canonical y Open Graph.
 * Cada diseño tiene su página en /disenos/<id> (ver pages/diseno).
 * public/sitemap.xml se genera solo al compilar (scripts/sitemap.mjs).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home'),
    data: {
      seo: {
        description:
          'Nails Ivonne: diseños de uñas con detalle, desde un nude impecable hasta arte, brillo y dorado. Explora el catálogo de trabajos reales y consulta tu cita.',
      } satisfies SeoData,
    },
  },
  disenoRoute,
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./pages/not-found/not-found'),
    data: { seo: { noindex: true } satisfies SeoData },
  },
];
