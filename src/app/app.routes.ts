import { Routes } from '@angular/router';
import { SeoData } from './core/seo/seo.service';

/**
 * El sitio es una sola página con secciones (#inicio, #trabajos, #catalogo,
 * #experiencia, #contacto). Cada ruta define `title` y `data.seo`;
 * SeoTitleStrategy los convierte en <title>, description, canonical y Open Graph.
 * Al agregar una ruta pública, agrégala también a public/sitemap.xml.
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
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./pages/not-found/not-found'),
    data: { seo: { noindex: true } satisfies SeoData },
  },
];
