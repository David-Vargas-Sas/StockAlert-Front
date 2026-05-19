import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface UserPermission {
  id: number;
  name: string;
  description: string;
}

export interface UserRoleItem {
  id: number;
  companyId: number;
  name: string;
  description: string;
  permissions: UserPermission[];
}

export interface AppUser {
  id: number;
  companyId: number;
  companyName: string;
  username: string;
  email: string;
  fullName: string;
  active: boolean;
  createdAt: string;
  roles: UserRoleItem[];
}

export interface UsersPageResponse {
  content: AppUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface UsersQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface UpdateUserRequest {
  email: string;
  fullName: string;
  active: boolean;
  roleIds: number[];
}

export interface CreateUserRequest {
  companyId: number;
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleIds: number[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const USERS_BASE_URL = 'http://localhost:8080/api/users';
const USERS_URL = `${USERS_BASE_URL}/paginated`;

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getPaginated(query: UsersQuery = {}): Observable<UsersPageResponse> {
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

    return this.http.get<ApiResponse<UsersPageResponse>>(USERS_URL, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los usuarios.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los usuarios.')),
    );
  }

  create(request: CreateUserRequest): Observable<AppUser> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post<ApiResponse<AppUser>>(USERS_BASE_URL, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible crear el usuario.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible crear el usuario.')),
    );
  }

  update(userId: number, request: UpdateUserRequest): Observable<AppUser> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.put<ApiResponse<AppUser>>(`${USERS_BASE_URL}/${userId}`, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible actualizar el usuario.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible actualizar el usuario.')),
    );
  }

  changeMyPassword(request: ChangePasswordRequest): Observable<string> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.patch<ApiResponse<string>>(`${USERS_BASE_URL}/me/password`, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cambiar la contrasena.');
        }

        return response.message || response.data;
      }),
      catchError(this.apiError.handle('No fue posible cambiar la contrasena.')),
    );
  }
}
