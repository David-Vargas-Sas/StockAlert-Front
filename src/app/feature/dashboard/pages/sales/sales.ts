import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { CustomerItem, CustomersService } from '../../../../services/customers';
import { ProductItem, ProductsService } from '../../../../services/products';
import { CreateSaleRequest, SaleItem, SaleRecord, SalesPageResponse, SalesService } from '../../../../services/sales';
import { FeedbackModal, FeedbackType } from '../../shared/feedback-modal';
import { PageTitle } from '../../shared/page-title';

interface SaleDraftItem {
  productId: number;
  quantity: number;
}

@Component({
  selector: 'app-sales-page',
  imports: [MatIconModule, PageTitle, FeedbackModal],
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

      <app-feedback-modal
        [title]="successMessage()"
        [message]="successDetail()"
        [type]="feedbackType()"
        (dismiss)="successMessage.set('')"
      />

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
                  <button type="button" aria-label="Enviar factura" [disabled]="sendingInvoiceId() === sale.id || isSaleCancelled(sale)" (click)="sendInvoice(sale)">
                    <mat-icon>outgoing_mail</mat-icon>
                  </button>
                  <button type="button" aria-label="Anular venta" [disabled]="isSaleCancelled(sale) || cancellingSaleId() === sale.id" (click)="cancelSale(sale)">
                    <mat-icon>block</mat-icon>
                  </button>
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

              <div class="sale-checkout">
                <div class="sale-entry-panel">
                  <label class="form-field">
                    <span>Cliente</span>
                    <select [value]="selectedCustomerId()" (change)="selectedCustomerId.set(Number($any($event.target).value))">
                      <option value="0">Selecciona cliente</option>
                      @for (customer of activeCustomers; track customer.id) {
                        <option [value]="customer.id">{{ customer.fullName }} - {{ customer.documentNumber }}</option>
                      }
                    </select>
                  </label>

                  <label class="form-field">
                    <span>Producto</span>
                    <select [value]="selectedProductId()" (change)="selectedProductId.set(Number($any($event.target).value))">
                      <option value="0">Selecciona producto</option>
                      @for (product of products(); track product.id) {
                        <option [value]="product.id">{{ product.name }} - stock {{ product.stock }}</option>
                      }
                    </select>
                  </label>

                  <div class="sale-product-row">
                    <label class="form-field">
                      <span>Cantidad</span>
                      <input type="number" min="1" step="1" [value]="saleQuantity()" (input)="saleQuantity.set(Number($any($event.target).value))" />
                    </label>
                    <label class="form-field">
                      <span>Precio unitario</span>
                      <input [value]="formatCurrency(selectedProduct?.price ?? 0)" readonly />
                    </label>
                  </div>

                  <button class="add-product-btn" type="button" (click)="addSaleItem()">
                    <mat-icon>add_shopping_cart</mat-icon>
                    Agregar al carrito
                  </button>

                  <div class="stock-warning" [class.sale-ok]="canRegisterCurrentSale">
                    <mat-icon>{{ canRegisterCurrentSale ? 'check_circle' : 'warning' }}</mat-icon>
                    <div>
                      <strong>{{ saleComposerMessage }}</strong>
                      <span>El backend validara stock antes de confirmar la venta.</span>
                    </div>
                  </div>
                </div>

                <aside class="sale-cart-panel">
                  <div class="cart-heading">
                    <div>
                      <span>Carrito</span>
                      <strong>{{ saleDraftItems().length }} productos</strong>
                    </div>
                    <mat-icon>shopping_bag</mat-icon>
                  </div>

                  <div class="cart-list">
                    @for (item of saleDraftItems(); track $index) {
                      <div class="cart-item">
                        <div>
                          <strong>{{ productName(item.productId) }}</strong>
                          <span>{{ item.quantity }} x {{ formatCurrency((itemSubtotal(item) / item.quantity) || 0) }}</span>
                        </div>
                        <strong>{{ formatCurrency(itemSubtotal(item)) }}</strong>
                        <button type="button" aria-label="Quitar producto" (click)="removeSaleItem($index)"><mat-icon>close</mat-icon></button>
                      </div>
                    } @empty {
                      <div class="cart-empty">
                        <mat-icon>add_shopping_cart</mat-icon>
                        <strong>Carrito vacio</strong>
                        <span>Agrega productos para registrar la venta.</span>
                      </div>
                    }
                  </div>

                  <div class="cart-total">
                    <span>Total venta</span>
                    <strong>{{ formatCurrency(currentSaleTotal) }}</strong>
                  </div>
                </aside>
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
              <button class="secondary-btn" type="button" [disabled]="sendingInvoiceId() === selectedSale()?.id || isSaleCancelled(selectedSale())" (click)="sendInvoice(selectedSale())">
                <mat-icon>outgoing_mail</mat-icon>
                {{ sendingInvoiceId() === selectedSale()?.id ? 'Enviando...' : 'Enviar factura' }}
              </button>
              <button class="primary-btn" type="button" (click)="closeSaleDetail()">Cerrar</button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
  styles: [`
    .sale-modal {
      width: min(920px, calc(100vw - 32px));
    }

    .sale-checkout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      gap: 18px;
    }

    .sale-entry-panel,
    .sale-cart-panel {
      border: 1px solid #d7e2f3;
      border-radius: 18px;
      background: #fff;
      padding: 18px;
    }

    .sale-entry-panel {
      display: grid;
      gap: 14px;
    }

    .sale-product-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .add-product-btn {
      min-height: 46px;
      border: 1px solid #b7c9e6;
      border-radius: 14px;
      background: #f8fbff;
      color: #14213d;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }

    .add-product-btn:hover {
      background: #eef6ff;
      border-color: #8fb0dc;
    }

    .sale-cart-panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
    }

    .cart-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .cart-heading span,
    .cart-total span {
      display: block;
      color: #59687c;
      font-size: 12px;
      font-weight: 800;
    }

    .cart-heading strong {
      display: block;
      color: #111827;
      font-size: 18px;
      margin-top: 3px;
    }

    .cart-heading mat-icon {
      color: #0f172a;
      background: #eaf2ff;
      border-radius: 14px;
      padding: 10px;
      width: 44px;
      height: 44px;
    }

    .cart-list {
      display: grid;
      gap: 10px;
      min-height: 170px;
      align-content: start;
    }

    .cart-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto 32px;
      gap: 10px;
      align-items: center;
      border: 1px solid #e4ebf5;
      border-radius: 14px;
      padding: 12px;
      background: #fff;
    }

    .cart-item div {
      min-width: 0;
    }

    .cart-item span {
      display: block;
      color: #667085;
      font-size: 12px;
      margin-top: 4px;
    }

    .cart-item button {
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: #111827;
      cursor: pointer;
      display: grid;
      place-items: center;
    }

    .cart-item button:hover {
      background: #fee2e2;
      color: #b91c1c;
    }

    .cart-empty {
      min-height: 170px;
      border: 1px dashed #c8d7ed;
      border-radius: 16px;
      color: #667085;
      display: grid;
      place-items: center;
      text-align: center;
      align-content: center;
      gap: 6px;
      padding: 18px;
    }

    .cart-empty strong {
      color: #111827;
    }

    .cart-total {
      margin-top: auto;
      border-radius: 16px;
      padding: 16px;
      background: #0f172a;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 12px;
    }

    .cart-total span {
      color: #cbd5e1;
    }

    .cart-total strong {
      font-size: 24px;
      line-height: 1;
    }

    @media (max-width: 820px) {
      .sale-checkout,
      .sale-product-row {
        grid-template-columns: 1fr;
      }

      .sale-modal {
        width: min(560px, calc(100vw - 24px));
      }
    }
  `],
})
export class SalesPage implements OnInit {
  private readonly salesService = inject(SalesService);
  private readonly productsService = inject(ProductsService);
  private readonly customersService = inject(CustomersService);
  readonly Number = Number;

