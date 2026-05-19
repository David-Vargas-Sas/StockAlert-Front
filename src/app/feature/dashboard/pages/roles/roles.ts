import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize, forkJoin } from 'rxjs';
import { ROLE_LABELS, UserRole } from '../../../../services/auth';
import { Permission, PermissionGroup, PermissionOperation, PermissionsService } from '../../../../services/permissions';
import { Role, RolesService } from '../../../../services/roles';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-roles-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Roles y permisos" subtitle="Configura permisos por modulo y operacion." />

      <div class="role-toolbar">
        <div class="tabs">
          @for (role of roles(); track role.id) {
            <button type="button" [class.active]="selectedRoleId() === role.id" (click)="selectRole(role.id)">
              {{ roleLabel(role.name) }}
            </button>
          }
        </div>
        <div class="role-actions">
          <button class="secondary-btn" type="button" [disabled]="!selectedRole()" (click)="openEditRole()">
            <mat-icon>edit</mat-icon>
            Editar rol
          </button>
          <button class="primary-btn" type="button" (click)="openCreateRole()"><mat-icon>add</mat-icon>Crear rol</button>
        </div>
      </div>

      @if (loading()) {
        <div class="audit-status-card">
          <span class="loading-dot"></span>
          <div>
            <h3>Cargando permisos</h3>
            <p>Consultando operaciones disponibles para construir la matriz de permisos.</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="audit-status-card error">
          <mat-icon>error</mat-icon>
          <div>
            <h3>No se pudieron cargar los permisos</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="secondary-btn" type="button" (click)="loadPermissions()">Reintentar</button>
        </div>
      }

      <div class="permission-overview">
        <article>
          <mat-icon>verified_user</mat-icon>
          <span>Rol seleccionado</span>
          <strong class="role-name-stat">{{ roleLabel(selectedRole()?.name || '') }}</strong>
        </article>
        <article>
          <mat-icon>rule</mat-icon>
          <span>Permisos</span>
          <strong>{{ totalPermissions }}</strong>
        </article>
        <article>
          <mat-icon>view_module</mat-icon>
          <span>Modulos activos</span>
          <strong>{{ selectedRoleModules }}</strong>
        </article>
        <article>
          <mat-icon>lock_open</mat-icon>
          <span>Operaciones</span>
          <strong>{{ operations.length }}</strong>
        </article>
      </div>

      <div class="table-card permission-table">
        <table>
          <thead>
            <tr>
              <th>Modulo</th>
              @for (operation of operations; track operation) {
                <th>{{ permissionsService.operationLabel(operation) }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (group of permissionGroups(); track group.module) {
              <tr>
                <td>
                  <strong>{{ permissionsService.moduleLabel(group.module) }}</strong>
                  <small>{{ group.module }}</small>
                </td>
                @for (operation of operations; track operation) {
                  <td>
                    @if (roleHasPermission(group.permissions[operation])) {
                      <span class="permission-check" [title]="group.permissions[operation]?.name">
                        <mat-icon>check</mat-icon>
                      </span>
                    } @else if (group.permissions[operation]) {
                      <span class="permission-empty" title="Permiso no asignado a este rol">
                        <mat-icon>close</mat-icon>
                      </span>
                    } @else {
                      <span class="permission-empty" title="Permiso no disponible">
                        <mat-icon>close</mat-icon>
                      </span>
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="operations.length + 1">
                  <div class="table-empty">
                    <mat-icon>rule</mat-icon>
                    <strong>Sin permisos disponibles</strong>
                    <span>No hay permisos registrados en el sistema.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (createRoleOpen()) {
        <div class="modal-backdrop" (click)="closeCreateRole()">
          <section class="modal role-create-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon admin">
                  <mat-icon>{{ editingRoleId() ? 'shield' : 'add_moderator' }}</mat-icon>
                </span>
                <div>
                  <h2>{{ editingRoleId() ? 'Editar rol' : 'Crear rol' }}</h2>
                  <p>{{ editingRoleId() ? 'Actualiza el nombre, descripcion y permisos del rol.' : 'El rol se creara para la empresa asociada a tu sesion.' }}</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeCreateRole()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (createError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ createError() }}</span>
                </div>
              }

              <div class="form-grid">
                <label class="form-field">
                  <span>Nombre del rol</span>
                  <input #roleName [value]="roleFormName()" placeholder="Ej. SUPERVISOR" />
                </label>
                <label class="form-field">
                  <span>Descripcion</span>
                  <input #roleDescription [value]="roleFormDescription()" placeholder="Gestion operativa limitada" />
                </label>
              </div>

              <div class="permission-picker">
                <div class="permission-picker-header">
                  <div>
                    <strong>Permisos</strong>
                    <small>{{ selectedPermissionIds().length }} seleccionados</small>
                  </div>
                  <button class="ghost-btn" type="button" (click)="clearSelectedPermissions()">Limpiar</button>
                </div>

                @for (group of permissionGroups(); track group.module) {
                  <section class="permission-picker-group">
                    <h3>{{ permissionsService.moduleLabel(group.module) }}</h3>
                    <div>
                      @for (permission of permissionsForGroup(group); track permission.id) {
                        <label class="permission-option">
                          <input
                            type="checkbox"
                            [checked]="selectedPermissionIds().includes(permission.id)"
                            (change)="togglePermission(permission.id)"
                          />
                          <span>{{ permissionLabel(permission.name) }}</span>
                        </label>
                      }
                    </div>
                  </section>
                }
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeCreateRole()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="creatingRole()" (click)="saveRole(roleName.value, roleDescription.value)">
                <mat-icon>save</mat-icon>
                {{ creatingRole() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
})
export class RolesPage implements OnInit {
  readonly permissionsService = inject(PermissionsService);
  private readonly rolesService = inject(RolesService);
  readonly operations: PermissionOperation[] = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'RESOLVE', 'CANCEL', 'ADJUST'];

  readonly roles = signal<Role[]>([]);
  readonly selectedRoleId = signal<number | null>(null);
  readonly permissions = signal<Permission[]>([]);
  readonly permissionGroups = signal<PermissionGroup[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly createRoleOpen = signal(false);
  readonly creatingRole = signal(false);
  readonly createError = signal('');
  readonly editingRoleId = signal<number | null>(null);
  readonly roleFormName = signal('');
  readonly roleFormDescription = signal('');
  readonly selectedPermissionIds = signal<number[]>([]);

  ngOnInit(): void {
    this.loadRolesAndPermissions();
  }

  get totalPermissions(): number {
    return this.selectedRole()?.permissions.length ?? 0;
  }

  get selectedRoleModules(): number {
    return new Set(
      (this.selectedRole()?.permissions ?? [])
        .map((permission) => this.moduleFromPermission(permission.name))
        .filter(Boolean),
    ).size;
  }

  selectedRole(): Role | null {
    return this.roles().find((role) => role.id === this.selectedRoleId()) ?? null;
  }

  loadRolesAndPermissions(preferredRoleId: number | null = this.selectedRoleId()): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      permissions: this.permissionsService.getAll(),
      rolesPage: this.rolesService.getPaginated({ page: 0, size: 50 }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ permissions, rolesPage }) => {
          this.permissions.set(permissions);
          this.permissionGroups.set(this.permissionsService.groupByModule(permissions));
          this.roles.set(rolesPage.content);
          this.selectedRoleId.set(
            rolesPage.content.some((role) => role.id === preferredRoleId)
              ? preferredRoleId
              : rolesPage.content[0]?.id ?? null,
          );
        },
        error: (error: Error) => {
          this.permissions.set([]);
          this.permissionGroups.set([]);
          this.roles.set([]);
          this.selectedRoleId.set(null);
          this.error.set(error.message || 'Revisa que la sesion sea valida y que el backend este activo.');
        },
      });
  }

  loadPermissions(): void {
    this.loadRolesAndPermissions();
  }

  selectRole(roleId: number): void {
    this.selectedRoleId.set(roleId);
  }

  openCreateRole(): void {
    this.createError.set('');
    this.editingRoleId.set(null);
    this.roleFormName.set('');
    this.roleFormDescription.set('');
    this.selectedPermissionIds.set([]);
    this.createRoleOpen.set(true);
  }

  openEditRole(): void {
    const role = this.selectedRole();

    if (!role) {
      return;
    }

    this.createError.set('');
    this.editingRoleId.set(role.id);
    this.roleFormName.set(role.name);
    this.roleFormDescription.set(role.description);
    this.selectedPermissionIds.set(role.permissions.map((permission) => permission.id));
    this.createRoleOpen.set(true);
  }

  closeCreateRole(): void {
    if (!this.creatingRole()) {
      this.createRoleOpen.set(false);
    }
  }

  permissionsForGroup(group: PermissionGroup): Permission[] {
    return this.operations
      .map((operation) => group.permissions[operation])
      .filter((permission): permission is Permission => !!permission);
  }

  togglePermission(permissionId: number): void {
    this.selectedPermissionIds.update((selected) =>
      selected.includes(permissionId)
        ? selected.filter((id) => id !== permissionId)
        : [...selected, permissionId],
    );
  }

  clearSelectedPermissions(): void {
    this.selectedPermissionIds.set([]);
  }

  saveRole(name: string, description: string): void {
    const roleName = name.trim().toUpperCase();
    const roleDescription = description.trim();
    const permissionIds = this.selectedPermissionIds();

    if (!roleName || !roleDescription) {
      this.createError.set('Completa el nombre y la descripcion del rol.');
      return;
    }

    if (permissionIds.length === 0) {
      this.createError.set('Selecciona al menos un permiso para el rol.');
      return;
    }

    this.creatingRole.set(true);
    this.createError.set('');

    const editingRoleId = this.editingRoleId();
    const request = { name: roleName, description: roleDescription, permissionIds };
    const saveRequest = editingRoleId
      ? this.rolesService.update(editingRoleId, request)
      : this.rolesService.create(request);

    saveRequest
      .pipe(finalize(() => this.creatingRole.set(false)))
      .subscribe({
        next: (role) => {
          this.createRoleOpen.set(false);
          this.editingRoleId.set(null);
          this.loadRolesAndPermissions(role.id);
        },
        error: (error: Error) => this.createError.set(error.message || 'No fue posible crear el rol.'),
      });
  }

  permissionLabel(permissionName: string): string {
    const operation = this.operations.find((item) => permissionName.endsWith(`_${item}`));
    return operation ? this.permissionsService.operationLabel(operation) : permissionName;
  }

  roleHasPermission(permission: Permission | undefined): boolean {
    return !!permission && !!this.selectedRole()?.permissions.some((item) => item.id === permission.id);
  }

  roleLabel(role: string): string {
    const normalized = role === 'ADMIN' ? 'ADMINISTRADOR' : role;
    return ROLE_LABELS[normalized as UserRole] ?? this.titleCase(role);
  }

  private moduleFromPermission(permissionName: string): string {
    const operation = this.operations.find((item) => permissionName.endsWith(`_${item}`));
    return operation ? permissionName.slice(0, -(operation.length + 1)) : '';
  }

  private titleCase(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
