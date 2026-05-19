import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';

export type UserRole = 'SUPER_ADMIN' | 'ADMINISTRADOR' | 'VENDEDOR' | 'BODEGUERO' | 'CONSULTOR';
type ApiUserRole = UserRole | 'ADMIN' | string;

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMINISTRADOR: 'Administrador',
  VENDEDOR: 'Vendedor',
  BODEGUERO: 'Bodeguero',
  CONSULTOR: 'Consultor',
};

export interface AuthUser {
  id: number;
  companyId: number;
  name: string;
  username: string;
  email: string;
  company: string;
  role: UserRole;
  roles: UserRole[];
  permissions: string[];
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    tokenType: string;
    accessToken: string;
    refreshToken: string;
    expiresInMinutes: number;
    refreshTokenExpiresInDays: number;
    user: {
      id: number;
      companyId: number;
      companyName: string;
      username: string;
      email: string;
      fullName: string;
      roles: Array<{
        name: ApiUserRole;
      permissions: Array<{ name: string }>;
      }>;
    };
  };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface StoredSession {
  user: AuthUser;
  tokenType: string;
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = 'stockalert.auth.session';
const LOGIN_URL = 'http://localhost:8080/api/auth/login';
const REFRESH_URL = 'http://localhost:8080/api/auth/refresh';
const LOGOUT_URL = 'http://localhost:8080/api/auth/logout';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiError = inject(ApiErrorService);
  private readonly sessionState = signal<StoredSession | null>(this.readStoredSession());

  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly accessToken = computed(() => this.sessionState()?.accessToken ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  login(username: string, password: string): Observable<AuthUser> {
    return this.http.post<LoginResponse>(LOGIN_URL, { username, password } satisfies LoginRequest).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible iniciar sesion.');
        }

        return this.toSession(response);
      }),
      tap((session) => {
        this.sessionState.set(session);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }),
      map((session) => session.user),
      catchError(this.apiError.handle('No fue posible iniciar sesion.')),
    );
  }

  refresh(): Observable<AuthUser> {
    const currentSession = this.sessionState();

    if (!currentSession?.refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible.'));
    }

    return this.http
      .post<LoginResponse>(REFRESH_URL, { refreshToken: currentSession.refreshToken })
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'No fue posible renovar la sesion.');
          }

          return this.toSession(response);
        }),
        tap((session) => {
          this.sessionState.set(session);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }),
        map((session) => session.user),
        catchError(this.apiError.handle('No fue posible renovar la sesion.')),
      );
  }

  logout(): Observable<void> {
    const currentSession = this.sessionState();

    if (!currentSession) {
      this.clearSession();
      return of(undefined);
    }

    const headers = new HttpHeaders({
      Authorization: `${currentSession.tokenType} ${currentSession.accessToken}`,
    });

    return this.http
      .post<ApiResponse<{ message: string }>>(
        LOGOUT_URL,
        { refreshToken: currentSession.refreshToken },
        { headers },
      )
      .pipe(
        map(() => undefined),
        tap(() => this.clearSession()),
        catchError(this.apiError.handle('No fue posible cerrar sesion.')),
      );
  }

  clearSession(): void {
    this.sessionState.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  canAccess(allowedRoles?: UserRole[]): boolean {
    const currentUser = this.user();
    if (!currentUser) {
      return false;
    }

    if (!allowedRoles?.length) {
      return true;
    }

    const userRoles = currentUser.roles?.length ? currentUser.roles : [currentUser.role];
    return userRoles.some((role) => allowedRoles.includes(role));
  }

  hasPermission(permission: string): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }

  private toSession(response: LoginResponse): StoredSession {
    const roles = response.data.user.roles
      .map((role) => this.normalizeRole(role.name))
      .filter((role): role is UserRole => role !== null);

    const primaryRole = roles[0] ?? 'CONSULTOR';
    const permissions = response.data.user.roles.flatMap((role) =>
      Array.isArray(role.permissions) ? role.permissions.map((permission) => permission.name) : [],
    );

    return {
      tokenType: response.data.tokenType,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: {
        id: response.data.user.id,
        companyId: response.data.user.companyId,
        name: response.data.user.fullName,
        username: response.data.user.username,
        email: response.data.user.email,
        company: response.data.user.companyName,
        role: primaryRole,
        roles,
        permissions,
      },
    };
  }

  private normalizeRole(role: ApiUserRole | null | undefined): UserRole | null {
    const normalized = String(role ?? '').trim().toUpperCase();

    if (normalized === 'ADMIN') {
      return 'ADMINISTRADOR';
    }

    if (normalized in ROLE_LABELS) {
      return normalized as UserRole;
    }

    return null;
  }

  private readStoredSession(): StoredSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const session = JSON.parse(stored) as StoredSession;
      const role = this.normalizeRole(session.user.role) ?? 'CONSULTOR';
      const roles = (session.user.roles ?? [role])
        .map((storedRole) => this.normalizeRole(storedRole))
        .filter((storedRole): storedRole is UserRole => storedRole !== null);

      return {
        ...session,
        user: {
          ...session.user,
          role,
          roles: roles.length ? roles : [role],
          permissions: session.user.permissions ?? [],
        },
      };
    } catch {
      return null;
    }
  }
}

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = route.data['roles'] as UserRole[] | undefined;
  const permissions = route.data['permissions'] as string[] | undefined;

  const canAccessByRole = auth.canAccess(roles);
  const canAccessByPermission = !permissions?.length || permissions.some((permission) => auth.hasPermission(permission));

  if (canAccessByRole && canAccessByPermission) {
    return true;
  }

  return router.createUrlTree([auth.isAuthenticated() ? '/app/dashboard' : '/login']);
};
