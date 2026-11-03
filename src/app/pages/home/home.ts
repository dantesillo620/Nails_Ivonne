import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { buildBusinessSchema } from '../../core/seo/business-schema';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>Nails Ivonne</h1>
      <p>Uñas hermosas, hechas con detalle.</p>
      <a routerLink="/contacto">Agenda tu cita</a>
    </section>
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
