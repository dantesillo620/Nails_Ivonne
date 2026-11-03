import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SeleccionService } from '../../core/seleccion.service';
import { Trabajo } from '../../data/trabajos';

/**
 * Botón para agregar o quitar un diseño de la selección para la cita.
 * `icono`: círculo sobre la foto del catálogo. `boton`: botón con texto.
 */
@Component({
  selector: 'app-elegir',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (seleccion.activa) {
      <button
        type="button"
        [class]="variante()"
        [class.elegido]="elegido()"
        [attr.aria-pressed]="elegido()"
        [attr.aria-label]="variante() === 'icono' ? 'Elegir para mi cita: ' + trabajo().titulo + ', ' + trabajo().id : null"
        (click)="alternar($event)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path class="mas" d="M12 6v12M6 12h12" />
          <path class="check" d="M6 12.5l4 4 8-9" pathLength="1" />
        </svg>
        @if (variante() === 'boton') {
          <span>Elegir para mi cita</span>
        }
      </button>
    }
  `,
  styleUrl: './elegir.scss',
})
export class Elegir {
  protected readonly seleccion = inject(SeleccionService);

  readonly trabajo = input.required<Trabajo>();
  readonly variante = input<'icono' | 'boton'>('icono');

  protected readonly elegido = computed(() => {
    this.seleccion.trabajos();
    return this.seleccion.tiene(this.trabajo().id);
  });

  protected alternar(event: Event): void {
    event.stopPropagation();
    this.seleccion.alternar(this.trabajo().id);
  }
}
