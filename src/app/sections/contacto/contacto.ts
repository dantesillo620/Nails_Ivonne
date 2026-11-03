import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  direccionLineas,
  instagramUrl,
  instagramUsuario,
  whatsappUrl,
} from '../../core/contacto';
import { SITE } from '../../core/site.config';
import { Reveal } from '../../shared/reveal';

@Component({
  selector: 'app-contacto',
  imports: [RouterLink, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacto.html',
  styleUrl: './contacto.scss',
})
export class Contacto {
  protected readonly textos = SITE.textos.contacto;
  protected readonly whatsapp = whatsappUrl();
  protected readonly instagram = instagramUrl();
  protected readonly instagramUsuario = instagramUsuario();
  protected readonly direccion = direccionLineas();
  protected readonly mapsUrl = SITE.contacto.mapsUrl;
  protected readonly horarios = SITE.contacto.horarios.filter((h) => h.dias && h.horas);
  protected readonly hayDetalles = this.direccion.length > 0 || this.horarios.length > 0;
}
