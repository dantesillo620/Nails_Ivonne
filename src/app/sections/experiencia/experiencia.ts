import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoService } from '../../core/catalogo.service';
import { SITE } from '../../core/site.config';
import { Foto } from '../../shared/foto';
import { Reveal } from '../../shared/reveal';

@Component({
  selector: 'app-experiencia',
  imports: [Foto, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experiencia.html',
  styleUrl: './experiencia.scss',
})
export class Experiencia {
  protected readonly textos = SITE.textos.experiencia;
  protected readonly foto = inject(CatalogoService).experiencia;
}
