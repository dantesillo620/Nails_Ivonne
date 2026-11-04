import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  DiaAgenda,
  SemanaAgenda,
  fechaDeClave,
  formatoDia,
  formatoHora,
  generarSemanas,
  mensajeAvisoCita,
  mensajeCita,
} from '../../core/agenda';
import { AgendaService } from '../../core/agenda.service';
import { whatsappUrl } from '../../core/contacto';
import { SeleccionService } from '../../core/seleccion.service';
import { SITE } from '../../core/site.config';
import { Trabajo } from '../../data/trabajos';
import { Reveal } from '../../shared/reveal';

const fmtSemana = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });
const fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'short' });

/** Nombre y WhatsApp se recuerdan en este navegador para la siguiente cita. */
const CLAVE_CONTACTO = 'nails-ivonne:contacto';

type Campo = 'dia' | 'hora' | 'nombre' | 'telefono';

/** Cita recién apartada, para la pantalla de confirmación. */
interface Apartada {
  id: number;
  nombre: string;
  fecha: Date;
  hora: string;
  disenos: readonly Trabajo[];
}

/**
 * Agenda para pedir cita.
 *
 * Con la API disponible, la cita se **aparta** en la página (queda pendiente y
 * Ivonne la confirma por WhatsApp) y solo se ofrecen horarios libres. Si la API no
 * responde, funciona como antes: arma un WhatsApp para Ivonne y no aparta nada.
 *
 * Los días se calculan en el navegador (el HTML prerenderizado no sabe qué día es hoy).
 */
