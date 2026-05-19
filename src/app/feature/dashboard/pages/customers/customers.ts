import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-customers-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Clientes" subtitle="Administra clientes, contacto y estado comercial." />

      <div class="toolbar">
        <label><mat-icon>search</mat-icon><input placeholder="Buscar cliente" /></label>
        <select>
          <option>Todos los estados</option>
          <option>Activo</option>
          <option>Desactivado</option>
        </select>
        <button class="primary-btn" type="button"><mat-icon>person_add</mat-icon>Crear cliente</button>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr><th>Cliente</th><th>Documento</th><th>Correo</th><th>Telefono</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Consumidor final</strong><small class="muted-line">Cliente general de ventas rapidas</small></td>
              <td>222222222</td>
              <td>cliente@stockalert.local</td>
              <td>3000000000</td>
              <td><span class="badge activa">Activo</span></td>
              <td class="actions">
                <button type="button" aria-label="Ver cliente"><mat-icon>visibility</mat-icon></button>
                <button class="edit-action" type="button" aria-label="Editar cliente"><mat-icon>edit</mat-icon></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination"><span>Modulo listo para conectar a /api/customers</span></div>
      </div>
    </section>
  `,
})
export class CustomersPage {}
