import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeleccionService } from '../../core/seleccion.service';

/** Aviso flotante con los diseños elegidos y acceso directo a la agenda. */
@Component({
  selector: 'app-barra-seleccion',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="barra" role="region" aria-label="Diseños elegidos">
        <ul class="miniaturas" aria-hidden="true">
          @for (t of miniaturas(); track t.id) {
            <li><img [src]="t.imagen.base + '-480.webp'" alt="" width="40" height="40" /></li>
          }
        </ul>
        <p class="texto">
          {{ seleccion.cantidad() }} {{ seleccion.cantidad() === 1 ? 'diseño elegido' : 'diseños elegidos' }}
        </p>
        <a class="ir" routerLink="/" fragment="agenda">
          Agendar
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    }
  `,
  styleUrl: './barra-seleccion.scss',
})
export class BarraSeleccion {
  protected readonly seleccion = inject(SeleccionService);
  protected readonly visible = computed(
    () => this.seleccion.cantidad() > 0 && !this.seleccion.agendaVisible(),
  );
  protected readonly miniaturas = computed(() => this.seleccion.trabajos().slice(-3));
}
