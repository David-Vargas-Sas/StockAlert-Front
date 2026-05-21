import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { DashboardService, DashboardSummary, InventorySummary, LatestSale, SalesPeriod, SalesPeriodPoint, TopProduct } from '../../../../services/dashboard';
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
        @for (kpi of dashboardKpis; track kpi.label) {
          <article class="kpi-card" [class]="kpi.tone"><div><span>{{ kpi.label }}</span><strong>{{ kpi.value }}</strong><small>{{ kpi.trend }}</small></div><mat-icon>{{ kpi.icon }}</mat-icon></article>
        }
      </div>
      <div class="dashboard-grid">
        <section class="panel sales-chart">
          <div class="panel-header">
            <div><h3>Ventas por periodo</h3><p>{{ salesPeriodLabel() }}</p></div>
            <div class="segmented">
              <button type="button" [class.active]="salesPeriod() === 'DAY'" (click)="changeSalesPeriod('DAY')">Dia</button>
              <button type="button" [class.active]="salesPeriod() === 'WEEK'" (click)="changeSalesPeriod('WEEK')">Semana</button>
              <button type="button" [class.active]="salesPeriod() === 'MONTH'" (click)="changeSalesPeriod('MONTH')">Mes</button>
            </div>
          </div>
          @if (loadingSalesPeriod()) {
            <div class="mini-list"><div><span>Cargando ventas</span><strong>...</strong></div></div>
          } @else if (salesPeriodError()) {
            <div class="mini-list"><div><span>{{ salesPeriodError() }}</span><button class="text-btn" type="button" (click)="loadSalesPeriod()">Reintentar</button></div></div>
          } @else {
            <div class="chart-bars">
              @for (point of salesPeriodData(); track point.label) {
                <span [style.height.%]="barHeight(point.total)" [title]="point.label + ': ' + formatCurrency(point.total)"></span>
              } @empty {
                <span [style.height.%]="8"></span>
              }
            </div>
            <div class="mini-list period-list">
              @for (point of salesPeriodData(); track point.label) {
                <div><span>{{ point.label }} - {{ point.count }} ventas</span><strong>{{ formatCurrency(point.total) }}</strong></div>
              } @empty {
                <div><span>Sin ventas para este periodo</span><strong>$0</strong></div>
              }
            </div>
          }
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Resumen de inventario</h3><mat-icon>warehouse</mat-icon></div>
          @if (inventorySummaryError()) {
            <div class="mini-list"><div><span>{{ inventorySummaryError() }}</span><button class="text-btn" type="button" (click)="loadInventorySummary()">Reintentar</button></div></div>
          } @else {
            <div class="inventory-list">
              <span><strong>{{ inventorySummary()?.activeProducts ?? 0 }}</strong> productos activos</span>
              <span><strong>{{ inventorySummary()?.lowStockProducts ?? 0 }}</strong> bajo stock</span>
              <span><strong>{{ inventorySummary()?.outOfStockProducts ?? 0 }}</strong> sin stock</span>
              <span><strong>{{ formatCurrency(inventorySummary()?.stockValue ?? 0) }}</strong> valor estimado</span>
            </div>
          }
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Ultimas ventas</h3><a class="text-btn" routerLink="/app/ventas">Ver todas</a></div>
          @if (loadingLatestSales()) {
            <div class="mini-list"><div><span>Cargando ventas</span><strong>...</strong></div></div>
          } @else if (latestSalesError()) {
            <div class="mini-list"><div><span>{{ latestSalesError() }}</span><button class="text-btn" type="button" (click)="loadLatestSales()">Reintentar</button></div></div>
          } @else {
            <div class="mini-list">
              @for (sale of latestSales(); track sale.id) {
                <div><span>{{ sale.saleNumber || ('V-' + sale.id) }} - {{ sale.customerName || 'Cliente sin nombre' }} - {{ sale.statusLabel || sale.status }}</span><strong>{{ formatCurrency(sale.total) }}</strong></div>
              } @empty {
                <div><span>Sin ventas recientes</span><strong>$0</strong></div>
              }
            </div>
          }
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Productos mas vendidos</h3><mat-icon>leaderboard</mat-icon></div>
          @if (loadingTopProducts()) {
            <div class="mini-list"><div><span>Cargando ranking</span><strong>...</strong></div></div>
          } @else if (topProductsError()) {
            <div class="mini-list"><div><span>{{ topProductsError() }}</span><button class="text-btn" type="button" (click)="loadTopProducts()">Reintentar</button></div></div>
          } @else {
            <div class="ranking">
              @for (product of topProducts(); track product.productId) {
                <span>
                  {{ product.productName || ('Producto #' + product.productId) }}
                  <strong>{{ product.quantitySold }}</strong>
                  <small>{{ formatCurrency(product.totalSold) }}</small>
                </span>
              } @empty {
                <span><strong>0</strong>Sin ventas registradas</span>
              }
            </div>
          }
        </section>
      </div>
    </section>
  `,
})
export class DashboardHomePage implements OnInit {
  readonly data = inject(DashboardData);
  private readonly dashboardService = inject(DashboardService);

  readonly topProducts = signal<TopProduct[]>([]);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly inventorySummary = signal<InventorySummary | null>(null);
  readonly loadingSummary = signal(false);
  readonly summaryError = signal('');
  readonly inventorySummaryError = signal('');
  readonly salesPeriod = signal<SalesPeriod>('WEEK');
  readonly salesPeriodData = signal<SalesPeriodPoint[]>([]);
  readonly loadingSalesPeriod = signal(false);
  readonly salesPeriodError = signal('');
  readonly latestSales = signal<LatestSale[]>([]);
  readonly loadingLatestSales = signal(false);
  readonly latestSalesError = signal('');
  readonly loadingTopProducts = signal(false);
  readonly topProductsError = signal('');

  ngOnInit(): void {
    this.loadDashboard();
  }

  get dashboardKpis(): { label: string; value: string; trend: string; icon: string; tone: string }[] {
    const summary = this.summary();

    if (!summary) {
      return this.data.kpis;
    }

    return [
      { label: 'Productos activos', value: String(summary.activeProducts), trend: `${summary.lowStockProducts} bajo stock`, icon: 'inventory', tone: 'blue' },
      { label: 'Ventas del dia', value: this.formatCurrency(summary.todaySalesTotal), trend: `${summary.todaySalesCount} facturas`, icon: 'payments', tone: 'green' },
      { label: 'Ventas del mes', value: this.formatCurrency(summary.monthSalesTotal), trend: `${summary.monthSalesVariationPercentage}% vs periodo anterior`, icon: 'trending_up', tone: 'cyan' },
      { label: 'Bajo stock', value: String(summary.lowStockProducts), trend: `${summary.outOfStockProducts} sin stock`, icon: 'warning', tone: 'amber' },
      { label: 'Alertas activas', value: String(summary.activeAlerts), trend: `${summary.todayNewAlerts} nuevas hoy`, icon: 'priority_high', tone: 'red' },
    ];
  }

  loadDashboard(): void {
    this.loadingSummary.set(true);
    this.loadingTopProducts.set(true);
    this.loadingLatestSales.set(true);
    this.summaryError.set('');
    this.inventorySummaryError.set('');
    this.topProductsError.set('');
    this.latestSalesError.set('');

    forkJoin({
      summary: this.dashboardService.getSummary(),
      inventorySummary: this.dashboardService.getInventorySummary(),
      topProducts: this.dashboardService.getTopProducts(5),
      salesPeriod: this.dashboardService.getSalesPeriod(this.salesPeriod()),
      latestSales: this.dashboardService.getLatestSales(5),
    })
      .pipe(
        finalize(() => {
          this.loadingSummary.set(false);
          this.loadingTopProducts.set(false);
          this.loadingLatestSales.set(false);
        }),
      )
      .subscribe({
        next: ({ summary, inventorySummary, topProducts, salesPeriod, latestSales }) => {
          this.summary.set(summary);
          this.inventorySummary.set(inventorySummary);
          this.topProducts.set(topProducts);
          this.salesPeriodData.set(salesPeriod);
          this.latestSales.set(latestSales);
        },
        error: (error: Error) => {
          this.summary.set(null);
          this.inventorySummary.set(null);
          this.topProducts.set([]);
          this.salesPeriodData.set([]);
          this.latestSales.set([]);
          this.summaryError.set(error.message || 'No fue posible cargar el resumen del dashboard.');
          this.inventorySummaryError.set(error.message || 'No fue posible cargar el resumen de inventario.');
          this.topProductsError.set(error.message || 'No fue posible cargar los productos mas vendidos.');
          this.salesPeriodError.set(error.message || 'No fue posible cargar las ventas por periodo.');
          this.latestSalesError.set(error.message || 'No fue posible cargar las ultimas ventas.');
        },
      });
  }

  loadInventorySummary(): void {
    this.inventorySummaryError.set('');

    this.dashboardService.getInventorySummary().subscribe({
      next: (summary) => this.inventorySummary.set(summary),
      error: (error: Error) => {
        this.inventorySummary.set(null);
        this.inventorySummaryError.set(error.message || 'No fue posible cargar el resumen de inventario.');
      },
    });
  }

  loadLatestSales(): void {
    this.loadingLatestSales.set(true);
    this.latestSalesError.set('');

    this.dashboardService
      .getLatestSales(5)
      .pipe(finalize(() => this.loadingLatestSales.set(false)))
      .subscribe({
        next: (sales) => this.latestSales.set(sales),
        error: (error: Error) => {
          this.latestSales.set([]);
          this.latestSalesError.set(error.message || 'No fue posible cargar las ultimas ventas.');
        },
      });
  }

  changeSalesPeriod(period: SalesPeriod): void {
    if (this.salesPeriod() === period) {
      return;
    }

    this.salesPeriod.set(period);
    this.loadSalesPeriod();
  }

  loadSalesPeriod(): void {
    this.loadingSalesPeriod.set(true);
    this.salesPeriodError.set('');

    this.dashboardService
      .getSalesPeriod(this.salesPeriod())
      .pipe(finalize(() => this.loadingSalesPeriod.set(false)))
      .subscribe({
        next: (points) => this.salesPeriodData.set(points),
        error: (error: Error) => {
          this.salesPeriodData.set([]);
          this.salesPeriodError.set(error.message || 'No fue posible cargar las ventas por periodo.');
        },
      });
  }

  salesPeriodLabel(): string {
    const labels: Record<SalesPeriod, string> = {
      DAY: 'Dia',
      WEEK: 'Semana',
      MONTH: 'Mes',
    };

    return labels[this.salesPeriod()];
  }

  barHeight(total: number): number {
    const max = Math.max(...this.salesPeriodData().map((point) => point.total), 0);

    if (!max) {
      return 8;
    }

    return Math.max((total / max) * 100, 8);
  }

  loadTopProducts(): void {
    this.loadingTopProducts.set(true);
    this.topProductsError.set('');

    this.dashboardService
      .getTopProducts(5)
      .pipe(finalize(() => this.loadingTopProducts.set(false)))
      .subscribe({
        next: (products) => this.topProducts.set(products),
        error: (error: Error) => {
          this.topProducts.set([]);
          this.topProductsError.set(error.message || 'No fue posible cargar los productos mas vendidos.');
        },
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  }
}
