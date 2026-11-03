import { TRABAJOS } from '../data/trabajos';
import { formatoHora, generarSemanas, mensajeCita } from './agenda';
import { SITE } from './site.config';

const cfg = { dias: [1, 2, 3, 4, 5, 6], horas: ['16:00', '18:00'], semanas: 2, anticipacionMinutos: 60 };

describe('agenda', () => {
  it('formatea horas en 12 h', () => {
    expect(formatoHora('16:00')).toBe('4:00 p. m.');
    expect(formatoHora('09:30')).toBe('9:30 a. m.');
    expect(formatoHora('12:00')).toBe('12:00 p. m.');
  });

  it('ofrece lunes a sábado y nunca domingo', () => {
    // Miércoles 4 de noviembre de 2026, 10:00
    const semanas = generarSemanas(new Date(2026, 10, 4, 10, 0), cfg);
    expect(semanas.length).toBe(2);
    const dias = semanas.flatMap((s) => s.dias);
    expect(dias.length).toBe(12);
    expect(dias.some((d) => d.fecha.getDay() === 0)).toBe(false);
    expect(semanas[0].titulo).toBe('2 al 7 de noviembre');
  });

  it('no ofrece días pasados ni horas que ya no alcanzan', () => {
    // Miércoles a las 17:30: hoy ya no hay horas (18:00 tiene menos de 60 min).
    const dias = generarSemanas(new Date(2026, 10, 4, 17, 30), cfg).flatMap((s) => s.dias);
    expect(dias.find((d) => d.clave === '2026-11-02')!.horas).toEqual([]);
    expect(dias.find((d) => d.clave === '2026-11-04')!.horas).toEqual([]);
    expect(dias.find((d) => d.clave === '2026-11-05')!.horas).toEqual(['16:00', '18:00']);

    // A las 16:30 todavía se puede pedir a las 18:00.
    const tarde = generarSemanas(new Date(2026, 10, 4, 16, 30), cfg).flatMap((s) => s.dias);
    expect(tarde.find((d) => d.clave === '2026-11-04')!.horas).toEqual(['18:00']);
  });

  it('salta a la semana siguiente si la actual ya terminó', () => {
    // Sábado 7 de noviembre a las 19:00 y domingo 8.
    for (const ahora of [new Date(2026, 10, 7, 19, 0), new Date(2026, 10, 8, 12, 0)]) {
      const semanas = generarSemanas(ahora, cfg);
      expect(semanas[0].dias[0].clave).toBe('2026-11-09');
      expect(semanas[0].dias.every((d) => d.horas.length === 2)).toBe(true);
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
