import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface AlertRecord {
  id: number;
  companyId: number;
  productId: number;
  productName: string;
  message: string;
  status: string;
  statusLabel?: string;
  createdAt: string;
}

export interface AlertsPageResponse {
  content: AlertRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AlertsQuery {
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

const ALERTS_URL = 'http://localhost:8080/api/alerts';
const ALERTS_PAGINATED_URL = `${ALERTS_URL}/paginated`;

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getAll(): Observable<AlertRecord[]> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<AlertRecord[]>>(ALERTS_URL, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible cargar las alertas.')),
      catchError(this.apiError.handle('No fue posible cargar las alertas.')),
    );
  }

  getPaginated(query: AlertsQuery = {}): Observable<AlertsPageResponse> {
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

    return this.http.get<ApiResponse<AlertsPageResponse>>(ALERTS_PAGINATED_URL, { headers, params }).pipe(
      map((response) => this.unwrap(response, 'No fue posible cargar las alertas.')),
      catchError(this.apiError.handle('No fue posible cargar las alertas.')),
    );
  }

  resolve(alertId: number): Observable<AlertRecord> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.put<ApiResponse<AlertRecord>>(`${ALERTS_URL}/${alertId}/resolve`, null, { headers }).pipe(
      map((response) => this.unwrap(response, 'No fue posible resolver la alerta.')),
      catchError(this.apiError.handle('No fue posible resolver la alerta.')),
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
