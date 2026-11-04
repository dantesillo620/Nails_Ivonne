import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Catalogo, Trabajo } from '../data/trabajos';
import { CATALOGO_COMPILADO, CatalogoService } from './catalogo.service';

function trabajo(id: string, extra: Partial<Trabajo> = {}): Trabajo {
  return {
    id,
    titulo: `Diseño ${id}`,
    alt: 'Uñas.',
    imagen: {
      base: `/images/trabajos/web/${id.toLowerCase()}`,
      width: 800,
      height: 1000,
      widths: [480],
    },
    ...extra,
  };
}

function preparar(plataforma: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: plataforma },
    ],
  });
  return { catalogo: TestBed.inject(CatalogoService), http: TestBed.inject(HttpTestingController) };
}

describe('CatalogoService', () => {
  it('empieza con la copia de compilación', () => {
    const { catalogo } = preparar();
    expect(catalogo.trabajos()).toBe(CATALOGO_COMPILADO.trabajos);
    expect(catalogo.buscar('ni-25')?.titulo).toBe('Conchas y perla');
    expect(catalogo.nombreCategoria('arte')).toBe('Arte y color');
    expect(catalogo.portada().principal.id).toBe('NI-05');
    expect(catalogo.experiencia().id).toBe('NI-10');
    expect(catalogo.actualizado()).toBe(false);
  });

  it('reemplaza el catálogo con el de la API, una sola vez', async () => {
    const { catalogo, http } = preparar();
    const fresco: Catalogo = {
      categorias: [{ id: 'arte', nombre: 'Arte' }],
      trabajos: [trabajo('NI-99', { categoria: 'arte', destacado: true }), trabajo('NI-05')],
    };

    const promesa = catalogo.actualizar();
    expect(catalogo.actualizar()).toBe(promesa);
    http.expectOne('/api/catalogo').flush(fresco);
    await promesa;

    expect(catalogo.actualizado()).toBe(true);
    expect(catalogo.buscar('NI-99')?.titulo).toBe('Diseño NI-99');
    expect(catalogo.buscar('NI-25')).toBeUndefined();
    expect(catalogo.destacados().map((t) => t.id)).toEqual(['NI-99']);
    http.verify();
  });

  it('si una foto fija desaparece, la portada usa otra', async () => {
    const { catalogo, http } = preparar();
    const promesa = catalogo.actualizar();
    http
      .expectOne('/api/catalogo')
      .flush({ categorias: [], trabajos: [trabajo('NI-40'), trabajo('NI-41')] });
    await promesa;

    expect(catalogo.portada().principal.id).toBe('NI-40');
    expect(catalogo.portada().secundaria.id).toBe('NI-41');
    expect(catalogo.experiencia().id).toBe('NI-40');
  });

  it('conserva la copia si la API falla o devuelve un catálogo vacío', async () => {
    const { catalogo, http } = preparar();
    const promesa = catalogo.actualizar();
    http.expectOne('/api/catalogo').flush('error', { status: 500, statusText: 'Error' });
    await promesa;
    expect(catalogo.trabajos()).toBe(CATALOGO_COMPILADO.trabajos);
    expect(catalogo.actualizado()).toBe(true);

    TestBed.resetTestingModule();
    const otro = preparar();
    const vacio = otro.catalogo.actualizar();
    otro.http.expectOne('/api/catalogo').flush({ categorias: [], trabajos: [] });
    await vacio;
    expect(otro.catalogo.trabajos()).toBe(CATALOGO_COMPILADO.trabajos);
  });

  it('no consulta la API durante el prerender', async () => {
    const { catalogo, http } = preparar('server');
    await catalogo.actualizar();
    http.expectNone('/api/catalogo');
    expect(catalogo.actualizado()).toBe(false);
  });
});
