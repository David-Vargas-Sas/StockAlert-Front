import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ProductItem, ProductsService } from '../../../../services/products';
import { CreatePurchaseRequest, PurchaseDetail, PurchaseRecord, PurchasesPageResponse, PurchasesService } from '../../../../services/purchases';
import { SupplierItem, SuppliersService } from '../../../../services/suppliers';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-purchases-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page purchases-page">
      <app-page-title title="Compras" subtitle="Registra compras, entradas de inventario y anulaciones." />

      <div class="toolbar purchases-toolbar">
        <label><mat-icon>calendar_today</mat-icon><input type="date" (change)="fromDate.set($any($event.target).value)" /></label>
        <label><mat-icon>search</mat-icon><input placeholder="Buscar proveedor" (input)="search.set($any($event.target).value)" /></label>
        <button class="primary-btn" type="button" (click)="openCreatePurchase()"><mat-icon>add_shopping_cart</mat-icon>Registrar compra</button>
      </div>

      @if (loading()) {
        <div class="audit-status-card">
          <span class="loading-dot"></span>
          <div><h3>Cargando compras</h3><p>Consultando entradas de inventario registradas.</p></div>
        </div>
      } @else if (error()) {
        <div class="audit-status-card error">
          <mat-icon>error</mat-icon>
          <div><h3>No se pudieron cargar las compras</h3><p>{{ error() }}</p></div>
          <button class="secondary-btn" type="button" (click)="loadPurchases()">Reintentar</button>
        </div>
      }

      <div class="kpi-grid purchases-kpis">
        <article class="kpi-card"><div><span>Compras listadas</span><strong>{{ pageInfo()?.totalElements ?? purchases().length }}</strong><small>Registros encontrados</small></div><mat-icon>shopping_cart_checkout</mat-icon></article>
        <article class="kpi-card green"><div><span>Total visible</span><strong>{{ formatCurrency(visibleTotal) }}</strong><small>Pagina actual</small></div><mat-icon>payments</mat-icon></article>
        <article class="kpi-card amber"><div><span>Anuladas</span><strong>{{ cancelledCount }}</strong><small>Estado CANCELLED</small></div><mat-icon>cancel</mat-icon></article>
      </div>

      <div class="table-card purchases-table">
        <table>
          <thead>
            <tr><th>Codigo</th><th>Proveedor</th><th>Fecha</th><th>Items</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @for (purchase of filteredPurchases; track purchase.id) {
              <tr>
                <td><strong>{{ purchaseCode(purchase) }}</strong></td>
                <td>{{ purchase.supplierName || ('Proveedor #' + purchase.supplierId) }}</td>
                <td>{{ formatDate(purchase.purchaseDate) }}</td>
                <td>{{ purchase.details.length }} items</td>
                <td>{{ formatCurrency(purchase.total) }}</td>
                <td><span class="badge" [class]="purchaseStatusClass(purchase)">{{ purchaseStatusLabel(purchase) }}</span></td>
                <td class="actions">
                  <button type="button" aria-label="Ver compra" (click)="openPurchaseDetail(purchase)"><mat-icon>visibility</mat-icon></button>
                  <button type="button" aria-label="Anular compra" [disabled]="isPurchaseCancelled(purchase) || cancellingPurchaseId() === purchase.id" (click)="cancelPurchase(purchase)">
                    <mat-icon>block</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="table-empty">
                    <mat-icon>shopping_cart_checkout</mat-icon>
                    <strong>Sin compras para mostrar</strong>
                    <span>No hay compras registradas o el filtro no encontro coincidencias.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pagination">
          <span>Mostrando {{ filteredPurchases.length }} de {{ pageInfo()?.totalElements ?? filteredPurchases.length }} compras</span>
          <button type="button" [disabled]="pageInfo()?.first" (click)="previousPage()">Anterior</button>
          <button type="button" [disabled]="pageInfo()?.last" (click)="nextPage()">Siguiente</button>
        </div>
      </div>

      @if (createPurchaseOpen()) {
        <div class="modal-backdrop" (click)="closeCreatePurchase()">
          <section class="modal sale-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon"><mat-icon>add_shopping_cart</mat-icon></span>
                <div><h2>Registrar compra</h2><p>Selecciona proveedor, producto y costo de entrada.</p></div>
              </div>
              <button class="modal-close" type="button" (click)="closeCreatePurchase()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (createError()) {
                <div class="inline-error"><mat-icon>error</mat-icon><span>{{ createError() }}</span></div>
              }

              <div class="sale-form">
                <label class="form-field product-field">
                  <span>Proveedor</span>
                  <select [value]="selectedSupplierId()" (change)="selectedSupplierId.set(Number($any($event.target).value))">
                    <option value="0">Selecciona proveedor</option>
                    @for (supplier of activeSuppliers; track supplier.id) {
                      <option [value]="supplier.id">{{ supplier.name }}</option>
                    }
                  </select>
                </label>
                <label class="form-field product-field">
                  <span>Producto</span>
                  <select [value]="selectedProductId()" (change)="selectedProductId.set(Number($any($event.target).value))">
                    <option value="0">Selecciona producto</option>
                    @for (product of products(); track product.id) {
                      <option [value]="product.id">{{ product.name }}</option>
                    }
                  </select>
                </label>
                <label class="form-field"><span>Cantidad</span><input type="number" min="1" step="1" [value]="quantity()" (input)="quantity.set(Number($any($event.target).value))" /></label>
                <label class="form-field"><span>Costo unitario</span><input type="number" min="0.01" step="0.01" [value]="unitCost()" (input)="unitCost.set(Number($any($event.target).value))" /></label>
                <div class="sale-total"><span>Total compra</span><strong>{{ formatCurrency(currentTotal) }}</strong></div>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeCreatePurchase()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="creatingPurchase()" (click)="savePurchase()">
                <mat-icon>save</mat-icon>
                {{ creatingPurchase() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }

      @if (detailOpen()) {
        <div class="modal-backdrop" (click)="closePurchaseDetail()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon"><mat-icon>receipt_long</mat-icon></span>
                <div><h2>Detalle de compra</h2><p>{{ purchaseCode(selectedPurchase()) }} - {{ formatDate(selectedPurchase()?.purchaseDate || '') }}</p></div>
              </div>
              <button class="modal-close" type="button" (click)="closePurchaseDetail()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (detailLoading()) {
                <div class="audit-status-card"><span class="loading-dot"></span><div><h3>Cargando compra</h3><p>Consultando detalle del registro.</p></div></div>
              } @else if (detailError()) {
                <div class="inline-error"><mat-icon>error</mat-icon><span>{{ detailError() }}</span></div>
              } @else if (selectedPurchase()) {
                <div class="form-grid detail-grid">
                  <label class="form-field"><span>Proveedor</span><strong>{{ selectedPurchase()?.supplierName }}</strong></label>
                  <label class="form-field"><span>Total</span><strong>{{ formatCurrency(selectedPurchase()?.total || 0) }}</strong></label>
                  <label class="form-field"><span>Estado</span><strong>{{ purchaseStatusLabel(selectedPurchase()) }}</strong></label>
                  <label class="form-field"><span>Fecha</span><strong>{{ formatDate(selectedPurchase()?.purchaseDate || '') }}</strong></label>
                </div>
                <div class="mini-list">
                  @for (item of selectedPurchase()?.details || []; track $index) {
                    <div><span>{{ item.productName || ('Producto #' + item.productId) }} x {{ item.quantity }}</span><strong>{{ formatCurrency(item.subtotal ?? (item.unitCost * item.quantity)) }}</strong></div>
                  }
                </div>
              }
            </div>

            <footer class="modal-footer">
              <button class="primary-btn" type="button" (click)="closePurchaseDetail()">Cerrar</button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .purchases-page{display:grid;gap:16px}
      .purchases-page .page-header,.purchases-toolbar{margin-bottom:0}
      .purchases-kpis{grid-template-columns:repeat(3,minmax(220px,1fr));gap:16px}
      .purchases-kpis .kpi-card{min-height:122px}
      .purchases-table .table-empty{min-height:150px}
    `,
  ],
})
export class PurchasesPage implements OnInit {
  private readonly purchasesService = inject(PurchasesService);
  private readonly productsService = inject(ProductsService);
  private readonly suppliersService = inject(SuppliersService);
  readonly Number = Number;

  readonly purchases = signal<PurchaseRecord[]>([]);
  readonly products = signal<ProductItem[]>([]);
  readonly suppliers = signal<SupplierItem[]>([]);
  readonly pageInfo = signal<Omit<PurchasesPageResponse, 'content'> | null>(null);
  readonly currentPage = signal(0);
  readonly pageSize = 10;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly search = signal('');
  readonly fromDate = signal('');
  readonly createPurchaseOpen = signal(false);
  readonly creatingPurchase = signal(false);
  readonly createError = signal('');
  readonly selectedSupplierId = signal(0);
  readonly selectedProductId = signal(0);
  readonly quantity = signal(1);
  readonly unitCost = signal(0);
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly selectedPurchase = signal<PurchaseRecord | null>(null);
  readonly cancellingPurchaseId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadPurchases();
    this.loadCatalogs();
  }

  get activeSuppliers(): SupplierItem[] {
    return this.suppliers().filter((supplier) => supplier.active);
  }

  get filteredPurchases(): PurchaseRecord[] {
    const query = this.search().trim().toLowerCase();
    const from = this.fromDate();

    return this.purchases().filter((purchase) => {
      const matchesQuery = !query || purchase.supplierName.toLowerCase().includes(query) || this.purchaseCode(purchase).toLowerCase().includes(query);
      const matchesDate = !from || dateOnly(purchase.purchaseDate) >= from;
      return matchesQuery && matchesDate;
    });
  }

  get visibleTotal(): number {
    return this.filteredPurchases.reduce((total, purchase) => total + (purchase.total || 0), 0);
  }

  get cancelledCount(): number {
    return this.purchases().filter((purchase) => this.purchaseStatusClass(purchase) === 'inactiva').length;
  }

  get currentTotal(): number {
    return (this.quantity() || 0) * (this.unitCost() || 0);
  }

  loadPurchases(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set('');

    this.purchasesService
      .getPaginated({ page, size: this.pageSize })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const { content, ...pageInfo } = response;
          this.purchases.set(content);
          this.pageInfo.set(pageInfo);
          this.currentPage.set(response.page);
        },
        error: (error: Error) => {
          this.purchases.set([]);
          this.pageInfo.set(null);
          this.error.set(error.message || 'Revisa que la sesion sea valida y que el backend este activo.');
        },
      });
  }

  loadCatalogs(): void {
    this.productsService.getAll().subscribe({ next: (products) => this.products.set(products), error: () => this.products.set([]) });
    this.suppliersService.getAll().subscribe({ next: (suppliers) => this.suppliers.set(suppliers), error: () => this.suppliers.set([]) });
  }

  previousPage(): void {
    if (!this.pageInfo()?.first) {
      this.loadPurchases(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (!this.pageInfo()?.last) {
      this.loadPurchases(this.currentPage() + 1);
    }
  }

  openCreatePurchase(): void {
    this.createError.set('');
    this.selectedSupplierId.set(0);
    this.selectedProductId.set(0);
    this.quantity.set(1);
    this.unitCost.set(0);
    this.createPurchaseOpen.set(true);
  }

  closeCreatePurchase(): void {
    if (!this.creatingPurchase()) {
      this.createPurchaseOpen.set(false);
      this.createError.set('');
    }
  }

  savePurchase(): void {
    const request: CreatePurchaseRequest = {
      supplierId: this.selectedSupplierId(),
      items: [{ productId: this.selectedProductId(), quantity: this.quantity(), unitCost: this.unitCost() }],
    };

    if (!request.supplierId || !request.items[0].productId) {
      this.createError.set('Selecciona proveedor y producto.');
      return;
    }

    if (
      !Number.isInteger(request.items[0].quantity) ||
      request.items[0].quantity < 1 ||
      !Number.isFinite(request.items[0].unitCost) ||
      request.items[0].unitCost <= 0
    ) {
      this.createError.set('Ingresa una cantidad y costo unitario validos.');
      return;
    }

    this.creatingPurchase.set(true);
    this.createError.set('');

    this.purchasesService
      .create(request)
      .pipe(finalize(() => this.creatingPurchase.set(false)))
      .subscribe({
        next: () => {
          this.createPurchaseOpen.set(false);
          this.createError.set('');
          this.loadPurchases(0);
          this.productsService.getAll().subscribe({ next: (products) => this.products.set(products), error: () => undefined });
        },
        error: (error: Error) => this.createError.set(error.message || 'No fue posible registrar la compra.'),
      });
  }

  openPurchaseDetail(purchase: PurchaseRecord): void {
    this.detailOpen.set(true);
    this.detailError.set('');
    this.selectedPurchase.set(purchase);
    this.detailLoading.set(true);

    this.purchasesService
      .getById(purchase.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (detail) => this.selectedPurchase.set(detail),
        error: (error: Error) => this.detailError.set(error.message || 'No fue posible cargar la compra.'),
      });
  }

  closePurchaseDetail(): void {
    if (!this.detailLoading()) {
      this.detailOpen.set(false);
      this.selectedPurchase.set(null);
      this.detailError.set('');
    }
  }

  cancelPurchase(purchase: PurchaseRecord): void {
    if (this.isPurchaseCancelled(purchase) || this.cancellingPurchaseId() !== null) {
      return;
    }

    const confirmed = window.confirm(`Anular la compra ${this.purchaseCode(purchase)}? Esta accion actualizara el inventario.`);

    if (!confirmed) {
      return;
    }

    this.error.set('');
    this.cancellingPurchaseId.set(purchase.id);

    this.purchasesService
      .cancel(purchase.id)
      .pipe(finalize(() => this.cancellingPurchaseId.set(null)))
      .subscribe({
        next: (updatedPurchase) => {
          this.purchases.update((purchases) => purchases.map((item) => (item.id === updatedPurchase.id ? updatedPurchase : item)));

          if (this.selectedPurchase()?.id === updatedPurchase.id) {
            this.selectedPurchase.set(updatedPurchase);
          }

          this.productsService.getAll().subscribe({ next: (products) => this.products.set(products), error: () => undefined });
        },
        error: (error: Error) => this.error.set(error.message || 'No fue posible anular la compra.'),
      });
  }

  purchaseCode(purchase: PurchaseRecord | null): string {
    return purchase?.id ? `C-${purchase.id}` : '-';
  }

  purchaseStatusLabel(purchase: PurchaseRecord | null): string {
    if (purchase?.statusLabel) {
      return purchase.statusLabel;
    }

    const status = String(purchase?.status || 'RECEIVED').toUpperCase();
    if (status === 'CANCELLED' || status === 'CANCELED') {
      return 'Anulada';
    }
    if (status === 'PENDING') {
      return 'Pendiente';
    }
    return 'Recibida';
  }

  purchaseStatusClass(purchase: PurchaseRecord | null): string {
    const status = String(purchase?.status || 'RECEIVED').toUpperCase();
    return this.isPurchaseCancelled(purchase) ? 'inactiva' : status === 'PENDING' ? 'bajo-stock' : 'activa';
  }

  isPurchaseCancelled(purchase: PurchaseRecord | null): boolean {
    const status = String(purchase?.status || '').toUpperCase();
    return status === 'CANCELLED' || status === 'CANCELED';
  }

  purchaseItems(purchase: PurchaseRecord | null): PurchaseDetail[] {
    return purchase?.details ?? [];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return !value || Number.isNaN(date.getTime())
      ? '-'
      : new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }
}

function dateOnly(value: string): string {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
