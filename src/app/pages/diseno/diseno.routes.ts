import { inject } from '@angular/core';
import { CanMatchFn, ResolveFn, Route, UrlSegment } from '@angular/router';
import { CatalogoService } from '../../core/catalogo.service';
import { SeoData } from '../../core/seo/seo.service';
import { imagenCompartir } from '../../data/trabajos';

/**
 * Solo coincide con diseños que existen; los demás caen en la página 404.
 * Un diseño recién agregado no está en la copia de compilación, así que antes
 * de descartarlo se espera el catálogo fresco de la API (solo en el navegador).
 */
const existe: CanMatchFn = async (_route, segments: UrlSegment[]) => {
  const catalogo = inject(CatalogoService);
  const id = segments[1]?.path;
  if (catalogo.buscar(id)) return true;
  await catalogo.actualizar();
  return !!catalogo.buscar(id);
};

const titulo: ResolveFn<string> = (route) => {
  const t = inject(CatalogoService).buscar(route.paramMap.get('id'))!;
  return `${t.titulo} (${t.id})`;
};

const seo: ResolveFn<SeoData> = (route) => {
  const t = inject(CatalogoService).buscar(route.paramMap.get('id'))!;
  const img = imagenCompartir(t);
  return {
    description: `${t.alt} Diseño ${t.id} de Nails Ivonne: elígelo y agenda tu cita por WhatsApp.`,
    image: img.src,
    imageWidth: img.width,
    imageHeight: img.height,
    imageAlt: t.alt,
  };
};

/** Página de cada diseño (/disenos/ni-25). Su enlace en WhatsApp muestra la foto. */
export const disenoRoute: Route = {
  path: 'disenos/:id',
  canMatch: [existe],
  title: titulo,
  resolve: { seo },
  loadComponent: () => import('./diseno'),
};
