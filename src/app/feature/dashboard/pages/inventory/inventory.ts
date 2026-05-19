import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-inventory-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Inventario" subtitle="Consulta stock, movimientos y ajustes manuales autorizados." />

      <div class="toolbar">
        <label><mat-icon>search</mat-icon><input placeholder="Buscar producto o movimiento" /></label>
        <select>
          <option>Todos los movimientos</option>
          <option>Entrada</option>
          <option>Salida</option>
          <option>Ajuste</option>
        </select>
        <button class="primary-btn" type="button"><mat-icon>tune</mat-icon>Ajustar inventario</button>
      </div>

      <div class="kpi-grid">
        <article class="kpi-card"><div><span>Productos monitoreados</span><strong>0</strong><small>Permiso INVENTORY_READ</small></div><mat-icon>warehouse</mat-icon></article>
        <article class="kpi-card cyan"><div><span>Ajustes recientes</span><strong>0</strong><small>Permiso INVENTORY_ADJUST</small></div><mat-icon>tune</mat-icon></article>
        <article class="kpi-card red"><div><span>Sin stock</span><strong>0</strong><small>Conecta endpoint de inventario</small></div><mat-icon>production_quantity_limits</mat-icon></article>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock final</th><th>Fecha</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Cafe premium 500g</strong><small class="muted-line">Movimiento de referencia</small></td>
              <td><span class="badge activa">Entrada</span></td>
              <td>0</td>
              <td>0</td>
              <td>-</td>
              <td class="actions"><button type="button" aria-label="Ver movimiento"><mat-icon>visibility</mat-icon></button></td>
            </tr>
          </tbody>
        </table>
        <div class="pagination"><span>Modulo listo para conectar a /api/inventory</span></div>
      </div>
    </section>
  `,
})
export class InventoryPage {}
