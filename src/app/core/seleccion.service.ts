import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Trabajo } from '../data/trabajos';
import { CatalogoService } from './catalogo.service';
import { whatsappNumero } from './contacto';

const CLAVE = 'nails-ivonne:seleccion';

/**
 * Diseños que la clienta eligió para su cita. Se guardan en este navegador
 * (localStorage) para no perderlos al recargar; no salen del dispositivo
 * hasta que ella envía el WhatsApp.
 */
@Injectable({ providedIn: 'root' })
export class SeleccionService {
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly catalogo = inject(CatalogoService);

  /** La selección solo tiene sentido si hay WhatsApp para enviar la solicitud. */
  readonly activa = whatsappNumero() !== null;

  private readonly ids = signal<readonly string[]>([]);
  /** Diseños elegidos, en el orden en que se eligieron. */
  readonly trabajos = computed<readonly Trabajo[]>(() =>
    this.ids()
      .map((id) => this.catalogo.buscar(id))
      .filter((t): t is Trabajo => !!t),
  );
  readonly cantidad = computed(() => this.trabajos().length);

  /** La sección de agenda está a la vista (oculta la barra flotante). */
  readonly agendaVisible = signal(false);

  /** Se llama después del primer render para no alterar el HTML prerenderizado. */
  restaurar(): void {
    if (!this.navegador) return;
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
      // Se conservan todos: un diseño nuevo puede no estar en la copia de compilación
      // y aparecer cuando llega el catálogo fresco. `trabajos` ignora los que no existen.
      if (Array.isArray(guardado)) this.ids.set(guardado.filter((id) => typeof id === 'string'));
    } catch {
      /* almacenamiento bloqueado o dato inválido: se empieza vacío */
    }
  }

  tiene(id: string): boolean {
    return this.ids().includes(id);
  }

  alternar(id: string): void {
    this.guardar(this.tiene(id) ? this.ids().filter((x) => x !== id) : [...this.ids(), id]);
  }

  quitar(id: string): void {
    this.guardar(this.ids().filter((x) => x !== id));
  }

  vaciar(): void {
    this.guardar([]);
  }

  private guardar(ids: readonly string[]): void {
    this.ids.set(ids);
    if (!this.navegador) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(ids));
    } catch {
      /* sin almacenamiento: la selección dura mientras la página esté abierta */
    }
  }
}
