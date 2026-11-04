import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import copia from '../data/catalogo.json';
import { Catalogo, Categoria, Trabajo } from '../data/trabajos';
import { SITE } from './site.config';

/** Copia del catálogo descargada al compilar (scripts/catalogo.mjs). */
export const CATALOGO_COMPILADO: Catalogo = copia;

/**
 * Catálogo de diseños.
 *
 * Empieza con la copia de compilación, que es la misma que se prerenderizó, para
 * que la hidratación coincida y la página se vea al instante. En el navegador,
 * actualizar() pide el catálogo fresco a /api y reemplaza las signals: lo que
 * Ivonne agregó u ocultó en el panel aparece sin volver a compilar.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly categorias = signal<readonly Categoria[]>(CATALOGO_COMPILADO.categorias);
  readonly trabajos = signal<readonly Trabajo[]>(CATALOGO_COMPILADO.trabajos);
  /** Ya se consultó la API en este navegador (con o sin éxito). */
  readonly actualizado = signal(false);

  readonly destacados = computed(() => this.trabajos().filter((t) => t.destacado));

  /** Fotos fijas de la portada y de "Experiencia"; si alguna se oculta, se usa otra. */
  readonly portada = computed(() => {
    const [principal, secundaria] = SITE.fotos.portada.map((id) => this.buscar(id));
    const lista = this.trabajos();
    const p = principal ?? lista[0];
    return { principal: p, secundaria: secundaria ?? lista.find((t) => t !== p) ?? p };
  });
  readonly experiencia = computed(() => this.buscar(SITE.fotos.experiencia) ?? this.trabajos()[0]);

  private pendiente: Promise<void> | null = null;

  /** Busca por id sin importar mayúsculas ('ni-25' o 'NI-25'). */
  buscar(id: string | null | undefined): Trabajo | undefined {
    const clave = id?.toUpperCase();
    return clave ? this.trabajos().find((t) => t.id === clave) : undefined;
  }

  nombreCategoria(id: string | null | undefined): string | null {
    return id ? (this.categorias().find((c) => c.id === id)?.nombre ?? null) : null;
  }

  /**
   * Pide el catálogo a la API una sola vez. Si falla o llega vacío se queda la
   * copia de compilación (mejor mostrar algo que una página sin fotos).
   * Fuera del navegador (prerender) no hace nada.
   */
  actualizar(): Promise<void> {
    if (!this.navegador) return Promise.resolve();
    this.pendiente ??= firstValueFrom(this.http.get<Catalogo>(`${SITE.api}/catalogo`))
      .then((c) => {
        if (Array.isArray(c?.trabajos) && c.trabajos.length > 0 && Array.isArray(c.categorias)) {
          this.categorias.set(c.categorias);
          this.trabajos.set(c.trabajos);
        }
      })
      .catch(() => {
        /* sin conexión o API caída: se queda la copia de compilación */
      })
      .finally(() => this.actualizado.set(true));
    return this.pendiente;
  }
}
