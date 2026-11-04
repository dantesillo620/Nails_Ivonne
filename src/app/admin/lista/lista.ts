import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PanelCatalogoService, TrabajoPanel } from '../panel-catalogo.service';
import { explicarError } from '../sesion.service';

type Filtro = 'todos' | 'visibles' | 'ocultos' | 'destacados';

/** Catálogo del panel: mostrar u ocultar, destacar, ordenar y entrar a editar. */
@Component({
  selector: 'app-lista',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista.html',
  styleUrl: './lista.scss',
})
export default class Lista {
  protected readonly catalogo = inject(PanelCatalogoService);

  /** Mensaje del último cambio ("Guardado", errores); lo leen los lectores de pantalla. */
  protected readonly aviso = signal<{ texto: string; error: boolean } | null>(null);
  protected readonly error = signal('');
  /** Diseños con un cambio en curso. */
  protected readonly ocupados = signal<ReadonlySet<number>>(new Set());
  protected readonly filtro = signal<Filtro>('todos');

  protected readonly cuentas = computed(() => {
    const t = this.catalogo.trabajos();
    return {
      todos: t.length,
      visibles: t.filter((x) => x.visible).length,
      ocultos: t.filter((x) => !x.visible).length,
      destacados: t.filter((x) => x.destacado).length,
    };
  });

  protected readonly filtros: { id: Filtro; nombre: string }[] = [
    { id: 'todos', nombre: 'Todos' },
    { id: 'visibles', nombre: 'En el sitio' },
    { id: 'ocultos', nombre: 'Ocultos' },
    { id: 'destacados', nombre: 'Destacados' },
  ];

  protected readonly lista = computed(() => {
    const t = this.catalogo.trabajos();
    switch (this.filtro()) {
      case 'visibles':
        return t.filter((x) => x.visible);
      case 'ocultos':
        return t.filter((x) => !x.visible);
      case 'destacados':
        return t.filter((x) => x.destacado);
      default:
        return t;
    }
  });

  /** El orden solo se cambia viendo el catálogo completo, para que "subir" sea claro. */
  protected readonly ordenable = computed(() => this.filtro() === 'todos');

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    void this.catalogo.cargar().catch((e) => this.error.set(explicarError(e).mensaje));
    // El editor regresa aquí con un aviso ("NI-37 publicado.").
    const aviso = (history.state as { aviso?: unknown } | null)?.aviso;
    if (typeof aviso === 'string') this.avisar(aviso, false);
  }

  protected miniatura(t: TrabajoPanel): string {
    return `${t.imagen.base}-${t.imagen.widths[0]}.webp`;
  }

  protected ocupado(id: number): boolean {
    return this.ocupados().has(id);
  }

  /**
   * El interruptor se mueve solo al tocarlo; si el cambio no se guarda (sin internet,
   * sesión vencida) se regresa a lo que de verdad está guardado.
   */
  protected async alternarVisible(t: TrabajoPanel, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    await this.alternar(t, 'visible');
    input.checked = this.catalogo.buscar(t.id)?.visible ?? t.visible;
  }

  protected async alternar(t: TrabajoPanel, campo: 'visible' | 'destacado'): Promise<void> {
    const valor = !t[campo];
    const texto =
      campo === 'visible'
        ? valor
          ? `${t.codigo} ya se ve en el sitio.`
          : `${t.codigo} quedó oculto.`
        : valor
          ? `${t.codigo} ahora es destacado.`
          : `${t.codigo} ya no es destacado.`;
    await this.cambio(t.id, () => this.catalogo.editar(t.id, { [campo]: valor }), texto);
  }

  protected async mover(t: TrabajoPanel, delta: -1 | 1): Promise<void> {
    await this.cambio(t.id, () => this.catalogo.mover(t.id, delta), 'Orden guardado.');
  }

  private async cambio(id: number, accion: () => Promise<unknown>, exito: string): Promise<void> {
    if (this.ocupado(id)) return;
    this.ocupados.update((s) => new Set(s).add(id));
    try {
      await accion();
      this.avisar(exito, false);
    } catch (e) {
      this.avisar(explicarError(e).mensaje, true);
    } finally {
      this.ocupados.update((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  private avisar(texto: string, error: boolean): void {
    clearTimeout(this.temporizador);
    this.aviso.set({ texto, error });
    if (!error) this.temporizador = setTimeout(() => this.aviso.set(null), 3500);
  }
}
