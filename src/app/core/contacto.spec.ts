import { SITE } from './site.config';
import { instagramUrl, whatsappDisenoUrl, whatsappUrl } from './contacto';

describe('contacto', () => {
  const original = { ...SITE.contacto };

  afterEach(() => {
    SITE.contacto.whatsapp = original.whatsapp;
    SITE.contacto.instagram = original.instagram;
  });

  it('omite WhatsApp cuando no hay un número válido', () => {
    SITE.contacto.whatsapp = '';
    expect(whatsappUrl()).toBeNull();
    SITE.contacto.whatsapp = '123';
    expect(whatsappUrl()).toBeNull();
  });

  it('arma un enlace wa.me con el mensaje codificado', () => {
    SITE.contacto.whatsapp = '+52 55 1234 5678';
    const url = whatsappDisenoUrl('Vino con dije dorado', 'NI-02');
    expect(url).toMatch(/^https:\/\/wa\.me\/525512345678\?text=/);
    const texto = decodeURIComponent(url!.split('text=')[1]);
    expect(texto).toContain('“Vino con dije dorado” (NI-02)');
    // El enlace a la página del diseño hace que WhatsApp muestre la foto.
    expect(texto).toContain(`${SITE.url}/disenos/ni-02`);
    expect(texto).not.toMatch(/reservad/i);
  });

  it('normaliza el usuario de Instagram', () => {
    SITE.contacto.instagram = '@nails.ivonne';
    expect(instagramUrl()).toBe('https://www.instagram.com/nails.ivonne/');
    SITE.contacto.instagram = 'https://instagram.com/nails.ivonne/';
    expect(instagramUrl()).toBe('https://www.instagram.com/nails.ivonne/');
  });
});
