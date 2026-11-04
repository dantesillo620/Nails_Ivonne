import { Trabajo } from '../data/trabajos';
import { urlDiseno } from './contacto';
import { SITE, SiteConfig } from './site.config';

export type ConfigAgenda = SiteConfig['agenda'];

/** Horarios que ya no se ofrecen, según la API (GET /api/agenda/disponibilidad). */
export interface Ocupacion {
  /** 'AAAA-MM-DD HH:MM' de citas apartadas y horas bloqueadas. */
  ocupados: ReadonlySet<string>;
  /** 'AAAA-MM-DD' de días bloqueados completos (vacaciones, cursos…). */
  diasBloqueados: ReadonlySet<string>;
}

const SIN_OCUPACION: Ocupacion = { ocupados: new Set(), diasBloqueados: new Set() };

export interface DiaAgenda {
  /** 'AAAA-MM-DD', fecha del estudio. */
  clave: string;
  fecha: Date;
  /** Horario de ese día de la semana. */
  todas: string[];
  /** Horas que todavía se pueden pedir ese día (ni pasadas ni ocupadas). */
  horas: string[];
  /** Ivonne bloqueó el día completo. */
  bloqueado?: boolean;
}

export interface SemanaAgenda {
  /** p. ej. '9 al 14 de noviembre'. */
  titulo: string;
  dias: DiaAgenda[];
}

const fmtDiaLargo = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'long' });

export function claveFecha(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function sumarDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** '16:00' -> '4:00 p. m.' */
export function formatoHora(hora: string): string {
  const total = minutos(hora);
  const h = Math.floor(total / 60);
  const m = String(total % 60).padStart(2, '0');
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  return `${h % 12 || 12}:${m} ${sufijo}`;
}

/** 'martes 10 de noviembre' */
export function formatoDia(fecha: Date): string {
  return fmtDiaLargo.format(fecha).replace(',', '');
}

function tituloSemana(inicio: Date, fin: Date): string {
  const mesInicio = fmtMes.format(inicio);
  const mesFin = fmtMes.format(fin);
  return mesInicio === mesFin
    ? `${inicio.getDate()} al ${fin.getDate()} de ${mesFin}`
    : `${inicio.getDate()} de ${mesInicio} al ${fin.getDate()} de ${mesFin}`;
}

/**
 * Fecha y minutos del día en la zona del estudio. `fecha` es un Date a medianoche
 * local que solo representa el día del calendario (año, mes, día).
 */
export function relojEstudio(ahora: Date, zonaHoraria: string): { fecha: Date; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(ahora);
  const n = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((p) => p.type === tipo)?.value);
  return {
    fecha: new Date(n('year'), n('month') - 1, n('day')),
    minutos: n('hour') * 60 + n('minute'),
  };
}

/**
 * Semanas de lunes a domingo con los días de atención. Los días pasados (o sin
 * horas que todavía se puedan pedir) se incluyen sin horas, para que la
 * semana se lea completa. Si la semana actual ya no tiene horas, empieza en la siguiente.
 * "Hoy" es el día en la zona horaria del estudio, no el del dispositivo.
 */
export function generarSemanas(
  ahora: Date,
  cfg: ConfigAgenda = SITE.agenda,
  ocupacion: Ocupacion = SIN_OCUPACION,
): SemanaAgenda[] {
  const { fecha: hoy, minutos: minutosAhora } = relojEstudio(ahora, cfg.zonaHoraria);
  const lunes = sumarDias(hoy, -((hoy.getDay() + 6) % 7));

  const semanas: SemanaAgenda[] = [];
  for (let s = 0; s <= cfg.semanas; s++) {
    const inicio = sumarDias(lunes, s * 7);
    const dias: DiaAgenda[] = [];
    for (let i = 0; i < 7; i++) {
      const fecha = sumarDias(inicio, i);
      const todas = cfg.horas[fecha.getDay()] ?? [];
      if (todas.length === 0) continue;
      const clave = claveFecha(fecha);
      const bloqueado = ocupacion.diasBloqueados.has(clave);
      let horas: string[] = [];
      if (bloqueado) horas = [];
      else if (fecha > hoy) horas = [...todas];
      else if (fecha.getTime() === hoy.getTime())
        horas = todas.filter((h) => minutos(h) - minutosAhora >= cfg.anticipacionMinutos);
      horas = horas.filter((h) => !ocupacion.ocupados.has(`${clave} ${h}`));
      dias.push({ clave, fecha, todas, horas, ...(bloqueado ? { bloqueado } : {}) });
    }
    if (dias.length === 0) continue;
    semanas.push({ titulo: tituloSemana(dias[0].fecha, dias[dias.length - 1].fecha), dias });
  }

  if (semanas.length && semanas[0].dias.every((d) => d.horas.length === 0)) semanas.shift();
  return semanas.slice(0, cfg.semanas);
}

export interface SolicitudCita {
  nombre: string;
  fecha: Date;
  hora: string;
  disenos: readonly Trabajo[];
  nota: string;
}

/** Mensaje de WhatsApp para pedir la cita. No afirma que la cita quedó confirmada. */
export function mensajeCita(s: SolicitudCita): string {
  const lineas = ['Hola, Ivonne. Me gustaría solicitar una cita de uñas.', ''];
  const nombre = s.nombre.trim();
  if (nombre) lineas.push(`Nombre: ${nombre}`);
  lineas.push(`Día: ${formatoDia(s.fecha)}`, `Hora: ${formatoHora(s.hora)}`, '');

  if (s.disenos.length === 0) {
    lineas.push('Diseño: todavía no lo elijo.');
  } else {
    lineas.push(s.disenos.length === 1 ? 'Diseño que me gustó:' : 'Diseños que me gustaron:');
    for (const t of s.disenos) lineas.push(`• ${t.titulo} (${t.id})`, urlDiseno(t.id));
  }

  const nota = s.nota.trim();
  if (nota) lineas.push('', `Comentarios: ${nota}`);
  lineas.push('', '¿Me confirmas si tienes disponible ese horario?');
  return lineas.join('\n');
}

export interface CitaApartada {
  id: number;
  nombre: string;
  fecha: Date;
  hora: string;
  disenos: readonly Trabajo[];
}

/**
 * Aviso por WhatsApp después de apartar la cita en la página: Ivonne ya la tiene
 * en su panel, el mensaje solo la pone al tanto. Tampoco afirma que esté confirmada.
 */
export function mensajeAvisoCita(c: CitaApartada): string {
  const lineas = [
    `Hola, Ivonne. Soy ${c.nombre.trim()} y acabo de apartar una cita en tu página (solicitud #${c.id}):`,
    '',
    `Día: ${formatoDia(c.fecha)}`,
    `Hora: ${formatoHora(c.hora)}`,
  ];
  if (c.disenos.length) {
    lineas.push('', c.disenos.length === 1 ? 'Diseño que me gustó:' : 'Diseños que me gustaron:');
    for (const t of c.disenos) lineas.push(`• ${t.titulo} (${t.id})`, urlDiseno(t.id));
  }
  lineas.push('', '¿Me confirmas, por favor?');
  return lineas.join('\n');
}

/** 'AAAA-MM-DD' -> Date a medianoche local (solo representa el día del calendario). */
export function fechaDeClave(clave: string): Date {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d);
}
