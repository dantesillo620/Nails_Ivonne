import { rutaDiseno } from '../data/trabajos';
import { SITE } from './site.config';

/** Número de WhatsApp válido (8 a 15 dígitos internacionales) o null. */
export function whatsappNumero(): string | null {
  const digits = SITE.contacto.whatsapp.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** Enlace wa.me con mensaje codificado, o null si no hay número configurado. */
export function whatsappUrl(mensaje: string = SITE.textos.whatsapp.consulta): string | null {
  const numero = whatsappNumero();
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null;
}

/** Dirección pública de la página de un diseño (WhatsApp muestra su foto). */
export function urlDiseno(id: string): string {
  return SITE.url + rutaDiseno(id);
}

/** Enlace de WhatsApp para pedir un diseño similar al del catálogo. */
export function whatsappDisenoUrl(titulo: string, id: string): string | null {
  const mensaje = SITE.textos.whatsapp.diseno
    .replace('{titulo}', titulo)
    .replace('{id}', id)
    .replace('{url}', urlDiseno(id));
  return whatsappUrl(mensaje);
}

/** Usuario de Instagram normalizado (sin @ ni URL) o null. */
export function instagramUsuario(): string | null {
  const raw = SITE.contacto.instagram.trim();
  if (!raw) return null;
  const user = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(user) ? user : null;
}

export function instagramUrl(): string | null {
  const user = instagramUsuario();
  return user ? `https://www.instagram.com/${user}/` : null;
}

/** Líneas de dirección no vacías, listas para mostrarse. */
export function direccionLineas(): string[] {
  const d = SITE.contacto.direccion;
  const linea2 = [d.colonia, d.codigoPostal && `C.P. ${d.codigoPostal}`].filter(Boolean).join(', ');
  const linea3 = [d.ciudad, d.estado].filter(Boolean).join(', ');
  return [d.calle, linea2, linea3].filter((l): l is string => !!l);
}
