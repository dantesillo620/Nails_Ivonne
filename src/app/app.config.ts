import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  TitleStrategy,
  provideRouter,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { routes } from './app.routes';
import { SeoTitleStrategy } from './core/seo/seo-title.strategy';

/** Alto del encabezado fijo: las anclas (#trabajos, #contacto…) quedan debajo de él. */
const ALTO_ENCABEZADO = 72;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // Volver a pulsar el mismo enlace de sección vuelve a desplazarse hasta ella.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    provideAppInitializer(() => inject(ViewportScroller).setOffset([0, ALTO_ENCABEZADO])),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    provideClientHydration(withEventReplay()),
  ],
};