@Component({
  selector: 'app-agenda',
  imports: [RouterLink, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class Agenda {
  protected readonly seleccion = inject(SeleccionService);
  private readonly agenda = inject(AgendaService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly textos = SITE.textos.agenda;
  protected readonly horario = SITE.contacto.horarios.filter((h) => h.dias && h.horas);
  protected readonly formatoHora = formatoHora;
  protected readonly formatoDia = formatoDia;

  protected readonly semanas = signal<SemanaAgenda[]>([]);
  protected readonly dia = signal<DiaAgenda | null>(null);
  protected readonly hora = signal<string | null>(null);
  protected readonly nombre = signal('');
  protected readonly telefono = signal('');
  protected readonly nota = signal('');
  /** Campo trampa para bots (oculto para las personas). */
  protected readonly sitio = signal('');

  /** Se aparta en la página (API disponible) o solo se arma el WhatsApp. */
  protected readonly modo = computed<'apartar' | 'whatsapp' | 'cargando'>(() => {
    const d = this.agenda.disponibilidad();
    return d === null ? 'cargando' : d ? 'apartar' : 'whatsapp';
  });

  protected readonly enviando = signal(false);
  /** Mensaje general (arriba del botón) y errores por campo. */
  protected readonly error = signal('');
  protected readonly errores = signal<Partial<Record<Campo, string>>>({});
  protected readonly apartada = signal<Apartada | null>(null);

  /** Horario del día elegido; cambia entre semana y sábado. */
  protected readonly horasDia = computed(() => this.dia()?.todas ?? []);

  protected readonly resumen = computed(() => {
    const d = this.dia();
    const h = this.hora();
    if (!d) return null;
    const dia = formatoDia(d.fecha);
    return h ? `${dia}, ${formatoHora(h)}` : dia;
  });

  /** Modo solo WhatsApp: el enlace con la solicitud armada. */
  protected readonly url = computed(() => {
    const d = this.dia();
    const h = this.hora();
    if (!d || !h) return null;
    return whatsappUrl(
      mensajeCita({
        nombre: this.nombre(),
        fecha: d.fecha,
        hora: h,
        disenos: this.seleccion.trabajos(),
        nota: this.nota(),
      }),
    );
  });

  /** Después de apartar: aviso opcional a Ivonne por WhatsApp. */
  protected readonly urlAviso = computed(() => {
    const a = this.apartada();
    return a ? whatsappUrl(mensajeAvisoCita(a)) : null;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.semanas.set(generarSemanas(new Date()));
      this.recordarContacto();
      void this.actualizarDisponibilidad();

      // Mientras la agenda está a la vista no hace falta la barra flotante.
      const observer = new IntersectionObserver(
        ([entrada]) => this.seleccion.agendaVisible.set(entrada.isIntersecting),
        { rootMargin: '0px 0px -30% 0px' },
      );
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        this.seleccion.agendaVisible.set(false);
      });
    });
  }

  protected diaSemana(fecha: Date): string {
    return fmtSemana.format(fecha).replace('.', '');
  }

  protected mes(fecha: Date): string {
    return fmtMes.format(fecha).replace('.', '');
  }

  protected elegirDia(d: DiaAgenda): void {
    this.dia.set(d);
    // Si la hora elegida no existe ese día (p. ej. hoy ya pasó), se limpia.
    const h = this.hora();
    if (h && !d.horas.includes(h)) this.hora.set(null);
    this.quitarError('dia');
  }

  protected elegirHora(h: string): void {
    this.hora.set(h);
    this.quitarError('hora');
  }

  protected escribir(campo: 'nombre' | 'telefono' | 'nota' | 'sitio', event: Event): void {
    this[campo].set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
    if (campo === 'nombre' || campo === 'telefono') this.quitarError(campo);
  }

  /** Modo solo WhatsApp, sin día u hora: se avisa y se lleva el foco a lo que falta. */
  protected faltaDato(event: Event): void {
    event.preventDefault();
    this.errores.set(
      this.dia()
        ? { hora: 'Elige una hora para continuar.' }
        : { dia: 'Elige un día y una hora para continuar.' },
    );
    this.enfocar();
  }

  protected async apartar(event: Event): Promise<void> {
    event.preventDefault();
    if (this.enviando() || this.modo() === 'cargando') return;

    const d = this.dia();
    const h = this.hora();
    const errores: Partial<Record<Campo, string>> = {};
    if (!d) errores.dia = 'Elige un día.';
    else if (!h) errores.hora = 'Elige una hora.';
    if (!this.nombre().trim()) errores.nombre = 'Escribe tu nombre.';
    if (this.telefono().replace(/\D/g, '').length < 10) {
      errores.telefono = 'Escribe tu WhatsApp con lada (10 dígitos).';
    }
    this.errores.set(errores);
    this.error.set('');
    if (Object.keys(errores).length || !d || !h) {
      this.enfocar();
      return;
    }

    this.enviando.set(true);
    const disenos = this.seleccion.trabajos();
    try {
      const cita = await this.agenda.apartar({
        nombre: this.nombre().trim(),
        telefono: this.telefono().trim(),
        fecha: d.clave,
        hora: h,
        nota: this.nota().trim(),
        disenos: disenos.map((t) => t.id),
        sitio: this.sitio(),
      });
      this.guardarContacto();
      this.apartada.set({
        id: cita.id,
        nombre: this.nombre().trim(),
        fecha: fechaDeClave(cita.fecha),
        hora: cita.hora,
        disenos,
      });
      this.seleccion.vaciar();
      this.nota.set('');
      this.dia.set(null);
      this.hora.set(null);
      void this.actualizarDisponibilidad();
      // El formulario se reemplaza por la confirmación, que es más corta: se lleva a la vista.
      afterNextRender(
        () => {
          const el = this.host.nativeElement.querySelector<HTMLElement>('#agenda-lista');
          el?.focus({ preventScroll: true });
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        },
        { injector: this.injector },
      );
    } catch (e) {
      await this.mostrarError(e);
    } finally {
      this.enviando.set(false);
    }
  }

  /** "Pedir otra cita" desde la confirmación. */
  protected otra(): void {
    this.apartada.set(null);
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('input[name="dia"]:not(:disabled)')
          ?.focus(),
      { injector: this.injector },
    );
  }

  private async mostrarError(e: unknown): Promise<void> {
    const cuerpo =
      e instanceof HttpErrorResponse
        ? ((e.error ?? {}) as {
            message?: string;
            errores?: Record<string, string>;
            ocupado?: boolean;
          })
        : {};
    if (cuerpo.ocupado) {
      // Alguien más lo apartó: se actualiza la agenda y se pide elegir otra hora.
      this.hora.set(null);
      await this.actualizarDisponibilidad();
      this.errores.set({ hora: 'Esa hora se acaba de ocupar. Elige otra.' });
      this.enfocar();
      return;
    }
    if (e instanceof HttpErrorResponse && e.status === 422 && cuerpo.errores) {
      const { nombre, telefono, hora, fecha } = cuerpo.errores;
      this.errores.set({ nombre, telefono, hora: hora ?? fecha });
      this.error.set(cuerpo.message ?? '');
      this.enfocar();
      return;
    }
    this.error.set(
      e instanceof HttpErrorResponse && e.status === 429 && cuerpo.message
        ? cuerpo.message
        : e instanceof HttpErrorResponse && e.status === 0
          ? 'No hay conexión. Revisa tu internet e intenta de nuevo.'
          : 'No se pudo apartar la cita. Intenta de nuevo o escríbele a Ivonne por WhatsApp.',
    );
  }

  /** Vuelve a pedir los horarios libres y redibuja la agenda conservando el día elegido. */
  private async actualizarDisponibilidad(): Promise<void> {
    await this.agenda.cargar();
    const disp = this.agenda.disponibilidad();
    if (!disp) return;
    const semanas = generarSemanas(new Date(), disp.agenda, disp.ocupacion);
    this.semanas.set(semanas);
    const elegido = this.dia();
    if (elegido) {
      const nuevo = semanas.flatMap((s) => s.dias).find((x) => x.clave === elegido.clave);
      this.dia.set(nuevo?.horas.length ? nuevo : null);
      const h = this.hora();
      if (h && !nuevo?.horas.includes(h)) this.hora.set(null);
    }
  }

  private quitarError(campo: Campo): void {
    if (this.errores()[campo]) {
      const { [campo]: _, ...resto } = this.errores();
      this.errores.set(resto);
    }
  }

  /** Lleva el foco al primer dato que falta. */
  private enfocar(): void {
    const e = this.errores();
    const selector = e.dia
      ? 'input[name="dia"]:not(:disabled)'
      : e.hora
        ? 'input[name="hora"]:not(:disabled)'
        : e.nombre
          ? '#agenda-nombre'
          : e.telefono
            ? '#agenda-telefono'
            : null;
    queueMicrotask(() => {
      if (selector) this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }

  private recordarContacto(): void {
    try {
      const c = JSON.parse(localStorage.getItem(CLAVE_CONTACTO) ?? 'null') as {
        nombre?: unknown;
        telefono?: unknown;
      } | null;
      if (typeof c?.nombre === 'string') this.nombre.set(c.nombre);
      if (typeof c?.telefono === 'string') this.telefono.set(c.telefono);
    } catch {
      /* sin almacenamiento: se escribe cada vez */
    }
  }

  private guardarContacto(): void {
    try {
      localStorage.setItem(
        CLAVE_CONTACTO,
        JSON.stringify({ nombre: this.nombre().trim(), telefono: this.telefono().trim() }),
      );
    } catch {
      /* sin almacenamiento */
    }
  }
}
