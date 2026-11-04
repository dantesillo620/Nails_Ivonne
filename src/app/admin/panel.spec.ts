import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PanelCatalogoService, TrabajoPanel } from './panel-catalogo.service';
import { SesionService, explicarError, panelInterceptor } from './sesion.service';
import { HttpErrorResponse } from '@angular/common/http';

function trabajo(id: number): TrabajoPanel {
  return {
    id,
    codigo: `NI-${String(id).padStart(2, '0')}`,
    titulo: `Diseño ${id}`,
    alt: 'Uñas.',
    categoria: null,
    destacado: false,
    visible: true,
    orden: id,
    imagen: { base: `/fotos/trabajos/web/ni-${id}`, width: 800, height: 1000, widths: [480] },
    modificado: null,
  };
}

function preparar() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([panelInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    backend: TestBed.inject(HttpTestingController),
    sesion: TestBed.inject(SesionService),
    catalogo: TestBed.inject(PanelCatalogoService),
    router: TestBed.inject(Router),
  };
}

describe('Panel', () => {
  it('entra con el token CSRF de la sesión y lo manda en cada cambio', async () => {
    const { http, backend, sesion } = preparar();

    const entrar = sesion.entrar('ivonne@ejemplo.com', 'secreta');
    backend.expectOne('/api/auth/sesion').flush({ usuario: null, csrfToken: 'token-1' });
    await new Promise((listo) => setTimeout(listo));
    const login = backend.expectOne('/api/auth/login');
    expect(login.request.headers.get('X-CSRF-Token')).toBe('token-1');
    login.flush({
      usuario: { id: 1, nombre: 'Ivonne', email: 'ivonne@ejemplo.com' },
      csrfToken: 'token-2',
    });
    await entrar;
    expect(sesion.usuario()?.nombre).toBe('Ivonne');

    void firstValueFrom(http.patch('/api/admin/trabajos/1', {}));
    expect(backend.expectOne('/api/admin/trabajos/1').request.headers.get('X-CSRF-Token')).toBe(
      'token-2',
    );

    // Las lecturas y las peticiones fuera de la API no llevan el token.
    void firstValueFrom(http.get('/api/admin/catalogo'));
    expect(backend.expectOne('/api/admin/catalogo').request.headers.has('X-CSRF-Token')).toBe(
      false,
    );
    void firstValueFrom(http.post('https://otro.sitio/algo', {}));
    expect(backend.expectOne('https://otro.sitio/algo').request.headers.has('X-CSRF-Token')).toBe(
      false,
    );
  });

  it('si la sesión vence, cierra la sesión local y manda a entrar', async () => {
    const { http, backend, sesion, router } = preparar();
    sesion.usuario.set({ id: 1, nombre: 'Ivonne', email: 'i@e.com' });
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const peticion = firstValueFrom(http.get('/api/admin/catalogo'));
    backend
      .expectOne('/api/admin/catalogo')
      .flush({ message: 'x' }, { status: 401, statusText: 'No' });
    await expect(peticion).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(sesion.usuario()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/admin/entrar'], expect.anything());
  });

  it('mover se ve al momento y se deshace si no se guarda', async () => {
    const { backend, catalogo } = preparar();
    catalogo.trabajos.set([trabajo(1), trabajo(2), trabajo(3)]);

    const mover = catalogo.mover(3, -1);
    expect(catalogo.trabajos().map((t) => t.id)).toEqual([1, 3, 2]);
    const req = backend.expectOne('/api/admin/trabajos/orden');
    expect(req.request.body).toEqual({ ids: [1, 3, 2] });
    req.flush('error', { status: 500, statusText: 'Error' });
    await expect(mover).rejects.toBeTruthy();

    expect(catalogo.trabajos().map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('no mueve más allá de los extremos', async () => {
    const { backend, catalogo } = preparar();
    catalogo.trabajos.set([trabajo(1), trabajo(2)]);

    await catalogo.mover(1, -1);
    await catalogo.mover(2, 1);
    backend.expectNone('/api/admin/trabajos/orden');
  });

  it('explica los errores con mensajes para Ivonne', () => {
    const campos = new HttpErrorResponse({
      status: 422,
      error: { message: 'Revisa los datos marcados.', errores: { titulo: 'Escribe un título.' } },
    });
    expect(explicarError(campos)).toEqual({
      mensaje: 'Revisa los datos marcados.',
      campos: { titulo: 'Escribe un título.' },
    });
    expect(explicarError(new HttpErrorResponse({ status: 0 })).mensaje).toContain(
      'No hay conexión',
    );
    expect(
      explicarError(new HttpErrorResponse({ status: 500, error: { message: 'SQLSTATE…' } }))
        .mensaje,
    ).toBe('Algo salió mal. Intenta de nuevo en un momento.');
    expect(explicarError(new Error('x')).mensaje).toBe(
      'Algo salió mal. Intenta de nuevo en un momento.',
    );
  });
});
