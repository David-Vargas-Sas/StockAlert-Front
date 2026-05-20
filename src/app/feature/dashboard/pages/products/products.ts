import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { CreateProductRequest, ProductItem, ProductsPageResponse, ProductsService, UpdateProductRequest } from '../../../../services/products';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-products-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Productos" subtitle="Gestiona inventario, precios, stock minimo y estado." />

      <div class="toolbar">
        <label>
          <mat-icon>search</mat-icon>
          <input placeholder="Buscar producto" (input)="search.set($any($event.target).value)" />
        </label>
        <select (change)="stateFilter.set($any($event.target).value)">
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Desactivado">Desactivado</option>
        </select>
        <select (change)="onStockFilterChange($any($event.target).value)">
          <option value="">Todos los stocks</option>
          <option value="Bajo stock">Bajo stock</option>
          <option value="Sin stock">Sin stock</option>
        </select>
        <button class="primary-btn" type="button" (click)="openCreateProduct()">
          <mat-icon>add</mat-icon>
          Crear producto
        </button>
      </div>

      @if (loading() || stockLoading()) {
        <div class="audit-status-card">
          <span class="loading-dot"></span>
          <div>
            <h3>{{ stockLoading() ? 'Cargando bajo stock' : 'Cargando productos' }}</h3>
            <p>{{ stockLoading() ? 'Consultando productos por debajo del stock minimo.' : 'Consultando productos registrados para tu empresa.' }}</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="audit-status-card error">
          <mat-icon>error</mat-icon>
          <div>
            <h3>No se pudieron cargar los productos</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="secondary-btn" type="button" (click)="loadProducts()">Reintentar</button>
        </div>
      }

      @if (statusError()) {
        <div class="inline-error">
          <mat-icon>error</mat-icon>
          <span>{{ statusError() }}</span>
        </div>
      }

      <div class="table-card">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Descripcion</th><th>Precio</th><th>Stock</th><th>Minimo</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @for (product of filteredProducts; track product.id) {
              <tr>
                <td><strong>{{ product.name }}</strong></td>
                <td>{{ product.description || '-' }}</td>
                <td>{{ formatCurrency(product.price) }}</td>
                <td>{{ product.stock }}</td>
                <td>{{ product.minimumStock }}</td>
                <td><span class="badge" [class]="stateClass(product)">{{ productState(product) }}</span></td>
                <td class="actions">
                  <button type="button" aria-label="Ver producto" (click)="openProductDetail(product)"><mat-icon>visibility</mat-icon></button>
                  <button type="button" aria-label="Editar producto" (click)="openEditProduct(product)"><mat-icon>edit</mat-icon></button>
                  <button
                    class="action-label"
                    [class.edit-action]="product.active"
                    type="button"
                    [attr.aria-label]="product.active ? 'Desactivar producto' : 'Activar producto'"
                    [disabled]="changingStatusId() === product.id"
                    (click)="toggleProductStatus(product)"
                  >
                    <mat-icon>{{ product.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                    {{ product.active ? 'Activo' : 'Desactivado' }}
                  </button>
                  <button type="button" aria-label="Eliminar producto" [disabled]="deletingProduct()" (click)="openDeleteProduct(product)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="table-empty">
                    <mat-icon>inventory_2</mat-icon>
                    <strong>Sin productos para mostrar</strong>
                    <span>No hay productos registrados o el filtro no encontro coincidencias.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pagination">
          <span>Mostrando {{ filteredProducts.length }} de {{ pageInfo()?.totalElements ?? filteredProducts.length }} productos</span>
          <button type="button" [disabled]="isLowStockMode || pageInfo()?.first" (click)="previousPage()">Anterior</button>
          <button type="button" [disabled]="isLowStockMode || pageInfo()?.last" (click)="nextPage()">Siguiente</button>
        </div>
      </div>

      @if (createProductOpen()) {
        <div class="modal-backdrop" (click)="closeCreateProduct()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon" [class.create]="!editingProductId()">
                  <mat-icon>{{ editingProductId() ? 'edit_square' : 'add_box' }}</mat-icon>
                </span>
                <div>
                  <h2>{{ editingProductId() ? 'Editar producto' : 'Crear producto' }}</h2>
                  <p>{{ editingProductId() ? 'Actualiza precio, inventario, minimo y estado.' : 'Registra un producto con precio, stock actual y minimo de reposicion.' }}</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeCreateProduct()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (createError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ createError() }}</span>
                </div>
              }

              <div class="form-grid">
                <label class="form-field">
                  <span>Nombre</span>
                  <input [value]="productFormName()" placeholder="Ej. Cafe premium 500g" (input)="productFormName.set($any($event.target).value)" />
                </label>
                <label class="form-field">
                  <span>Precio</span>
                  <input [value]="productFormPrice()" type="number" min="0.01" step="0.01" placeholder="0.01" (input)="productFormPrice.set($any($event.target).value)" />
                </label>
                <label class="form-field">
                  <span>Stock</span>
                  <input [value]="productFormStock()" type="number" min="0" step="1" placeholder="0" (input)="productFormStock.set($any($event.target).value)" />
                </label>
                <label class="form-field">
                  <span>Stock minimo</span>
                  <input [value]="productFormMinimumStock()" type="number" min="0" step="1" placeholder="0" (input)="productFormMinimumStock.set($any($event.target).value)" />
                </label>
                <label class="form-field">
                  <span>Descripcion</span>
                  <input [value]="productFormDescription()" placeholder="Linea, categoria o detalle corto" (input)="productFormDescription.set($any($event.target).value)" />
                </label>
              </div>

              @if (editingProductId()) {
                <label class="toggle-field">
                  <input type="checkbox" [checked]="productFormActive()" (change)="productFormActive.set($any($event.target).checked)" />
                  <span>Producto activo</span>
                </label>
              }
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeCreateProduct()">Cancelar</button>
              <button
                class="primary-btn"
                type="button"
                [disabled]="creatingProduct()"
                (click)="saveProduct()"
              >
                <mat-icon>save</mat-icon>
                {{ creatingProduct() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }

      @if (detailOpen()) {
        <div class="modal-backdrop" (click)="closeProductDetail()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon"><mat-icon>inventory_2</mat-icon></span>
                <div>
                  <h2>Detalle de producto</h2>
                  <p>Informacion operativa de inventario, precio y estado.</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeProductDetail()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (detailLoading()) {
                <div class="audit-status-card">
                  <span class="loading-dot"></span>
                  <div>
                    <h3>Cargando producto</h3>
                    <p>Consultando informacion actualizada del inventario.</p>
                  </div>
                </div>
              } @else if (detailError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ detailError() }}</span>
                </div>
              } @else if (selectedProduct()) {
                <div class="form-grid detail-grid">
                  <label class="form-field"><span>Producto</span><strong>{{ selectedProduct()?.name }}</strong></label>
                  <label class="form-field"><span>Estado</span><strong>{{ productState(selectedProduct()!) }}</strong></label>
                  <label class="form-field"><span>Precio</span><strong>{{ formatCurrency(selectedProduct()!.price) }}</strong></label>
                  <label class="form-field"><span>Stock</span><strong>{{ selectedProduct()?.stock }}</strong></label>
                  <label class="form-field"><span>Stock minimo</span><strong>{{ selectedProduct()?.minimumStock }}</strong></label>
                  <label class="form-field"><span>Empresa</span><strong>{{ selectedProduct()?.companyId || '-' }}</strong></label>
                  <label class="form-field"><span>Descripcion</span><strong>{{ selectedProduct()?.description || '-' }}</strong></label>
                  <label class="form-field"><span>Creacion</span><strong>{{ formatDate(selectedProduct()?.createdAt || '') }}</strong></label>
                </div>
              }
            </div>

            <footer class="modal-footer">
              <button class="primary-btn" type="button" (click)="closeProductDetail()">Cerrar</button>
            </footer>
          </section>
        </div>
      }

      @if (deleteProductOpen()) {
        <div class="modal-backdrop" (click)="closeDeleteProduct()">
          <section class="modal sale-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon danger"><mat-icon>delete</mat-icon></span>
                <div>
                  <h2>Eliminar producto</h2>
                  <p>Esta accion quitara el producto del inventario.</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeDeleteProduct()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (deleteError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ deleteError() }}</span>
                </div>
              }

              <div class="stock-warning">
                <mat-icon>warning</mat-icon>
                <div>
                  <strong>{{ productToDelete()?.name }}</strong>
                  <span>Confirma que deseas eliminar este producto. No se mostrara en el listado despues de guardar.</span>
                </div>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeDeleteProduct()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="deletingProduct()" (click)="confirmDeleteProduct()">
                <mat-icon>delete</mat-icon>
                {{ deletingProduct() ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
})
export class ProductsPage implements OnInit {
  private readonly productsService = inject(ProductsService);

