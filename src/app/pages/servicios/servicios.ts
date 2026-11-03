import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-servicios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>Servicios</h1>
      <p>Manicure, pedicure, uñas acrílicas, gel y nail art.</p>
    </section>
  `,
})
export default class Servicios {}
