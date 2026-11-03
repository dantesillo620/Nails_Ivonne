import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiaAgenda, SemanaAgenda, formatoDia, formatoHora, generarSemanas, mensajeCita } from '../../core/agenda';
import { whatsappUrl } from '../../core/contacto';
import { SeleccionService } from '../../core/seleccion.service';
import { SITE } from '../../core/site.config';
import { Reveal } from '../../shared/reveal';

const fmtSemana = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });
const fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'short' });

/**
 * Agenda para pedir cita: día, hora y diseños elegidos se envían en un
 * WhatsApp a Ivonne. No reserva nada; ella confirma por mensaje.
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly textos = SITE.textos.agenda;
  protected readonly horario = SITE.contacto.horarios.filter((h) => h.dias && h.horas);
  protected readonly horas = SITE.agenda.horas;
  protected readonly formatoHora = formatoHora;

  protected readonly semanas = signal<SemanaAgenda[]>([]);
  protected readonly dia = signal<DiaAgenda | null>(null);
  protected readonly hora = signal<string | null>(null);
  protected readonly nombre = signal('');
  protected readonly nota = signal('');
  protected readonly error = signal(false);

  protected readonly resumen = computed(() => {
    const d = this.dia();
    const h = this.hora();
    if (!d) return null;
    const dia = formatoDia(d.fecha);
    return h ? `${dia}, ${formatoHora(h)}` : dia;
  });

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

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.semanas.set(generarSemanas(new Date()));

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
    this.error.set(false);
  }

  protected elegirHora(h: string): void {
    this.hora.set(h);
    this.error.set(false);
  }

  protected escribir(campo: 'nombre' | 'nota', event: Event): void {
    this[campo].set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  /** Solo se llega aquí si falta día u hora: se avisa y se lleva el foco a lo que falta. */
  protected faltaDato(event: Event): void {
    event.preventDefault();
    this.error.set(true);
    const selector = this.dia() ? 'input[name="hora"]:not(:disabled)' : 'input[name="dia"]:not(:disabled)';
    this.host.nativeElement.querySelector<HTMLInputElement>(selector)?.focus();
  }
}
