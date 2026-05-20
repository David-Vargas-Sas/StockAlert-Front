import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type FeedbackType = 'success' | 'error' | 'create' | 'edit' | 'delete' | 'activate' | 'deactivate';

@Component({
  selector: 'app-feedback-modal',
  imports: [MatIconModule],
  template: `
    @if (title) {
      <aside class="feedback-modal {{ type }}" role="status" aria-live="polite">
        <span class="feedback-icon">
          <mat-icon>{{ icon }}</mat-icon>
        </span>
        <div>
          <strong>{{ title }}</strong>
          @if (message) {
            <p>{{ message }}</p>
          }
        </div>
        <button type="button" aria-label="Cerrar notificacion" (click)="dismiss.emit()">
          <mat-icon>close</mat-icon>
        </button>
      </aside>
    }
  `,
  styles: [
    `
      .feedback-modal {
        position: fixed;
        top: 18px;
        right: 22px;
        z-index: 80;
        width: min(420px, calc(100vw - 32px));
        min-height: 72px;
        display: grid;
        grid-template-columns: 38px 1fr 32px;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border: 1px solid #bbf7d0;
        border-radius: 16px;
        background: #f0fdf4;
        color: #166534;
        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
        animation: feedback-enter 160ms ease both;
      }

      .feedback-modal.error {
        border-color: #fecaca;
        background: #fff1f2;
        color: #991b1b;
      }

      .feedback-modal.edit {
        border-color: #bfdbfe;
        background: #eff6ff;
        color: #1e40af;
      }

      .feedback-modal.delete {
        border-color: #fecaca;
        background: #fff1f2;
        color: #991b1b;
      }

      .feedback-modal.activate {
        border-color: #99f6e4;
        background: #f0fdfa;
        color: #0f766e;
      }

      .feedback-modal.deactivate {
        border-color: #fde68a;
        background: #fffbeb;
        color: #92400e;
      }

      .feedback-icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: #16a34a;
        color: #ffffff;
      }

      .feedback-modal.error .feedback-icon,
      .feedback-modal.delete .feedback-icon {
        background: #dc2626;
      }

      .feedback-modal.edit .feedback-icon {
        background: #2563eb;
      }

      .feedback-modal.activate .feedback-icon {
        background: #0d9488;
      }

      .feedback-modal.deactivate .feedback-icon {
        background: #d97706;
      }

      .feedback-icon mat-icon {
        width: 21px;
        height: 21px;
        font-size: 21px;
      }

      strong {
        display: block;
        font-size: 14px;
        font-weight: 900;
      }

      p {
        margin: 4px 0 0;
        color: currentColor;
        font-size: 13px;
        line-height: 1.35;
        opacity: 0.88;
      }

      button {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: currentColor;
        cursor: pointer;
      }

      button:hover {
        background: rgba(15, 23, 42, 0.08);
      }

      button mat-icon {
        width: 19px;
        height: 19px;
        font-size: 19px;
      }

      @keyframes feedback-enter {
        from {
          opacity: 0;
          transform: translateY(-8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `,
  ],
})
export class FeedbackModal {
  @Input() title = '';
  @Input() message = '';
  @Input() type: FeedbackType = 'success';
  @Output() dismiss = new EventEmitter<void>();

  get icon(): string {
    const icons: Record<FeedbackType, string> = {
      success: 'check_circle',
      error: 'error',
      create: 'add_circle',
      edit: 'edit',
      delete: 'delete',
      activate: 'toggle_on',
      deactivate: 'toggle_off',
    };

    return icons[this.type];
  }
}
