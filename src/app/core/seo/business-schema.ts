import { SITE } from '../site.config';

/** Quita propiedades vacías ('' o []) para no publicar datos incompletos. */
function compact<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && !(Array.isArray(v) && v.length === 0)),
  ) as Partial<T>;
}

/** JSON-LD de negocio local (schema.org/NailSalon) para Google Search y Maps. */
export function buildBusinessSchema(): object {
  const { business } = SITE;
  const address = compact(business.address);

  return compact({
    '@context': 'https://schema.org',
    '@type': 'NailSalon',
    name: SITE.name,
    url: SITE.url,
    image: SITE.url + SITE.defaultImage,
    description: SITE.defaultDescription,
    telephone: business.telephone,
    priceRange: business.priceRange,
    address: Object.keys(address).length > 1 ? { '@type': 'PostalAddress', ...address } : '',
    openingHours: [...business.openingHours],
    sameAs: [...business.sameAs],
  });
}