  readonly products = signal<ProductItem[]>([]);
  readonly pageInfo = signal<Omit<ProductsPageResponse, 'content'> | null>(null);
  readonly currentPage = signal(0);
  readonly pageSize = 10;
  readonly loading = signal(false);
  readonly stockLoading = signal(false);
  readonly error = signal('');
  readonly statusError = signal('');
  readonly changingStatusId = signal<number | null>(null);
  readonly search = signal('');
  readonly stateFilter = signal('');
  readonly stockFilter = signal('');
  readonly createProductOpen = signal(false);
  readonly creatingProduct = signal(false);
  readonly createError = signal('');
  readonly editingProductId = signal<number | null>(null);
  readonly productFormName = signal('');
  readonly productFormDescription = signal('');
  readonly productFormPrice = signal('');
  readonly productFormStock = signal('');
  readonly productFormMinimumStock = signal('');
  readonly productFormActive = signal(true);
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly selectedProduct = signal<ProductItem | null>(null);
  readonly deleteProductOpen = signal(false);
  readonly deletingProduct = signal(false);
  readonly deleteError = signal('');
  readonly productToDelete = signal<ProductItem | null>(null);

  ngOnInit(): void {
    this.loadProducts();
  }

  get filteredProducts(): ProductItem[] {
    const term = this.search().trim().toLowerCase();
    const state = this.stateFilter();
    const stock = this.stockFilter();

    return this.products().filter((product) => {
      const matchesSearch = !term || [product.name, product.description].join(' ').toLowerCase().includes(term);
      const matchesState = !state || product.active === (state === 'Activo');
      const matchesStock = !stock || this.productState(product) === stock;

      return matchesSearch && matchesState && matchesStock;
    });
  }

