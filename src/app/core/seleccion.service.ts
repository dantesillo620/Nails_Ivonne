import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TRABAJOS, Trabajo } from '../data/trabajos';
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

  /** La selección solo tiene sentido si hay WhatsApp para enviar la solicitud. */
  readonly activa = whatsappNumero() !== null;

  private readonly ids = signal<readonly string[]>([]);
  /** Diseños elegidos, en el orden en que se eligieron. */
  readonly trabajos = computed<readonly Trabajo[]>(() =>
    this.ids()
      .map((id) => TRABAJOS.find((t) => t.id === id))
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
      if (Array.isArray(guardado)) {
        this.ids.set(guardado.filter((id) => typeof id === 'string' && TRABAJOS.some((t) => t.id === id)));
      }
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
