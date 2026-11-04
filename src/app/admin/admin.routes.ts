import { Routes } from '@angular/router';
import { SeoData } from '../core/seo/seo.service';
import { conSesion } from './sesion.service';

/** Ninguna página del panel debe aparecer en Google. */
const PRIVADA = { seo: { noindex: true } satisfies SeoData };

/**
 * Panel de administración (/admin). Solo se renderiza en el navegador
 * (RenderMode.Client en app.routes.server.ts): no se prerenderiza.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./panel-layout'),
    children: [
      {
        path: 'entrar',
        title: 'Entrar al panel',
        data: PRIVADA,
        loadComponent: () => import('./entrar/entrar'),
      },
      {
        path: '',
        canActivate: [conSesion],
        children: [
          {
            path: '',
            title: 'Panel',
            data: PRIVADA,
            loadComponent: () => import('./lista/lista'),
          },
          {
            path: 'nuevo',
            title: 'Nuevo diseño',
            data: PRIVADA,
            loadComponent: () => import('./editor/editor'),
          },
          {
            path: 'disenos/:id',
            title: 'Editar diseño',
            data: PRIVADA,
            loadComponent: () => import('./editor/editor'),
          },
        ],
      },
    ],
  },
];
