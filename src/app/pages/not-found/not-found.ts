import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="contenedor seccion no-encontrada">
      <img src="/brand/isotipo-nails-ivonne.svg" alt="" width="100" height="132" />
      <h1 class="titulo-seccion">Esta página <em>no existe</em></h1>
      <p class="texto-seccion">Puede que el enlace haya cambiado. Te invitamos a ver los diseños.</p>
      <a class="btn btn-primario" routerLink="/" fragment="trabajos">Explorar diseños</a>
    </section>
  `,
  styles: `
    .no-encontrada {
      display: grid;
      justify-items: center;
      gap: 0.5rem;
      text-align: center;
      min-height: 60vh;
      align-content: center;
    }
    img {
      width: 56px;
      height: auto;
      margin-bottom: 1rem;
    }
    .btn {
      margin-top: 2rem;
    }
  `,
})
export default class NotFound {}
