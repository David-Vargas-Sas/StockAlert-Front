import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface SupplierItem {
  id: number;
  companyId: number;
  name: string;
  taxId: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  taxId: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
}

export interface UpdateSupplierRequest extends CreateSupplierRequest {
  active: boolean;
}

export interface SuppliersPageResponse {
  content: SupplierItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface SuppliersQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

const SUPPLIERS_URL = 'http://localhost:8080/api/suppliers';
const SUPPLIERS_PAGINATED_URL = `${SUPPLIERS_URL}/paginated`;

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getAll(): Observable<SupplierItem[]> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.get<ApiResponse<SupplierItem[]>>(SUPPLIERS_URL, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los proveedores.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los proveedores.')),
    );
  }

  getPaginated(query: SuppliersQuery = {}): Observable<SuppliersPageResponse> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const params = {
      page: String(query.page ?? 0),
      size: String(query.size ?? 10),
      sortBy: query.sortBy ?? 'id',
      sortDirection: query.sortDirection ?? 'asc',
    };

    return this.http.get<ApiResponse<SuppliersPageResponse>>(SUPPLIERS_PAGINATED_URL, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los proveedores.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los proveedores.')),
    );
  }

  getById(supplierId: number): Observable<SupplierItem> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.get<ApiResponse<SupplierItem>>(`${SUPPLIERS_URL}/${supplierId}`, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar el proveedor.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar el proveedor.')),
    );
  }

  create(request: CreateSupplierRequest): Observable<SupplierItem> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post<ApiResponse<SupplierItem>>(SUPPLIERS_URL, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible crear el proveedor.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible crear el proveedor.')),
    );
  }

  update(supplierId: number, request: UpdateSupplierRequest): Observable<SupplierItem> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.put<ApiResponse<SupplierItem>>(`${SUPPLIERS_URL}/${supplierId}`, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible actualizar el proveedor.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible actualizar el proveedor.')),
    );
  }

  activate(supplierId: number): Observable<SupplierItem> {
    return this.patchStatus(supplierId, 'activate');
  }

  deactivate(supplierId: number): Observable<SupplierItem> {
    return this.patchStatus(supplierId, 'deactivate');
  }

  delete(supplierId: number): Observable<string> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.delete<ApiResponse<string> | string>(`${SUPPLIERS_URL}/${supplierId}`, { headers }).pipe(
      map((response) => {
        if (typeof response === 'string') {
          return response || 'Proveedor eliminado correctamente';
        }

        if (!response.success) {
          throw new Error(response.message || 'No fue posible eliminar el proveedor.');
        }

        return response.message || response.data;
      }),
      catchError(this.apiError.handle('No fue posible eliminar el proveedor.')),
    );
  }

  private patchStatus(supplierId: number, action: 'activate' | 'deactivate'): Observable<SupplierItem> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const fallback = `No fue posible ${action === 'activate' ? 'activar' : 'desactivar'} el proveedor.`;

    return this.http.patch<ApiResponse<SupplierItem>>(`${SUPPLIERS_URL}/${supplierId}/${action}`, null, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || fallback);
        }

        return response.data;
      }),
      catchError(this.apiError.handle(fallback)),
    );
  }
}
