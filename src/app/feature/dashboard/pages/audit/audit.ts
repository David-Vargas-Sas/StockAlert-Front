import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../services/auth';
import { CompaniesService, CompanyOption } from '../../../../services/companies';
import { SessionLog, SessionLogsPage, SessionLogsService } from '../../../../services/session-logs';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-audit-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Sesiones y auditoria" subtitle="Eventos de login, logout, refresh token e IP." />

      @if (loading()) {
        <div class="audit-status-card">
          <span class="loading-dot"></span>
          <div>
            <h3>Cargando auditoria</h3>
            <p>Consultando eventos recientes de inicio, salida y renovacion de sesion.</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="audit-status-card error">
          <mat-icon>error</mat-icon>
          <div>
            <h3>No se pudieron cargar los logs</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="secondary-btn" type="button" (click)="loadLogs()">Reintentar</button>
        </div>
      }

      <div class="audit-overview">
        <article class="audit-summary">
          <div class="panel-header">
            <div>
              <h3>Actividad de sesiones</h3>
              <p>Lectura rapida de eventos registrados hoy.</p>
            </div>
            <mat-icon>admin_panel_settings</mat-icon>
          </div>

          <div class="audit-kpis">
            @for (metric of eventMetrics; track metric.event) {
              <span [class]="metric.tone">
                <small>{{ metric.label }}</small>
                <strong>{{ metric.count }}</strong>
              </span>
            }
          </div>
        </article>

        <article class="audit-chart panel">
          <div class="panel-header">
            <div>
              <h3>Eventos por tipo</h3>
              <p>Comparativo visual de login, logout y refresh token.</p>
            </div>
            <mat-icon>bar_chart</mat-icon>
          </div>

          <div class="audit-bars">
            @for (metric of eventMetrics; track metric.event) {
              <div class="audit-bar-row">
                <span>{{ metric.label }}</span>
                <div class="bar-track">
                  <i [style.width.%]="metric.percent" [class]="metric.tone"></i>
                </div>
                <strong>{{ metric.count }}</strong>
              </div>
            }
          </div>
        </article>
      </div>

      <div class="audit-users">
        @for (user of userActivity; track user.user) {
          <article class="user-activity-card">
            <div>
              <span class="user-avatar">{{ user.initials }}</span>
              <div>
                <strong>{{ user.user }}</strong>
                <small>{{ user.company }}</small>
              </div>
            </div>
            <dl>
              <span><dt>Entradas</dt><dd>{{ user.login }}</dd></span>
              <span><dt>Salidas</dt><dd>{{ user.logout }}</dd></span>
              <span><dt>Refresh</dt><dd>{{ user.refresh }}</dd></span>
            </dl>
          </article>
        }
      </div>

      <div class="audit-filter-card">
        <div class="filter-copy">
          <mat-icon>filter_alt</mat-icon>
          <div>
            <h3>Filtros de auditoria</h3>
            <p>Filtra los logs por empresa usando el identificador enviado por el backend.</p>
          </div>
        </div>

        <div class="audit-filter-controls">
          <div class="company-filter">
            <span>Empresa</span>
            <button class="company-select-trigger" type="button" (click)="toggleCompanyMenu()">
              <span>{{ selectedCompanyName }}</span>
              <mat-icon>{{ companyMenuOpen() ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>

            @if (companyMenuOpen()) {
              <div class="company-menu">
                <button type="button" [class.active]="companyId() === null" (click)="selectCompany(null)">
                  <mat-icon>public</mat-icon>
                  <span>Todas las empresas</span>
                </button>
                @for (company of companies(); track company.id) {
                  <button type="button" [class.active]="companyId() === company.id" (click)="selectCompany(company.id)">
                    <mat-icon>business</mat-icon>
                    <span>{{ company.name }}</span>
                  </button>
                }
              </div>
            }
          </div>

          <button class="secondary-btn" type="button" (click)="useCurrentCompany()">
            <mat-icon>business</mat-icon>
            Mi empresa
          </button>
          <button class="ghost-btn" type="button" (click)="clearCompanyFilter()">
            Limpiar
          </button>
        </div>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Evento</th><th>Empresa</th><th>Fecha</th><th>IP</th><th>Mensaje</th></tr>
          </thead>
          <tbody>
            @for (log of logs(); track log.id) {
              <tr>
                <td><strong>{{ log.username }}</strong></td>
                <td><span class="badge" [class]="eventClass(log.eventType)">{{ eventLabel(log.eventType) }}</span></td>
                <td>{{ log.companyName }}</td>
                <td>{{ formatDate(log.createdAt) }}</td>
                <td>{{ formatIp(log.ipAddress) }}</td>
                <td>{{ log.message }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">
                  <div class="table-empty">
                    <mat-icon>manage_search</mat-icon>
                    <strong>Sin logs registrados</strong>
                    <span>No hay eventos de sesion para mostrar con los filtros actuales.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (pageInfo()) {
          <div class="pagination">
            <span>Mostrando {{ logs().length }} de {{ pageInfo()?.totalElements }} eventos</span>
            <button type="button" [disabled]="pageInfo()?.first" (click)="previousPage()">Anterior</button>
            <button type="button" [disabled]="pageInfo()?.last" (click)="nextPage()">Siguiente</button>
          </div>
        }
      </div>
    </section>
  `,
})
export class AuditPage implements OnInit {
  private readonly sessionLogs = inject(SessionLogsService);
  private readonly companiesService = inject(CompaniesService);
  readonly auth = inject(AuthService);

  readonly logs = signal<SessionLog[]>([]);
  readonly companies = signal<CompanyOption[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pageInfo = signal<Omit<SessionLogsPage, 'content'> | null>(null);
  readonly currentPage = signal(0);
  readonly companyId = signal<number | null>(null);
  readonly companyMenuOpen = signal(false);
  readonly pageSize = 10;

  ngOnInit(): void {
    this.loadCompanies();
    this.loadLogs();
  }

  loadCompanies(): void {
    this.companiesService.getOptions().subscribe((companies) => this.companies.set(companies));
  }

  loadLogs(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set('');

    this.sessionLogs
      .getPaginated({
        page,
        size: this.pageSize,
        companyId: this.companyId(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const { content, ...pageInfo } = response;
          this.logs.set(content);
          this.pageInfo.set(pageInfo);
          this.currentPage.set(response.page);
        },
        error: (error: Error) => {
          this.logs.set([]);
          this.pageInfo.set(null);
          this.error.set(error.message || 'Revisa que el backend este activo y que la sesion sea valida.');
        },
      });
  }

  applyCompanyFilter(value: string): void {
    const companyId = Number(value);
    this.companyId.set(Number.isFinite(companyId) && companyId > 0 ? companyId : null);
    this.loadLogs(0);
  }

  toggleCompanyMenu(): void {
    this.companyMenuOpen.update((open) => !open);
  }

  selectCompany(companyId: number | null): void {
    this.companyId.set(companyId);
    this.companyMenuOpen.set(false);
    this.loadLogs(0);
  }

  useCurrentCompany(): void {
    const companyId = this.auth.user()?.companyId ?? null;
    this.selectCompany(companyId);
  }

  clearCompanyFilter(): void {
    this.selectCompany(null);
  }

  get selectedCompanyName(): string {
    const selectedId = this.companyId();

    if (!selectedId) {
      return 'Todas las empresas';
    }

    return this.companies().find((company) => company.id === selectedId)?.name ?? 'Empresa seleccionada';
  }

  get eventMetrics() {
    const events = [
      { event: 'LOGIN', label: 'Ingresos', tone: 'login' },
      { event: 'LOGOUT', label: 'Salidas', tone: 'logout' },
      { event: 'REFRESH_TOKEN', label: 'Refresh token', tone: 'refresh' },
    ];
    const max = Math.max(...events.map((item) => this.countEvent(item.event)), 1);

    return events.map((item) => {
      const count = this.countEvent(item.event);
      return {
        ...item,
        count,
        percent: Math.max((count / max) * 100, count > 0 ? 12 : 0),
      };
    });
  }

  get userActivity() {
    const activity = new Map<string, { user: string; company: string; login: number; logout: number; refresh: number }>();

    for (const log of this.logs()) {
      const current = activity.get(log.username) ?? {
        user: log.username,
        company: log.companyName,
        login: 0,
        logout: 0,
        refresh: 0,
      };

      if (log.eventType === 'LOGIN') {
        current.login += 1;
      } else if (log.eventType === 'LOGOUT') {
        current.logout += 1;
      } else if (log.eventType === 'REFRESH_TOKEN') {
        current.refresh += 1;
      }

      activity.set(log.username, current);
    }

    return Array.from(activity.values()).map((item) => ({
      ...item,
      initials: item.user.slice(0, 2).toUpperCase(),
    }));
  }

  eventLabel(event: string): string {
    const labels: Record<string, string> = {
      LOGIN: 'Ingreso',
      LOGOUT: 'Salida',
      REFRESH_TOKEN: 'Refresh token',
    };

    return labels[event] ?? event;
  }

  eventClass(event: string): string {
    const classes: Record<string, string> = {
      LOGIN: 'login',
      LOGOUT: 'logout',
      REFRESH_TOKEN: 'refresh',
    };

    return classes[event] ?? 'info';
  }

  formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
  }

  formatIp(value: string): string {
    return value === '0:0:0:0:0:0:0:1' ? 'localhost' : value;
  }

  previousPage(): void {
    if (!this.pageInfo()?.first) {
      this.loadLogs(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (!this.pageInfo()?.last) {
      this.loadLogs(this.currentPage() + 1);
    }
  }

  private countEvent(event: string): number {
    return this.logs().filter((log) => log.eventType === event).length;
  }
}
