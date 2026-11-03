import { Injectable, computed, signal } from '@angular/core';
import { Trabajo } from '../../data/trabajos';

/** Estado del visor de fotos, compartido por destacados y catálogo. */
@Injectable({ providedIn: 'root' })
export class LightboxService {
  readonly items = signal<readonly Trabajo[]>([]);
  readonly index = signal<number | null>(null);
  readonly actual = computed(() => {
    const i = this.index();
    return i === null ? null : (this.items()[i] ?? null);
  });

  /** Elemento que abrió el visor, para devolverle el foco al cerrar. */
  private origen: HTMLElement | null = null;

  abrir(items: readonly Trabajo[], index: number, origen?: HTMLElement | null): void {
    this.origen = origen ?? null;
    this.items.set(items);
    this.index.set(index);
  }

  cerrar(): void {
    if (this.index() === null) return;
    this.index.set(null);
    const origen = this.origen;
    this.origen = null;
    origen?.focus({ preventScroll: true });
  }

  siguiente(): void {
    this.mover(1);
  }

  anterior(): void {
    this.mover(-1);
  }

  private mover(delta: number): void {
    const i = this.index();
    const total = this.items().length;
    if (i === null || total === 0) return;
    this.index.set((i + delta + total) % total);
  }
}