  get isLowStockMode(): boolean {
    return this.stockFilter() === 'Bajo stock';
  }

  openCreateProduct(): void {
    this.createError.set('');
    this.editingProductId.set(null);
    this.setProductForm();
    this.createProductOpen.set(true);
  }

  openEditProduct(product: ProductItem): void {
    this.createError.set('');
    this.editingProductId.set(product.id);
    this.setProductForm(product);
    this.createProductOpen.set(true);
  }

  loadProducts(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set('');

    this.productsService
      .getPaginated({ page, size: this.pageSize })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const { content, ...pageInfo } = response;
          this.products.set(content);
          this.pageInfo.set(pageInfo);
          this.currentPage.set(response.page);
        },
        error: (error: Error) => {
          this.products.set([]);
          this.pageInfo.set(null);
          this.error.set(error.message || 'Revisa que la sesion sea valida y que el backend este activo.');
        },
      });
  }

  previousPage(): void {
    if (!this.pageInfo()?.first) {
      this.loadProducts(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (!this.pageInfo()?.last) {
      this.loadProducts(this.currentPage() + 1);
    }
  }

  onStockFilterChange(value: string): void {
    this.stockFilter.set(value);

    if (value === 'Bajo stock') {
      this.loadLowStockProducts();
    } else {
      this.loadProducts();
    }
  }

  loadLowStockProducts(): void {
    this.stockLoading.set(true);
    this.error.set('');

    this.productsService
      .getLowStock()
      .pipe(finalize(() => this.stockLoading.set(false)))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.pageInfo.set({
            page: 0,
            size: products.length,
            totalElements: products.length,
            totalPages: 1,
            first: true,
            last: true,
            empty: products.length === 0,
          });
          this.currentPage.set(0);
        },
        error: (error: Error) => {
          this.products.set([]);
          this.pageInfo.set(null);
          this.error.set(error.message || 'No fue posible cargar productos con bajo stock.');
        },
      });
  }

  closeCreateProduct(): void {
    if (!this.creatingProduct()) {
      this.createProductOpen.set(false);
      this.editingProductId.set(null);
      this.createError.set('');
    }
  }

  openProductDetail(product: ProductItem): void {
    this.detailOpen.set(true);
    this.detailError.set('');
    this.selectedProduct.set(product);

    if (product.id < 1) {
      return;
    }

    this.detailLoading.set(true);

    this.productsService
      .getById(product.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (productDetail) => this.selectedProduct.set(productDetail),
        error: (error: Error) => this.detailError.set(error.message || 'No fue posible cargar el producto.'),
      });
  }

  closeProductDetail(): void {
    if (!this.detailLoading()) {
      this.detailOpen.set(false);
      this.selectedProduct.set(null);
      this.detailError.set('');
    }
  }

  toggleProductStatus(product: ProductItem): void {
    this.statusError.set('');

    if (product.id < 1) {
      this.statusError.set('Este producto aun no tiene un ID valido del backend.');
      return;
    }

    this.changingStatusId.set(product.id);

    const request = product.active ? this.productsService.deactivate(product.id) : this.productsService.activate(product.id);

    request.pipe(finalize(() => this.changingStatusId.set(null))).subscribe({
      next: (updatedProduct) => {
        const nextProduct = updatedProduct ?? { ...product, active: !product.active };
        this.products.update((products) => products.map((item) => (item.id === nextProduct.id ? nextProduct : item)));

        if (this.selectedProduct()?.id === nextProduct.id) {
          this.selectedProduct.set(nextProduct);
        }
      },
      error: (error: Error) => this.statusError.set(error.message || 'No fue posible cambiar el estado del producto.'),
    });
  }

  openDeleteProduct(product: ProductItem): void {
    this.deleteError.set('');
    this.productToDelete.set(product);
    this.deleteProductOpen.set(true);
  }

  closeDeleteProduct(): void {
    if (!this.deletingProduct()) {
      this.deleteProductOpen.set(false);
      this.productToDelete.set(null);
      this.deleteError.set('');
    }
  }

  confirmDeleteProduct(): void {
    const product = this.productToDelete();

    if (!product || product.id < 1) {
      this.deleteError.set('Este producto no tiene un ID valido para eliminar.');
      return;
    }

    this.deletingProduct.set(true);
    this.deleteError.set('');

    this.productsService
      .delete(product.id)
      .pipe(finalize(() => this.deletingProduct.set(false)))
      .subscribe({
        next: () => {
          this.products.update((products) => products.filter((item) => item.id !== product.id));
          this.deleteProductOpen.set(false);
          this.productToDelete.set(null);
          this.deleteError.set('');

          if (this.selectedProduct()?.id === product.id) {
            this.closeProductDetail();
          }
        },
        error: (error: Error) => this.deleteError.set(error.message || 'No fue posible eliminar el producto.'),
      });
  }

  saveProduct(): void {
    const request: CreateProductRequest = {
      name: this.productFormName().trim(),
      description: this.productFormDescription().trim(),
      price: Number(this.productFormPrice()),
      stock: Number(this.productFormStock()),
      minimumStock: Number(this.productFormMinimumStock()),
    };

    if (!request.name || !request.description || !Number.isFinite(request.price) || request.price < 0.01) {
      this.createError.set('Completa nombre, descripcion y un precio valido.');
      return;
    }

    if (!Number.isInteger(request.stock) || request.stock < 0 || !Number.isInteger(request.minimumStock) || request.minimumStock < 0) {
      this.createError.set('Stock y stock minimo deben ser numeros enteros mayores o iguales a cero.');
      return;
    }

    this.creatingProduct.set(true);
    this.createError.set('');

    const editingProductId = this.editingProductId();
    const saveRequest = editingProductId
      ? this.productsService.update(editingProductId, {
          ...request,
          active: this.productFormActive(),
        } satisfies UpdateProductRequest)
      : this.productsService.create(request);

    saveRequest
      .pipe(finalize(() => this.creatingProduct.set(false)))
      .subscribe({
        next: (product) => {
          this.products.update((products) =>
            editingProductId ? products.map((item) => (item.id === product.id ? product : item)) : [product, ...products],
          );
          this.createProductOpen.set(false);
          this.editingProductId.set(null);
          this.createError.set('');

          if (!this.isLowStockMode && !editingProductId) {
            this.loadProducts(0);
          }

          if (this.selectedProduct()?.id === product.id) {
            this.selectedProduct.set(product);
          }
        },
        error: (error: Error) => this.createError.set(error.message || 'No fue posible guardar el producto.'),
      });
  }

  private setProductForm(product?: ProductItem): void {
    this.productFormName.set(product?.name ?? '');
    this.productFormDescription.set(product?.description ?? '');
    this.productFormPrice.set(product ? String(product.price) : '');
    this.productFormStock.set(product ? String(product.stock) : '');
    this.productFormMinimumStock.set(product ? String(product.minimumStock) : '');
    this.productFormActive.set(product?.active ?? true);
  }

  productState(product: ProductItem): string {
    if (!product.active) {
      return 'Desactivado';
    }

    if (product.stock === 0) {
      return 'Sin stock';
    }

    return product.stock <= product.minimumStock ? 'Bajo stock' : 'Activo';
  }

  stateClass(product: ProductItem): string {
    return this.productState(product).toLowerCase().replaceAll(' ', '-');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDate(value: string): string {
    const date = new Date(value);

    return !value || Number.isNaN(date.getTime())
      ? '-'
      : new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(date);
  }

}
