import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { SITE } from '../core/site.config';

/** Lo que se puede hacer con los avisos en este dispositivo. */
export type EstadoAvisos =
  | 'cargando'
  /** Con `npm start` no hay service worker: solo en el sitio compilado. */
  | 'desarrollo'
  /** El navegador no soporta notificaciones push. */
  | 'sin-soporte'
  /** iPhone/iPad: Apple solo permite avisos en la app instalada en la pantalla de inicio. */
  | 'ios-instalar'
  /** El servidor no tiene claves VAPID. */
  | 'sin-servidor'
  /** Ivonne (o el navegador) bloqueó las notificaciones de este sitio. */
  | 'bloqueado'
  | 'inactivo'
  | 'activo';

export interface Dispositivo {
  id: number;
  endpoint: string;
  dispositivo: string | null;
  creado: string | null;
}

/** Evento de Chrome/Edge/Android para ofrecer instalar la app (no está en los tipos de TS). */
export interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function esIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac, pero con pantalla táctil.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function esAppInstalada(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** 'iPhone · Safari', 'Android · Chrome', 'Mac · Chrome'… para reconocer cada dispositivo en la lista. */
export function nombreDispositivo(ua = navigator.userAgent): string {
  const sistema = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Macintosh/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : 'Otro';
  const navegador = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/.test(ua)
      ? 'Samsung Internet'
      : /Firefox|FxiOS/.test(ua)
        ? 'Firefox'
        : /Chrome|CriOS/.test(ua)
          ? 'Chrome'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'Navegador';
  return `${sistema} · ${navegador}${esAppInstalada() ? ' (app)' : ''}`;
}

/**
 * Avisos del panel (Web Push) e instalación de la app en este dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush);
  private readonly api = `${SITE.api}/admin/push`;

  private readonly clave = signal<string | null | undefined>(undefined);
  readonly dispositivos = signal<readonly Dispositivo[]>([]);
  private readonly permiso = signal<NotificationPermission | 'sin-soporte'>(
    typeof Notification === 'undefined' ? 'sin-soporte' : Notification.permission,
  );
  /** Suscripción de este navegador (null si no tiene). */
  readonly suscripcion = toSignal(this.swPush.subscription, { initialValue: null });

  /** Ofrecimiento de instalar la app guardado por el componente raíz (solo Chrome/Edge/Android). */
  readonly instalable = signal<EventoInstalar | null>(null);
  readonly instalada = signal(esAppInstalada());

  readonly estado = computed<EstadoAvisos>(() => {
    if (isDevMode()) return 'desarrollo';
    if (esIos() && !this.instalada()) return 'ios-instalar';
    if (!this.swPush.isEnabled || this.permiso() === 'sin-soporte') return 'sin-soporte';
    const clave = this.clave();
    if (clave === undefined) return 'cargando';
    if (clave === null) return 'sin-servidor';
    if (this.permiso() === 'denied') return 'bloqueado';
    const sub = this.suscripcion();
    // Activo solo si el servidor también lo tiene (pudo borrarse si el servicio de push lo dio de baja).
    return sub && this.dispositivos().some((d) => d.endpoint === sub.endpoint)
      ? 'activo'
      : 'inactivo';
  });

  async cargar(): Promise<void> {
    const r = await firstValueFrom(
      this.http.get<{ clavePublica: string | null; dispositivos: Dispositivo[] }>(this.api),
    );
    this.clave.set(r.clavePublica);
    this.dispositivos.set(r.dispositivos);
  }

  /** Pide permiso al navegador y registra este dispositivo. */
  async activar(): Promise<void> {
    const clave = this.clave();
    if (!clave) throw new Error('Sin clave pública');
    try {
      const sub = await this.swPush.requestSubscription({ serverPublicKey: clave });
      await firstValueFrom(
        this.http.post(`${this.api}/suscripciones`, {
          ...sub.toJSON(),
          dispositivo: nombreDispositivo(),
        }),
      );
    } finally {
      this.permiso.set(Notification.permission);
    }
    await this.cargar();
  }

  async desactivar(): Promise<void> {
    const sub = this.suscripcion();
    if (sub) {
      await firstValueFrom(
        this.http.post(`${this.api}/suscripciones/quitar`, { endpoint: sub.endpoint }),
      );
      await this.swPush.unsubscribe().catch(() => undefined);
    }
    await this.cargar();
  }

  /** Quita otro dispositivo de la lista (por ejemplo, un celular que ya no usa). */
  async quitar(d: Dispositivo): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.api}/suscripciones/quitar`, { endpoint: d.endpoint }),
    );
    if (d.endpoint === this.suscripcion()?.endpoint) {
      await this.swPush.unsubscribe().catch(() => undefined);
    }
    await this.cargar();
  }

  async probar(): Promise<{ enviadas: number; fallidas: number }> {
    const r = await firstValueFrom(
      this.http.post<{ enviadas: number; fallidas: number }>(`${this.api}/prueba`, {}),
    );
    await this.cargar();
    return r;
  }

  async instalar(): Promise<boolean> {
    const e = this.instalable();
    if (!e) return false;
    await e.prompt();
    const { outcome } = await e.userChoice;
    this.instalable.set(null);
    return outcome === 'accepted';
  }
}
