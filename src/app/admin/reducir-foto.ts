/** Lado más largo con el que se sube una foto: suficiente para la versión de 1440 px. */
export const LADO_MAXIMO = 2400;

/**
 * Reduce la foto en el celular antes de subirla: una foto de 12 MP (3–6 MB) queda
 * en unos cientos de KB, así sube rápido con datos móviles y el servidor la procesa
 * en menos tiempo. `createImageBitmap` aplica la orientación del EXIF y el canvas
 * no conserva los metadatos (ubicación del celular).
 *
 * Si el navegador no puede leerla, se sube tal cual y el servidor decide.
 */
export async function reducirFoto(archivo: File, ladoMaximo = LADO_MAXIMO): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return archivo;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    return archivo;
  }

  try {
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return archivo;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((listo) => canvas.toBlob(listo, 'image/jpeg', 0.9));
    if (!blob) return archivo;
    // Si "reducirla" la hizo más pesada (ya venía pequeña y comprimida), se usa la original,
    // siempre que el servidor la acepte (un HEIC del iPhone siempre se convierte).
    const aceptada = ['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type);
    return escala === 1 && aceptada && blob.size >= archivo.size ? archivo : blob;
  } finally {
    bitmap.close();
  }
}
