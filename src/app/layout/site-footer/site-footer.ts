import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { instagramUrl, instagramUsuario, whatsappUrl } from '../../core/contacto';
import { SITE } from '../../core/site.config';
import { NAV } from '../nav';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly nav = NAV;
  protected readonly nombre = SITE.name;
  protected readonly anio = new Date().getFullYear();
  protected readonly whatsapp = whatsappUrl();
  protected readonly instagram = instagramUrl();
  protected readonly instagramUsuario = instagramUsuario();
}
