import { CanMatchFn, ResolveFn, Route, UrlSegment } from '@angular/router';
import { SeoData } from '../../core/seo/seo.service';
import { buscarTrabajo, imagenCompartir } from '../../data/trabajos';

/** Solo coincide con ids que existen; los demás caen en la página 404. */
const existe: CanMatchFn = (_route, segments: UrlSegment[]) => !!buscarTrabajo(segments[1]?.path);

const titulo: ResolveFn<string> = (route) => {
  const t = buscarTrabajo(route.paramMap.get('id'))!;
  return `${t.titulo} (${t.id})`;
};

const seo: ResolveFn<SeoData> = (route) => {
  const t = buscarTrabajo(route.paramMap.get('id'))!;
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
