import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { fechaDeClave, formatoDia, formatoHora, relojEstudio } from '../../core/agenda';
import {
  BloqueoPanel,
  CitaPanel,
  EstadoCita,
  PanelAgendaService,
  telefonoLegible,
  whatsappCliente,
} from '../panel-agenda.service';
import { explicarError } from '../sesion.service';

/** Un horario del día: con cita, bloqueado o libre. */
interface Hueco {
  hora: string;
  cita?: CitaPanel;
  bloqueo?: BloqueoPanel;
  /** Ya pasó: no se puede agregar ni bloquear. */
  pasado: boolean;
}

interface DiaPanel {
  clave: string;
  titulo: string;
  hoy: boolean;
  pasado: boolean;
  /** Bloqueo del día completo. */
  bloqueo?: BloqueoPanel;
  huecos: Hueco[];
  canceladas: CitaPanel[];
}

type Dialogo =
  | { tipo: 'cita'; fecha: string; hora: string }
  | { tipo: 'bloqueo'; fecha: string; hora: string | null };

const fmtMesLargo = new Intl.DateTimeFormat('es-MX', { month: 'long' });

function sumarDias(clave: string, n: number): string {
  const d = fechaDeClave(clave);
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Agenda del panel: la semana de Ivonne, día por día. */
@Component({
  selector: 'app-semana',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './semana.html',
  styleUrl: './semana.scss',
})
export default class Semana {
  protected readonly agenda = inject(PanelAgendaService);
  private readonly dialogoRef = viewChild<ElementRef<HTMLDialogElement>>('ventana');

  protected readonly error = signal('');
  protected readonly aviso = signal<{ texto: string; error: boolean } | null>(null);
  protected readonly ocupado = signal(false);

  protected readonly dialogo = signal<Dialogo | null>(null);
  protected readonly dNombre = signal('');
  protected readonly dTelefono = signal('');
  protected readonly dHora = signal('');
  protected readonly dNota = signal('');
  protected readonly dErrores = signal<Record<string, string>>({});

  protected readonly formatoHora = formatoHora;
  protected readonly telefonoLegible = telefonoLegible;

  protected readonly titulo = computed(() => {
    const s = this.agenda.semana();
    if (!s) return '';
    const ini = fechaDeClave(s.desde);
    const fin = fechaDeClave(s.hasta);
    const mesIni = fmtMesLargo.format(ini);
    const mesFin = fmtMesLargo.format(fin);
    return mesIni === mesFin
      ? `${ini.getDate()} al ${fin.getDate()} de ${mesFin}`
      : `${ini.getDate()} de ${mesIni} al ${fin.getDate()} de ${mesFin}`;
  });

  protected readonly esSemanaActual = computed(() => {
    const s = this.agenda.semana();
    return !!s && s.hoy >= s.desde && s.hoy <= s.hasta;
  });

  protected readonly dias = computed<DiaPanel[]>(() => {
    const s = this.agenda.semana();
    if (!s) return [];
    const ahora = relojEstudio(new Date(), s.agenda.zonaHoraria);
    const horaAhora = `${String(Math.floor(ahora.minutos / 60)).padStart(2, '0')}:${String(ahora.minutos % 60).padStart(2, '0')}`;

    const dias: DiaPanel[] = [];
    for (let i = 0; i < 7; i++) {
      const clave = sumarDias(s.desde, i);
      const fecha = fechaDeClave(clave);
      const delDia = s.citas.filter((c) => c.fecha === clave);
      const activas = delDia.filter((c) => c.estado !== 'cancelada');
      const bloqueos = s.bloqueos.filter((b) => b.fecha === clave);
      const bloqueoDia = bloqueos.find((b) => b.hora === null);
      const horario = s.agenda.horas[fecha.getDay()] ?? [];
      // Sin horario y sin nada agendado (domingo): no se muestra.
      if (!horario.length && !delDia.length && !bloqueos.length) continue;

      const horas = [
        ...new Set([
          ...horario,
          ...activas.map((c) => c.hora),
          ...bloqueos.flatMap((b) => (b.hora ? [b.hora] : [])),
        ]),
      ].sort();
      const pasadoDia = clave < s.hoy;
      // Lo que ya pasó y quedó libre no ayuda a Ivonne: solo se muestran las citas que hubo.
      if (pasadoDia && !delDia.length) continue;
      const huecos = horas
        .map((hora) => ({
          hora,
          cita: activas.find((c) => c.hora === hora),
          bloqueo: bloqueos.find((b) => b.hora === hora),
          pasado: pasadoDia || (clave === s.hoy && hora < horaAhora),
        }))
        .filter((h) => !h.pasado || h.cita);
      dias.push({
        clave,
        titulo: formatoDia(fecha),
        hoy: clave === s.hoy,
        pasado: pasadoDia,
        bloqueo: bloqueoDia,
        huecos,
        canceladas: delDia.filter((c) => c.estado === 'cancelada'),
      });
    }
    return dias;
  });

  protected readonly citasSemana = computed(() => {
    const citas = this.agenda.semana()?.citas ?? [];
    return {
      pendientes: citas.filter((c) => c.estado === 'pendiente').length,
      confirmadas: citas.filter((c) => c.estado === 'confirmada').length,
    };
  });

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    void this.ir();
  }

  /** -1 semana anterior, +1 siguiente, 0 la actual. */
  protected async ir(delta = 0): Promise<void> {
    const s = this.agenda.semana();
    this.error.set('');
    try {
      await this.agenda.cargar(delta && s ? sumarDias(s.desde, delta * 7) : undefined);
    } catch (e) {
      this.error.set(explicarError(e).mensaje);
    }
  }

  protected miniatura(d: CitaPanel['disenos'][number]): string {
    return `${d.imagen.base}-${d.imagen.widths[0]}.webp`;
  }

  /** Mensaje de WhatsApp para la clienta según el estado de su cita. */
  protected whatsapp(c: CitaPanel): string {
    // La hora ya termina en punto ('4:00 p. m.'): no se le agrega otro.
    const cuando = `el ${formatoDia(fechaDeClave(c.fecha))} a las ${formatoHora(c.hora)}`.replace(
      /\.$/,
      '',
    );
    const nombre = c.nombre.split(' ')[0];
    const texto =
      c.estado === 'confirmada'
        ? `Hola, ${nombre}. Te confirmo tu cita ${cuando}. ¡Te espero! — Ivonne, Nails Ivonne`
        : c.estado === 'cancelada'
          ? `Hola, ${nombre}. Por un imprevisto no podré atenderte ${cuando}. ¿Te acomoda otro horario? — Ivonne, Nails Ivonne`
          : `Hola, ${nombre}. Recibí tu solicitud de cita para ${cuando}. En un momento te confirmo. — Ivonne, Nails Ivonne`;
    return whatsappCliente(c.telefono, texto);
  }

  protected async estado(c: CitaPanel, estado: EstadoCita): Promise<void> {
    if (
      estado === 'cancelada' &&
      !confirm(
        `¿Cancelar la cita de ${c.nombre} (${formatoHora(c.hora)})?\n\nEl horario queda libre en la página.`,
      )
    ) {
      return;
    }
    const texto =
      estado === 'confirmada'
        ? `Cita de ${c.nombre} confirmada. Avísale por WhatsApp.`
        : estado === 'cancelada'
          ? `Cita de ${c.nombre} cancelada. Avísale por WhatsApp.`
          : `Cita de ${c.nombre} otra vez pendiente.`;
    await this.cambio(() => this.agenda.cambiarEstado(c.id, estado), texto);
  }

  protected async desbloquear(b: BloqueoPanel): Promise<void> {
    await this.cambio(
      () => this.agenda.desbloquear(b.id),
      b.hora ? 'Horario desbloqueado.' : 'Día desbloqueado.',
    );
  }

  protected abrir(d: Dialogo): void {
    this.dialogo.set(d);
    this.dNombre.set('');
    this.dTelefono.set('');
    this.dNota.set('');
    this.dHora.set(d.tipo === 'cita' ? d.hora : '');
    this.dErrores.set({});
    queueMicrotask(() => this.dialogoRef()?.nativeElement.showModal());
  }

  protected cerrar(): void {
    this.dialogoRef()?.nativeElement.close();
  }

  protected alCerrar(): void {
    this.dialogo.set(null);
  }

  protected texto(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected tituloDialogo(d: Dialogo): string {
    const dia = formatoDia(fechaDeClave(d.fecha));
    if (d.tipo === 'cita') return `Agregar cita · ${dia}`;
    return d.hora ? `Bloquear ${dia}, ${formatoHora(d.hora)}` : `Bloquear ${dia}`;
  }

  protected async guardarDialogo(event: Event): Promise<void> {
    event.preventDefault();
    const d = this.dialogo();
    if (!d || this.ocupado()) return;

    if (d.tipo === 'cita') {
      const errores: Record<string, string> = {};
      if (!this.dNombre().trim()) errores['nombre'] = 'Escribe el nombre.';
      if (this.dTelefono().replace(/\D/g, '').length < 10)
        errores['telefono'] = 'Escribe el WhatsApp con lada.';
      if (!/^\d{2}:\d{2}$/.test(this.dHora())) errores['hora'] = 'Elige la hora.';
      this.dErrores.set(errores);
      if (Object.keys(errores).length) return;
    }

    this.ocupado.set(true);
    try {
      if (d.tipo === 'cita') {
        await this.agenda.crearCita({
          nombre: this.dNombre().trim(),
          telefono: this.dTelefono().trim(),
          fecha: d.fecha,
          hora: this.dHora(),
          nota: this.dNota().trim(),
        });
        this.avisar(`Cita de ${this.dNombre().trim()} agregada.`, false);
      } else {
        await this.agenda.bloquear(d.fecha, d.hora, this.dNota().trim());
        this.avisar(d.hora ? 'Horario bloqueado.' : 'Día bloqueado: no se ofrecerán citas.', false);
      }
      this.cerrar();
    } catch (e) {
      const { mensaje, campos } = explicarError(e);
      this.dErrores.set({ ...campos, general: mensaje });
    } finally {
      this.ocupado.set(false);
    }
  }

  private async cambio(accion: () => Promise<unknown>, exito: string): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    try {
      await accion();
      this.avisar(exito, false);
    } catch (e) {
      const { mensaje, campos } = explicarError(e);
      this.avisar(campos['hora'] ?? mensaje, true);
    } finally {
      this.ocupado.set(false);
    }
  }

  private avisar(texto: string, error: boolean): void {
    clearTimeout(this.temporizador);
    this.aviso.set({ texto, error });
    if (!error) this.temporizador = setTimeout(() => this.aviso.set(null), 5000);
  }
}