  readonly sales = signal<SaleRecord[]>([]);
  readonly products = signal<ProductItem[]>([]);
  readonly customers = signal<CustomerItem[]>([]);
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
  readonly selectedCustomerId = signal(0);
  readonly selectedProductId = signal(0);
  readonly saleQuantity = signal(1);
  readonly saleDraftItems = signal<SaleDraftItem[]>([]);
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly selectedSale = signal<SaleRecord | null>(null);
  readonly cancellingSaleId = signal<number | null>(null);
  readonly sendingInvoiceId = signal<number | null>(null);
  readonly successMessage = signal('');
  readonly successDetail = signal('');
  readonly feedbackType = signal<FeedbackType>('success');

  ngOnInit(): void {
    this.loadSales();
    this.loadProducts();
    this.loadCustomers();
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

  get activeCustomers(): CustomerItem[] {
    return this.customers().filter((customer) => customer.active !== false);
  }

  get selectedProductName(): string {
    return this.selectedProduct?.name ?? 'Selecciona un producto para registrar venta';
  }

  get selectedProductStock(): number {
    return this.selectedProduct?.stock ?? 0;
  }

  get currentSaleTotal(): number {
    return this.saleDraftItems().reduce((total, item) => total + this.itemSubtotal(item), 0);
  }

  get canRegisterCurrentSale(): boolean {
    return this.saleDraftItems().length > 0 && this.saleDraftItems().every((item) => this.isDraftItemValid(item));
  }

  get saleComposerMessage(): string {
    if (this.saleDraftItems().length === 0) {
      return 'Agrega productos y cantidades para validar stock.';
    }

    return this.canRegisterCurrentSale ? 'Stock disponible para registrar la venta.' : 'Hay productos con cantidad invalida o stock insuficiente.';
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

  loadCustomers(): void {
    this.customersService.getAll().subscribe({ next: (customers) => this.customers.set(customers), error: () => this.customers.set([]) });
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
    this.selectedCustomerId.set(0);
    this.selectedProductId.set(0);
    this.saleQuantity.set(1);
    this.saleDraftItems.set([]);
    this.createSaleOpen.set(true);
  }

  closeCreateSale(): void {
    if (!this.creatingSale()) {
      this.createSaleOpen.set(false);
      this.createError.set('');
    }
  }

  saveSale(): void {
    const request: CreateSaleRequest = {
      customerId: this.selectedCustomerId(),
      items: this.saleDraftItems(),
    };

    if (!request.customerId) {
      this.createError.set('Selecciona un cliente.');
      return;
    }

    if (request.items.length === 0) {
      this.createError.set('Agrega al menos un producto a la venta.');
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
          this.createError.set('');
          this.loadSales(0);
          this.loadProducts();
        },
        error: (error: Error) => this.createError.set(error.message || 'No fue posible registrar la venta.'),
      });
  }

