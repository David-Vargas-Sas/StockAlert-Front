import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface ProductItem {
  id: number;
  companyId: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  minimumStock: number;
  active: boolean;
  createdAt: string;
}

export interface ProductsPageResponse {
  content: ProductItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ProductsQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  minimumStock: number;
}

export interface UpdateProductRequest extends CreateProductRequest {
  active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const PRODUCTS_URL = 'http://localhost:8080/api/products';
const PRODUCTS_PAGINATED_URL = `${PRODUCTS_URL}/paginated`;

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getAll(): Observable<ProductItem[]> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.get<ApiResponse<ProductItem[]>>(PRODUCTS_URL, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los productos.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los productos.')),
    );
  }

  getPaginated(query: ProductsQuery = {}): Observable<ProductsPageResponse> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 10)
      .set('sortBy', query.sortBy ?? 'id')
      .set('sortDirection', query.sortDirection ?? 'asc');

    return this.http.get<ApiResponse<ProductsPageResponse>>(PRODUCTS_PAGINATED_URL, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los productos.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los productos.')),
    );
  }

  getLowStock(): Observable<ProductItem[]> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.get<ApiResponse<ProductItem[]>>(`${PRODUCTS_URL}/low-stock`, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los productos con bajo stock.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los productos con bajo stock.')),
    );
  }

  getById(productId: number): Observable<ProductItem> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.get<ApiResponse<ProductItem>>(`${PRODUCTS_URL}/${productId}`, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar el producto.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar el producto.')),
    );
  }

  create(request: CreateProductRequest): Observable<ProductItem> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post<ApiResponse<ProductItem>>(PRODUCTS_URL, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible crear el producto.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible crear el producto.')),
    );
  }

  update(productId: number, request: UpdateProductRequest): Observable<ProductItem> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.put<ApiResponse<ProductItem>>(`${PRODUCTS_URL}/${productId}`, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible actualizar el producto.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible actualizar el producto.')),
    );
  }

  activate(productId: number): Observable<ProductItem | null> {
    return this.patchStatus(productId, 'activate');
  }

  deactivate(productId: number): Observable<ProductItem | null> {
    return this.patchStatus(productId, 'deactivate');
  }

  delete(productId: number): Observable<string> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.delete<ApiResponse<string>>(`${PRODUCTS_URL}/${productId}`, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible eliminar el producto.');
        }

        return response.message || response.data;
      }),
      catchError(this.apiError.handle('No fue posible eliminar el producto.')),
    );
  }

  private patchStatus(productId: number, action: 'activate' | 'deactivate'): Observable<ProductItem | null> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.patch<ApiResponse<ProductItem | null>>(`${PRODUCTS_URL}/${productId}/${action}`, null, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || `No fue posible ${action === 'activate' ? 'activar' : 'desactivar'} el producto.`);
        }

        return response.data;
      }),
      catchError(this.apiError.handle(`No fue posible ${action === 'activate' ? 'activar' : 'desactivar'} el producto.`)),
    );
  }
}
