import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SesionService } from './sesion.service';

/** Marco del panel: barra superior con la marca, enlace al sitio y salir. */
@Component({
  selector: 'app-panel-layout',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel">
      <header class="barra">
        <a routerLink="/admin" class="marca">
          <img src="/brand/isotipo-nails-ivonne.svg" alt="" width="22" height="29" />
          <span>Nails Ivonne <span class="sub">Panel</span></span>
        </a>
        @if (sesion.usuario(); as u) {
          <nav class="acciones" aria-label="Panel">
            <a href="/" target="_blank" rel="noopener"
              >Ver sitio<span class="sr-only"> (abre otra pestaña)</span></a
            >
            <button type="button" (click)="salir()" [disabled]="saliendo()">Salir</button>
          </nav>
        }
      </header>
      <div class="contenido">
        <router-outlet />
      </div>
    </div>
  `,
  styles: `
    .panel {
      min-height: 100dvh;
      background: var(--marfil);
    }
    .barra {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-height: 60px;
      padding: 0.5rem max(1rem, env(safe-area-inset-left)) 0.5rem
        max(1rem, env(safe-area-inset-right));
      padding-top: max(0.5rem, env(safe-area-inset-top));
      background: var(--ciruela);
      color: var(--marfil);
    }
    .marca {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      min-height: 44px;
      font-family: var(--font-display);
      font-size: 1.35rem;
      text-decoration: none;
    }
    .marca img {
      filter: brightness(0) invert(1);
      opacity: 0.9;
    }
    .sub {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--dorado-claro);
      margin-left: 0.3rem;
    }
    .acciones {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .acciones a,
    .acciones button {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 0.75rem;
      border: 0;
      border-radius: 999px;
      background: none;
      font-size: 0.9rem;
      text-decoration: none;
      cursor: pointer;
    }
    .acciones button {
      border: 1px solid color-mix(in srgb, var(--marfil) 35%, transparent);
    }
    .contenido {
      max-width: 960px;
      margin-inline: auto;
      padding: 1.5rem 1rem calc(3rem + env(safe-area-inset-bottom));
    }
    :focus-visible {
      outline-color: var(--dorado-claro);
    }
  `,
})
export default class PanelLayout {
  protected readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  protected readonly saliendo = signal(false);

  protected async salir(): Promise<void> {
    this.saliendo.set(true);
    try {
      await this.sesion.salir();
    } finally {
      this.saliendo.set(false);
      void this.router.navigateByUrl('/admin/entrar');
    }
  }
}
