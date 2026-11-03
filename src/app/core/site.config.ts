/**
 * Configuración central de Nails Ivonne.
 *
 * Aquí se editan los datos del negocio, los textos principales y el SEO.
 * Los campos vacíos ('' o []) no se muestran en la página ni en los datos
 * para Google: completa solo lo que quieras publicar.
 */

export interface Horario {
  /** Texto visible, p. ej. 'Lunes a viernes'. */
  dias: string;
  /** Texto visible, p. ej. '10:00 – 19:00'. */
  horas: string;
  /** Formato schema.org para Google, p. ej. 'Mo-Fr 10:00-19:00'. Opcional. */
  schema?: string;
}

export interface Direccion {
  calle: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  pais: string;
}

export interface SiteConfig {
  name: string;
  url: string;
  locale: string;
  defaultDescription: string;
  defaultImage: string;
  contacto: {
    /**
     * WhatsApp en formato internacional, solo dígitos y sin '+':
     * código de país + número. México: '52' + 10 dígitos, p. ej. '525512345678'.
     */
    whatsapp: string;
    /** Usuario de Instagram sin '@', p. ej. 'nails.ivonne'. */
    instagram: string;
    direccion: Direccion;
    /** Enlace de Google Maps a la ubicación. Opcional. */
    mapsUrl: string;
    horarios: Horario[];
  };
  textos: {
    hero: { etiqueta: string; titulo: string; tituloEnfasis: string; texto: string };
    destacados: { titulo: string; texto: string };
    catalogo: { titulo: string; texto: string };
    experiencia: {
      titulo: string;
      texto: string;
      puntos: { titulo: string; texto: string }[];
    };
    contacto: { titulo: string; texto: string; textoSinWhatsapp: string };
    whatsapp: {
      /** Mensaje general para consultar una cita. */
      consulta: string;
      /** Mensaje para un diseño; {titulo} y {id} se reemplazan. */
      diseno: string;
    };
  };
}

export const SITE: SiteConfig = {
  name: 'Nails Ivonne',
  // TODO: reemplazar por el dominio definitivo (sin "/" al final).
  url: 'https://nails-ivonne.vercel.app',
  locale: 'es_MX',
  defaultDescription:
    'Nails Ivonne: diseños de uñas con detalle, desde un nude impecable hasta arte, brillo y dorado. Explora el catálogo y consulta tu cita.',
  // Imagen para compartir en redes (1200×630).
  defaultImage: '/brand/og-nails-ivonne.jpg',

  contacto: {
    whatsapp: '', // TODO
    instagram: '', // TODO
    direccion: {
      calle: '', // TODO
      colonia: '',
      ciudad: '',
      estado: '',
      codigoPostal: '',
      pais: 'MX',
    },
    mapsUrl: '',
    horarios: [], // TODO: [{ dias: 'Lunes a viernes', horas: '10:00 – 19:00', schema: 'Mo-Fr 10:00-19:00' }]
  },

  textos: {
    hero: {
      etiqueta: 'Estudio de uñas',
      titulo: 'Un diseño para cada',
      tituloEnfasis: 'versión de ti',
      texto:
        'Del nude más limpio al detalle que todas notan. Encuentra inspiración en trabajos reales y elige el estilo que va contigo.',
    },
    destacados: {
      titulo: 'Trabajos destacados',
      texto: 'Una selección de diseños para ver de cerca: relieves, brillo, líneas finas y color.',
    },
    catalogo: {
      titulo: 'Catálogo de diseños',
      texto: 'Todos los trabajos son reales. Toca cualquier foto para verla en grande.',
    },
    experiencia: {
      titulo: 'Cada detalle, pensado para ti',
      texto:
        'En Nails Ivonne cada diseño empieza con lo que te gusta: un color, una foto guardada o solo una idea. A partir de ahí elegimos forma, tono y detalles para que el resultado se sienta tuyo.',
      puntos: [
        {
          titulo: 'Tu idea es el punto de partida',
          texto: 'Trae una referencia o elige del catálogo. Lo platicamos y lo adaptamos a ti.',
        },
        {
          titulo: 'Detalle que se nota de cerca',
          texto: 'Líneas finas, relieves, brillo o un acabado limpio, cuidados uña por uña.',
        },
        {
          titulo: 'Un rato para ti',
          texto: 'Una cita tranquila, a tu ritmo, para salir sintiéndote tú.',
        },
      ],
    },
    contacto: {
      titulo: 'Tu próximo diseño empieza aquí',
      texto:
        'Cuéntanos qué te gustaría y te compartimos disponibilidad. Si viste un diseño en el catálogo, menciónalo en tu mensaje.',
      textoSinWhatsapp:
        'Explora el catálogo, guarda los diseños que más te gusten y compártelos al consultar tu cita.',
    },
    whatsapp: {
      consulta: 'Hola, Ivonne. Me gustaría consultar disponibilidad para una cita de uñas.',
      diseno:
        'Hola, Ivonne. Vi el diseño “{titulo}” ({id}) en tu página y me gustaría algo similar. ¿Me compartes información para una cita?',
    },
  },
};
