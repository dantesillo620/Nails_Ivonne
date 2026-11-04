import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../../core/catalogo.service';
import { whatsappNumero } from '../../core/contacto';
import { SITE } from '../../core/site.config';
import { Foto } from '../../shared/foto';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, Foto],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly textos = SITE.textos.hero;
  protected readonly portada = inject(CatalogoService).portada;
  protected readonly agenda = whatsappNumero() !== null;
}
