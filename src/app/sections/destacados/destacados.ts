import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../../core/catalogo.service';
import { SITE } from '../../core/site.config';
import { Foto } from '../../shared/foto';
import { LightboxService } from '../../shared/lightbox/lightbox.service';
import { Reveal } from '../../shared/reveal';

@Component({
  selector: 'app-destacados',
  imports: [RouterLink, Foto, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './destacados.html',
  styleUrl: './destacados.scss',
})
export class Destacados {
  private readonly lightbox = inject(LightboxService);

  protected readonly textos = SITE.textos.destacados;
  protected readonly trabajos = inject(CatalogoService).destacados;

  protected abrir(index: number, event: Event): void {
    this.lightbox.abrir(this.trabajos(), index, event.currentTarget as HTMLElement);
  }
}
