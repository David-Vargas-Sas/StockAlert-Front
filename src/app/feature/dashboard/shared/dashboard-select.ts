import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface DashboardSelectOption {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-dashboard-select',
  imports: [MatIconModule],
  template: `
    <button class="select-trigger" type="button" [class.open]="open" (click)="toggle()" [attr.aria-expanded]="open">
      <span>{{ selectedLabel }}</span>
      <mat-icon>expand_more</mat-icon>
    </button>

    @if (open) {
      <div class="select-menu" role="listbox">
        @for (option of options; track option.value) {
          <button
            type="button"
            role="option"
            [class.active]="isSelected(option)"
            [attr.aria-selected]="isSelected(option)"
            (click)="select(option)"
          >
            <span>{{ option.label }}</span>
            @if (isSelected(option)) {
              <mat-icon>check</mat-icon>
            }
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      position: relative;
      display: block;
      flex: 0 1 230px;
      min-width: 190px;
    }

    .select-trigger {
      width: 100%;
      min-height: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 12px 0 14px;
      border: 1px solid #dce5f0;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffffff, #f8fafc);
      color: #111827;
      cursor: pointer;
      font-weight: 800;
      text-align: left;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
      transition:
        border-color 160ms ease,
        box-shadow 160ms ease,
        background 160ms ease;
    }

    .select-trigger:hover,
    .select-trigger.open,
    .select-trigger:focus-visible {
      border-color: #0d9488;
      background: #ffffff;
      box-shadow:
        0 0 0 3px rgba(13, 148, 136, 0.12),
        0 10px 22px rgba(15, 23, 42, 0.06);
      outline: 0;
    }

    .select-trigger span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select-trigger mat-icon {
      width: 21px;
      height: 21px;
      flex: 0 0 auto;
      color: #64748b;
      transition: transform 160ms ease, color 160ms ease;
    }

    .select-trigger.open mat-icon {
      color: #0d9488;
      transform: rotate(180deg);
    }

    .select-menu {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      z-index: 30;
      width: min(320px, 86vw);
      max-height: 280px;
      overflow: auto;
      padding: 6px;
      border: 1px solid #dce5f0;
      border-radius: 16px;
      background: #ffffff;
      box-shadow: 0 22px 46px rgba(15, 23, 42, 0.18);
    }

    .select-menu button {
      width: 100%;
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border: 0;
      border-radius: 11px;
      padding: 0 10px;
      background: transparent;
      color: #334155;
      cursor: pointer;
      font-weight: 800;
      text-align: left;
    }

    .select-menu button:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .select-menu button.active {
      background: #e6f7f5;
      color: #0f766e;
    }

    .select-menu button span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select-menu mat-icon {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      font-size: 18px;
      color: currentColor;
    }
  `],
})
export class DashboardSelect {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() options: DashboardSelectOption[] = [];
  @Input() value: string | number = '';
  @Output() valueChange = new EventEmitter<string>();

  open = false;

  get selectedLabel(): string {
    return this.options.find((option) => this.normalize(option.value) === this.normalize(this.value))?.label ?? 'Selecciona';
  }

  toggle(): void {
    this.open = !this.open;
  }

  select(option: DashboardSelectOption): void {
    this.valueChange.emit(this.normalize(option.value));
    this.open = false;
  }

  isSelected(option: DashboardSelectOption): boolean {
    return this.normalize(option.value) === this.normalize(this.value);
  }

  @HostListener('document:click', ['$event'])
  closeFromOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('document:keydown.escape')
  closeFromEscape(): void {
    this.open = false;
  }

  private normalize(value: string | number): string {
    return String(value);
  }
}
