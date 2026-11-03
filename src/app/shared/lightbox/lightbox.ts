import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { whatsappDisenoUrl } from '../../core/contacto';
import { CATEGORIAS } from '../../data/trabajos';
import { LightboxService } from './lightbox.service';

/**
 * Visor de fotos en un <dialog> modal nativo: el navegador mueve el foco al
 * abrir, deja inerte el resto de la página y cierra con Escape. Al cerrar, el
 * servicio devuelve el foco a la foto que lo abrió.
 */
@Component({
  selector: 'app-lightbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lightbox.html',
  styleUrl: './lightbox.scss',
})
export class Lightbox {
  private readonly lb = inject(LightboxService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly trabajo = this.lb.actual;
  protected readonly posicion = computed(() => (this.lb.index() ?? 0) + 1);
  protected readonly total = computed(() => this.lb.items().length);
  protected readonly categoria = computed(() => {
    const c = this.trabajo()?.categoria;
    return CATEGORIAS.find((x) => x.id === c)?.nombre ?? null;
  });
  protected readonly whatsapp = computed(() => {
    const t = this.trabajo();
    return t ? whatsappDisenoUrl(t.titulo, t.id) : null;
  });
  protected readonly srcset = computed(() => {
    const img = this.trabajo()?.imagen;
    return img ? img.widths.map((w) => `${img.base}-${w}.webp ${w}w`).join(', ') : '';
  });
  protected readonly src = computed(() => {
    const img = this.trabajo()?.imagen;
    return img ? `${img.base}-${img.widths[img.widths.length - 1]}.webp` : '';
  });

  private swipeX: number | null = null;

  constructor() {
    effect(() => {
      const abierto = this.lb.index() !== null;
      const dialog = this.dialog().nativeElement;
      if (abierto && !dialog.open) dialog.showModal();
      if (!abierto && dialog.open) dialog.close();
    });
  }

  /** Cierra el diálogo; el evento `close` sincroniza el estado y regresa el foco. */
  protected cerrar(): void {
    this.dialog().nativeElement.close();
  }

  protected alCerrar(): void {
    this.lb.cerrar();
  }

  protected anterior(): void {
    this.lb.anterior();
  }

  protected siguiente(): void {
    this.lb.siguiente();
  }

  protected teclado(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.lb.siguiente();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.lb.anterior();
    }
  }

  /** Clic en el fondo (fuera del contenido) cierra el visor. */
  protected clicFondo(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cerrar();
  }

  protected inicioGesto(event: PointerEvent): void {
    this.swipeX = event.pointerType === 'mouse' ? null : event.clientX;
  }

  protected finGesto(event: PointerEvent): void {
    if (this.swipeX === null) return;
    const dx = event.clientX - this.swipeX;
    this.swipeX = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) this.lb.siguiente();
    else this.lb.anterior();
  }
}
