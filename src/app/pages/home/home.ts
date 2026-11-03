import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { buildBusinessSchema } from '../../core/seo/business-schema';
import { SeoService } from '../../core/seo/seo.service';
import { Catalogo } from '../../sections/catalogo/catalogo';
import { Contacto } from '../../sections/contacto/contacto';
import { Destacados } from '../../sections/destacados/destacados';
import { Experiencia } from '../../sections/experiencia/experiencia';
import { Hero } from '../../sections/hero/hero';
import { Lightbox } from '../../shared/lightbox/lightbox';

@Component({
  selector: 'app-home',
  imports: [Hero, Destacados, Catalogo, Experiencia, Contacto, Lightbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hero />
    <app-destacados />
    <app-catalogo />
    <app-experiencia />
    <app-contacto />
    <app-lightbox />
  `,
})
export default class Home implements OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setJsonLd('business', buildBusinessSchema());
  }

  ngOnDestroy(): void {
    this.seo.setJsonLd('business', null);
  }
}
