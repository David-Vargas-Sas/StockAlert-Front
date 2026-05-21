import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../services/auth';
import { CreateCustomerRequest, CustomerInvoice, CustomerInvoicesPageResponse, CustomerItem, CustomersService, UpdateCustomerRequest } from '../../../../services/customers';
import { SalesService } from '../../../../services/sales';
import { DashboardSelect, DashboardSelectOption } from '../../shared/dashboard-select';
import { FeedbackModal, FeedbackType } from '../../shared/feedback-modal';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-customers-page',
  imports: [MatIconModule, PageTitle, ReactiveFormsModule, FeedbackModal, DashboardSelect],
  template: `
    <section class="page">
      <app-page-title title="Clientes" subtitle="Administra clientes, contacto y estado comercial." />

      <div class="toolbar">
        <label>
          <mat-icon>search</mat-icon>
          <input placeholder="Buscar cliente" [value]="search()" (input)="search.set(inputValue($event))" />
        </label>
        <app-dashboard-select [options]="statusOptions" [value]="statusFilter()" (valueChange)="statusFilter.set($event)" />
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
                <div class="customer-detail-grid">
                  <div><mat-icon>badge</mat-icon><span>Documento</span><strong>{{ selectedCustomer()?.documentNumber }}</strong></div>
                  <div><mat-icon>mail</mat-icon><span>Correo</span><strong>{{ selectedCustomer()?.email || '-' }}</strong></div>
                  <div><mat-icon>call</mat-icon><span>Telefono</span><strong>{{ selectedCustomer()?.phone || '-' }}</strong></div>
                  <div><mat-icon>location_on</mat-icon><span>Direccion</span><strong>{{ selectedCustomer()?.address || '-' }}</strong></div>
                  <div><mat-icon>verified_user</mat-icon><span>Estado</span><strong>{{ selectedCustomer()?.active === false ? 'Desactivado' : 'Activo' }}</strong></div>
                </div>

                <section class="customer-invoices">
                  <div class="panel-header">
                    <div><h3>Historial de facturas</h3><p>{{ customerInvoicesPageInfo()?.totalElements ?? 0 }} ventas registradas</p></div>
                    <mat-icon>receipt_long</mat-icon>
                  </div>

                  @if (customerInvoicesLoading()) {
                    <div class="table-empty"><span class="loading-dot"></span><strong>Cargando facturas</strong><span>Consultando ventas del cliente.</span></div>
                  } @else if (customerInvoicesError()) {
                    <div class="inline-error"><mat-icon>error</mat-icon><span>{{ customerInvoicesError() }}</span></div>
                  } @else {
                    <div class="customer-invoice-list">
                      @for (invoice of customerInvoices(); track invoice.id) {
                        <article class="customer-invoice-card">
                          <div>
                            <strong>{{ invoice.saleNumber || ('V-' + invoice.id) }}</strong>
                            <span>{{ formatDateTime(invoice.saleDate) }} - {{ invoice.sellerName || invoice.createdBy || '-' }}</span>
                          </div>
                          <span class="badge" [class]="invoiceStatusClass(invoice)">{{ invoice.statusLabel || invoice.status }}</span>
                          <strong>{{ formatCurrency(invoice.total) }}</strong>
                          <button type="button" aria-label="Reenviar factura" [disabled]="sendingInvoiceId() === invoice.id || isInvoiceCancelled(invoice)" (click)="sendInvoice(invoice)">
                            <mat-icon>outgoing_mail</mat-icon>
                          </button>
                        </article>
                      } @empty {
                        <div class="table-empty customer-invoices-empty"><mat-icon>receipt_long</mat-icon><strong>Sin facturas registradas</strong><span>Este cliente aun no tiene ventas asociadas.</span></div>
                      }
                    </div>

                    @if (customerInvoicesPageInfo()) {
                      <div class="pagination customer-invoices-pagination">
                        <span>Mostrando {{ customerInvoices().length }} de {{ customerInvoicesPageInfo()?.totalElements }} facturas</span>
                        <button type="button" [disabled]="customerInvoicesPageInfo()?.first" (click)="previousCustomerInvoicesPage()">Anterior</button>
                        <button type="button" [disabled]="customerInvoicesPageInfo()?.last" (click)="nextCustomerInvoicesPage()">Siguiente</button>
                      </div>
                    }
                  }
                </section>
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
  styles: [`
    .customer-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .customer-detail-grid div {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      grid-template-rows: auto auto;
      column-gap: 10px;
      row-gap: 2px;
      align-items: center;
      min-width: 0;
      padding: 12px;
      border: 1px solid #dce5f0;
      border-radius: 14px;
      background: #ffffff;
    }

    .customer-detail-grid mat-icon {
      grid-row: 1 / 3;
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 19px;
    }

    .customer-detail-grid span {
      color: #667085;
      font-size: 12px;
      font-weight: 800;
    }

    .customer-detail-grid strong {
      min-width: 0;
      overflow: hidden;
      color: #111827;
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .customer-invoices {
      display: grid;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #dce5f0;
    }

    .customer-invoice-list {
      display: grid;
      gap: 10px;
    }

    .customer-invoice-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto 38px;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border: 1px solid #dce5f0;
      border-radius: 14px;
      background: #ffffff;
    }

    .customer-invoice-card div {
      min-width: 0;
    }

    .customer-invoice-card div span {
      display: block;
      margin-top: 3px;
      overflow: hidden;
      color: #667085;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .customer-invoice-card > strong {
      white-space: nowrap;
    }

    .customer-invoice-card button {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid #dce5f0;
      border-radius: 11px;
      background: #ffffff;
      color: #0f172a;
      cursor: pointer;
    }

    .customer-invoice-card button:hover:not(:disabled) {
      border-color: #99f6e4;
      background: #f0fdfa;
      color: #0f766e;
    }

    .customer-invoice-card button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .customer-invoices-pagination {
      border: 1px solid #dce5f0;
      border-radius: 14px;
    }

    .customer-invoices-empty {
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      background: #ffffff;
    }

    @media (max-width: 680px) {
      .customer-detail-grid {
        grid-template-columns: 1fr;
      }

      .customer-invoice-card {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class CustomersPage implements OnInit {
  private readonly customersService = inject(CustomersService);
  private readonly salesService = inject(SalesService);
  private readonly auth = inject(AuthService);

  readonly customers = signal<CustomerItem[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal('all');
  readonly statusOptions: DashboardSelectOption[] = [
    { label: 'Todos los estados', value: 'all' },
    { label: 'Activo', value: 'active' },
    { label: 'Desactivado', value: 'inactive' },
  ];
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
  readonly customerInvoices = signal<CustomerInvoice[]>([]);
  readonly customerInvoicesLoading = signal(false);
  readonly customerInvoicesError = signal('');
  readonly customerInvoicesPageInfo = signal<Omit<CustomerInvoicesPageResponse, 'content'> | null>(null);
  readonly customerInvoicesPage = signal(0);
  readonly sendingInvoiceId = signal<number | null>(null);
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

    if (!request.fullName || !request.documentNumber || !request.email || !request.phone || !request.address) {
      this.createError.set('Completa los datos obligatorios del cliente.');
      return;
    }

    if (!isValidEmail(request.email)) {
      this.createError.set('Revisa el correo del cliente.');
      return;
    }

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
    this.customerInvoices.set([]);
    this.customerInvoicesPageInfo.set(null);
    this.customerInvoicesPage.set(0);
    this.customerInvoicesError.set('');
    this.loadCustomerInvoices(customer.id, 0);

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
      this.customerInvoices.set([]);
      this.customerInvoicesPageInfo.set(null);
      this.customerInvoicesError.set('');
    }
  }

  loadCustomerInvoices(customerId = this.selectedCustomer()?.id ?? 0, page = this.customerInvoicesPage()): void {
    if (!customerId) {
      return;
    }

    this.customerInvoicesLoading.set(true);
    this.customerInvoicesError.set('');

    this.customersService
      .getInvoicesPaginated(customerId, { page, size: 5, sortBy: 'saleDate', sortDirection: 'desc' })
      .pipe(finalize(() => this.customerInvoicesLoading.set(false)))
      .subscribe({
        next: (response) => {
          const { content, ...pageInfo } = response;
          this.customerInvoices.set(content ?? []);
          this.customerInvoicesPageInfo.set(pageInfo);
          this.customerInvoicesPage.set(response.page ?? page);
        },
        error: (error: Error) => {
          this.customerInvoices.set([]);
          this.customerInvoicesPageInfo.set(null);
          this.customerInvoicesError.set(error.message || 'No fue posible cargar el historial de facturas.');
        },
      });
  }

  previousCustomerInvoicesPage(): void {
    if (!this.customerInvoicesPageInfo()?.first) {
      this.loadCustomerInvoices(this.selectedCustomer()?.id ?? 0, this.customerInvoicesPage() - 1);
    }
  }

  nextCustomerInvoicesPage(): void {
    if (!this.customerInvoicesPageInfo()?.last) {
      this.loadCustomerInvoices(this.selectedCustomer()?.id ?? 0, this.customerInvoicesPage() + 1);
    }
  }

  sendInvoice(invoice: CustomerInvoice): void {
    if (this.sendingInvoiceId() !== null || this.isInvoiceCancelled(invoice)) {
      return;
    }

    this.customerInvoicesError.set('');
    this.successMessage.set('');
    this.sendingInvoiceId.set(invoice.id);

    this.salesService
      .sendInvoice(invoice.id)
      .pipe(finalize(() => this.sendingInvoiceId.set(null)))
      .subscribe({
        next: (message) => {
          this.feedbackType.set('success');
          this.successMessage.set(message || 'Factura enviada correctamente');
        },
        error: (error: Error) => this.customerInvoicesError.set(error.message || 'No fue posible enviar la factura.'),
      });
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

  invoiceStatusClass(invoice: CustomerInvoice): string {
    return this.isInvoiceCancelled(invoice) ? 'anulada' : 'activa';
  }

  isInvoiceCancelled(invoice: CustomerInvoice): boolean {
    const status = String(invoice.status || '').toUpperCase();
    return status === 'CANCELLED' || status === 'CANCELED';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    return !value || Number.isNaN(date.getTime())
      ? '-'
      : new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
