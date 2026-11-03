import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SITE } from '../../core/site.config';
import { FOTO_EXPERIENCIA } from '../../data/trabajos';
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
  protected readonly foto = FOTO_EXPERIENCIA;
}
