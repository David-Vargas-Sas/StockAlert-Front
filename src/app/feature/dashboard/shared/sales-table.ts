import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Sale } from '../services/dashboard-data';

@Component({
  selector: 'app-sales-table',
  imports: [MatIconModule],
  template: `
    <div class="table-card">
      <table>
        <thead>
          <tr><th>Codigo</th><th>Fecha</th><th>Vendedor</th><th>Productos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          @for (sale of sales; track sale.code) {
            <tr>
              <td><strong>{{ sale.code }}</strong></td><td>{{ sale.date }}</td><td>{{ sale.seller }}</td><td>{{ sale.products }}</td><td>{{ sale.total }}</td>
              <td><span class="badge" [class]="sale.state === 'Anulada' ? 'anulada' : 'activa'">{{ sale.state }}</span></td>
              <td class="actions"><button><mat-icon>visibility</mat-icon></button></td>
            </tr>
          }
        </tbody>
      </table>
      <div class="pagination">Mostrando 1-3 de 72 <button>Anterior</button><button>Siguiente</button></div>
    </div>
  `,
})
export class SalesTable {
  @Input() sales: Sale[] = [];
}
