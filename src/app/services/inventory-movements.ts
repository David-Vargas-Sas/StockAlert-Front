import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface InventoryMovement {
  id: number;
  companyId: number;
  productId: number;
  productName: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface AdjustmentOutRequest {
  productId: number;
  quantity: number;
  notes: string;
}

export type InventoryAdjustmentType = 'in' | 'out';

export interface InventoryMovementsPageResponse {
  content: InventoryMovement[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface InventoryMovementsQuery {
  productId?: number;
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

const INVENTORY_MOVEMENTS_URL = 'http://localhost:8080/api/inventory-movements';

@Injectable({ providedIn: 'root' })
export class InventoryMovementsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getPaginated(query: InventoryMovementsQuery = {}): Observable<InventoryMovementsPageResponse> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const params: Record<string, string> = {
      page: String(query.page ?? 0),
      size: String(query.size ?? 10),
      sortBy: query.sortBy ?? 'id',
      sortDirection: query.sortDirection ?? 'desc',
    };

    if (query.productId) {
      params['productId'] = String(query.productId);
    }

    return this.http.get<ApiResponse<InventoryMovementsPageResponse>>(`${INVENTORY_MOVEMENTS_URL}/paginated`, { headers, params }).pipe(
      map((response) => this.unwrap(response, 'No fue posible cargar los movimientos de inventario.')),
      catchError(this.apiError.handle('No fue posible cargar los movimientos de inventario.')),
    );
  }

  adjustmentOut(request: AdjustmentOutRequest): Observable<InventoryMovement> {
    return this.adjustment('out', request);
  }

  adjustmentIn(request: AdjustmentOutRequest): Observable<InventoryMovement> {
    return this.adjustment('in', request);
  }

  private adjustment(type: InventoryAdjustmentType, request: AdjustmentOutRequest): Observable<InventoryMovement> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const label = type === 'in' ? 'entrada' : 'salida';

    return this.http.patch<ApiResponse<InventoryMovement>>(`${INVENTORY_MOVEMENTS_URL}/adjustment-${type}`, request, { headers }).pipe(
      map((response) => this.unwrap(response, `No fue posible registrar el ajuste de ${label}.`)),
      catchError(this.apiError.handle(`No fue posible registrar el ajuste de ${label}.`)),
    );
  }

  private unwrap<T>(response: ApiResponse<T>, fallback: string): T {
    if (!response.success) {
      throw new Error(response.message || fallback);
    }

    return response.data;
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.auth.accessToken();

    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : null;
  }
}
