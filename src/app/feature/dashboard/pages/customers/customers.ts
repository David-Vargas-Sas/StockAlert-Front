import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../services/auth';
import { CreateCustomerRequest, CustomerItem, CustomersService, UpdateCustomerRequest } from '../../../../services/customers';
import { FeedbackModal, FeedbackType } from '../../shared/feedback-modal';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-customers-page',
  imports: [MatIconModule, PageTitle, ReactiveFormsModule, FeedbackModal],
  template: `
    <section class="page">
      <app-page-title title="Clientes" subtitle="Administra clientes, contacto y estado comercial." />

      <div class="toolbar">
        <label>
          <mat-icon>search</mat-icon>
          <input placeholder="Buscar cliente" [value]="search()" (input)="search.set(inputValue($event))" />
        </label>
        <select [value]="statusFilter()" (change)="statusFilter.set(inputValue($event))">
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Desactivado</option>
        </select>
        <button class="primary-btn" type="button" [disabled]="!canCreateCustomer()" (click)="openCreateCustomer()">
          <mat-icon>person_add</mat-icon>
          Crear cliente
        </button>
      </div>

      @if (!canCreateCustomer()) {
        <div class="inline-error">
          <mat-icon>lock</mat-icon>
          <span>Tu usuario puede ver clientes, pero no tiene permiso para crearlos.</span>
        </div>
      }

      @if (loadError()) {
        <div class="inline-error">
          <mat-icon>error</mat-icon>
          <span>{{ loadError() }}</span>
        </div>
      }

      <app-feedback-modal
        [title]="successMessage()"
        [type]="feedbackType()"
        message="El cliente quedo disponible para registrar ventas."
        (dismiss)="successMessage.set('')"
      />

      <div class="table-card">
        <table>
          <thead>
            <tr><th>Cliente</th><th>Documento</th><th>Correo</th><th>Telefono</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @if (loadingCustomers()) {
              <tr>
                <td colspan="6">
                  <div class="table-empty">
                    <span class="loading-dot"></span>
                    <strong>Cargando clientes</strong>
                    <span>Consultando clientes registrados para tu empresa.</span>
                  </div>
                </td>
              </tr>
            } @else {
              @for (customer of filteredCustomers(); track customer.id) {
                <tr>
                  <td><strong>{{ customer.fullName }}</strong><small class="muted-line">{{ customer.address || 'Sin direccion registrada' }}</small></td>
                  <td>{{ customer.documentNumber }}</td>
                  <td>{{ customer.email || '-' }}</td>
                  <td>{{ customer.phone || '-' }}</td>
                  <td><span class="badge" [class.activa]="customer.active !== false" [class.desactivado]="customer.active === false">{{ customer.active === false ? 'Desactivado' : 'Activo' }}</span></td>
                  <td class="actions">
                    <button type="button" aria-label="Ver cliente" (click)="selectCustomer(customer)"><mat-icon>visibility</mat-icon></button>
                    <button class="edit-action" type="button" aria-label="Editar cliente" (click)="openEditCustomer(customer)"><mat-icon>edit</mat-icon></button>
                    <button class="danger-action" type="button" aria-label="Eliminar cliente" (click)="openDeleteCustomer(customer)">
                      <mat-icon>delete</mat-icon>
                    </button>
                    <button
                      type="button"
                      [class.activate-action]="customer.active === false"
                      [class.deactivate-action]="customer.active !== false"
                      [attr.aria-label]="customer.active === false ? 'Activar cliente' : 'Desactivar cliente'"
                      [disabled]="statusUpdatingId() === customer.id"
                      (click)="toggleCustomerStatus(customer)"
                    >
                      <mat-icon>{{ customer.active === false ? 'toggle_off' : 'toggle_on' }}</mat-icon>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <div class="table-empty">
                      <mat-icon>groups</mat-icon>
                      <strong>Sin clientes para mostrar</strong>
                      <span>No hay clientes registrados o el filtro no encontro coincidencias.</span>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
        <div class="pagination">
          <span>Mostrando {{ filteredCustomers().length }} de {{ totalElements() }} clientes</span>
          <button type="button" [disabled]="firstPage()" (click)="previousPage()">Anterior</button>
          <button type="button" [disabled]="lastPage()" (click)="nextPage()">Siguiente</button>
        </div>
      </div>

      @if (customerModalOpen()) {
        <div class="modal-backdrop" (click)="closeCreateCustomer()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon create"><mat-icon>person_add</mat-icon></span>
                <div>
                  <h2>{{ editingCustomerId() ? 'Editar cliente' : 'Crear cliente' }}</h2>
                  <p>{{ editingCustomerId() ? 'Actualiza identificacion, contacto y estado.' : 'Registra identificacion y datos de contacto.' }}</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeCreateCustomer()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (createError()) {
                <div class="inline-error"><mat-icon>error</mat-icon><span>{{ createError() }}</span></div>
              }

              <form class="form-grid" [formGroup]="customerForm">
                <label>Nombre completo<input formControlName="fullName" placeholder="Ej. Maria Perez" /></label>
                <label>Documento<input formControlName="documentNumber" placeholder="Ej. 1020304050" /></label>
                <label>
                  Correo
                  <input type="email" formControlName="email" placeholder="cliente@correo.com" />
                  @if (customerForm.controls.email.touched && customerForm.controls.email.invalid) {
                    <small class="field-hint">Ingresa un correo valido.</small>
                  }
                </label>
                <label>Telefono<input formControlName="phone" placeholder="Ej. 3001234567" /></label>
                <label>Direccion<input formControlName="address" placeholder="Direccion principal" /></label>
                @if (editingCustomerId()) {
                  <label class="check">
                    <input type="checkbox" formControlName="active" />
                    Cliente activo
                  </label>
                }
              </form>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeCreateCustomer()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="creatingCustomer()" (click)="saveCustomer()">
                <mat-icon>save</mat-icon>
                {{ creatingCustomer() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }

      @if (detailModalOpen()) {
        <div class="modal-backdrop" (click)="closeCustomerDetail()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon"><mat-icon>badge</mat-icon></span>
                <div><h2>Detalle de cliente</h2><p>{{ selectedCustomer()?.fullName }}</p></div>
              </div>
              <button class="modal-close" type="button" (click)="closeCustomerDetail()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>
            <div class="modal-body">
              @if (detailLoading()) {
                <div class="audit-status-card">
                  <span class="loading-dot"></span>
                  <div><h3>Cargando cliente</h3><p>Consultando informacion actualizada.</p></div>
                </div>
              } @else if (detailError()) {
                <div class="inline-error"><mat-icon>error</mat-icon><span>{{ detailError() }}</span></div>
              } @else if (selectedCustomer()) {
                <div class="detail-grid">
                <div><span>Documento</span><strong>{{ selectedCustomer()?.documentNumber }}</strong></div>
                <div><span>Correo</span><strong>{{ selectedCustomer()?.email || '-' }}</strong></div>
                <div><span>Telefono</span><strong>{{ selectedCustomer()?.phone || '-' }}</strong></div>
                <div><span>Direccion</span><strong>{{ selectedCustomer()?.address || '-' }}</strong></div>
                <div><span>Estado</span><strong>{{ selectedCustomer()?.active === false ? 'Desactivado' : 'Activo' }}</strong></div>
              </div>
              }
            </div>
            <footer class="modal-footer"><button class="primary-btn" type="button" (click)="closeCustomerDetail()">Cerrar</button></footer>
          </section>
        </div>
      }

      @if (deleteCustomerTarget()) {
        <div class="modal-backdrop" (click)="closeDeleteCustomer()">
          <section class="modal sale-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon danger"><mat-icon>delete</mat-icon></span>
                <div>
                  <h2>Eliminar cliente</h2>
                  <p>Esta accion quitara el cliente del catalogo comercial.</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeDeleteCustomer()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (deleteError()) {
                <div class="inline-error"><mat-icon>error</mat-icon><span>{{ deleteError() }}</span></div>
              }
              <div class="audit-status-card error">
                <mat-icon>warning</mat-icon>
                <div>
                  <h3>{{ deleteCustomerTarget()?.fullName }}</h3>
                  <p>Confirma que deseas eliminar este cliente.</p>
                </div>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeDeleteCustomer()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="deletingCustomer()" (click)="confirmDeleteCustomer()">
                <mat-icon>delete</mat-icon>
                {{ deletingCustomer() ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
})
export class CustomersPage implements OnInit {
  private readonly customersService = inject(CustomersService);
  private readonly auth = inject(AuthService);

  readonly customers = signal<CustomerItem[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal('all');
  readonly customerModalOpen = signal(false);
  readonly editingCustomerId = signal<number | null>(null);
  readonly creatingCustomer = signal(false);
  readonly loadingCustomers = signal(false);
  readonly statusUpdatingId = signal<number | null>(null);
  readonly deleteCustomerTarget = signal<CustomerItem | null>(null);
  readonly deletingCustomer = signal(false);
  readonly loadError = signal('');
  readonly createError = signal('');
  readonly deleteError = signal('');
  readonly detailError = signal('');
  readonly successMessage = signal('');
  readonly feedbackType = signal<FeedbackType>('success');
  readonly selectedCustomer = signal<CustomerItem | null>(null);
  readonly detailModalOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly totalElements = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);
  readonly canCreateCustomer = computed(() => this.auth.hasPermission('CUSTOMER_CREATE'));

  readonly customerForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    documentNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    active: new FormControl(true, { nonNullable: true }),
  });

  readonly filteredCustomers = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.customers().filter((customer) => {
      const matchesTerm = [customer.fullName, customer.documentNumber, customer.email, customer.phone, customer.address]
        .some((value) => (value || '').toLowerCase().includes(term));
      const isActive = customer.active !== false;
      const matchesStatus = status === 'all' || (status === 'active' && isActive) || (status === 'inactive' && !isActive);

      return matchesTerm && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  openCreateCustomer(): void {
    if (!this.canCreateCustomer()) {
      this.createError.set('Tu usuario no tiene permiso CUSTOMER_CREATE.');
      return;
    }

    this.customerForm.reset();
    this.customerForm.controls.active.setValue(true);
    this.editingCustomerId.set(null);
    this.createError.set('');
    this.successMessage.set('');
    this.customerModalOpen.set(true);
  }

  openEditCustomer(customer: CustomerItem): void {
    this.createError.set('');
    this.successMessage.set('');
    this.editingCustomerId.set(customer.id);
    this.customerForm.setValue({
      fullName: customer.fullName ?? '',
      documentNumber: customer.documentNumber ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      active: customer.active !== false,
    });
    this.customerModalOpen.set(true);
  }

  closeCreateCustomer(): void {
    if (!this.creatingCustomer()) {
      this.customerModalOpen.set(false);
      this.editingCustomerId.set(null);
      this.createError.set('');
    }
  }

  saveCustomer(): void {
    this.createError.set('');
    this.successMessage.set('');

    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.createError.set(this.customerForm.controls.email.invalid ? 'Revisa el correo del cliente.' : 'Completa los datos obligatorios del cliente.');
      return;
    }

    this.creatingCustomer.set(true);
    const customerId = this.editingCustomerId();
    const formValue = this.customerForm.getRawValue();
    const request = this.cleanRequest(formValue);
    const saveRequest = customerId
      ? this.customersService.update(customerId, { ...request, active: formValue.active } satisfies UpdateCustomerRequest)
      : this.customersService.create(request);

    saveRequest
      .pipe(finalize(() => this.creatingCustomer.set(false)))
      .subscribe({
        next: (customer) => {
          this.customers.update((items) => customerId ? items.map((item) => (item.id === customer.id ? customer : item)) : [customer, ...items]);
          if (!customerId) {
            this.totalElements.update((total) => total + 1);
          }
          this.customerModalOpen.set(false);
          this.editingCustomerId.set(null);
          this.feedbackType.set(customerId ? 'edit' : 'create');
          this.successMessage.set(customerId ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
        },
        error: (error: Error) => this.createError.set(error.message || 'No fue posible guardar el cliente.'),
      });
  }

  loadCustomers(page = this.page()): void {
    this.loadingCustomers.set(true);
    this.loadError.set('');

    this.customersService
      .getPaginated({ page, size: this.size(), sortBy: 'id', sortDirection: 'asc' })
      .pipe(finalize(() => this.loadingCustomers.set(false)))
      .subscribe({
        next: (response) => {
          this.customers.set(response.content ?? []);
          this.page.set(response.page ?? page);
          this.size.set(response.size ?? this.size());
          this.totalElements.set(response.totalElements ?? 0);
          this.firstPage.set(response.first ?? true);
          this.lastPage.set(response.last ?? true);
        },
        error: (error: Error) => this.loadError.set(error.message || 'No fue posible cargar los clientes.'),
      });
  }

  previousPage(): void {
    if (!this.firstPage()) {
      this.loadCustomers(this.page() - 1);
    }
  }

  nextPage(): void {
    if (!this.lastPage()) {
      this.loadCustomers(this.page() + 1);
    }
  }

  selectCustomer(customer: CustomerItem): void {
    this.detailModalOpen.set(true);
    this.detailLoading.set(true);
    this.detailError.set('');
    this.selectedCustomer.set(customer);

    this.customersService
      .getById(customer.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (customerDetail) => this.selectedCustomer.set(customerDetail),
        error: (error: Error) => this.detailError.set(error.message || 'No fue posible cargar el cliente.'),
      });
  }

  closeCustomerDetail(): void {
    if (!this.detailLoading()) {
      this.detailModalOpen.set(false);
      this.selectedCustomer.set(null);
      this.detailError.set('');
    }
  }

  toggleCustomerStatus(customer: CustomerItem): void {
    this.loadError.set('');
    this.successMessage.set('');
    this.statusUpdatingId.set(customer.id);

    const request = customer.active === false
      ? this.customersService.activate(customer.id)
      : this.customersService.deactivate(customer.id);

    request
      .pipe(finalize(() => this.statusUpdatingId.set(null)))
      .subscribe({
        next: (updatedCustomer) => {
          this.customers.update((items) => items.map((item) => (item.id === updatedCustomer.id ? updatedCustomer : item)));

          if (this.selectedCustomer()?.id === updatedCustomer.id) {
            this.selectedCustomer.set(updatedCustomer);
          }

          this.feedbackType.set(updatedCustomer.active === false ? 'deactivate' : 'activate');
          this.successMessage.set(updatedCustomer.active === false ? 'Cliente desactivado correctamente' : 'Cliente activado correctamente');
        },
        error: (error: Error) => this.loadError.set(error.message || 'No fue posible actualizar el estado del cliente.'),
      });
  }

  openDeleteCustomer(customer: CustomerItem): void {
    this.deleteError.set('');
    this.successMessage.set('');
    this.deleteCustomerTarget.set(customer);
  }

  closeDeleteCustomer(): void {
    if (!this.deletingCustomer()) {
      this.deleteCustomerTarget.set(null);
      this.deleteError.set('');
    }
  }

  confirmDeleteCustomer(): void {
    const customer = this.deleteCustomerTarget();

    if (!customer) {
      return;
    }

    this.deleteError.set('');
    this.deletingCustomer.set(true);

    this.customersService
      .delete(customer.id)
      .pipe(finalize(() => this.deletingCustomer.set(false)))
      .subscribe({
        next: (message) => {
          this.customers.update((items) => items.filter((item) => item.id !== customer.id));
          this.totalElements.update((total) => Math.max(total - 1, 0));

          if (this.selectedCustomer()?.id === customer.id) {
            this.selectedCustomer.set(null);
          }

          this.deleteCustomerTarget.set(null);
          this.feedbackType.set('delete');
          this.successMessage.set(message || 'Cliente eliminado correctamente');
        },
        error: (error: Error) => this.deleteError.set(error.message || 'No fue posible eliminar el cliente.'),
      });
  }

  private cleanRequest(request: CreateCustomerRequest): CreateCustomerRequest {
    return {
      fullName: request.fullName.trim(),
      documentNumber: request.documentNumber.trim(),
      email: request.email.trim(),
      phone: request.phone.trim(),
      address: request.address.trim(),
    };
  }
}
