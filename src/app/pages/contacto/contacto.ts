import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-contacto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>Contacto</h1>
      <p>Agenda tu cita con nosotras.</p>
    </section>
  `,
})
export default class Contacto {}
