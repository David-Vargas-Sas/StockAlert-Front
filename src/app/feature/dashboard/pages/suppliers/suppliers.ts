import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-suppliers-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Proveedores" subtitle="Gestiona aliados de abastecimiento y datos de contacto." />

      <div class="toolbar">
        <label><mat-icon>search</mat-icon><input placeholder="Buscar proveedor" /></label>
        <select>
          <option>Todos los estados</option>
          <option>Activo</option>
          <option>Desactivado</option>
        </select>
        <button class="primary-btn" type="button"><mat-icon>local_shipping</mat-icon>Crear proveedor</button>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr><th>Proveedor</th><th>NIT</th><th>Contacto</th><th>Telefono</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Distribuciones Andina</strong><small class="muted-line">Abarrotes y productos base</small></td>
              <td>900123456-7</td>
              <td>compras@andina.local</td>
              <td>3012345678</td>
              <td><span class="badge activa">Activo</span></td>
              <td class="actions">
                <button type="button" aria-label="Ver proveedor"><mat-icon>visibility</mat-icon></button>
                <button class="edit-action" type="button" aria-label="Editar proveedor"><mat-icon>edit</mat-icon></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination"><span>Modulo listo para conectar a /api/suppliers</span></div>
      </div>
    </section>
  `,
})
export class SuppliersPage {}
