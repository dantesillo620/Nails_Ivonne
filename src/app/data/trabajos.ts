/**
 * Catálogo de trabajos de Nails Ivonne.
 *
 * Para agregar una foto:
 *  1. Coloca el original en public/images/trabajos/.
 *  2. Genera las copias para web con:  npm run fotos -- "<archivo>" ni-37
 *     (crea public/images/trabajos/web/ni-37-<ancho>.webp e imprime la línea para este archivo).
 *  3. Pega la línea en TRABAJOS, en la posición donde quieras que aparezca.
 *
 * Cada diseño tiene su página (/disenos/ni-37) con una copia JPEG en
 * public/images/trabajos/og/ para que WhatsApp muestre la foto al compartir el enlace.
 *
 * Los originales no se publican (ver "ignore" en angular.json): el sitio usa las copias WebP.
 */

export type CategoriaId = 'clasicos' | 'brillo' | 'arte';

export interface Categoria {
  id: CategoriaId;
  nombre: string;
}

export const CATEGORIAS: readonly Categoria[] = [
  { id: 'clasicos', nombre: 'Nude y francés' },
  { id: 'brillo', nombre: 'Brillo y dorado' },
  { id: 'arte', nombre: 'Arte y color' },
];

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

function foto(nombre: string, width: number, height: number, widths: number[]): Imagen {
  return { base: `/images/trabajos/web/${nombre}`, width, height, widths };
}

