import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { SITE } from '../site.config';
import { SeoData, SeoService } from './seo.service';

/**
 * Reemplaza la estrategia de títulos de Angular: en cada navegación lee
 * `title` y `data.seo` de la ruta activa y aplica todas las meta tags.
 * Al prerenderizar, esto queda escrito en el HTML de cada página.
 */
@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    const fullTitle = pageTitle ? `${pageTitle} | ${SITE.name}` : SITE.name;

    let route: ActivatedRouteSnapshot = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const data = (route.data['seo'] ?? {}) as SeoData;

    this.seo.update(fullTitle, snapshot.url, data);
  }
}
