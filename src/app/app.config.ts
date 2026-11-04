import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { panelInterceptor } from './admin/sesion.service';
import { routes } from './app.routes';
import { SeoTitleStrategy } from './core/seo/seo-title.strategy';

/** Alto del encabezado fijo: las anclas (#trabajos, #contacto…) quedan debajo de él. */
const ALTO_ENCABEZADO = 72;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([panelInterceptor])),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // Volver a pulsar el mismo enlace de sección vuelve a desplazarse hasta ella.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withComponentInputBinding(),
    ),
    provideAppInitializer(() => inject(ViewportScroller).setOffset([0, ALTO_ENCABEZADO])),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    provideClientHydration(withEventReplay()),
    // App instalable y notificaciones del panel. Solo en el sitio compilado (no con `npm start`).
    // Se registra cuando la página ya cargó, para no competir con la primera visita.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
