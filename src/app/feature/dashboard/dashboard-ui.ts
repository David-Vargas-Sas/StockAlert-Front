import { Injectable, signal } from '@angular/core';

export type ModalMode = 'producto' | 'venta' | 'usuario' | 'rol' | 'empresa';

@Injectable({ providedIn: 'root' })
export class DashboardUi {
  readonly visible = signal(false);
  readonly title = signal('');
  readonly mode = signal<ModalMode>('producto');

  open(mode: ModalMode, title: string): void {
    this.mode.set(mode);
    this.title.set(title);
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
  }
}