/** Orden en que se muestran en el catálogo. */
export const TRABAJOS: readonly Trabajo[] = [
  { id: 'NI-02', titulo: 'Vino con dije dorado', categoria: 'brillo', alt: 'Uñas cuadradas en color vino; una de ellas en tono nude con un dije dorado.', imagen: foto('ni-02', 3024, 4032, [480, 960, 1440]), destacado: true },
  { id: 'NI-25', titulo: 'Conchas y perla', categoria: 'arte', alt: 'Uñas almendradas con conchas en relieve en tono durazno y uñas azul perla con marco dorado.', imagen: foto('ni-25', 2066, 3672, [480, 960, 1440]), destacado: true },
  { id: 'NI-32', titulo: 'Gris con marco dorado', categoria: 'brillo', alt: 'Uñas almendradas en gris humo y nude con bordes dorados.', imagen: foto('ni-32', 899, 979, [480, 899]), destacado: true },
  { id: 'NI-14', titulo: 'Blanco y dorado', categoria: 'brillo', alt: 'Uñas almendradas con francés blanco y detalles dorados en relieve.', imagen: foto('ni-14', 3840, 5120, [480, 960, 1440]), destacado: true },
  { id: 'NI-35', titulo: 'Gemas de colores', categoria: 'arte', alt: 'Uñas almendradas con lunares negros y gemas de colores en verde, morado y rosa.', imagen: foto('ni-35', 2442, 2830, [480, 960, 1440]), destacado: true },
  { id: 'NI-29', titulo: 'Moños y francés rosa', categoria: 'arte', alt: 'Uñas almendradas en rosa con francés blanco, moños en relieve y pequeñas piedras.', imagen: foto('ni-29', 3024, 4032, [480, 960, 1440]), destacado: true },
  { id: 'NI-05', titulo: 'Nude natural', categoria: 'clasicos', alt: 'Uñas almendradas en tono nude con acabado brillante, bajo la luz de una lámpara.', imagen: foto('ni-05', 3024, 4032, [480, 960, 1440]) },
  { id: 'NI-21', titulo: 'Francés dorado fino', categoria: 'clasicos', alt: 'Uñas almendradas en tono nude con una línea dorada fina en la punta.', imagen: foto('ni-21', 3024, 4032, [480, 960, 1440]) },
  { id: 'NI-12', titulo: 'Francés de lunares con flor', categoria: 'arte', alt: 'Uñas almendradas con puntas blancas de lunares negros y flores en relieve con centro dorado.', imagen: foto('ni-12', 2066, 3672, [480, 960, 1440]) },
  { id: 'NI-13', titulo: 'Rosa brillante y dorado', categoria: 'brillo', alt: 'Uñas cuadradas en rosa con brillo y puntas doradas texturizadas.', imagen: foto('ni-13', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-36', titulo: 'Mix de dibujos', categoria: 'arte', alt: 'Uñas almendradas con un diseño distinto en cada una: fresa, osito, flor y lunares.', imagen: foto('ni-36', 2575, 2717, [480, 960, 1440]) },
  { id: 'NI-06', titulo: 'Francés negro', categoria: 'clasicos', alt: 'Uñas almendradas en tono nude con puntas francesas en negro.', imagen: foto('ni-06', 2066, 3672, [480, 960, 1440]) },
  { id: 'NI-26', titulo: 'Nude con relieves dorados', categoria: 'brillo', alt: 'Uñas almendradas en nude y rosa con detalles dorados y pequeñas esferas.', imagen: foto('ni-26', 3024, 4032, [480, 960, 1440]) },
  { id: 'NI-18', titulo: 'Corazones rosas', categoria: 'arte', alt: 'Uñas almendradas en rosa con puntas fucsia y corazones delineados en blanco.', imagen: foto('ni-18', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-08', titulo: 'Plata con perlas', categoria: 'brillo', alt: 'Uñas cuadradas con brillo plateado y pequeñas perlas en relieve.', imagen: foto('ni-08', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-10', titulo: 'Francés blanco', categoria: 'clasicos', alt: 'Uñas cuadradas con francés blanco clásico sobre base rosada.', imagen: foto('ni-10', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-34', titulo: 'Lunares de colores', categoria: 'arte', alt: 'Uñas almendradas en nude con lunares negros y piedras de colores.', imagen: foto('ni-34', 1011, 1143, [480, 960, 1011]) },
  { id: 'NI-11', titulo: 'Moño y corazones', categoria: 'arte', alt: 'Uñas cuadradas en rosa con brillo, un moño dorado, corazones rojos y un corazón dorado.', imagen: foto('ni-11', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-04', titulo: 'Destellos iridiscentes', categoria: 'brillo', alt: 'Uñas almendradas largas con destellos iridiscentes en tonos rosa y verde.', imagen: foto('ni-04', 1980, 3520, [480, 960, 1440]) },
  { id: 'NI-20', titulo: 'Blanco lechoso', categoria: 'clasicos', alt: 'Uñas almendradas en blanco lechoso con acabado brillante.', imagen: foto('ni-20', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-03', titulo: 'Nude con estrellas rosas', categoria: 'arte', alt: 'Uñas cuadradas largas en tono nude con estrellas rosas, puntas metálicas y líneas finas.', imagen: foto('ni-03', 3024, 4032, [480, 960, 1440]) },
  { id: 'NI-23', titulo: 'Rojo con lunares', categoria: 'arte', alt: 'Uñas almendradas en rojo, rosa y nude con lunares blancos y detalles dorados.', imagen: foto('ni-23', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-33', titulo: 'Rosa con relieves dorados', categoria: 'brillo', alt: 'Uñas en rosa con piedras y detalles dorados en relieve.', imagen: foto('ni-33', 3345, 4073, [480, 960, 1440]) },
  { id: 'NI-01', titulo: 'Francés fucsia con detalles', categoria: 'arte', alt: 'Uñas cortas cuadradas con puntas francesas en rosa fucsia y pequeños detalles blancos.', imagen: foto('ni-01', 3024, 4032, [480, 960, 1440]) },
  { id: 'NI-31', titulo: 'Brillo con moños', categoria: 'brillo', alt: 'Uñas almendradas con brillo, piedras y pequeños moños rosas en relieve.', imagen: foto('ni-31', 3024, 4032, [480, 960, 1440]) },
  { id: 'NI-27', titulo: 'Celeste con lunares y rayas', categoria: 'arte', alt: 'Uñas almendradas en azul cielo con lunares negros y rayas.', imagen: foto('ni-27', 3563, 4498, [480, 960, 1440]) },
  { id: 'NI-09', titulo: 'Azul con líneas plateadas', categoria: 'arte', alt: 'Uñas almendradas en azul rey con líneas y figuras plateadas.', imagen: foto('ni-09', 3024, 4032, [480, 960, 1440]) },
  { id: 'NI-28', titulo: 'Nude con estrella', categoria: 'clasicos', alt: 'Uñas almendradas en tono nude; dos de ellas con una estrella blanca.', imagen: foto('ni-28', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-19', titulo: 'Lunares y plata', categoria: 'arte', alt: 'Uñas almendradas en nude y blanco con lunares negros y detalles plateados.', imagen: foto('ni-19', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-30', titulo: 'Nude con textura y oro', categoria: 'brillo', alt: 'Uñas cortas en nude con relieves ondulados y puntas doradas.', imagen: foto('ni-30', 3534, 4416, [480, 960, 1440]) },
  { id: 'NI-16', titulo: 'Rosa chicle con flor', categoria: 'arte', alt: 'Uñas almendradas en rosa chicle; dos de ellas con una flor blanca.', imagen: foto('ni-16', 3024, 4032, [480, 960, 1440]) },
  { id: 'NI-22', titulo: 'Azul metálico', categoria: 'brillo', alt: 'Uñas cortas en azul con acabado metálico.', imagen: foto('ni-22', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-24', titulo: 'Verde olivo con estrellas', categoria: 'arte', alt: 'Uñas cortas en verde olivo con estrellas blancas.', imagen: foto('ni-24', 2066, 3672, [480, 960, 1440]) },
  { id: 'NI-15', titulo: 'Blanco con lunares', categoria: 'arte', alt: 'Uñas almendradas en nude y blanco; algunas con lunares oscuros.', imagen: foto('ni-15', 3840, 5120, [480, 960, 1440]) },
  { id: 'NI-17', titulo: 'Francés amarillo y rosa', categoria: 'arte', alt: 'Uñas cuadradas con puntas francesas en amarillo pastel y rosa.', imagen: foto('ni-17', 2066, 3672, [480, 960, 1440]) },
  { id: 'NI-07', titulo: 'Rosa con puntos blancos', categoria: 'arte', alt: 'Uñas almendradas en rosa pálido; dos de ellas con pequeños puntos blancos.', imagen: foto('ni-07', 3840, 5120, [480, 960, 1440]) },
];

/** Ruta de la página de un diseño: 'NI-25' -> '/disenos/ni-25'. */
export function rutaDiseno(id: string): string {
  return `/disenos/${id.toLowerCase()}`;
}

/** Imagen JPEG de cada diseño para la vista previa en WhatsApp y redes. */
export function imagenCompartir(t: Trabajo): { src: string; width: number; height: number } {
  const width = Math.min(800, t.imagen.width);
  const height = Math.round((t.imagen.height * width) / t.imagen.width);
  return { src: `/images/trabajos/og/${t.id.toLowerCase()}.jpg`, width, height };
}

/** Busca un diseño por id sin importar mayúsculas ('ni-25' o 'NI-25'). */
export function buscarTrabajo(id: string | null | undefined): Trabajo | undefined {
  const clave = id?.toUpperCase();
  return TRABAJOS.find((t) => t.id === clave);
}

/** Foto principal y secundaria de la portada. */
export const PORTADA = {
  principal: TRABAJOS.find((t) => t.id === 'NI-05')!,
  secundaria: TRABAJOS.find((t) => t.id === 'NI-21')!,
};

/** Foto de la sección "Experiencia". */
export const FOTO_EXPERIENCIA = TRABAJOS.find((t) => t.id === 'NI-10')!;
