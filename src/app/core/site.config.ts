/**
 * Datos globales del sitio. Todo el SEO (meta tags, Open Graph, canonical,
 * JSON-LD) toma sus valores de aquí, así que es el único lugar a editar
 * cuando cambie el dominio o los datos del negocio.
 */
export const SITE = {
  name: 'Nails Ivonne',
  // TODO: reemplazar por el dominio definitivo (sin "/" al final).
  url: 'https://nails-ivonne.vercel.app',
  locale: 'es_MX',
  defaultDescription:
    'Salón de uñas: manicure, pedicure, uñas acrílicas, gel y nail art. Agenda tu cita con Nails Ivonne.',
  // Imagen para compartir en redes (1200x630). Colocar el archivo en /public.
  defaultImage: '/og-image.jpg',

  // Datos del negocio para Google (JSON-LD). Los campos vacíos se omiten.
  business: {
    telephone: '', // TODO: '+52 ...'
    priceRange: '$$',
    address: {
      streetAddress: '', // TODO
      addressLocality: '', // TODO: ciudad
      addressRegion: '', // TODO: estado
      postalCode: '', // TODO
      addressCountry: 'MX',
    },
    openingHours: [] as string[], // TODO: p. ej. ['Mo-Fr 10:00-19:00', 'Sa 10:00-15:00']
    sameAs: [] as string[], // TODO: URLs de Instagram, Facebook, TikTok...
  },
} as const;
