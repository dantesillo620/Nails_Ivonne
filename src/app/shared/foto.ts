import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Imagen } from '../data/trabajos';

/**
 * Imagen responsiva del catálogo: srcset WebP, dimensiones reales para evitar
 * saltos de contenido y carga diferida salvo que se marque como prioritaria.
 */
@Component({
  selector: 'app-foto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [src]="src()"
      [attr.srcset]="srcset()"
      [attr.sizes]="sizes()"
      [width]="imagen().width"
      [height]="imagen().height"
      [alt]="alt()"
      [attr.loading]="prioridad() ? 'eager' : 'lazy'"
      [attr.fetchpriority]="prioridad() ? 'high' : null"
      decoding="async"
    />
  `,
  styles: `
    :host {
      display: block;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: var(--foto-fit, cover);
      object-position: var(--foto-pos, center);
    }
  `,
})
export class Foto {
  readonly imagen = input.required<Imagen>();
  readonly alt = input.required<string>();
  /** Valor del atributo sizes (cuánto ocupa la imagen en pantalla). */
  readonly sizes = input('100vw');
  /** true para la imagen principal de la portada. */
  readonly prioridad = input(false);

  protected readonly srcset = computed(() => {
    const { base, widths } = this.imagen();
    return widths.map((w) => `${base}-${w}.webp ${w}w`).join(', ');
  });

  protected readonly src = computed(() => {
    const { base, widths } = this.imagen();
    const w = widths.find((x) => x >= 960) ?? widths[widths.length - 1];
    return `${base}-${w}.webp`;
  });
}
