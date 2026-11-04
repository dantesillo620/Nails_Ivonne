import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigAgenda } from '../core/agenda';
import { SITE } from '../core/site.config';
import { Imagen } from '../data/trabajos';

export type EstadoCita = 'pendiente' | 'confirmada' | 'cancelada';

export interface CitaPanel {
  id: number;
  /** 'AAAA-MM-DD' */
  fecha: string;
  /** 'HH:MM' */
  hora: string;
  estado: EstadoCita;
  nombre: string;
  /** Internacional, solo dígitos (como lo usa wa.me). */
  telefono: string;
  nota: string | null;
  disenos: { id: number; codigo: string; titulo: string; imagen: Imagen }[];
  creada: string | null;
}

export interface BloqueoPanel {
  id: number;
  fecha: string;
  /** null: el día completo. */
  hora: string | null;
  motivo: string | null;
}

export interface SemanaPanel {
  desde: string;
  hasta: string;
  hoy: string;
  agenda: ConfigAgenda;
  citas: CitaPanel[];
  bloqueos: BloqueoPanel[];
  /** Citas por confirmar de hoy en adelante (en cualquier semana). */
  pendientes: number;
}

export interface NuevaCita {
  nombre: string;
  telefono: string;
  fecha: string;
  hora: string;
  nota: string;
}

/** Agenda del panel. Después de cada cambio se vuelve a pedir la semana a la API. */
@Injectable({ providedIn: 'root' })
export class PanelAgendaService {
  private readonly http = inject(HttpClient);
  private readonly api = `${SITE.api}/admin`;

  readonly semana = signal<SemanaPanel | null>(null);
  /** Para el aviso en la barra del panel. */
  readonly pendientes = signal(0);

  async cargar(semana?: string): Promise<void> {
    const params = semana ? { semana } : undefined;
    const s = await firstValueFrom(this.http.get<SemanaPanel>(`${this.api}/agenda`, { params }));
    this.semana.set(s);
    this.pendientes.set(s.pendientes);
  }

  async cambiarEstado(id: number, estado: EstadoCita): Promise<CitaPanel> {
    const { cita } = await firstValueFrom(
      this.http.patch<{ cita: CitaPanel }>(`${this.api}/citas/${id}`, { estado }),
    );
    await this.recargar();
    return cita;
  }

  async crearCita(datos: NuevaCita): Promise<CitaPanel> {
    const { cita } = await firstValueFrom(
      this.http.post<{ cita: CitaPanel }>(`${this.api}/citas`, datos),
    );
    await this.recargar();
    return cita;
  }

  async bloquear(fecha: string, hora: string | null, motivo: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.api}/bloqueos`, { fecha, hora: hora ?? '', motivo }),
    );
    await this.recargar();
  }

  async desbloquear(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/bloqueos/${id}`));
    await this.recargar();
  }

  private recargar(): Promise<void> {
    return this.cargar(this.semana()?.desde);
  }
}

/** Enlace de WhatsApp a la clienta con un mensaje ya escrito. */
export function whatsappCliente(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
}

/** '523312345678' -> '+52 33 1234 5678' (para leerlo, no para marcar). */
export function telefonoLegible(telefono: string): string {
  const d = telefono.replace(/\D/g, '');
  const m = d.match(/^(52)(\d{2})(\d{4})(\d{4})$/) ?? d.match(/^(1)(\d{3})(\d{3})(\d{4})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${d}`;
}
