import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-purchases-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Compras" subtitle="Registra compras, entradas de inventario y anulaciones." />

      <div class="toolbar">
        <label><mat-icon>calendar_today</mat-icon><input type="date" /></label>
        <label><mat-icon>search</mat-icon><input placeholder="Buscar compra" /></label>
        <button class="primary-btn" type="button"><mat-icon>add_shopping_cart</mat-icon>Registrar compra</button>
      </div>

      <div class="kpi-grid">
        <article class="kpi-card"><div><span>Compras del mes</span><strong>$0</strong><small>Sin datos conectados</small></div><mat-icon>shopping_cart_checkout</mat-icon></article>
        <article class="kpi-card green"><div><span>Ordenes activas</span><strong>0</strong><small>Pendientes de backend</small></div><mat-icon>receipt_long</mat-icon></article>
        <article class="kpi-card amber"><div><span>Anulaciones</span><strong>0</strong><small>Permiso PURCHASE_CANCEL</small></div><mat-icon>cancel</mat-icon></article>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr><th>Codigo</th><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>C-0001</strong></td>
              <td>Distribuciones Andina</td>
              <td>-</td>
              <td>$0</td>
              <td><span class="badge activa">Activa</span></td>
              <td class="actions">
                <button type="button" aria-label="Ver compra"><mat-icon>visibility</mat-icon></button>
                <button type="button" aria-label="Anular compra"><mat-icon>cancel</mat-icon></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination"><span>Modulo listo para conectar a /api/purchases</span></div>
      </div>
    </section>
  `,
})
export class PurchasesPage {}
