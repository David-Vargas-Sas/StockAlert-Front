import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface CustomerItem {
  id: number;
  companyId?: number;
  fullName: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  active?: boolean;
  createdAt?: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  active: boolean;
}

export interface CustomersPageResponse {
  content: CustomerItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CustomersQuery {
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

const CUSTOMERS_URL = 'http://localhost:8080/api/customers';
const CUSTOMERS_PAGINATED_URL = `${CUSTOMERS_URL}/paginated`;

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getAll(): Observable<CustomerItem[]> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<CustomerItem[]>>(CUSTOMERS_URL, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible cargar los clientes.')),
      catchError(this.apiError.handle('No fue posible cargar los clientes.')),
    );
  }

  getById(customerId: number): Observable<CustomerItem> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<CustomerItem>>(`${CUSTOMERS_URL}/${customerId}`, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible cargar el cliente.')),
      catchError(this.apiError.handle('No fue posible cargar el cliente.')),
    );
  }

  getPaginated(query: CustomersQuery = {}): Observable<CustomersPageResponse> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const params = {
      page: String(query.page ?? 0),
      size: String(query.size ?? 10),
      sortBy: query.sortBy ?? 'id',
      sortDirection: query.sortDirection ?? 'asc',
    };

    return this.http.get<ApiResponse<CustomersPageResponse>>(CUSTOMERS_PAGINATED_URL, { headers, params }).pipe(
      map((response) => this.unwrap(response, 'No fue posible cargar los clientes.')),
      catchError(this.apiError.handle('No fue posible cargar los clientes.')),
    );
  }

  create(request: CreateCustomerRequest): Observable<CustomerItem> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.post<ApiResponse<CustomerItem>>(CUSTOMERS_URL, request, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible crear el cliente.')),
      catchError(this.apiError.handle('No fue posible crear el cliente.')),
    );
  }

  update(customerId: number, request: UpdateCustomerRequest): Observable<CustomerItem> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.put<ApiResponse<CustomerItem>>(`${CUSTOMERS_URL}/${customerId}`, request, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible actualizar el cliente.')),
      catchError(this.apiError.handle('No fue posible actualizar el cliente.')),
    );
  }

  activate(customerId: number): Observable<CustomerItem> {
    return this.patchStatus(customerId, 'activate');
  }

  deactivate(customerId: number): Observable<CustomerItem> {
    return this.patchStatus(customerId, 'deactivate');
  }

  delete(customerId: number): Observable<string> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.delete<ApiResponse<string>>(`${CUSTOMERS_URL}/${customerId}`, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible eliminar el cliente.');
        }

        return response.message || response.data;
      }),
      catchError(this.apiError.handle('No fue posible eliminar el cliente.')),
    );
  }

  private unwrap<T>(response: ApiResponse<T>, fallback: string): T {
    if (!response.success) {
      throw new Error(response.message || fallback);
    }

    return response.data;
  }

  private patchStatus(customerId: number, action: 'activate' | 'deactivate'): Observable<CustomerItem> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const fallback = `No fue posible ${action === 'activate' ? 'activar' : 'desactivar'} el cliente.`;

    return this.http.patch<ApiResponse<CustomerItem>>(`${CUSTOMERS_URL}/${customerId}/${action}`, null, { headers }).pipe(
      map((response) => this.unwrap(response, fallback)),
      catchError(this.apiError.handle(fallback)),
    );
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.auth.accessToken();

    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : null;
  }
}
