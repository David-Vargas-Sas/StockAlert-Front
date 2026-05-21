import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../services/auth';
import { AdjustmentOutRequest, InventoryAdjustmentType, InventoryMovement, InventoryMovementsService } from '../../../../services/inventory-movements';
import { ProductItem, ProductsService } from '../../../../services/products';
import { DashboardSelect, DashboardSelectOption } from '../../shared/dashboard-select';
import { FeedbackModal } from '../../shared/feedback-modal';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-inventory-page',
  imports: [MatIconModule, PageTitle, FeedbackModal, DashboardSelect],
  template: `
    <section class="page inventory-page">
      <app-page-title title="Inventario" subtitle="Consulta stock, movimientos y ajustes manuales autorizados." />

      <div class="toolbar inventory-toolbar">
        <label><mat-icon>search</mat-icon><input placeholder="Buscar producto o movimiento" [value]="search()" (input)="search.set(inputValue($event))" /></label>
        <app-dashboard-select [options]="stockOptions" [value]="stockFilter()" (valueChange)="stockFilter.set($event)" />
        <app-dashboard-select [options]="movementProductOptions" [value]="movementProductId()" (valueChange)="changeMovementProduct($event)" />
        <button class="secondary-btn" type="button" [disabled]="!canAdjustInventory()" (click)="openAdjustment('in')"><mat-icon>add_shopping_cart</mat-icon>Ajuste entrada</button>
        <button class="primary-btn" type="button" [disabled]="!canAdjustInventory()" (click)="openAdjustment('out')"><mat-icon>remove_shopping_cart</mat-icon>Ajuste salida</button>
      </div>

      @if (!canAdjustInventory()) {
        <div class="inline-error"><mat-icon>lock</mat-icon><span>Tu usuario puede ver inventario, pero no tiene permiso para ajustar stock.</span></div>
      }

      @if (loadError()) {
        <div class="inline-error"><mat-icon>error</mat-icon><span>{{ loadError() }}</span></div>
      }

      @if (movementsError()) {
        <div class="inline-error"><mat-icon>error</mat-icon><span>{{ movementsError() }}</span></div>
      }

      <app-feedback-modal
        [title]="successMessage()"
        type="create"
        message="El movimiento quedo registrado y el stock fue actualizado."
        (dismiss)="successMessage.set('')"
      />

      <div class="kpi-grid inventory-kpis">
        <article class="kpi-card"><div><span>Productos monitoreados</span><strong>{{ products().length }}</strong><small>Catalogo activo</small></div><mat-icon>warehouse</mat-icon></article>
        <article class="kpi-card cyan"><div><span>Movimientos</span><strong>{{ movementsTotalElements() }}</strong><small>Registros encontrados</small></div><mat-icon>tune</mat-icon></article>
        <article class="kpi-card red"><div><span>Sin stock</span><strong>{{ emptyStockCount }}</strong><small>Requieren revision</small></div><mat-icon>production_quantity_limits</mat-icon></article>
      </div>

      <div class="table-card inventory-table">
        <table>
          <thead>
            <tr><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock final</th><th>Fecha</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @if (loadingProducts() || loadingMovements()) {
              <tr>
                <td colspan="6">
                  <div class="table-empty"><span class="loading-dot"></span><strong>Cargando inventario</strong><span>Consultando productos y movimientos registrados.</span></div>
                </td>
              </tr>
            } @else {
              @for (movement of filteredMovements(); track movement.id) {
                <tr>
                  <td><strong>{{ movement.productName || ('Producto #' + movement.productId) }}</strong><small class="muted-line">{{ movement.notes || 'Sin notas' }}</small></td>
                  <td><span class="badge" [class]="movementTypeClass(movement)">{{ movementTypeLabel(movement) }}</span></td>
                  <td>{{ movement.quantity }}</td>
                  <td>{{ movement.newStock }}</td>
                  <td>{{ formatDate(movement.createdAt) }}</td>
                  <td class="actions">
                    <button type="button" aria-label="Ajuste de entrada" [disabled]="!canAdjustInventory()" (click)="openAdjustment('in', productById(movement.productId) ?? undefined)"><mat-icon>add_circle</mat-icon></button>
                    <button type="button" aria-label="Ajuste de salida" [disabled]="!canAdjustInventory() || (productById(movement.productId)?.stock ?? 0) <= 0" (click)="openAdjustment('out', productById(movement.productId) ?? undefined)"><mat-icon>remove_circle</mat-icon></button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <div class="table-empty"><mat-icon>inventory_2</mat-icon><strong>Sin movimientos para mostrar</strong><span>No hay movimientos registrados o el filtro no encontro coincidencias.</span></div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
        <div class="pagination">
          <span>Mostrando {{ filteredMovements().length }} de {{ movementsTotalElements() }} movimientos</span>
          <button type="button" [disabled]="movementsFirstPage()" (click)="previousMovementsPage()">Anterior</button>
          <button type="button" [disabled]="movementsLastPage()" (click)="nextMovementsPage()">Siguiente</button>
        </div>
      </div>

      @if (adjustmentOpen()) {
        <div class="modal-backdrop" (click)="closeAdjustment()">
          <section class="modal sale-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon"><mat-icon>{{ adjustmentType() === 'in' ? 'add_shopping_cart' : 'remove_shopping_cart' }}</mat-icon></span>
                <div><h2>Ajuste de {{ adjustmentType() === 'in' ? 'entrada' : 'salida' }}</h2><p>Registra un movimiento manual autorizado de inventario.</p></div>
              </div>
              <button class="modal-close" type="button" (click)="closeAdjustment()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (adjustmentError()) {
                <div class="inline-error"><mat-icon>error</mat-icon><span>{{ adjustmentError() }}</span></div>
              }

              <div class="sale-form">
                <label class="form-field product-field">
                  <span>Producto</span>
                  <select [value]="selectedProductId()" (change)="selectedProductId.set(Number(inputValue($event)))">
                    <option value="0">Selecciona producto</option>
                    @for (product of products(); track product.id) {
                      <option [value]="product.id">{{ product.name }} - stock {{ product.stock }}</option>
                    }
                  </select>
                </label>
                <label class="form-field"><span>Cantidad</span><input type="number" min="1" step="1" [value]="quantity()" (input)="quantity.set(Number(inputValue($event)))" /></label>
                <label class="form-field product-field"><span>Notas</span><input [value]="notes()" (input)="notes.set(inputValue($event))" placeholder="Motivo del ajuste" /></label>
                <div class="stock-warning" [class.sale-ok]="canSaveAdjustment">
                  <mat-icon>{{ canSaveAdjustment ? 'check_circle' : 'warning' }}</mat-icon>
                  <div><strong>{{ adjustmentMessage }}</strong><span>El backend validara el movimiento antes de confirmar.</span></div>
                </div>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeAdjustment()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="savingAdjustment()" (click)="saveAdjustment()">
                <mat-icon>save</mat-icon>
                {{ savingAdjustment() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .inventory-page {
        display: grid;
        gap: 18px;
      }

      .inventory-toolbar,
      .inventory-kpis {
        margin-bottom: 0;
      }

      .inventory-toolbar {
        align-items: stretch;
      }

      .inventory-toolbar label {
        flex: 1 1 260px;
        max-width: 360px;
      }

      .inventory-toolbar app-dashboard-select {
        flex: 0 1 220px;
      }

      .inventory-toolbar .secondary-btn,
      .inventory-toolbar .primary-btn {
        flex: 0 0 auto;
      }

      .inventory-kpis {
        grid-template-columns: repeat(3, minmax(220px, 1fr));
        gap: 16px;
        max-width: 980px;
      }

      .inventory-kpis .kpi-card {
        min-height: 118px;
      }

      .inventory-table {
        margin-top: 2px;
      }

      .inventory-table table {
        min-width: 900px;
      }

      .inventory-table .table-empty {
        min-height: 150px;
      }

      @media (max-width: 960px) {
        .inventory-kpis {
          grid-template-columns: 1fr;
          max-width: none;
        }

        .inventory-toolbar label,
        .inventory-toolbar app-dashboard-select,
        .inventory-toolbar .secondary-btn,
        .inventory-toolbar .primary-btn {
          flex: 1 1 100%;
          max-width: none;
        }
      }
    `,
  ],
})
export class InventoryPage implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly inventoryMovementsService = inject(InventoryMovementsService);
  private readonly auth = inject(AuthService);
  readonly Number = Number;

  readonly products = signal<ProductItem[]>([]);
  readonly movements = signal<InventoryMovement[]>([]);
  readonly search = signal('');
  readonly stockFilter = signal('all');
  readonly stockOptions: DashboardSelectOption[] = [
    { label: 'Todos los productos', value: 'all' },
    { label: 'Bajo stock', value: 'low' },
    { label: 'Sin stock', value: 'empty' },
  ];
  readonly loadingProducts = signal(false);
  readonly loadingMovements = signal(false);
  readonly loadError = signal('');
  readonly movementsError = signal('');
  readonly successMessage = signal('');
  readonly adjustmentOpen = signal(false);
  readonly adjustmentType = signal<InventoryAdjustmentType>('out');
  readonly savingAdjustment = signal(false);
  readonly adjustmentError = signal('');
  readonly selectedProductId = signal(0);
  readonly quantity = signal(1);
  readonly notes = signal('');
  readonly movementProductId = signal(0);
  readonly movementsPage = signal(0);
  readonly movementsSize = signal(10);
  readonly movementsTotalElements = signal(0);
  readonly movementsFirstPage = signal(true);
  readonly movementsLastPage = signal(true);
  readonly canAdjustInventory = computed(() => this.auth.hasPermission('INVENTORY_ADJUST'));

  readonly filteredProducts = computed(() => {
    const term = this.search().trim().toLowerCase();
    const filter = this.stockFilter();

    return this.products().filter((product) => {
      const matchesTerm = [product.name, product.description].some((value) => value.toLowerCase().includes(term));
      const matchesStock =
        filter === 'all' ||
        (filter === 'low' && product.stock > 0 && product.stock <= product.minimumStock) ||
        (filter === 'empty' && product.stock <= 0);

      return matchesTerm && matchesStock;
    });
  });

  readonly filteredMovements = computed(() => {
    const term = this.search().trim().toLowerCase();

    return this.movements().filter((movement) =>
      [movement.productName, movement.type, movement.notes ?? '', movement.createdBy ?? ''].some((value) => value.toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.loadProducts();
    this.loadMovements();
  }

  get selectedProduct(): ProductItem | null {
    return this.products().find((product) => product.id === this.selectedProductId()) ?? null;
  }

  get emptyStockCount(): number {
    return this.products().filter((product) => product.stock <= 0).length;
  }

  get movementProductOptions(): DashboardSelectOption[] {
    return [
      { label: 'Todos los movimientos', value: 0 },
      ...this.products().map((product) => ({ label: product.name, value: product.id })),
    ];
  }

  get canSaveAdjustment(): boolean {
    const hasValidQuantity = Number.isInteger(this.quantity()) && this.quantity() > 0;
    return !!this.selectedProduct && hasValidQuantity && (this.adjustmentType() === 'in' || this.quantity() <= (this.selectedProduct?.stock ?? 0));
  }

  get adjustmentMessage(): string {
    if (!this.selectedProduct) {
      return 'Selecciona un producto para validar stock.';
    }

    if (this.adjustmentType() === 'in') {
      return this.canSaveAdjustment ? 'Cantidad valida para registrar la entrada.' : 'Ingresa una cantidad valida.';
    }

    return this.canSaveAdjustment ? 'Stock suficiente para registrar la salida.' : 'Cantidad invalida o superior al stock disponible.';
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  loadProducts(): void {
    this.loadingProducts.set(true);
    this.loadError.set('');

    this.productsService
      .getAll()
      .pipe(finalize(() => this.loadingProducts.set(false)))
      .subscribe({
        next: (products) => this.products.set(products),
        error: (error: Error) => this.loadError.set(error.message || 'No fue posible cargar el inventario.'),
      });
  }

  loadMovements(page = this.movementsPage()): void {
    this.loadingMovements.set(true);
    this.movementsError.set('');

    this.inventoryMovementsService
      .getPaginated({
        productId: this.movementProductId() || undefined,
        page,
        size: this.movementsSize(),
        sortBy: 'id',
        sortDirection: 'desc',
      })
      .pipe(finalize(() => this.loadingMovements.set(false)))
      .subscribe({
        next: (response) => {
          this.movements.set(response.content ?? []);
          this.movementsPage.set(response.page ?? page);
          this.movementsSize.set(response.size ?? this.movementsSize());
          this.movementsTotalElements.set(response.totalElements ?? 0);
          this.movementsFirstPage.set(response.first ?? true);
          this.movementsLastPage.set(response.last ?? true);
        },
        error: (error: Error) => this.movementsError.set(error.message || 'No fue posible cargar los movimientos de inventario.'),
      });
  }

  changeMovementProduct(value: string): void {
    this.movementProductId.set(Number(value));
    this.loadMovements(0);
  }

  previousMovementsPage(): void {
    if (!this.movementsFirstPage()) {
      this.loadMovements(this.movementsPage() - 1);
    }
  }

  nextMovementsPage(): void {
    if (!this.movementsLastPage()) {
      this.loadMovements(this.movementsPage() + 1);
    }
  }

  openAdjustment(type: InventoryAdjustmentType, product?: ProductItem): void {
    if (!this.canAdjustInventory()) {
      this.adjustmentError.set('Tu usuario no tiene permiso INVENTORY_ADJUST.');
      return;
    }

    this.adjustmentType.set(type);
    this.selectedProductId.set(product?.id ?? 0);
    this.quantity.set(1);
    this.notes.set('');
    this.adjustmentError.set('');
    this.successMessage.set('');
    this.adjustmentOpen.set(true);
  }

  closeAdjustment(): void {
    if (!this.savingAdjustment()) {
      this.adjustmentOpen.set(false);
      this.adjustmentError.set('');
    }
  }

  saveAdjustment(): void {
    const request: AdjustmentOutRequest = {
      productId: this.selectedProductId(),
      quantity: this.quantity(),
      notes: this.notes().trim(),
    };

    if (!this.canSaveAdjustment) {
      this.adjustmentError.set('Selecciona producto y una cantidad valida.');
      return;
    }

    if (!request.notes) {
      this.adjustmentError.set('Ingresa una nota para justificar el ajuste.');
      return;
    }

    this.savingAdjustment.set(true);
    this.adjustmentError.set('');
    const adjustmentRequest = this.adjustmentType() === 'in'
      ? this.inventoryMovementsService.adjustmentIn(request)
      : this.inventoryMovementsService.adjustmentOut(request);

    adjustmentRequest
      .pipe(finalize(() => this.savingAdjustment.set(false)))
      .subscribe({
        next: (movement) => {
          this.movements.update((items) => [movement, ...items]);
          this.movementsTotalElements.update((total) => total + 1);
          this.products.update((products) => products.map((product) => (product.id === movement.productId ? { ...product, stock: movement.newStock } : product)));
          this.adjustmentOpen.set(false);
          this.successMessage.set(`Ajuste de ${this.adjustmentType() === 'in' ? 'entrada' : 'salida'} registrado correctamente`);
        },
        error: (error: Error) => this.adjustmentError.set(error.message || `No fue posible registrar el ajuste de ${this.adjustmentType() === 'in' ? 'entrada' : 'salida'}.`),
      });
  }

  stockStatusLabel(product: ProductItem): string {
    if (product.stock <= 0) {
      return 'Sin stock';
    }

    return product.stock <= product.minimumStock ? 'Bajo stock' : 'Disponible';
  }

  stockStatusClass(product: ProductItem): string {
    const label = this.stockStatusLabel(product);
    return label === 'Sin stock' ? 'inactiva' : label === 'Bajo stock' ? 'bajo-stock' : 'activa';
  }

  lastMovementLabel(productId: number): string {
    const movement = this.movements().find((item) => item.productId === productId);
    return movement ? `${this.movementTypeLabel(movement)} x ${movement.quantity}` : '-';
  }

  productById(productId: number): ProductItem | null {
    return this.products().find((product) => product.id === productId) ?? null;
  }

  movementTypeLabel(movement: InventoryMovement): string {
    if (movement.typeLabel) {
      return movement.typeLabel;
    }

    const type = String(movement.type || '').toUpperCase();

    if (type === 'ADJUSTMENT_IN') {
      return 'Ajuste entrada';
    }

    if (type === 'ADJUSTMENT_OUT') {
      return 'Ajuste salida';
    }

    if (type === 'PURCHASE') {
      return 'Compra';
    }

    if (type === 'SALE') {
      return 'Venta';
    }

    return type || '-';
  }

  movementTypeClass(movement: InventoryMovement): string {
    const type = String(movement.type || '').toUpperCase();
    return type === 'ADJUSTMENT_OUT' || type === 'SALE' ? 'inactiva' : 'activa';
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return !value || Number.isNaN(date.getTime())
      ? '-'
      : new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }
}
