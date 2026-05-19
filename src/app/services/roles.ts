import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';
import { Permission } from './permissions';

export interface Role {
  id: number;
  companyId: number;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface RolesPageResponse {
  content: Role[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface RolesQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface CreateRoleRequest {
  companyId: number;
  name: string;
  description: string;
  permissionIds: number[];
}

export interface UpdateRoleRequest {
  name: string;
  description: string;
  permissionIds: number[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const ROLES_URL = 'http://localhost:8080/api/roles';
const ROLES_PAGINATED_URL = 'http://localhost:8080/api/roles/paginated';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getPaginated(query: RolesQuery = {}): Observable<RolesPageResponse> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 10)
      .set('sortBy', query.sortBy ?? 'id')
      .set('sortDirection', query.sortDirection ?? 'asc');

    return this.http.get<ApiResponse<RolesPageResponse>>(ROLES_PAGINATED_URL, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los roles.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los roles.')),
    );
  }

  create(request: Omit<CreateRoleRequest, 'companyId'>): Observable<Role> {
    const token = this.auth.accessToken();
    const companyId = this.auth.user()?.companyId;

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    if (!companyId) {
      return throwError(() => new Error('No hay empresa asociada a la sesion.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .post<ApiResponse<Role>>(
        ROLES_URL,
        {
          companyId,
          ...request,
        } satisfies CreateRoleRequest,
        { headers },
      )
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'No fue posible crear el rol.');
          }

          return response.data;
        }),
        catchError(this.apiError.handle('No fue posible crear el rol.')),
      );
  }

  update(roleId: number, request: UpdateRoleRequest): Observable<Role> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.put<ApiResponse<Role>>(`${ROLES_URL}/${roleId}`, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible actualizar el rol.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible actualizar el rol.')),
    );
  }
}
