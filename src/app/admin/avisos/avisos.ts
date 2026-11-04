import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AvisosService, Dispositivo } from '../avisos.service';
import { explicarError } from '../sesion.service';

const fmtFecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Activar los avisos de citas nuevas e instalar la app del panel en este dispositivo. */
@Component({
  selector: 'app-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avisos.html',
  styleUrl: './avisos.scss',
})
export default class Avisos {
  protected readonly avisos = inject(AvisosService);

  protected readonly ocupado = signal(false);
  protected readonly mensaje = signal<{ texto: string; error: boolean } | null>(null);

  constructor() {
    void this.avisos.cargar().catch((e) => this.decir(explicarError(e).mensaje, true));
  }

  protected anticipacion(minutos: number): string {
    if (minutos === 0) return 'No recordarme';
    if (minutos < 60) return `${minutos} minutos antes`;
    const h = minutos / 60;
    return h === 1 ? '1 hora antes' : `${h} horas antes`;
  }

  protected async cambiarRecordatorio(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const minutos = Number(select.value);
    await this.hacer(
      async () => {
        await this.avisos.guardarRecordatorio(minutos);
        this.decir(
          minutos
            ? `Te avisaremos ${this.anticipacion(minutos)} de cada cita.`
            : 'Ya no recibirás recordatorios de tus citas.',
          false,
        );
      },
      (e) => {
        // Si no se guardó, el selector vuelve a lo que de verdad está guardado.
        select.value = String(this.avisos.recordatorioMinutos() ?? 60);
        return explicarError(e).mensaje;
      },
    );
  }

  protected creado(d: Dispositivo): string {
    return d.creado ? fmtFecha.format(new Date(d.creado)) : '';
  }

  protected esEste(d: Dispositivo): boolean {
    return d.endpoint === this.avisos.suscripcion()?.endpoint;
  }

  protected async activar(): Promise<void> {
    await this.hacer(
      async () => {
        await this.avisos.activar();
        this.decir('Listo: este dispositivo recibirá un aviso con cada cita nueva.', false);
      },
      (e) =>
        typeof Notification !== 'undefined' && Notification.permission === 'denied'
          ? 'No se dio permiso para mostrar notificaciones.'
          : e instanceof Error && e.message.includes('Sin clave')
            ? 'El servidor todavía no tiene configurados los avisos.'
            : explicarError(e).mensaje === 'Algo salió mal. Intenta de nuevo en un momento.'
              ? 'No se pudieron activar los avisos. Revisa tu conexión e intenta de nuevo.'
              : explicarError(e).mensaje,
    );
  }

  protected async desactivar(): Promise<void> {
    await this.hacer(async () => {
      await this.avisos.desactivar();
      this.decir('Este dispositivo ya no recibirá avisos.', false);
    });
  }

  protected async quitar(d: Dispositivo): Promise<void> {
    if (!confirm(`¿Dejar de mandar avisos a ${d.dispositivo ?? 'ese dispositivo'}?`)) return;
    await this.hacer(async () => {
      await this.avisos.quitar(d);
      this.decir('Dispositivo quitado.', false);
    });
  }

  protected async probar(): Promise<void> {
    await this.hacer(async () => {
      const r = await this.avisos.probar();
      this.decir(
        r.enviadas
          ? `Aviso de prueba enviado a ${r.enviadas} dispositivo${r.enviadas === 1 ? '' : 's'}. Debe llegar en unos segundos.`
          : 'No se pudo entregar el aviso. Desactiva y vuelve a activar los avisos en este dispositivo.',
        !r.enviadas,
      );
    });
  }

  protected async instalar(): Promise<void> {
    const ok = await this.avisos.instalar();
    if (ok) this.decir('App instalada. Ábrela desde su ícono para usar el panel.', false);
  }

  private async hacer(
    accion: () => Promise<void>,
    mensajeError: (e: unknown) => string = (e) => explicarError(e).mensaje,
  ): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.mensaje.set(null);
    try {
      await accion();
    } catch (e) {
      this.decir(mensajeError(e), true);
    } finally {
      this.ocupado.set(false);
    }
  }

  private decir(texto: string, error: boolean): void {
    this.mensaje.set({ texto, error });
  }
}
