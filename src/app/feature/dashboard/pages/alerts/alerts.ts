import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardData } from '../../services/dashboard-data';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-alerts-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page"><app-page-title title="Alertas" subtitle="Prioriza reposiciones y resuelve alertas de inventario." /><div class="tabs"><button class="active">Activas</button><button>Resueltas</button></div><div class="alert-grid">@for (alert of data.alerts; track alert.product) {<article class="alert-card" [class]="data.stateClass(alert.level)"><span class="badge">{{ alert.level }}</span><h3>{{ alert.product }}</h3><p>{{ alert.message }}</p><div>Stock {{ alert.stock }} / minimo {{ alert.min }}</div><footer><small>{{ alert.date }}</small><button class="secondary-btn">Resolver</button></footer></article>}</div></section>
  `,
})
export class AlertsPage {
  readonly data = inject(DashboardData);
}
