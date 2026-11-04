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
import { CatalogoService } from '../../core/catalogo.service';
import { SeleccionService } from '../../core/seleccion.service';
import { SITE } from '../../core/site.config';
import { CategoriaId } from '../../data/trabajos';
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
  private readonly catalogo = inject(CatalogoService);
  protected readonly seleccion = inject(SeleccionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly textos = SITE.textos.catalogo;

  /** Solo se muestran filtros de categorías que tienen trabajos. */
  protected readonly filtros = computed(() => {
    const trabajos = this.catalogo.trabajos();
    return [
      { id: 'todos' as Filtro, nombre: 'Todos', cantidad: trabajos.length },
      ...this.catalogo
        .categorias()
        .map((c) => ({
          id: c.id as Filtro,
          nombre: c.nombre,
          cantidad: trabajos.filter((t) => t.categoria === c.id).length,
        }))
        .filter((f) => f.cantidad > 0),
    ];
  });

  private readonly elegido = signal<Filtro>('todos');
  /** Si la categoría elegida desaparece del catálogo fresco, se vuelve a "Todos". */
  protected readonly filtro = computed<Filtro>(() => {
    const f = this.elegido();
    return this.filtros().some((x) => x.id === f) ? f : 'todos';
  });
  private readonly limite = signal(PASO);

  protected readonly filtrados = computed(() => {
    const f = this.filtro();
    const trabajos = this.catalogo.trabajos();
    return f === 'todos' ? trabajos : trabajos.filter((t) => t.categoria === f);
  });
  protected readonly mostrados = computed(() => this.filtrados().slice(0, this.limite()));
  protected readonly quedan = computed(() => this.filtrados().length - this.mostrados().length);

  protected elegir(filtro: Filtro): void {
    if (filtro === this.filtro()) return;
    this.elegido.set(filtro);
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
