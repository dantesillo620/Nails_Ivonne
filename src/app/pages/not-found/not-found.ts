import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>Página no encontrada</h1>
      <p>La página que buscas no existe.</p>
      <a routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export default class NotFound {}
