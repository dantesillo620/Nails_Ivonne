import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-galeria',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>Galería</h1>
      <p>Algunos de nuestros trabajos.</p>
    </section>
  `,
})
export default class Galeria {}
