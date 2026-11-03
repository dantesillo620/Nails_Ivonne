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
  /**
   * Agenda de la página. No es un sistema de reservas: la clienta elige día y
   * hora y se arma un WhatsApp para que Ivonne confirme.
   */
  agenda: {
    /** Días que se atiende: 0 domingo, 1 lunes … 6 sábado. */
    dias: number[];
    /** Horas de inicio de cita que se ofrecen, en formato 24 h ('16:00'). */
    horas: string[];
    /** Cuántas semanas se muestran. */
    semanas: number;
    /** Minutos mínimos de anticipación para ofrecer una hora del mismo día. */
    anticipacionMinutos: number;
  };
  textos: {
    hero: { etiqueta: string; titulo: string; tituloEnfasis: string; texto: string };
    destacados: { titulo: string; texto: string };
    catalogo: { titulo: string; texto: string; textoElegir: string };
    experiencia: {
      titulo: string;
      texto: string;
      puntos: { titulo: string; texto: string }[];
    };
    agenda: { titulo: string; texto: string; aviso: string };
    contacto: { titulo: string; texto: string; textoSinWhatsapp: string };
    whatsapp: {
      /** Mensaje general para consultar una cita. */
      consulta: string;
      /** Mensaje para un diseño; {titulo}, {id} y {url} se reemplazan. */
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
    whatsapp: '523855221123',
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
    horarios: [
      { dias: 'Lunes a sábado', horas: '4:00 a 8:00 p. m.', schema: 'Mo-Sa 16:00-20:00' },
      { dias: 'Domingo', horas: 'Cerrado' },
    ],
  },

  agenda: {
    dias: [1, 2, 3, 4, 5, 6],
    horas: ['16:00', '18:00'],
    semanas: 2,
    anticipacionMinutos: 60,
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
      textoElegir: 'Con el + guardas los que te gusten y se agregan a tu solicitud de cita.',
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
    agenda: {
      titulo: 'Agenda tu cita',
      texto:
        'Elige el día y la hora que te acomodan y, si quieres, los diseños que te gustaron. Se arma un mensaje de WhatsApp para Ivonne con todo listo.',
      aviso:
        'Es una solicitud: Ivonne te responde por WhatsApp para confirmar si el horario está libre.',
    },
    contacto: {
      titulo: 'Tu próximo diseño empieza aquí',
      texto:
        '¿Tienes una idea especial o alguna duda? Escríbele directo a Ivonne. Si ya sabes qué día te acomoda, usa la agenda.',
      textoSinWhatsapp:
        'Explora el catálogo, guarda los diseños que más te gusten y compártelos al consultar tu cita.',
    },
    whatsapp: {
      consulta: 'Hola, Ivonne. Me gustaría consultar disponibilidad para una cita de uñas.',
      diseno:
        'Hola, Ivonne. Vi el diseño “{titulo}” ({id}) en tu página y me gustaría algo similar. ¿Me compartes información para una cita?\n{url}',
    },
  },
};
