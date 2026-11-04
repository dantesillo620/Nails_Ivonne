import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SITE } from '../core/site.config';
import { Categoria, Imagen } from '../data/trabajos';

/** Un diseño como lo ve el panel (también los ocultos). */
export interface TrabajoPanel {
  /** Id interno; el que se ve es `codigo`. */
  id: number;
  codigo: string;
  titulo: string;
  alt: string;
  categoria: string | null;
  destacado: boolean;
  visible: boolean;
  orden: number;
  imagen: Imagen;
  modificado: string | null;
}

export type CambiosTrabajo = Partial<
  Pick<TrabajoPanel, 'titulo' | 'alt' | 'categoria' | 'destacado' | 'visible'>
>;

interface RespuestaCatalogo {
  categorias: Categoria[];
  trabajos: TrabajoPanel[];
}

/** Catálogo del panel: lee y cambia los diseños en /api/admin. */
@Injectable({ providedIn: 'root' })
export class PanelCatalogoService {
  private readonly http = inject(HttpClient);
  private readonly api = `${SITE.api}/admin`;

  readonly categorias = signal<readonly Categoria[]>([]);
  readonly trabajos = signal<readonly TrabajoPanel[]>([]);
  readonly cargado = signal(false);

  async cargar(): Promise<void> {
    this.aplicar(await firstValueFrom(this.http.get<RespuestaCatalogo>(`${this.api}/catalogo`)));
    this.cargado.set(true);
  }

  buscar(id: number): TrabajoPanel | undefined {
    return this.trabajos().find((t) => t.id === id);
  }

  nombreCategoria(slug: string | null): string | null {
    return slug ? (this.categorias().find((c) => c.id === slug)?.nombre ?? null) : null;
  }

  /** Sube un diseño nuevo; aparece primero en el catálogo. */
  async crear(datos: FormData): Promise<TrabajoPanel> {
    const { trabajo } = await firstValueFrom(
      this.http.post<{ trabajo: TrabajoPanel }>(`${this.api}/trabajos`, datos),
    );
    this.trabajos.update((lista) => [trabajo, ...lista]);
    return trabajo;
  }

  async editar(id: number, cambios: CambiosTrabajo): Promise<TrabajoPanel> {
    const { trabajo } = await firstValueFrom(
      this.http.patch<{ trabajo: TrabajoPanel }>(`${this.api}/trabajos/${id}`, cambios),
    );
    this.trabajos.update((lista) => lista.map((t) => (t.id === id ? trabajo : t)));
    return trabajo;
  }

  /**
   * Mueve un diseño un lugar hacia arriba (-1) o hacia abajo (+1). Se ve al momento
   * y se guarda en la API; si falla, se regresa al orden anterior.
   */
  async mover(id: number, delta: -1 | 1): Promise<void> {
    const antes = this.trabajos();
    const i = antes.findIndex((t) => t.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= antes.length) return;

    const nueva = [...antes];
    [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
    this.trabajos.set(nueva);
    try {
      this.aplicar(
        await firstValueFrom(
          this.http.put<RespuestaCatalogo>(`${this.api}/trabajos/orden`, {
            ids: nueva.map((t) => t.id),
          }),
        ),
      );
    } catch (error) {
      this.trabajos.set(antes);
      throw error;
    }
  }

  async borrar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/trabajos/${id}`));
    this.trabajos.update((lista) => lista.filter((t) => t.id !== id));
  }

  private aplicar(r: RespuestaCatalogo): void {
    this.categorias.set(r.categorias);
    this.trabajos.set(r.trabajos);
  }
}
