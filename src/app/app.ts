import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { CatalogoService } from './core/catalogo.service';
import { SeleccionService } from './core/seleccion.service';
import { BarraSeleccion } from './layout/barra-seleccion/barra-seleccion';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, BarraSeleccion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (panel()) {
      <router-outlet />
    } @else {
      <app-site-header />
      <main id="contenido" tabindex="-1">
        <router-outlet />
      </main>
      <app-site-footer />
      <app-barra-seleccion />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    main {
      flex: 1;
    }
    main:focus {
      outline: none;
    }
  `,
})
export class App {
  private readonly router = inject(Router);
  private readonly ruta = inject(Location);

  /** En /admin el panel tiene su propio marco: sin encabezado, pie ni barra del sitio. */
  protected readonly panel = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => esPanel(e.urlAfterRedirects)),
    ),
    // Antes de la primera navegación se usa la dirección del navegador, para no mostrar el sitio un instante.
    { initialValue: esPanel(this.ruta.path()) },
  );

  constructor() {
    const seleccion = inject(SeleccionService);
    const catalogo = inject(CatalogoService);
    // Después del primer render, para no alterar el HTML prerenderizado durante la hidratación.
    afterNextRender(() => {
      if (this.panel()) return;
      void catalogo.actualizar();
      seleccion.restaurar();
    });
  }
}

function esPanel(url: string): boolean {
  return url === '/admin' || url.startsWith('/admin/') || url.startsWith('/admin?');
}