  addSaleItem(): void {
    const productId = this.selectedProductId();
    const quantity = this.saleQuantity();

    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      this.createError.set('Selecciona producto y una cantidad valida.');
      return;
    }

    const product = this.products().find((item) => item.id === productId);

    if (!product || product.stock < quantity) {
      this.createError.set('No hay stock suficiente para la cantidad solicitada.');
      return;
    }

    this.createError.set('');
    this.saleDraftItems.update((items) => {
      const existing = items.find((item) => item.productId === productId);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;

      if (product.stock < nextQuantity) {
        this.createError.set('La suma de cantidades supera el stock disponible.');
        return items;
      }

      return existing
        ? items.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item))
        : [...items, { productId, quantity }];
    });
  }

  removeSaleItem(index: number): void {
    this.saleDraftItems.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  productName(productId: number): string {
    return this.products().find((product) => product.id === productId)?.name ?? `Producto #${productId}`;
  }

  itemSubtotal(item: SaleDraftItem): number {
    const product = this.products().find((product) => product.id === item.productId);
    return (product?.price ?? 0) * item.quantity;
  }

  private isDraftItemValid(item: SaleDraftItem): boolean {
    const product = this.products().find((product) => product.id === item.productId);
    return !!product && Number.isInteger(item.quantity) && item.quantity > 0 && product.stock >= item.quantity;
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

  cancelSale(sale: SaleRecord): void {
    if (this.isSaleCancelled(sale) || this.cancellingSaleId() !== null) {
      return;
    }

    const confirmed = window.confirm(`Anular la venta ${this.saleCode(sale)}? Esta accion actualizara el inventario.`);

    if (!confirmed) {
      return;
    }

    this.error.set('');
    this.cancellingSaleId.set(sale.id);

    this.salesService
      .cancel(sale.id)
      .pipe(finalize(() => this.cancellingSaleId.set(null)))
      .subscribe({
        next: (updatedSale) => {
          this.sales.update((sales) => sales.map((item) => (item.id === updatedSale.id ? updatedSale : item)));

          if (this.selectedSale()?.id === updatedSale.id) {
            this.selectedSale.set(updatedSale);
          }

          this.productsService.getAll().subscribe({ next: (products) => this.products.set(products), error: () => undefined });
        },
        error: (error: Error) => this.error.set(error.message || 'No fue posible anular la venta.'),
      });
  }

  sendInvoice(sale: SaleRecord | null): void {
    if (!sale || this.sendingInvoiceId() !== null || this.isSaleCancelled(sale)) {
      return;
    }

    this.error.set('');
    this.detailError.set('');
    this.successMessage.set('');
    this.sendingInvoiceId.set(sale.id);

    this.salesService
      .sendInvoice(sale.id)
      .pipe(finalize(() => this.sendingInvoiceId.set(null)))
      .subscribe({
        next: (message) => {
          this.feedbackType.set('success');
          this.successMessage.set(message || 'Factura enviada correctamente');
          this.successDetail.set(`La factura ${this.saleCode(sale)} fue enviada al correo del cliente.`);
        },
        error: (error: Error) => {
          const message = error.message || 'No fue posible enviar la factura.';
          if (this.detailOpen()) {
            this.detailError.set(message);
          } else {
            this.error.set(message);
          }
        },
      });
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
    if (sale?.statusLabel) {
      return sale.statusLabel;
    }

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
    if (this.isSaleCancelled(sale)) {
      return 'anulada';
    }

    return this.saleStatusLabel(sale).toLowerCase();
  }

  isSaleCancelled(sale: SaleRecord | null): boolean {
    const status = String(sale?.status || '').toUpperCase();
    return status === 'CANCELLED' || status === 'CANCELED';
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
