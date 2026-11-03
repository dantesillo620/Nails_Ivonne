import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { whatsappDisenoUrl } from '../../core/contacto';
import { SeleccionService } from '../../core/seleccion.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE } from '../../core/site.config';
import { CATEGORIAS, TRABAJOS, buscarTrabajo, rutaDiseno } from '../../data/trabajos';
import { Elegir } from '../../shared/elegir/elegir';

@Component({
  selector: 'app-diseno',
  imports: [RouterLink, Elegir],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diseno.html',
  styleUrl: './diseno.scss',
})
export default class Diseno implements OnDestroy {
  private readonly seo = inject(SeoService);
  protected readonly seleccion = inject(SeleccionService);

  /** Parámetro :id de la ruta ('ni-25'). */
  readonly id = input.required<string>();

  protected readonly trabajo = computed(() => buscarTrabajo(this.id())!);
  protected readonly categoria = computed(
    () => CATEGORIAS.find((c) => c.id === this.trabajo().categoria)?.nombre ?? null,
  );
  protected readonly whatsapp = computed(() => whatsappDisenoUrl(this.trabajo().titulo, this.trabajo().id));
  protected readonly elegido = computed(() => {
    this.seleccion.trabajos();
    return this.seleccion.tiene(this.trabajo().id);
  });

  /** Diseño anterior y siguiente en el orden del catálogo (circular). */
  protected readonly vecinos = computed(() => {
    const i = TRABAJOS.indexOf(this.trabajo());
    const n = TRABAJOS.length;
    return { anterior: TRABAJOS[(i - 1 + n) % n], siguiente: TRABAJOS[(i + 1) % n] };
  });

  protected readonly srcset = computed(() => {
    const { base, widths } = this.trabajo().imagen;
    return widths.map((w) => `${base}-${w}.webp ${w}w`).join(', ');
  });
  protected readonly src = computed(() => {
    const { base, widths } = this.trabajo().imagen;
    return `${base}-${widths.find((w) => w >= 960) ?? widths[widths.length - 1]}.webp`;
  });

  protected readonly ruta = rutaDiseno;

  constructor() {
    effect(() => {
      const t = this.trabajo();
      this.seo.setJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE.url + '/' },
          { '@type': 'ListItem', position: 2, name: 'Catálogo', item: SITE.url + '/#catalogo' },
          { '@type': 'ListItem', position: 3, name: `${t.titulo} (${t.id})`, item: SITE.url + rutaDiseno(t.id) },
        ],
      });
    });
  }

  ngOnDestroy(): void {
    this.seo.setJsonLd('breadcrumb', null);
  }
}
