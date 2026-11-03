import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE } from '../site.config';

/** Datos SEO que puede declarar cada ruta en `data.seo`. */
export interface SeoData {
  /** Descripción para Google y redes (idealmente 120-160 caracteres). */
  description?: string;
  /** Imagen para compartir; ruta relativa a /public o URL absoluta. */
  image?: string;
  /** `true` para que la página no se indexe (p. ej. la 404). */
  noindex?: boolean;
  /** Medidas y texto alternativo de `image` (ayudan a WhatsApp y Facebook a mostrarla). */
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  /** Tipo Open Graph; por defecto `website`. */
  type?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** Aplica título, descripción, canonical, Open Graph y Twitter Card. */
  update(pageTitle: string, path: string, seo: SeoData = {}): void {
    const description = seo.description ?? SITE.defaultDescription;
    const url = this.absoluteUrl(path);
    const image = this.absoluteUrl(seo.image ?? SITE.defaultImage);
    // Sin imagen propia se usa la de la marca (1200×630).
    const dims = seo.image
      ? { w: seo.imageWidth, h: seo.imageHeight, alt: seo.imageAlt }
      : { w: 1200, h: 630, alt: SITE.name };

    this.title.setTitle(pageTitle);
    this.setName('description', description);
    this.setName('robots', seo.noindex ? 'noindex, follow' : 'index, follow');

    this.setProperty('og:site_name', SITE.name);
    this.setProperty('og:locale', SITE.locale);
    this.setProperty('og:type', seo.type ?? 'website');
    this.setProperty('og:title', pageTitle);
    this.setProperty('og:description', description);
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.setOptionalProperty('og:image:width', dims.w?.toString());
    this.setOptionalProperty('og:image:height', dims.h?.toString());
    this.setOptionalProperty('og:image:alt', dims.alt);

    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', pageTitle);
    this.setName('twitter:description', description);
    this.setName('twitter:image', image);

    this.setCanonical(url);
  }

  /** Inserta o reemplaza un bloque JSON-LD identificado por `id`. */
  setJsonLd(id: string, data: object | null): void {
    const head = this.document.head;
    const existing = head.querySelector(`script[type="application/ld+json"][data-id="${id}"]`);
    existing?.remove();
    if (!data) return;

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-id', id);
    script.textContent = JSON.stringify(data);
    head.appendChild(script);
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setOptionalProperty(property: string, content: string | undefined): void {
    if (content) this.meta.updateTag({ property, content });
    else this.meta.removeTag(`property="${property}"`);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }

  private absoluteUrl(path: string): string {
    if (/^https?:\/\//.test(path)) return path;
    const clean = path.split(/[?#]/)[0];
    return SITE.url + (clean.startsWith('/') ? clean : `/${clean}`);
  }
}
