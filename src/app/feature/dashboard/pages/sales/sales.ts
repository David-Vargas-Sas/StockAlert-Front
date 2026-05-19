import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ProductItem, ProductsService } from '../../../../services/products';
import { CreateSaleRequest, SaleItem, SaleRecord, SalesPageResponse, SalesService } from '../../../../services/sales';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-sales-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Ventas" subtitle="Consulta ventas y registra transacciones con validacion de stock." />

      <div class="toolbar">
        <label><mat-icon>calendar_today</mat-icon><input type="date" (change)="fromDate.set($any($event.target).value)" /></label>
        <label><mat-icon>calendar_today</mat-icon><input type="date" (change)="toDate.set($any($event.target).value)" /></label>
        <button class="primary-btn" type="button" (click)="openCreateSale()"><mat-icon>point_of_sale</mat-icon>Registrar venta</button>
      </div>

      @if (loading()) {
        <div class="audit-status-card">
          <span class="loading-dot"></span>
          <div>
            <h3>Cargando ventas</h3>
            <p>Consultando transacciones registradas para tu empresa.</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="audit-status-card error">
          <mat-icon>error</mat-icon>
          <div>
            <h3>No se pudieron cargar las ventas</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="secondary-btn" type="button" (click)="loadSales()">Reintentar</button>
        </div>
      }

      <div class="sale-composer">
        <div><strong>Registro de venta</strong><span>{{ selectedProductName }}</span></div>
        <div><span>Stock disponible</span><strong [class.danger]="selectedProductStock <= 0">{{ selectedProductStock }} unidades</strong></div>
        <div><span>Cantidad solicitada</span><strong>{{ saleQuantity() || 0 }}</strong></div>
        <p [class.sale-ok]="canRegisterCurrentSale"><mat-icon>{{ canRegisterCurrentSale ? 'check_circle' : 'error' }}</mat-icon>{{ saleComposerMessage }}</p>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr><th>Codigo</th><th>Fecha</th><th>Vendedor</th><th>Productos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @for (sale of filteredSales; track sale.id) {
              <tr>
                <td><strong>{{ saleCode(sale) }}</strong></td>
                <td>{{ formatDate(saleDate(sale)) }}</td>
                <td>{{ saleSeller(sale) }}</td>
                <td>{{ saleItems(sale).length }} items</td>
                <td>{{ formatCurrency(saleTotal(sale)) }}</td>
                <td><span class="badge" [class]="saleStatusClass(sale)">{{ saleStatusLabel(sale) }}</span></td>
                <td class="actions">
                  <button type="button" aria-label="Ver venta" (click)="openSaleDetail(sale)"><mat-icon>visibility</mat-icon></button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="table-empty">
                    <mat-icon>receipt_long</mat-icon>
                    <strong>Sin ventas para mostrar</strong>
                    <span>No hay transacciones registradas o el filtro no encontro coincidencias.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pagination">
          <span>Mostrando {{ filteredSales.length }} de {{ pageInfo()?.totalElements ?? filteredSales.length }} ventas</span>
          <button type="button" [disabled]="pageInfo()?.first" (click)="previousPage()">Anterior</button>
          <button type="button" [disabled]="pageInfo()?.last" (click)="nextPage()">Siguiente</button>
        </div>
      </div>

      @if (createSaleOpen()) {
        <div class="modal-backdrop" (click)="closeCreateSale()">
          <section class="modal sale-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon"><mat-icon>point_of_sale</mat-icon></span>
                <div>
                  <h2>Registrar venta</h2>
                  <p>Selecciona un producto y valida disponibilidad antes de guardar.</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeCreateSale()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (createError()) {
                <div class="inline-error"><mat-icon>error</mat-icon><span>{{ createError() }}</span></div>
              }

              <div class="sale-form">
                <label class="form-field product-field">
                  <span>Producto</span>
                  <select [value]="selectedProductId()" (change)="selectedProductId.set(Number($any($event.target).value))">
                    <option value="0">Selecciona producto</option>
                    @for (product of products(); track product.id) {
                      <option [value]="product.id">{{ product.name }} - stock {{ product.stock }}</option>
                    }
                  </select>
                </label>
                <label class="form-field">
                  <span>Cantidad</span>
                  <input type="number" min="1" step="1" [value]="saleQuantity()" (input)="saleQuantity.set(Number($any($event.target).value))" />
                </label>
                <label class="form-field">
                  <span>Precio unitario</span>
                  <input [value]="formatCurrency(selectedProduct?.price ?? 0)" readonly />
                </label>
                <div class="sale-total">
                  <span>Total venta</span>
                  <strong>{{ formatCurrency(currentSaleTotal) }}</strong>
                </div>
                <div class="stock-warning" [class.sale-ok]="canRegisterCurrentSale">
                  <mat-icon>{{ canRegisterCurrentSale ? 'check_circle' : 'warning' }}</mat-icon>
                  <div>
                    <strong>{{ saleComposerMessage }}</strong>
                    <span>El backend validara stock antes de confirmar la venta.</span>
                  </div>
                </div>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeCreateSale()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="creatingSale()" (click)="saveSale()">
                <mat-icon>save</mat-icon>
                {{ creatingSale() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }

      @if (detailOpen()) {
        <div class="modal-backdrop" (click)="closeSaleDetail()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon"><mat-icon>receipt_long</mat-icon></span>
                <div>
                  <h2>Detalle de venta</h2>
                  <p>{{ saleCode(selectedSale()) }} - {{ formatDate(saleDate(selectedSale())) }}</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeSaleDetail()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (detailLoading()) {
                <div class="audit-status-card"><span class="loading-dot"></span><div><h3>Cargando venta</h3><p>Consultando detalle de la transaccion.</p></div></div>
              } @else if (detailError()) {
                <div class="inline-error"><mat-icon>error</mat-icon><span>{{ detailError() }}</span></div>
              } @else if (selectedSale()) {
                <div class="form-grid detail-grid">
                  <label class="form-field"><span>Vendedor</span><strong>{{ saleSeller(selectedSale()) }}</strong></label>
                  <label class="form-field"><span>Total</span><strong>{{ formatCurrency(saleTotal(selectedSale())) }}</strong></label>
                  <label class="form-field"><span>Estado</span><strong>{{ saleStatusLabel(selectedSale()) }}</strong></label>
                  <label class="form-field"><span>Empresa</span><strong>{{ selectedSale()?.companyName || selectedSale()?.companyId || '-' }}</strong></label>
                </div>
                <div class="mini-list">
                  @for (item of saleItems(selectedSale()); track $index) {
                    <div><span>{{ item.productName || ('Producto #' + item.productId) }} x {{ item.quantity }}</span><strong>{{ formatCurrency(item.subtotal ?? ((item.unitPrice ?? 0) * item.quantity)) }}</strong></div>
                  }
                </div>
              }
            </div>

            <footer class="modal-footer">
              <button class="primary-btn" type="button" (click)="closeSaleDetail()">Cerrar</button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
})
export class SalesPage implements OnInit {
  private readonly salesService = inject(SalesService);
  private readonly productsService = inject(ProductsService);
  readonly Number = Number;

  readonly sales = signal<SaleRecord[]>([]);
  readonly products = signal<ProductItem[]>([]);
  readonly pageInfo = signal<Omit<SalesPageResponse, 'content'> | null>(null);
  readonly currentPage = signal(0);
  readonly pageSize = 10;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly createSaleOpen = signal(false);
  readonly creatingSale = signal(false);
  readonly createError = signal('');
  readonly selectedProductId = signal(0);
  readonly saleQuantity = signal(1);
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly selectedSale = signal<SaleRecord | null>(null);

  ngOnInit(): void {
    this.loadSales();
    this.loadProducts();
  }

  get filteredSales(): SaleRecord[] {
    const from = this.fromDate();
    const to = this.toDate();

    return this.sales().filter((sale) => {
      const date = saleDateOnly(this.saleDate(sale));
      return (!from || date >= from) && (!to || date <= to);
    });
  }

  get selectedProduct(): ProductItem | null {
    return this.products().find((product) => product.id === this.selectedProductId()) ?? null;
  }

  get selectedProductName(): string {
    return this.selectedProduct?.name ?? 'Selecciona un producto para registrar venta';
  }

  get selectedProductStock(): number {
    return this.selectedProduct?.stock ?? 0;
  }

  get currentSaleTotal(): number {
    return (this.selectedProduct?.price ?? 0) * (this.saleQuantity() || 0);
  }

  get canRegisterCurrentSale(): boolean {
    return !!this.selectedProduct && this.saleQuantity() > 0 && this.selectedProductStock >= this.saleQuantity();
  }

  get saleComposerMessage(): string {
    if (!this.selectedProduct) {
      return 'Selecciona producto y cantidad para validar stock.';
    }

    return this.canRegisterCurrentSale ? 'Stock disponible para registrar la venta.' : 'Stock insuficiente para completar esta venta.';
  }

  loadSales(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set('');

    this.salesService
      .getPaginated({ page, size: this.pageSize })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const { content, ...pageInfo } = response;
          this.sales.set(content);
          this.pageInfo.set(pageInfo);
          this.currentPage.set(response.page);
        },
        error: (error: Error) => {
          this.sales.set([]);
          this.pageInfo.set(null);
          this.error.set(error.message || 'Revisa que la sesion sea valida y que el backend este activo.');
        },
      });
  }

  loadProducts(): void {
    this.productsService.getAll().subscribe({ next: (products) => this.products.set(products), error: () => this.products.set([]) });
  }

  previousPage(): void {
    if (!this.pageInfo()?.first) {
      this.loadSales(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (!this.pageInfo()?.last) {
      this.loadSales(this.currentPage() + 1);
    }
  }

  openCreateSale(): void {
    this.createError.set('');
    this.selectedProductId.set(0);
    this.saleQuantity.set(1);
    this.createSaleOpen.set(true);
  }

  closeCreateSale(): void {
    if (!this.creatingSale()) {
      this.createSaleOpen.set(false);
    }
  }

  saveSale(): void {
    const request: CreateSaleRequest = {
      items: [{ productId: this.selectedProductId(), quantity: this.saleQuantity() }],
    };

    if (!request.items[0].productId || !Number.isInteger(request.items[0].quantity) || request.items[0].quantity < 1) {
      this.createError.set('Selecciona producto y una cantidad valida.');
      return;
    }

    if (!this.canRegisterCurrentSale) {
      this.createError.set('No hay stock suficiente para la cantidad solicitada.');
      return;
    }

    this.creatingSale.set(true);
    this.createError.set('');

    this.salesService
      .create(request)
      .pipe(finalize(() => this.creatingSale.set(false)))
      .subscribe({
        next: () => {
          this.createSaleOpen.set(false);
          this.loadSales(0);
          this.loadProducts();
        },
        error: (error: Error) => this.createError.set(error.message || 'No fue posible registrar la venta.'),
      });
  }

  openSaleDetail(sale: SaleRecord): void {
    this.detailOpen.set(true);
    this.detailError.set('');
    this.selectedSale.set(sale);
    this.detailLoading.set(true);

    this.salesService
      .getById(sale.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (saleDetail) => this.selectedSale.set(saleDetail),
        error: (error: Error) => this.detailError.set(error.message || 'No fue posible cargar la venta.'),
      });
  }

  closeSaleDetail(): void {
    if (!this.detailLoading()) {
      this.detailOpen.set(false);
      this.selectedSale.set(null);
      this.detailError.set('');
    }
  }

  saleCode(sale: SaleRecord | null): string {
    return sale?.code ?? (sale?.id ? `V-${sale.id}` : '-');
  }

  saleDate(sale: SaleRecord | null): string {
    return sale?.createdAt ?? sale?.saleDate ?? '';
  }

  saleSeller(sale: SaleRecord | null): string {
    return sale?.seller ?? sale?.username ?? '-';
  }

  saleTotal(sale: SaleRecord | null): number {
    return sale?.total ?? sale?.totalAmount ?? 0;
  }

  saleItems(sale: SaleRecord | null): SaleItem[] {
    return sale?.items ?? sale?.details ?? [];
  }

  saleStatusLabel(sale: SaleRecord | null): string {
    const status = String(sale?.status || 'ACTIVE').toUpperCase();

    if (status === 'CANCELLED' || status === 'CANCELED') {
      return 'Anulada';
    }

    if (status === 'INACTIVE') {
      return 'Inactiva';
    }

    return 'Activa';
  }

  saleStatusClass(sale: SaleRecord | null): string {
    return this.saleStatusLabel(sale).toLowerCase();
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

function saleDateOnly(value: string): string {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
