import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface Permission {
  id: number;
  name: string;
  description: string;
}

export interface PermissionGroup {
  module: string;
  permissions: Partial<Record<PermissionOperation, Permission>>;
}

export type PermissionOperation = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESOLVE' | 'CANCEL' | 'ADJUST';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const PERMISSIONS_URL = 'http://localhost:8080/api/permissions';
const MODULE_LABELS: Record<string, string> = {
  COMPANY: 'Empresas',
  USER: 'Usuarios',
  ROLE: 'Roles',
  PERMISSION: 'Permisos',
  PRODUCT: 'Productos',
  SUPPLIER: 'Proveedores',
  CUSTOMER: 'Clientes',
  PURCHASE: 'Compras',
  INVENTORY: 'Inventario',
  DASHBOARD: 'Dashboard',
  AUDIT_LOG: 'Auditoria',
  SALE: 'Ventas',
  ALERT: 'Alertas',
  SESSION_LOG: 'Auditoria',
};

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getAll(): Observable<Permission[]> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<ApiResponse<Permission[]>>(PERMISSIONS_URL, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los permisos.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los permisos.')),
    );
  }

  groupByModule(permissions: Permission[]): PermissionGroup[] {
    const groups = new Map<string, PermissionGroup>();

    for (const permission of permissions) {
      const parsed = this.parsePermission(permission.name);

      if (!parsed) {
        continue;
      }

      const group = groups.get(parsed.module) ?? {
        module: parsed.module,
        permissions: {},
      };

      group.permissions[parsed.operation] = permission;
      groups.set(parsed.module, group);
    }

    return Array.from(groups.values()).sort((left, right) => left.module.localeCompare(right.module));
  }

  moduleLabel(module: string): string {
    return MODULE_LABELS[module] ?? this.titleCase(module);
  }

  operationLabel(operation: PermissionOperation): string {
    const labels: Record<PermissionOperation, string> = {
      READ: 'Ver',
      CREATE: 'Crear',
      UPDATE: 'Editar',
      DELETE: 'Desactivar',
      RESOLVE: 'Resolver',
      CANCEL: 'Anular',
      ADJUST: 'Ajustar',
    };

    return labels[operation];
  }

  private parsePermission(name: string): { module: string; operation: PermissionOperation } | null {
    const operation = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'RESOLVE', 'CANCEL', 'ADJUST'].find((item) => name.endsWith(`_${item}`)) as
      | PermissionOperation
      | undefined;

    if (!operation) {
      return null;
    }

    return {
      module: name.slice(0, -(operation.length + 1)),
      operation,
    };
  }

  private titleCase(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
