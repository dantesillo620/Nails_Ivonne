import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SITE } from './core/site.config';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly siteName = SITE.name;
  protected readonly year = new Date().getFullYear();
  protected readonly nav = [
    { path: '/', label: 'Inicio', exact: true },
    { path: '/servicios', label: 'Servicios', exact: false },
    { path: '/galeria', label: 'Galería', exact: false },
    { path: '/contacto', label: 'Contacto', exact: false },
  ];
}
