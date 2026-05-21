import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../services/auth';
import { CreateSupplierRequest, SupplierItem, SuppliersService, UpdateSupplierRequest } from '../../../../services/suppliers';
import { DashboardSelect, DashboardSelectOption } from '../../shared/dashboard-select';
import { FeedbackModal, FeedbackType } from '../../shared/feedback-modal';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-suppliers-page',
  imports: [MatIconModule, PageTitle, ReactiveFormsModule, FeedbackModal, DashboardSelect],
  template: `
    <section class="page">
      <app-page-title title="Proveedores" subtitle="Gestiona aliados de abastecimiento y datos de contacto." />

      <div class="toolbar">
        <label>
          <mat-icon>search</mat-icon>
          <input placeholder="Buscar proveedor" [value]="search()" (input)="search.set(inputValue($event))" />
        </label>
        <app-dashboard-select [options]="statusOptions" [value]="statusFilter()" (valueChange)="statusFilter.set($event)" />
        <button class="primary-btn" type="button" [disabled]="!canCreateSupplier()" (click)="openCreateSupplier()">
          <mat-icon>local_shipping</mat-icon>
          Crear proveedor
        </button>
      </div>

      @if (!canCreateSupplier()) {
        <div class="inline-error">
          <mat-icon>lock</mat-icon>
          <span>Tu usuario puede ver proveedores, pero no tiene permiso para crearlos.</span>
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
        message="La informacion quedo registrada para compras y abastecimiento."
        (dismiss)="successMessage.set('')"
      />

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>NIT</th>
              <th>Contacto</th>
              <th>Telefono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loadingSuppliers()) {
              <tr>
                <td colspan="6">
                  <div class="table-empty">
                    <span class="loading-dot"></span>
                    <strong>Cargando proveedores</strong>
                    <span>Consultando proveedores registrados para tu empresa.</span>
                  </div>
                </td>
              </tr>
            } @else {
              @for (supplier of filteredSuppliers(); track supplier.id) {
                <tr>
                  <td>
                    <strong>{{ supplier.name }}</strong>
                    <small class="muted-line">{{ supplier.email || supplier.address || 'Sin datos de contacto' }}</small>
                  </td>
                  <td>{{ supplier.taxId || '-' }}</td>
                  <td>{{ supplier.contactName || '-' }}</td>
                  <td>{{ supplier.phone || '-' }}</td>
                  <td><span class="badge" [class.activa]="supplier.active" [class.desactivado]="!supplier.active">{{ supplier.active ? 'Activo' : 'Desactivado' }}</span></td>
                <td class="actions">
                  <button type="button" aria-label="Ver proveedor" (click)="openSupplierDetail(supplier.id)"><mat-icon>visibility</mat-icon></button>
                  <button class="edit-action" type="button" aria-label="Editar proveedor" (click)="openEditSupplier(supplier)"><mat-icon>edit</mat-icon></button>
                  <button class="danger-action" type="button" aria-label="Eliminar proveedor" (click)="openDeleteSupplier(supplier)">
                    <mat-icon>delete</mat-icon>
                  </button>
                  <button
                    type="button"
                    [class.activate-action]="!supplier.active"
                    [class.deactivate-action]="supplier.active"
                    [attr.aria-label]="supplier.active ? 'Desactivar proveedor' : 'Activar proveedor'"
                    [disabled]="statusUpdatingId() === supplier.id"
                    (click)="toggleSupplierStatus(supplier)"
                  >
                    <mat-icon>{{ supplier.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                  </button>
                </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <div class="table-empty">
                      <mat-icon>local_shipping</mat-icon>
                      <strong>Sin proveedores para mostrar</strong>
                      <span>No hay proveedores registrados o el filtro no encontro coincidencias.</span>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
        <div class="pagination">
          <span>Mostrando {{ filteredSuppliers().length }} de {{ totalElements() }} proveedores</span>
          <button type="button" [disabled]="firstPage()" (click)="previousPage()">Anterior</button>
          <button type="button" [disabled]="lastPage()" (click)="nextPage()">Siguiente</button>
        </div>
      </div>

      @if (supplierModalOpen()) {
        <div class="modal-backdrop" (click)="closeCreateSupplier()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon create"><mat-icon>local_shipping</mat-icon></span>
                <div>
                  <h2>{{ editingSupplierId() ? 'Editar proveedor' : 'Crear proveedor' }}</h2>
                  <p>{{ editingSupplierId() ? 'Actualiza datos comerciales, contacto y estado.' : 'Registra datos comerciales y contacto principal.' }}</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeCreateSupplier()" aria-label="Cerrar modal">
                <mat-icon>close</mat-icon>
              </button>
            </header>

            <div class="modal-body">
              @if (createError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ createError() }}</span>
                </div>
              }

              <form class="form-grid" [formGroup]="supplierForm">
                <label>
                  Nombre
                  <input formControlName="name" placeholder="Ej. Distribuciones Andina" />
                </label>
                <label>
                  NIT / Tax ID
                  <input formControlName="taxId" placeholder="Ej. 900123456-7" />
                </label>
                <label>
                  Contacto
                  <input formControlName="contactName" placeholder="Ej. Laura Perez" />
                </label>
                <label>
                  Correo
                  <input type="email" formControlName="email" placeholder="proveedor@correo.com" />
                  @if (supplierForm.controls.email.touched && supplierForm.controls.email.invalid) {
                    <small class="field-hint">Ingresa un correo valido.</small>
                  }
                </label>
                <label>
                  Telefono
                  <input formControlName="phone" placeholder="Ej. 3012345678" />
                </label>
                <label>
                  Direccion
                  <input formControlName="address" placeholder="Direccion principal" />
                </label>
                @if (editingSupplierId()) {
                  <label class="check">
                    <input type="checkbox" formControlName="active" />
                    Proveedor activo
                  </label>
                }
              </form>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeCreateSupplier()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="creatingSupplier()" (click)="saveSupplier()">
                <mat-icon>save</mat-icon>
                {{ creatingSupplier() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }

      @if (deleteSupplierTarget()) {
        <div class="modal-backdrop" (click)="closeDeleteSupplier()">
          <section class="modal sale-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon danger"><mat-icon>delete</mat-icon></span>
                <div>
                  <h2>Eliminar proveedor</h2>
                  <p>Esta accion quitara el proveedor del catalogo de abastecimiento.</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeDeleteSupplier()" aria-label="Cerrar modal">
                <mat-icon>close</mat-icon>
              </button>
            </header>

            <div class="modal-body">
              @if (deleteError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ deleteError() }}</span>
                </div>
              }
              <div class="audit-status-card error">
                <mat-icon>warning</mat-icon>
                <div>
                  <h3>{{ deleteSupplierTarget()?.name }}</h3>
                  <p>Confirma que deseas eliminar este proveedor.</p>
                </div>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeDeleteSupplier()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="deletingSupplier()" (click)="confirmDeleteSupplier()">
                <mat-icon>delete</mat-icon>
                {{ deletingSupplier() ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </footer>
          </section>
        </div>
      }

      @if (detailModalOpen()) {
        <div class="modal-backdrop" (click)="closeSupplierDetail()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon"><mat-icon>local_shipping</mat-icon></span>
                <div>
                  <h2>Detalle de proveedor</h2>
                  <p>Informacion comercial y contacto principal.</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeSupplierDetail()" aria-label="Cerrar modal">
                <mat-icon>close</mat-icon>
              </button>
            </header>

            <div class="modal-body">
              @if (detailLoading()) {
                <div class="audit-status-card">
                  <span class="loading-dot"></span>
                  <div>
                    <h3>Cargando proveedor</h3>
                    <p>Consultando informacion actualizada.</p>
                  </div>
                </div>
              } @else if (detailError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ detailError() }}</span>
                </div>
              } @else if (selectedSupplier()) {
                <div class="detail-grid">
                  <div><span>Nombre</span><strong>{{ selectedSupplier()?.name }}</strong></div>
                  <div><span>NIT</span><strong>{{ selectedSupplier()?.taxId || '-' }}</strong></div>
                  <div><span>Contacto</span><strong>{{ selectedSupplier()?.contactName || '-' }}</strong></div>
                  <div><span>Correo</span><strong>{{ selectedSupplier()?.email || '-' }}</strong></div>
                  <div><span>Telefono</span><strong>{{ selectedSupplier()?.phone || '-' }}</strong></div>
                  <div><span>Direccion</span><strong>{{ selectedSupplier()?.address || '-' }}</strong></div>
                  <div><span>Estado</span><strong>{{ selectedSupplier()?.active ? 'Activo' : 'Desactivado' }}</strong></div>
                  <div><span>Creacion</span><strong>{{ formatDate(selectedSupplier()?.createdAt) }}</strong></div>
                </div>
              }
            </div>

            <footer class="modal-footer">
              <button class="primary-btn" type="button" (click)="closeSupplierDetail()">Cerrar</button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
})
export class SuppliersPage implements OnInit {
  private readonly suppliersService = inject(SuppliersService);
  private readonly auth = inject(AuthService);

  readonly search = signal('');
  readonly statusFilter = signal('all');
  readonly statusOptions: DashboardSelectOption[] = [
    { label: 'Todos los estados', value: 'all' },
    { label: 'Activo', value: 'active' },
    { label: 'Desactivado', value: 'inactive' },
  ];
  readonly supplierModalOpen = signal(false);
  readonly editingSupplierId = signal<number | null>(null);
  readonly creatingSupplier = signal(false);
  readonly statusUpdatingId = signal<number | null>(null);
  readonly deleteSupplierTarget = signal<SupplierItem | null>(null);
  readonly selectedSupplier = signal<SupplierItem | null>(null);
  readonly detailModalOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly deletingSupplier = signal(false);
  readonly loadingSuppliers = signal(false);
  readonly loadError = signal('');
  readonly createError = signal('');
  readonly deleteError = signal('');
  readonly detailError = signal('');
  readonly successMessage = signal('');
  readonly feedbackType = signal<FeedbackType>('success');
  readonly canCreateSupplier = computed(() => this.auth.hasPermission('SUPPLIER_CREATE'));
  readonly suppliers = signal<SupplierItem[]>([]);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly totalElements = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly supplierForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    taxId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    active: new FormControl(true, { nonNullable: true }),
  });

  readonly filteredSuppliers = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.suppliers().filter((supplier) => {
      const matchesTerm = [supplier.name, supplier.taxId, supplier.contactName, supplier.email, supplier.phone]
        .some((value) => value.toLowerCase().includes(term));
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && supplier.active) ||
        (status === 'inactive' && !supplier.active);

      return matchesTerm && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.loadSuppliers();
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  openCreateSupplier(): void {
    if (!this.canCreateSupplier()) {
      this.createError.set('Tu usuario no tiene permiso SUPPLIER_CREATE.');
      return;
    }

    this.createError.set('');
    this.successMessage.set('');
    this.editingSupplierId.set(null);
    this.supplierForm.reset();
    this.supplierForm.controls.active.setValue(true);
    this.supplierModalOpen.set(true);
  }

  openEditSupplier(supplier: SupplierItem): void {
    this.createError.set('');
    this.successMessage.set('');
    this.editingSupplierId.set(supplier.id);
    this.supplierForm.setValue({
      name: supplier.name ?? '',
      taxId: supplier.taxId ?? '',
      contactName: supplier.contactName ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      active: supplier.active,
    });
    this.supplierModalOpen.set(true);
  }

  closeCreateSupplier(): void {
    if (this.creatingSupplier()) {
      return;
    }

    this.supplierModalOpen.set(false);
    this.editingSupplierId.set(null);
    this.createError.set('');
  }

  saveSupplier(): void {
    this.createError.set('');
    this.successMessage.set('');

    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      this.createError.set(this.supplierForm.controls.email.invalid ? 'Revisa el correo del proveedor.' : 'Completa los datos obligatorios del proveedor.');
      return;
    }

    const supplierId = this.editingSupplierId();
    const formValue = this.supplierForm.getRawValue();
    const request = this.cleanRequest(formValue);

    if (!request.name || !request.taxId || !request.contactName || !request.email || !request.phone || !request.address) {
      this.createError.set('Completa los datos obligatorios del proveedor.');
      return;
    }

    if (!isValidEmail(request.email)) {
      this.createError.set('Revisa el correo del proveedor.');
      return;
    }

    this.creatingSupplier.set(true);
    const saveRequest = supplierId
      ? this.suppliersService.update(supplierId, { ...request, active: formValue.active } satisfies UpdateSupplierRequest)
      : this.suppliersService.create(request);

    saveRequest
      .pipe(finalize(() => this.creatingSupplier.set(false)))
      .subscribe({
        next: (supplier) => {
          this.suppliers.update((items) =>
            supplierId ? items.map((item) => (item.id === supplier.id ? supplier : item)) : [supplier, ...items],
          );
          if (!supplierId) {
            this.totalElements.update((total) => total + 1);
          }
          this.feedbackType.set(supplierId ? 'edit' : 'create');
          this.successMessage.set(supplierId ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente');
          this.supplierModalOpen.set(false);
          this.editingSupplierId.set(null);
          this.createError.set('');
        },
        error: (error: Error) => {
          this.createError.set(error.message || 'No fue posible crear el proveedor.');
        },
      });
  }

  toggleSupplierStatus(supplier: SupplierItem): void {
    this.createError.set('');
    this.successMessage.set('');
    this.statusUpdatingId.set(supplier.id);

    const request = supplier.active
      ? this.suppliersService.deactivate(supplier.id)
      : this.suppliersService.activate(supplier.id);

    request
      .pipe(finalize(() => this.statusUpdatingId.set(null)))
      .subscribe({
        next: (updatedSupplier) => {
          this.suppliers.update((items) =>
            items.map((item) => (item.id === supplier.id ? updatedSupplier : item)),
          );
          this.feedbackType.set(updatedSupplier.active ? 'activate' : 'deactivate');
          this.successMessage.set(updatedSupplier.active ? 'Proveedor activado correctamente' : 'Proveedor desactivado correctamente');
        },
        error: (error: Error) => {
          this.loadError.set(error.message || 'No fue posible actualizar el estado del proveedor.');
        },
      });
  }

  openDeleteSupplier(supplier: SupplierItem): void {
    this.deleteError.set('');
    this.successMessage.set('');
    this.deleteSupplierTarget.set(supplier);
  }

  closeDeleteSupplier(): void {
    if (this.deletingSupplier()) {
      return;
    }

    this.deleteSupplierTarget.set(null);
    this.deleteError.set('');
  }

  confirmDeleteSupplier(): void {
    const supplier = this.deleteSupplierTarget();

    if (!supplier) {
      return;
    }

    this.deleteError.set('');
    this.deletingSupplier.set(true);

    this.suppliersService
      .delete(supplier.id)
      .pipe(finalize(() => this.deletingSupplier.set(false)))
      .subscribe({
        next: (message) => {
          this.suppliers.update((items) => items.filter((item) => item.id !== supplier.id));
          this.totalElements.update((total) => Math.max(total - 1, 0));
          this.feedbackType.set('delete');
          this.successMessage.set(message || 'Proveedor eliminado correctamente');
          this.deleteSupplierTarget.set(null);
          this.deleteError.set('');
          this.loadSuppliers(this.suppliers().length ? this.page() : Math.max(this.page() - 1, 0));
        },
        error: (error: Error) => {
          this.deleteError.set(error.message || 'No fue posible eliminar el proveedor.');
        },
      });
  }

  openSupplierDetail(supplierId: number): void {
    this.detailModalOpen.set(true);
    this.detailLoading.set(true);
    this.detailError.set('');
    this.selectedSupplier.set(null);

    this.suppliersService
      .getById(supplierId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (supplier) => this.selectedSupplier.set(supplier),
        error: (error: Error) => {
          this.detailError.set(error.message || 'No fue posible cargar el proveedor.');
        },
      });
  }

  closeSupplierDetail(): void {
    this.detailModalOpen.set(false);
    this.selectedSupplier.set(null);
    this.detailError.set('');
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  loadSuppliers(page = this.page()): void {
    this.loadingSuppliers.set(true);
    this.loadError.set('');

    this.suppliersService
      .getPaginated({ page, size: this.size(), sortBy: 'id', sortDirection: 'asc' })
      .pipe(finalize(() => this.loadingSuppliers.set(false)))
      .subscribe({
        next: (response) => {
          this.suppliers.set(response.content ?? []);
          this.page.set(response.page ?? page);
          this.size.set(response.size ?? this.size());
          this.totalElements.set(response.totalElements ?? 0);
          this.firstPage.set(response.first ?? true);
          this.lastPage.set(response.last ?? true);
        },
        error: (error: Error) => {
          this.loadError.set(error.message || 'No fue posible cargar los proveedores.');
        },
      });
  }

  previousPage(): void {
    if (!this.firstPage()) {
      this.loadSuppliers(this.page() - 1);
    }
  }

  nextPage(): void {
    if (!this.lastPage()) {
      this.loadSuppliers(this.page() + 1);
    }
  }

  private cleanRequest(request: CreateSupplierRequest): CreateSupplierRequest {
    return {
      name: request.name.trim(),
      taxId: request.taxId.trim(),
      contactName: request.contactName.trim(),
      email: request.email.trim(),
      phone: request.phone.trim(),
      address: request.address.trim(),
    };
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
