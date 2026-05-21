import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface PurchaseDetail {
  productId: number;
  productName?: string;
  quantity: number;
  unitCost: number;
  subtotal?: number;
}

export interface PurchaseRecord {
  id: number;
  companyId: number;
  supplierId: number;
  supplierName: string;
  purchaseDate: string;
  status: string;
  statusLabel?: string;
  total: number;
  cancelledAt?: string;
  cancelledBy?: string;
  details: PurchaseDetail[];
}

export interface PurchasesPageResponse {
  content: PurchaseRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PurchasesQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface CreatePurchaseRequest {
  supplierId: number;
  items: {
    productId: number;
    quantity: number;
    unitCost: number;
  }[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

const PURCHASES_URL = 'http://localhost:8080/api/purchases';
const PURCHASES_PAGINATED_URL = `${PURCHASES_URL}/paginated`;

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getAll(): Observable<PurchaseRecord[]> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<PurchaseRecord[]>>(PURCHASES_URL, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible cargar las compras.')),
      catchError(this.apiError.handle('No fue posible cargar las compras.')),
    );
  }

  getPaginated(query: PurchasesQuery = {}): Observable<PurchasesPageResponse> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 10)
      .set('sortBy', query.sortBy ?? 'id')
      .set('sortDirection', query.sortDirection ?? 'desc');

    return this.http.get<ApiResponse<PurchasesPageResponse | PurchaseRecord[]>>(PURCHASES_PAGINATED_URL, { headers, params }).pipe(
      map((response) => this.toPageResponse(this.unwrap(response, 'No fue posible cargar las compras.'), query)),
      catchError(this.apiError.handle('No fue posible cargar las compras.')),
    );
  }

  getById(purchaseId: number): Observable<PurchaseRecord> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<PurchaseRecord>>(`${PURCHASES_URL}/${purchaseId}`, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible cargar la compra.')),
      catchError(this.apiError.handle('No fue posible cargar la compra.')),
    );
  }

  create(request: CreatePurchaseRequest): Observable<PurchaseRecord> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.post<ApiResponse<PurchaseRecord>>(PURCHASES_URL, request, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible registrar la compra.')),
      catchError(this.apiError.handle('No fue posible registrar la compra.')),
    );
  }

  cancel(purchaseId: number): Observable<PurchaseRecord> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.patch<ApiResponse<PurchaseRecord>>(`${PURCHASES_URL}/${purchaseId}/cancel`, null, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible anular la compra.')),
      catchError(this.apiError.handle('No fue posible anular la compra.')),
    );
  }

  private unwrap<T>(response: ApiResponse<T>, fallback: string): T {
    if (!response.success) {
      throw new Error(response.message || fallback);
    }

    return response.data;
  }

  private toPageResponse(data: PurchasesPageResponse | PurchaseRecord[], query: PurchasesQuery): PurchasesPageResponse {
    if (!Array.isArray(data)) {
      return data;
    }

    const page = query.page ?? 0;
    const size = query.size ?? data.length;

    return {
      content: data,
      page,
      size,
      totalElements: data.length,
      totalPages: data.length ? 1 : 0,
      first: page === 0,
      last: true,
      empty: data.length === 0,
    };
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.auth.accessToken();

    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : null;
  }
}
