import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DashboardData } from '../../services/dashboard-data';

@Component({
  selector: 'app-dashboard-home-page',
  imports: [MatIconModule, RouterLink],
  template: `
    <section class="page">
      <div class="page-header">
        <div><span class="eyebrow">Operacion diaria</span><h2>Dashboard principal</h2><p>Resumen de ventas, inventario y alertas inteligentes.</p></div>
        <a class="primary-btn" routerLink="/app/ventas"><mat-icon>add_shopping_cart</mat-icon>Registrar venta</a>
      </div>
      <div class="kpi-grid">
        @for (kpi of data.kpis; track kpi.label) {
          <article class="kpi-card" [class]="kpi.tone"><div><span>{{ kpi.label }}</span><strong>{{ kpi.value }}</strong><small>{{ kpi.trend }}</small></div><mat-icon>{{ kpi.icon }}</mat-icon></article>
        }
      </div>
      <div class="dashboard-grid">
        <section class="panel sales-chart"><div class="panel-header"><div><h3>Ventas por periodo</h3><p>Dia, semana y mes</p></div><div class="segmented"><button>Dia</button><button class="active">Semana</button><button>Mes</button></div></div><div class="chart-bars">@for (bar of [42, 64, 38, 78, 58, 90, 73]; track $index) {<span [style.height.%]="bar"></span>}</div></section>
        <section class="panel"><div class="panel-header"><h3>Resumen de inventario</h3><mat-icon>warehouse</mat-icon></div><div class="inventory-list"><span><strong>1.248</strong> productos activos</span><span><strong>36</strong> bajo stock</span><span><strong>7</strong> sin stock</span><span><strong>$128.6M</strong> valor estimado</span></div></section>
        <section class="panel"><div class="panel-header"><h3>Ultimas ventas</h3><a class="text-btn" routerLink="/app/ventas">Ver todas</a></div><div class="mini-list">@for (sale of data.sales; track sale.code) {<div><span>{{ sale.code }} - {{ sale.seller }}</span><strong>{{ sale.total }}</strong></div>}</div></section>
        <section class="panel"><div class="panel-header"><h3>Productos mas vendidos</h3><mat-icon>leaderboard</mat-icon></div><div class="ranking"><span>Arroz integral 1kg <strong>186</strong></span><span>Cafe premium 500g <strong>142</strong></span><span>Jabon liquido 1L <strong>117</strong></span></div></section>
      </div>
    </section>
  `,
})
export class DashboardHomePage {
  readonly data = inject(DashboardData);
}
