import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SeleccionService } from '../../core/seleccion.service';
import { SITE } from '../../core/site.config';
import { CATEGORIAS, CategoriaId, TRABAJOS } from '../../data/trabajos';
import { Elegir } from '../../shared/elegir/elegir';
import { Foto } from '../../shared/foto';
import { LightboxService } from '../../shared/lightbox/lightbox.service';
import { Reveal } from '../../shared/reveal';

type Filtro = CategoriaId | 'todos';

/** Cuántos diseños se muestran al inicio y en cada "Ver más". */
const PASO = 12;

@Component({
  selector: 'app-catalogo',
  imports: [Foto, Reveal, Elegir],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo {
  private readonly lightbox = inject(LightboxService);
  protected readonly seleccion = inject(SeleccionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly textos = SITE.textos.catalogo;
  protected readonly total = TRABAJOS.length;

  /** Solo se muestran filtros de categorías que tienen trabajos. */
  protected readonly filtros = [
    { id: 'todos' as Filtro, nombre: 'Todos', cantidad: TRABAJOS.length },
    ...CATEGORIAS.map((c) => ({
      id: c.id as Filtro,
      nombre: c.nombre,
      cantidad: TRABAJOS.filter((t) => t.categoria === c.id).length,
    })).filter((f) => f.cantidad > 0),
  ];

  protected readonly filtro = signal<Filtro>('todos');
  private readonly limite = signal(PASO);

  protected readonly filtrados = computed(() => {
    const f = this.filtro();
    return f === 'todos' ? TRABAJOS : TRABAJOS.filter((t) => t.categoria === f);
  });
  protected readonly mostrados = computed(() => this.filtrados().slice(0, this.limite()));
  protected readonly quedan = computed(() => this.filtrados().length - this.mostrados().length);

  protected elegir(filtro: Filtro): void {
    if (filtro === this.filtro()) return;
    this.filtro.set(filtro);
    this.limite.set(PASO);
  }

  protected verMas(): void {
    const primeroNuevo = this.mostrados().length;
    this.limite.update((n) => n + PASO);
    // Lleva el foco al primer diseño nuevo para no perder el lugar al navegar con teclado.
    afterNextRender(
      () => {
        const botones = this.host.nativeElement.querySelectorAll<HTMLButtonElement>('.tarjeta');
        botones[primeroNuevo]?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  protected abrir(index: number, event: Event): void {
    this.lightbox.abrir(this.filtrados(), index, event.currentTarget as HTMLElement);
  }
}
