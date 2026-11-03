import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeleccionService } from './core/seleccion.service';
import { BarraSeleccion } from './layout/barra-seleccion/barra-seleccion';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, BarraSeleccion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header />
    <main id="contenido" tabindex="-1">
      <router-outlet />
    </main>
    <app-site-footer />
    <app-barra-seleccion />
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
  constructor() {
    const seleccion = inject(SeleccionService);
    afterNextRender(() => seleccion.restaurar());
  }
}
