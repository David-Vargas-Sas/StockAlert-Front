import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AlertRecord, AlertsService } from '../../../../services/alerts';
import { AuthService } from '../../../../services/auth';
import { FeedbackModal } from '../../shared/feedback-modal';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-alerts-page',
  imports: [MatIconModule, PageTitle, FeedbackModal],
  template: `
    <section class="page alerts-page">
      <app-page-title title="Alertas" subtitle="Prioriza reposiciones y resuelve alertas de inventario." />

      <div class="toolbar alerts-toolbar">
        <label><mat-icon>search</mat-icon><input placeholder="Buscar alerta o producto" [value]="search()" (input)="search.set(inputValue($event))" /></label>
        <div class="tabs">
          <button type="button" [class.active]="statusFilter() === 'active'" (click)="statusFilter.set('active')">Activas</button>
          <button type="button" [class.active]="statusFilter() === 'resolved'" (click)="statusFilter.set('resolved')">Resueltas</button>
          <button type="button" [class.active]="statusFilter() === 'all'" (click)="statusFilter.set('all')">Todas</button>
        </div>
      </div>

      @if (!canResolveAlerts()) {
        <div class="inline-error"><mat-icon>lock</mat-icon><span>Tu usuario puede ver alertas, pero no tiene permiso para resolverlas.</span></div>
      }

      @if (loadError()) {
        <div class="inline-error"><mat-icon>error</mat-icon><span>{{ loadError() }}</span></div>
      }

      <app-feedback-modal
        [title]="successMessage()"
        type="edit"
        message="La alerta quedo marcada como resuelta."
        (dismiss)="successMessage.set('')"
      />

      @if (loadingAlerts()) {
        <div class="audit-status-card">
          <span class="loading-dot"></span>
          <div><h3>Cargando alertas</h3><p>Consultando alertas de inventario registradas.</p></div>
        </div>
      } @else {
        <div class="alert-grid">
          @for (alert of filteredAlerts(); track alert.id) {
            <article class="alert-card" [class]="alertCardClass(alert)">
              <span class="badge" [class]="alertStatusClass(alert)">{{ alertStatusLabel(alert) }}</span>
              <h3>{{ alert.productName || ('Producto #' + alert.productId) }}</h3>
              <p>{{ alert.message }}</p>
              <div class="alert-meta">
                <span>ID {{ alert.id }}</span>
                <span>{{ formatDate(alert.createdAt) }}</span>
              </div>
              <footer>
                <small>{{ alert.status }}</small>
                <button class="secondary-btn" type="button" [disabled]="!canResolveAlerts() || isResolved(alert) || resolvingAlertId() === alert.id" (click)="resolveAlert(alert)">
                  <mat-icon>task_alt</mat-icon>
                  {{ resolvingAlertId() === alert.id ? 'Resolviendo...' : 'Resolver' }}
                </button>
              </footer>
            </article>
          } @empty {
            <div class="alerts-empty-card">
              <mat-icon>notifications_off</mat-icon>
              <strong>Sin alertas para mostrar</strong>
              <span>No hay alertas registradas o el filtro no encontro coincidencias.</span>
            </div>
          }
        </div>
        <div class="pagination alerts-pagination">
          <span>Mostrando {{ filteredAlerts().length }} de {{ totalElements() }} alertas</span>
          <button type="button" [disabled]="firstPage()" (click)="previousPage()">Anterior</button>
          <button type="button" [disabled]="lastPage()" (click)="nextPage()">Siguiente</button>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .alerts-page {
        display: grid;
        gap: 16px;
      }

      .alerts-toolbar {
        margin-bottom: 0;
        justify-content: space-between;
        gap: 14px;
      }

      .alerts-toolbar label {
        flex: 1 1 320px;
        max-width: 520px;
      }

      .alerts-toolbar .tabs {
        flex: 0 0 auto;
        min-height: 44px;
        background: #f6f9fd;
      }

      .alerts-toolbar .tabs button {
        min-width: 86px;
      }

      .alerts-toolbar .tabs button.active {
        background: #0f172a !important;
        color: #ffffff !important;
      }

      .alert-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 360px));
        gap: 16px;
        align-items: start;
        justify-content: start;
        margin-top: 0;
      }

      .alert-card {
        display: grid;
        gap: 10px;
        min-height: 188px;
        max-width: 360px;
        border-radius: 14px;
      }

      .alert-card .badge {
        width: fit-content;
      }

      .alert-card h3 {
        margin: 4px 0 0;
        font-size: 16px;
        line-height: 1.25;
      }

      .alert-card p {
        margin: 0;
        line-height: 1.4;
      }

      .alert-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .alert-card.resuelta {
        background: #f8fafc;
        border-color: #dbe4ef;
      }

      .alert-card footer {
        align-self: end;
        gap: 10px;
      }

      .alert-card footer .secondary-btn {
        min-height: 38px;
        padding-inline: 12px;
      }

      .alerts-empty-card {
        grid-column: 1 / -1;
        min-height: 210px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 8px;
        padding: 28px;
        border: 1px dashed #cbd5e1;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.72);
        color: #334155;
        text-align: center;
      }

      .alerts-empty-card mat-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #f1f5f9;
        color: #475569;
      }

      .alerts-empty-card span {
        color: var(--muted);
        font-size: 13px;
      }

      .alerts-pagination {
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
      }

      @media (max-width: 760px) {
        .alert-grid {
          grid-template-columns: 1fr;
        }

        .alert-card {
          max-width: none;
        }

        .alerts-toolbar label,
        .alerts-toolbar .tabs {
          flex: 1 1 100%;
          max-width: none;
        }
      }
    `,
  ],
})
export class AlertsPage implements OnInit {
  private readonly alertsService = inject(AlertsService);
  private readonly auth = inject(AuthService);

