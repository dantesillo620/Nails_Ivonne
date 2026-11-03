import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Aparición suave al entrar en pantalla (una sola vez).
 *
 * El HTML prerenderizado se muestra completo: solo después de cargar la app se
 * ocultan los elementos que todavía están fuera de pantalla, así el contenido
 * nunca depende de JavaScript para verse. Los estilos están en styles.scss.
 */
@Directive({ selector: '[appReveal]' })
export class Reveal {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) return;
      // Lo que ya está visible al cargar no se anima.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

      el.dataset['reveal'] = 'oculto';
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            el.dataset['reveal'] = 'visible';
            observer.disconnect();
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
