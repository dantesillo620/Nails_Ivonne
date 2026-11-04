import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ConfigAgenda, Ocupacion } from './agenda';
import { SITE } from './site.config';

interface RespuestaDisponibilidad {
  agenda: ConfigAgenda;
  hoy: string;
  ocupados: string[];
  diasBloqueados: string[];
}

export interface Disponibilidad {
  agenda: ConfigAgenda;
  ocupacion: Ocupacion;
}

export interface SolicitudApartar {
  nombre: string;
  telefono: string;
  /** 'AAAA-MM-DD' */
  fecha: string;
  /** 'HH:MM' */
  hora: string;
  nota: string;
  /** Códigos de los diseños elegidos ('NI-25'). */
  disenos: string[];
  /** Campo trampa: siempre vacío para personas. */
  sitio: string;
}

export interface CitaPublica {
  id: number;
  fecha: string;
  hora: string;
  estado: string;
}

/**
 * Agenda con la API: qué horarios están libres y apartar una cita.
 * Si la API no responde, `disponible` queda en false y la agenda vuelve a
 * funcionar solo con WhatsApp, como antes de existir el backend.
 */
@Injectable({ providedIn: 'root' })
export class AgendaService {
  private readonly http = inject(HttpClient);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** null mientras se consulta; luego la disponibilidad, o false si la API no respondió. */
  readonly disponibilidad = signal<Disponibilidad | false | null>(null);

  async cargar(): Promise<void> {
    if (!this.navegador) return;
    try {
      const r = await firstValueFrom(
        this.http.get<RespuestaDisponibilidad>(`${SITE.api}/agenda/disponibilidad`),
      );
      this.disponibilidad.set({
        agenda: { ...SITE.agenda, ...r.agenda },
        ocupacion: { ocupados: new Set(r.ocupados), diasBloqueados: new Set(r.diasBloqueados) },
      });
    } catch {
      this.disponibilidad.set(false);
    }
  }

  async apartar(solicitud: SolicitudApartar): Promise<CitaPublica> {
    const { cita } = await firstValueFrom(
      this.http.post<{ cita: CitaPublica }>(`${SITE.api}/agenda/citas`, solicitud),
    );
    return cita;
  }
}
