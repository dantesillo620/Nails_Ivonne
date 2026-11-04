import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { rutaDiseno } from '../../data/trabajos';
import { PanelCatalogoService, TrabajoPanel } from '../panel-catalogo.service';
import { reducirFoto } from '../reducir-foto';
import { explicarError } from '../sesion.service';

const MAX_TITULO = 120;
const MAX_ALT = 255;

/**
 * Formulario de un diseño: /admin/nuevo (con foto) y /admin/disenos/:id (editar
 * textos, categoría y visibilidad; la foto no se cambia, se sube un diseño nuevo).
 */
@Component({
  selector: 'app-editor',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export default class Editor {
  protected readonly catalogo = inject(PanelCatalogoService);
  private readonly router = inject(Router);

  /** Parámetro :id de la ruta; sin él es un diseño nuevo. */
  readonly id = input<string>();

  protected readonly nuevo = computed(() => !this.id());
  protected readonly trabajo = computed<TrabajoPanel | undefined>(() => {
    const id = Number(this.id());
    return id ? this.catalogo.buscar(id) : undefined;
  });
  protected readonly noExiste = computed(
    () => !this.nuevo() && this.catalogo.cargado() && !this.trabajo(),
  );

  protected readonly titulo = signal('');
  protected readonly alt = signal('');
  protected readonly categoria = signal('');
  protected readonly destacado = signal(false);
  protected readonly visible = signal(true);

  /** Foto elegida (solo al crear) y su vista previa. */
  protected readonly foto = signal<File | null>(null);
  protected readonly vistaPrevia = signal<string | null>(null);

  protected readonly guardando = signal(false);
  protected readonly borrando = signal(false);
  protected readonly error = signal('');
  protected readonly errores = signal<Record<string, string>>({});
  protected readonly cargaError = signal('');

  protected readonly maxTitulo = MAX_TITULO;
  protected readonly maxAlt = MAX_ALT;
  protected readonly ruta = rutaDiseno;

  constructor() {
    if (!this.catalogo.cargado()) {
      void this.catalogo.cargar().catch((e) => this.cargaError.set(explicarError(e).mensaje));
    }

    // Al abrir un diseño existente se llenan los campos una vez.
    let llenado: number | null = null;
    effect(() => {
      const t = this.trabajo();
      if (!t || llenado === t.id) return;
      llenado = t.id;
      untracked(() => {
        this.titulo.set(t.titulo);
        this.alt.set(t.alt);
        this.categoria.set(t.categoria ?? '');
        this.destacado.set(t.destacado);
        this.visible.set(t.visible);
      });
    });

    inject(DestroyRef).onDestroy(() => this.soltarVistaPrevia());
  }

  protected texto(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  protected marcado(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected elegirFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) return;
    this.soltarVistaPrevia();
    this.foto.set(archivo);
    this.vistaPrevia.set(URL.createObjectURL(archivo));
    this.quitarError('foto');
  }

  protected miniatura(t: TrabajoPanel): string {
    const { base, widths } = t.imagen;
    return `${base}-${widths.find((w) => w >= 960) ?? widths[widths.length - 1]}.webp`;
  }

  protected quitarError(campo: string): void {
    if (this.errores()[campo]) {
      const { [campo]: _, ...resto } = this.errores();
      this.errores.set(resto);
    }
  }

  protected async guardar(event: Event): Promise<void> {
    event.preventDefault();
    if (this.guardando()) return;

    const errores: Record<string, string> = {};
    if (this.nuevo() && !this.foto()) errores['foto'] = 'Elige una foto del diseño.';
    if (!this.titulo().trim()) errores['titulo'] = 'Escribe un título.';
    if (!this.alt().trim()) errores['alt'] = 'Describe la foto para quien no puede verla.';
    this.errores.set(errores);
    if (Object.keys(errores).length) {
      this.error.set('Revisa los datos marcados.');
      this.enfocarPrimerError();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    try {
      const datos = {
        titulo: this.titulo().trim(),
        alt: this.alt().trim(),
        categoria: this.categoria() || null,
        destacado: this.destacado(),
        visible: this.visible(),
      };
      let guardado: TrabajoPanel;
      if (this.nuevo()) {
        const form = new FormData();
        form.append('foto', await reducirFoto(this.foto()!), 'foto.jpg');
        form.append('titulo', datos.titulo);
        form.append('alt', datos.alt);
        form.append('categoria', datos.categoria ?? '');
        form.append('destacado', datos.destacado ? '1' : '0');
        form.append('visible', datos.visible ? '1' : '0');
        guardado = await this.catalogo.crear(form);
      } else {
        guardado = await this.catalogo.editar(this.trabajo()!.id, datos);
      }
      void this.router.navigate(['/admin/catalogo'], {
        state: { aviso: `${guardado.codigo} ${this.nuevo() ? 'publicado' : 'guardado'}.` },
      });
    } catch (e) {
      const { mensaje, campos } = explicarError(e);
      this.error.set(mensaje);
      this.errores.set(campos);
      this.enfocarPrimerError();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async borrar(): Promise<void> {
    const t = this.trabajo();
    if (!t || this.borrando()) return;
    const ok = confirm(
      `¿Borrar ${t.codigo} "${t.titulo}"?\n\nSe quita del sitio para siempre. Si solo quieres que no se vea, mejor desactiva "En el sitio".`,
    );
    if (!ok) return;
    this.borrando.set(true);
    try {
      await this.catalogo.borrar(t.id);
      void this.router.navigate(['/admin/catalogo'], { state: { aviso: `${t.codigo} se borró.` } });
    } catch (e) {
      this.error.set(explicarError(e).mensaje);
    } finally {
      this.borrando.set(false);
    }
  }

  private enfocarPrimerError(): void {
    queueMicrotask(() => {
      const campo = Object.keys(this.errores())[0];
      const el = document.getElementById(campo ? `campo-${campo}` : 'error-editor');
      el?.focus();
    });
  }

  private soltarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
