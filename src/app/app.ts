import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { AvisosService, EventoInstalar } from './admin/avisos.service';
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
  private readonly sw = inject(SwUpdate);

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
    const avisos = inject(AvisosService);
    afterNextRender(() => {
      this.aplicarVersionesNuevas();
      // En el panel se ofrece instalar con un botón propio (sección Avisos). En el sitio
      // se deja el ofrecimiento normal del navegador para las clientas.
      window.addEventListener('beforeinstallprompt', (e) => {
        if (!this.panel()) return;
        e.preventDefault();
        avisos.instalable.set(e as EventoInstalar);
      });
      window.addEventListener('appinstalled', () => {
        avisos.instalable.set(null);
        avisos.instalada.set(true);
      });
      if (this.panel()) return;
      void catalogo.actualizar();
      seleccion.restaurar();
    });
  }
  /**
   * Cuando hay una versión nueva del sitio, el service worker la descarga en segundo plano.
   * Se aplica en la siguiente navegación con una recarga completa: así nunca se mezclan
   * archivos de dos versiones (y nadie pierde lo que está escribiendo).
   */
  private aplicarVersionesNuevas(): void {
    const sw = this.sw;
    if (!sw.isEnabled) return;
    let lista = false;
    sw.versionUpdates
      .pipe(filter((e) => e.type === 'VERSION_READY'))
      .subscribe(() => (lista = true));
    sw.unrecoverable.subscribe(() => location.reload());
    this.router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe((e) => {
      if (lista) location.assign(e.url);
    });
  }
}

function esPanel(url: string): boolean {
  return url === '/admin' || url.startsWith('/admin/') || url.startsWith('/admin?');
}
