import { instagramUrl, whatsappNumero } from '../contacto';
import { SITE } from '../site.config';

/** Quita propiedades vacías ('' , [] o undefined) para no publicar datos incompletos. */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0),
    ),
  );
}

/** JSON-LD de negocio local (schema.org/NailSalon) para Google Search y Maps. */
export function buildBusinessSchema(): object {
  const { contacto } = SITE;
  const d = contacto.direccion;
  const address = compact({
    streetAddress: d.calle,
    addressLocality: d.ciudad,
    addressRegion: d.estado,
    postalCode: d.codigoPostal,
    addressCountry: d.pais,
  });
  const telefono = whatsappNumero();
  const instagram = instagramUrl();

  return compact({
    '@context': 'https://schema.org',
    '@type': 'NailSalon',
    name: SITE.name,
    url: SITE.url,
    image: SITE.url + SITE.defaultImage,
    logo: `${SITE.url}/brand/logo-nails-ivonne.svg`,
    description: SITE.defaultDescription,
    telephone: telefono ? `+${telefono}` : '',
    // Solo se publica la dirección si hay calle o ciudad, no únicamente el país.
    address: d.calle || d.ciudad ? { '@type': 'PostalAddress', ...address } : '',
    hasMap: contacto.mapsUrl,
    openingHours: contacto.horarios.map((h) => h.schema).filter((s): s is string => !!s),
    sameAs: instagram ? [instagram] : [],
  });
}
