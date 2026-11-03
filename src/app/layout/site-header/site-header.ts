import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { whatsappUrl } from '../../core/contacto';
import { NAV } from '../nav';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  host: {
    '[class.con-fondo]': 'conFondo()',
    '[class.menu-abierto]': 'menuAbierto()',
    '(document:keydown.escape)': 'cerrarConEscape()',
  },
})
export class SiteHeader {
  protected readonly nav = NAV;
  protected readonly whatsapp = whatsappUrl();
  protected readonly menuAbierto = signal(false);
  /** El encabezado gana fondo al bajar, para separarse del contenido. */
  protected readonly conFondo = signal(false);

  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const actualizar = () => this.conFondo.set(window.scrollY > 24);
      actualizar();
      window.addEventListener('scroll', actualizar, { passive: true });

      // Si la pantalla crece a escritorio con el menú abierto, se cierra.
      const escritorio = window.matchMedia('(min-width: 960px)');
      const alCambiar = (e: MediaQueryListEvent) => e.matches && this.menuAbierto.set(false);
      escritorio.addEventListener('change', alCambiar);

      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', actualizar);
        escritorio.removeEventListener('change', alCambiar);
      });
    });
  }

  protected alternarMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected cerrarConEscape(): void {
    if (!this.menuAbierto()) return;
    this.menuAbierto.set(false);
    this.botonMenu()?.nativeElement.focus();
  }
}
