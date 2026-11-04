/**
 * Tipos y utilidades del catálogo de Nails Ivonne.
 *
 * Los diseños viven en la base de datos (api/) y se agregan desde el panel.
 * catalogo.json es la copia que se descarga de la API al compilar
 * (scripts/catalogo.mjs): con ella se prerenderiza el sitio y es lo primero
 * que se muestra; luego CatalogoService pide el catálogo fresco a /api.
 */

/** Slug de la categoría: 'clasicos', 'brillo', 'arte'… (las define el panel). */
export type CategoriaId = string;

export interface Categoria {
  id: CategoriaId;
  nombre: string;
}

export interface Imagen {
  /** Ruta base sin ancho ni extensión: '/images/trabajos/web/ni-01'. */
  base: string;
  /** Dimensiones del original, para reservar espacio y evitar saltos. */
  width: number;
  height: number;
  /** Anchos disponibles en WebP (archivos '<base>-<ancho>.webp'). */
  widths: readonly number[];
}

export interface Trabajo {
  /** Identificador visible y para WhatsApp, p. ej. 'NI-07'. */
  id: string;
  titulo: string;
  /** Describe lo que se ve en la foto para lectores de pantalla. */
  alt: string;
  categoria?: CategoriaId;
  imagen: Imagen;
  /** Aparece en "Trabajos destacados". */
  destacado?: boolean;
}

/** Respuesta de GET /api/catalogo, en el orden en que se muestra. */
export interface Catalogo {
  categorias: readonly Categoria[];
  trabajos: readonly Trabajo[];
}

/** Ruta de la página de un diseño: 'NI-25' -> '/disenos/ni-25'. */
export function rutaDiseno(id: string): string {
  return `/disenos/${id.toLowerCase()}`;
}

/**
 * Imagen JPEG de cada diseño para la vista previa en WhatsApp y redes.
 * Vive junto a las WebP: '/images/trabajos/web/ni-25' -> '/images/trabajos/og/ni-25.jpg'
 * (la API usa la misma regla al servir diseños nuevos).
 */
export function imagenCompartir(t: Trabajo): { src: string; width: number; height: number } {
  const width = Math.min(800, t.imagen.width);
  const height = Math.round((t.imagen.height * width) / t.imagen.width);
  return { src: t.imagen.base.replace(/\/web\/([^/]+)$/, '/og/$1') + '.jpg', width, height };
}
