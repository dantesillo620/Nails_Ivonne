import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { SITE } from '../core/site.config';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

interface RespuestaSesion {
  usuario: Usuario | null;
  csrfToken: string;
}

/**
 * Sesión del panel. La API guarda la sesión en una cookie; aquí solo se recuerda
 * quién entró y el token CSRF, que se manda en la cabecera X-CSRF-Token de cada
 * cambio (la cookie CSRF vive en /api y el panel no puede leerla).
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);

  readonly usuario = signal<Usuario | null>(null);
  /** Token CSRF vigente; lo usa panelInterceptor. */
  csrf: string | null = null;

  private cargando: Promise<void> | null = null;

  /** Pregunta a la API si hay sesión abierta (una vez, salvo que se fuerce). */
  cargar(forzar = false): Promise<void> {
    if (!this.cargando || forzar) {
      this.cargando = firstValueFrom(
        this.http.get<RespuestaSesion>(`${SITE.api}/auth/sesion`),
      ).then(
        (s) => this.aplicar(s),
        (error: unknown) => {
          this.cargando = null;
          throw error;
        },
      );
    }
    return this.cargando;
  }

  async entrar(email: string, password: string): Promise<void> {
    await this.cargar();
    const s = await firstValueFrom(
      this.http.post<RespuestaSesion>(`${SITE.api}/auth/login`, { email, password }),
    );
    this.aplicar(s);
  }

  async salir(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${SITE.api}/auth/logout`, {}));
    } finally {
      this.usuario.set(null);
      this.cargando = null;
    }
  }

  /** La API respondió 401: la sesión se cerró (venció o se borró la cuenta). */
  vencida(): void {
    this.usuario.set(null);
  }

  private aplicar(s: RespuestaSesion): void {
    this.usuario.set(s.usuario);
    this.csrf = s.csrfToken;
  }
}

/**
 * Agrega el token CSRF a los cambios que van a la API y, si la API dice que no
 * hay sesión (401 en /admin), manda a la pantalla de entrar.
 */
export const panelInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${SITE.api}/`)) return next(req);
  const sesion = inject(SesionService);
  const router = inject(Router);

  const conToken =
    req.method !== 'GET' && sesion.csrf
      ? req.clone({ setHeaders: { 'X-CSRF-Token': sesion.csrf } })
      : req;

  return next(conToken).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith(`${SITE.api}/admin/`)
      ) {
        sesion.vencida();
        void router.navigate(['/admin/entrar'], { queryParams: { volver: router.url } });
      }
      return throwError(() => error);
    }),
  );
};

/** Las páginas del panel piden sesión; sin ella, a la pantalla de entrar. */
export const conSesion: CanActivateFn = async (_route, state) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  try {
    await sesion.cargar();
  } catch {
    // Sin conexión con la API: se muestra la pantalla de entrar, que explica el problema.
  }
  return sesion.usuario()
    ? true
    : router.createUrlTree(['/admin/entrar'], { queryParams: { volver: state.url } });
};

/** Mensaje para Ivonne a partir de un error de la API, y los errores por campo si los hay. */
export function explicarError(error: unknown): { mensaje: string; campos: Record<string, string> } {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = (error.error ?? {}) as { message?: string; errores?: Record<string, string> };
    if (error.status === 0) {
      return {
        mensaje: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.',
        campos: {},
      };
    }
    if (error.status === 403) {
      return { mensaje: 'La sesión expiró. Recarga la página e intenta de nuevo.', campos: {} };
    }
    if (error.status === 413) {
      return { mensaje: 'La foto pesa demasiado. Intenta con otra.', campos: {} };
    }
    if (cuerpo.message && error.status < 500) {
      return { mensaje: cuerpo.message, campos: cuerpo.errores ?? {} };
    }
  }
  return { mensaje: 'Algo salió mal. Intenta de nuevo en un momento.', campos: {} };
}
