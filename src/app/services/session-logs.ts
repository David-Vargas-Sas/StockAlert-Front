import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface SessionLog {
  id: number;
  userId: number;
  companyId: number;
  companyName: string;
  username: string;
  eventType: string;
  ipAddress: string;
  message: string;
  createdAt: string;
}

export interface SessionLogsPage {
  content: SessionLog[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface SessionLogsQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
  companyId?: number | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const SESSION_LOGS_URL = 'http://localhost:8080/api/session-logs/paginated';

@Injectable({ providedIn: 'root' })
export class SessionLogsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getPaginated(query: SessionLogsQuery = {}): Observable<SessionLogsPage> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 10)
      .set('sortBy', query.sortBy ?? 'createdAt')
      .set('sortDirection', query.sortDirection ?? 'desc');

    if (query.companyId !== null && query.companyId !== undefined) {
      params = params.set('companyId', query.companyId);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<ApiResponse<SessionLogsPage>>(SESSION_LOGS_URL, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los logs de sesion.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los logs de sesion.')),
    );
  }
}
