import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PanelAgendaService } from './panel-agenda.service';
import { SesionService } from './sesion.service';

/** Marco del panel: barra superior con la marca, enlace al sitio y salir. */
@Component({
  selector: 'app-panel-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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
      @if (sesion.usuario()) {
        <nav class="pestanas" aria-label="Secciones del panel">
          <a
            routerLink="/admin"
            routerLinkActive="activa"
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
          >
            Agenda
            @if (agenda.pendientes(); as n) {
              <span class="contador">{{ n }}<span class="sr-only"> por confirmar</span></span>
            }
          </a>
          <a routerLink="/admin/catalogo" routerLinkActive="activa" ariaCurrentWhenActive="page"
            >Catálogo</a
          >
          <a routerLink="/admin/avisos" routerLinkActive="activa" ariaCurrentWhenActive="page"
            >Avisos</a
          >
        </nav>
      }
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
    .pestanas {
      position: sticky;
      top: 60px;
      z-index: 9;
      display: flex;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.4rem 1rem;
      background: var(--marfil);
      border-bottom: 1px solid var(--linea);
    }
    .pestanas a {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 44px;
      padding: 0 1.1rem;
      border-radius: 999px;
      text-decoration: none;
      color: var(--tinta-suave);
    }
    .pestanas a.activa {
      background: var(--ciruela);
      color: var(--marfil);
    }
    .contador {
      min-width: 1.4rem;
      padding: 0 0.4rem;
      border-radius: 999px;
      background: var(--dorado);
      color: var(--ciruela-2);
      font-size: 0.8rem;
      font-weight: 600;
      text-align: center;
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
  protected readonly agenda = inject(PanelAgendaService);
  private readonly router = inject(Router);
  protected readonly saliendo = signal(false);

  constructor() {
    this.usarAppDelPanel();

    // El número de citas por confirmar se ve en la pestaña desde cualquier página del panel.
    effect(() => {
      if (this.sesion.usuario() && !untracked(() => this.agenda.semana())) {
        void this.agenda.cargar().catch(() => {
          /* la página de agenda muestra el error si se visita */
        });
      }
    });
  }

  /**
   * Dentro del panel, "Agregar a pantalla de inicio" instala la app del panel (abre en la
   * agenda, ícono ciruela) y no la del sitio. Al salir del panel se deja todo como estaba.
   */
  private usarAppDelPanel(): void {
    const head = inject(DOCUMENT).head;
    const cambios: [Element | null, string, string][] = [
      [head.querySelector('link[rel="manifest"]'), 'href', '/panel.webmanifest'],
      [head.querySelector('link[rel="apple-touch-icon"]'), 'href', '/brand/app/panel-180.png'],
      [head.querySelector('meta[name="apple-mobile-web-app-title"]'), 'content', 'Panel Ivonne'],
      [head.querySelector('meta[name="theme-color"]'), 'content', '#3e1224'],
    ];
    const antes = cambios.map(([el, attr]) => el?.getAttribute(attr) ?? null);
    for (const [el, attr, valor] of cambios) el?.setAttribute(attr, valor);
    inject(DestroyRef).onDestroy(() =>
      cambios.forEach(([el, attr], i) => {
        const v = antes[i];
        if (el && v !== null) el.setAttribute(attr, v);
      }),
    );
  }

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
