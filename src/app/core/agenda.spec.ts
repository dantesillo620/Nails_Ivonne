import { TRABAJOS } from '../data/trabajos';
import { formatoHora, generarSemanas, mensajeCita } from './agenda';
import { SITE } from './site.config';

const entreSemana = ['14:00', '16:00', '18:00'];
const sabado = ['09:00', '11:00', '13:00', '15:00', '17:00'];
const cfg = {
  zonaHoraria: 'America/Mexico_City',
  horas: { 1: entreSemana, 2: entreSemana, 3: entreSemana, 4: entreSemana, 5: entreSemana, 6: sabado },
  semanas: 2,
  anticipacionMinutos: 60,
};

/** Instante a esa hora de Guadalajara (UTC−6 todo el año), sin importar la zona de la computadora. */
function gdl(anio: number, mes: number, dia: number, hora: number, minuto = 0): Date {
  return new Date(Date.UTC(anio, mes, dia, hora + 6, minuto));
}

describe('agenda', () => {
  it('formatea horas en 12 h', () => {
    expect(formatoHora('16:00')).toBe('4:00 p. m.');
    expect(formatoHora('09:30')).toBe('9:30 a. m.');
    expect(formatoHora('12:00')).toBe('12:00 p. m.');
  });

  it('ofrece lunes a sábado y nunca domingo', () => {
    // Miércoles 4 de noviembre de 2026, 10:00
    const semanas = generarSemanas(gdl(2026, 10, 4, 10), cfg);
    expect(semanas.length).toBe(2);
    const dias = semanas.flatMap((s) => s.dias);
    expect(dias.length).toBe(12);
    expect(dias.some((d) => d.fecha.getDay() === 0)).toBe(false);
    expect(semanas[0].titulo).toBe('2 al 7 de noviembre');
  });

  it('el sábado tiene su propio horario', () => {
    const dias = generarSemanas(gdl(2026, 10, 4, 10), cfg).flatMap((s) => s.dias);
    expect(dias.find((d) => d.clave === '2026-11-05')!.horas).toEqual(entreSemana);
    expect(dias.find((d) => d.clave === '2026-11-07')!.todas).toEqual(sabado);
    expect(dias.find((d) => d.clave === '2026-11-07')!.horas).toEqual(sabado);
  });

  it('no ofrece días pasados ni horas que ya no alcanzan', () => {
    // Miércoles a las 17:30: hoy ya no hay horas (18:00 tiene menos de 60 min).
    const dias = generarSemanas(gdl(2026, 10, 4, 17, 30), cfg).flatMap((s) => s.dias);
    expect(dias.find((d) => d.clave === '2026-11-02')!.horas).toEqual([]);
    expect(dias.find((d) => d.clave === '2026-11-04')!.horas).toEqual([]);
    expect(dias.find((d) => d.clave === '2026-11-05')!.horas).toEqual(entreSemana);

    // A las 16:30 todavía se puede pedir a las 18:00; a las 13:00, todo el día.
    const tarde = generarSemanas(gdl(2026, 10, 4, 16, 30), cfg).flatMap((s) => s.dias);
    expect(tarde.find((d) => d.clave === '2026-11-04')!.horas).toEqual(['18:00']);
    const mediodia = generarSemanas(gdl(2026, 10, 4, 13), cfg).flatMap((s) => s.dias);
    expect(mediodia.find((d) => d.clave === '2026-11-04')!.horas).toEqual(entreSemana);
  });

  it('usa la hora de Guadalajara, no la del dispositivo', () => {
    // 4 de noviembre, 1:30 p. m. en Utah = 2:30 p. m. en Guadalajara: las 2:00 ya pasaron.
    const desdeUtah = generarSemanas(new Date(Date.UTC(2026, 10, 4, 20, 30)), cfg).flatMap((s) => s.dias);
    expect(desdeUtah.find((d) => d.clave === '2026-11-04')!.horas).toEqual(['16:00', '18:00']);

    // 5 de noviembre 03:00 UTC sigue siendo miércoles 4, 9:00 p. m., en Guadalajara.
    const noche = generarSemanas(new Date(Date.UTC(2026, 10, 5, 3, 0)), cfg).flatMap((s) => s.dias);
    expect(noche.find((d) => d.clave === '2026-11-04')!.horas).toEqual([]);
    expect(noche.find((d) => d.clave === '2026-11-05')!.horas).toEqual(entreSemana);
  });

  it('salta a la semana siguiente si la actual ya terminó', () => {
    // Sábado 7 de noviembre a las 19:00 y domingo 8.
    for (const ahora of [gdl(2026, 10, 7, 19), gdl(2026, 10, 8, 12)]) {
      const semanas = generarSemanas(ahora, cfg);
      expect(semanas[0].dias[0].clave).toBe('2026-11-09');
      expect(semanas[0].dias.every((d) => d.horas.length === d.todas.length)).toBe(true);
    }
  });

  it('arma la solicitud con diseños y enlaces, sin afirmar que está confirmada', () => {
    const msg = mensajeCita({
      nombre: ' Ana ',
      fecha: new Date(2026, 10, 10),
      hora: '16:00',
      disenos: [TRABAJOS.find((t) => t.id === 'NI-25')!],
      nota: '',
    });
    expect(msg).toContain('Nombre: Ana\n');
    expect(msg).toContain('Día: martes 10 de noviembre');
    expect(msg).toContain('Hora: 4:00 p. m.');
    expect(msg).toContain('• Conchas y perla (NI-25)');
    expect(msg).toContain(`${SITE.url}/disenos/ni-25`);
    expect(msg).not.toContain('Comentarios');
    expect(msg).not.toMatch(/confirmada|reservad/i);
  });
});
