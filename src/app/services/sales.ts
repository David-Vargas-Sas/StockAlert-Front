import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface SaleItem {
  id?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface SaleRecord {
  id: number;
  code?: string;
  companyId?: number;
  companyName?: string;
  userId?: number;
  username?: string;
  seller?: string;
  total?: number;
  totalAmount?: number;
  status?: string;
  statusLabel?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt?: string;
  saleDate?: string;
  items?: SaleItem[];
  details?: SaleItem[];
}

export interface SalesPageResponse {
  content: SaleRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface SalesQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface CreateSaleRequest {
  customerId: number;
  items: {
    productId: number;
    quantity: number;
  }[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const SALES_URL = 'http://localhost:8080/api/sales';
const SALES_PAGINATED_URL = `${SALES_URL}/paginated`;

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getAll(): Observable<SaleRecord[]> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<SaleRecord[]>>(SALES_URL, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar las ventas.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar las ventas.')),
    );
  }

  getPaginated(query: SalesQuery = {}): Observable<SalesPageResponse> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 10)
      .set('sortBy', query.sortBy ?? 'id')
      .set('sortDirection', query.sortDirection ?? 'desc');

    return this.http.get<ApiResponse<SalesPageResponse>>(SALES_PAGINATED_URL, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar las ventas.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar las ventas.')),
    );
  }

  getById(saleId: number): Observable<SaleRecord> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<SaleRecord>>(`${SALES_URL}/${saleId}`, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar la venta.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar la venta.')),
    );
  }

  create(request: CreateSaleRequest): Observable<SaleRecord> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.post<ApiResponse<SaleRecord>>(SALES_URL, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible registrar la venta.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible registrar la venta.')),
    );
  }

  cancel(saleId: number): Observable<SaleRecord> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.patch<ApiResponse<SaleRecord>>(`${SALES_URL}/${saleId}/cancel`, null, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible anular la venta.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible anular la venta.')),
    );
  }

  sendInvoice(saleId: number): Observable<string> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.post<ApiResponse<string>>(`${SALES_URL}/${saleId}/send-invoice`, null, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible enviar la factura.');
        }

        return response.message || response.data;
      }),
      catchError(this.apiError.handle('No fue posible enviar la factura.')),
    );
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.auth.accessToken();

    if (!token) {
      return null;
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