  readonly alerts = signal<AlertRecord[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal<'active' | 'resolved' | 'all'>('active');
  readonly loadingAlerts = signal(false);
  readonly resolvingAlertId = signal<number | null>(null);
  readonly loadError = signal('');
  readonly successMessage = signal('');
  readonly page = signal(0);
  readonly size = signal(10);
  readonly totalElements = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);
  readonly canResolveAlerts = computed(() => this.auth.hasPermission('ALERT_RESOLVE'));

  readonly filteredAlerts = computed(() => {
    const term = this.search().trim().toLowerCase();
    const filter = this.statusFilter();

    return this.alerts().filter((alert) => {
      const matchesTerm = [alert.productName, alert.message, alert.status, alert.statusLabel].some((value) => (value || '').toLowerCase().includes(term));
      const resolved = this.isResolved(alert);
      const matchesStatus = filter === 'all' || (filter === 'resolved' && resolved) || (filter === 'active' && !resolved);

      return matchesTerm && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.loadAlerts();
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  loadAlerts(page = this.page()): void {
    this.loadingAlerts.set(true);
    this.loadError.set('');

    this.alertsService
      .getPaginated({ page, size: this.size(), sortBy: 'id', sortDirection: 'desc' })
      .pipe(finalize(() => this.loadingAlerts.set(false)))
      .subscribe({
        next: (response) => {
          this.alerts.set(response.content ?? []);
          this.page.set(response.page ?? page);
          this.size.set(response.size ?? this.size());
          this.totalElements.set(response.totalElements ?? 0);
          this.firstPage.set(response.first ?? true);
          this.lastPage.set(response.last ?? true);
        },
        error: (error: Error) => this.loadError.set(error.message || 'No fue posible cargar las alertas.'),
      });
  }

  previousPage(): void {
    if (!this.firstPage()) {
      this.loadAlerts(this.page() - 1);
    }
  }

  nextPage(): void {
    if (!this.lastPage()) {
      this.loadAlerts(this.page() + 1);
    }
  }

  resolveAlert(alert: AlertRecord): void {
    if (!this.canResolveAlerts() || this.isResolved(alert) || this.resolvingAlertId() !== null) {
      return;
    }

    this.loadError.set('');
    this.successMessage.set('');
    this.resolvingAlertId.set(alert.id);

    this.alertsService
      .resolve(alert.id)
      .pipe(finalize(() => this.resolvingAlertId.set(null)))
      .subscribe({
        next: (resolvedAlert) => {
          this.alerts.update((alerts) => alerts.map((item) => (item.id === resolvedAlert.id ? resolvedAlert : item)));
          this.successMessage.set('Alerta resuelta correctamente');
        },
        error: (error: Error) => this.loadError.set(error.message || 'No fue posible resolver la alerta.'),
      });
  }

  isResolved(alert: AlertRecord): boolean {
    return String(alert.status || '').toUpperCase() === 'RESOLVED';
  }

  alertStatusLabel(alert: AlertRecord): string {
    if (alert.statusLabel) {
      return alert.statusLabel;
    }

    return this.isResolved(alert) ? 'Resuelta' : 'Activa';
  }

  alertStatusClass(alert: AlertRecord): string {
    return this.isResolved(alert) ? 'activa' : 'critica';
  }

  alertCardClass(alert: AlertRecord): string {
    return this.isResolved(alert) ? 'resuelta' : 'critica';
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return !value || Number.isNaN(date.getTime())
      ? '-'
      : new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }
}
