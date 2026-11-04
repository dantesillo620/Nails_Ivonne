import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { explicarError, SesionService } from '../sesion.service';

/** Pantalla para entrar al panel con correo y contraseña. */
@Component({
  selector: 'app-entrar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="entrar" aria-labelledby="entrar-titulo">
      <h1 id="entrar-titulo">Entrar al panel</h1>
      <p class="intro">Aquí administras los diseños del catálogo.</p>

      <form (submit)="enviar($event)" novalidate>
        <label for="email">Correo</label>
        <input
          id="email"
          type="email"
          autocomplete="username"
          inputmode="email"
          autocapitalize="none"
          spellcheck="false"
          required
          [value]="email()"
          (input)="email.set(valor($event))"
          [attr.aria-invalid]="!!error() || null"
          aria-describedby="error-entrar"
        />

        <label for="password">Contraseña</label>
        <div class="con-boton">
          <input
            id="password"
            [type]="ver() ? 'text' : 'password'"
            autocomplete="current-password"
            required
            [value]="password()"
            (input)="password.set(valor($event))"
            [attr.aria-invalid]="!!error() || null"
            aria-describedby="error-entrar"
          />
          <button type="button" class="ver" (click)="ver.set(!ver())" [attr.aria-pressed]="ver()">
            {{ ver() ? 'Ocultar' : 'Mostrar' }}<span class="sr-only"> contraseña</span>
          </button>
        </div>

        <p id="error-entrar" class="error" role="alert">{{ error() }}</p>

        <button type="submit" class="btn btn-primario" [disabled]="enviando()">
          {{ enviando() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .entrar {
      max-width: 24rem;
      margin: clamp(1rem, 8vh, 4rem) auto 0;
    }
    h1 {
      font-size: 2.25rem;
    }
    .intro {
      margin-top: 0.5rem;
      color: var(--tinta-suave);
    }
    form {
      display: grid;
      gap: 0.5rem;
      margin-top: 2rem;
    }
    label {
      margin-top: 0.75rem;
      font-weight: 500;
    }
    input {
      width: 100%;
      min-height: 48px;
      padding: 0.6rem 0.9rem;
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      background: #fff;
      font: inherit;
      /* 16px o más: Safari en iPhone no hace zoom al escribir */
      font-size: 1rem;
    }
    input[aria-invalid='true'] {
      border-color: var(--vino);
    }
    .con-boton {
      position: relative;
    }
    .con-boton input {
      padding-right: 6.5rem;
    }
    .ver {
      position: absolute;
      inset: 2px 2px 2px auto;
      padding: 0 0.9rem;
      border: 0;
      border-radius: var(--radio);
      background: none;
      color: var(--vino);
      font-size: 0.9rem;
      cursor: pointer;
    }
    .error {
      min-height: 1.5em;
      margin-top: 0.5rem;
      color: var(--vino);
      font-weight: 500;
    }
    .btn {
      width: 100%;
      margin-top: 0.5rem;
    }
  `,
})
export default class Entrar {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  /** A dónde regresar después de entrar (lo pone el guard del panel). */
  readonly volver = input<string>();

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly ver = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');

  constructor() {
    // Con sesión abierta no tiene caso esta pantalla.
    void this.sesion.cargar().then(
      () => this.sesion.usuario() && this.irAlPanel(),
      () => this.error.set('No hay conexión con el servidor. Revisa tu internet.'),
    );
  }

  protected valor(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async enviar(event: Event): Promise<void> {
    event.preventDefault();
    if (this.enviando()) return;
    if (!this.email().trim() || !this.password()) {
      this.error.set('Escribe tu correo y tu contraseña.');
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    try {
      await this.sesion.entrar(this.email().trim(), this.password());
      this.irAlPanel();
    } catch (e) {
      this.error.set(explicarError(e).mensaje);
    } finally {
      this.enviando.set(false);
    }
  }

  private irAlPanel(): void {
    const destino = this.volver();
    // Solo rutas del panel: evita que un enlace manipulado lleve a otro sitio.
    void this.router.navigateByUrl(destino?.startsWith('/admin') ? destino : '/admin');
  }
}
