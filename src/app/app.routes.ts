import { Routes } from '@angular/router';
import { SeoData } from './core/seo/seo.service';

/**
 * Cada ruta define `title` y `data.seo`; SeoTitleStrategy los convierte en
 * <title>, description, canonical, Open Graph y Twitter Card.
 * Al agregar una ruta pública, agrégala también a public/sitemap.xml.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home'),
    data: {
      seo: {
        description:
          'Nails Ivonne: manicure, pedicure, uñas acrílicas, gel y nail art. Agenda tu cita.',
      } satisfies SeoData,
    },
  },
  {
    path: 'servicios',
    title: 'Servicios',
    loadComponent: () => import('./pages/servicios/servicios'),
    data: {
      seo: {
        description:
          'Servicios de uñas en Nails Ivonne: manicure, pedicure, acrílico, gel, rubber y nail art.',
      } satisfies SeoData,
    },
  },
  {
    path: 'galeria',
    title: 'Galería',
    loadComponent: () => import('./pages/galeria/galeria'),
    data: {
      seo: {
        description: 'Galería de diseños de uñas realizados en Nails Ivonne.',
      } satisfies SeoData,
    },
  },
  {
    path: 'contacto',
    title: 'Contacto',
    loadComponent: () => import('./pages/contacto/contacto'),
    data: {
      seo: {
        description: 'Contacta a Nails Ivonne y agenda tu cita de uñas.',
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
