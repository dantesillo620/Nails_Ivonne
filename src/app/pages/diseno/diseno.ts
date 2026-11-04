import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogoService } from '../../core/catalogo.service';
import { whatsappDisenoUrl } from '../../core/contacto';
import { SeleccionService } from '../../core/seleccion.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE } from '../../core/site.config';
import { Trabajo, rutaDiseno } from '../../data/trabajos';
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
  private readonly catalogo = inject(CatalogoService);
  private readonly router = inject(Router);
  protected readonly seleccion = inject(SeleccionService);

  /** Parámetro :id de la ruta ('ni-25'). */
  readonly id = input.required<string>();

  /**
   * La ruta solo coincide si el diseño existe. Si el catálogo fresco ya no lo trae
   * (Ivonne lo ocultó), se conserva el anterior mientras la página pasa al 404.
   */
  protected readonly trabajo = linkedSignal<Trabajo | undefined, Trabajo>({
    source: () => this.catalogo.buscar(this.id()),
    computation: (actual, previo) => actual ?? previo!.value,
  });
  protected readonly categoria = computed(() => this.catalogo.nombreCategoria(this.trabajo().categoria));
  protected readonly whatsapp = computed(() => whatsappDisenoUrl(this.trabajo().titulo, this.trabajo().id));
  protected readonly elegido = computed(() => {
    this.seleccion.trabajos();
    return this.seleccion.tiene(this.trabajo().id);
  });

  /** Diseño anterior y siguiente en el orden del catálogo (circular). */
  protected readonly vecinos = computed(() => {
    const lista = this.catalogo.trabajos();
    const id = this.trabajo().id;
    const i = Math.max(0, lista.findIndex((t) => t.id === id));
    const n = lista.length;
    return { anterior: lista[(i - 1 + n) % n], siguiente: lista[(i + 1) % n] };
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
    // Diseño oculto o borrado desde el panel: se vuelve a resolver la misma URL, que ahora cae en el 404.
    effect(() => {
      if (this.catalogo.actualizado() && !this.catalogo.buscar(this.id())) {
        untracked(() => void this.router.navigateByUrl(this.router.url, { skipLocationChange: true }));
      }
    });

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
