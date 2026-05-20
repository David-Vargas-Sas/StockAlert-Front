import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize, forkJoin } from 'rxjs';
import { AuthService, ROLE_LABELS, UserRole } from '../../../../services/auth';
import { Role, RolesService } from '../../../../services/roles';
import { AppUser, UsersPageResponse, UsersService } from '../../../../services/users';
import { FeedbackModal, FeedbackType } from '../../shared/feedback-modal';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-users-page',
  imports: [MatIconModule, PageTitle, FeedbackModal],
  template: `
    <section class="page">
      <app-page-title title="Usuarios" subtitle="Administra acceso, roles y estado de usuarios por empresa." />

      <div class="toolbar">
        <label>
          <mat-icon>search</mat-icon>
          <input placeholder="Buscar usuario" (input)="search.set($any($event.target).value)" />
        </label>
        <button class="primary-btn" (click)="openCreateUser()">
          <mat-icon>person_add</mat-icon>
          Crear usuario
        </button>
      </div>

      @if (loading()) {
        <div class="audit-status-card">
          <span class="loading-dot"></span>
          <div>
            <h3>Cargando usuarios</h3>
            <p>Consultando usuarios registrados y sus roles asociados.</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="audit-status-card error">
          <mat-icon>error</mat-icon>
          <div>
            <h3>No se pudieron cargar los usuarios</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="secondary-btn" type="button" (click)="loadUsers()">Reintentar</button>
        </div>
      }

      <app-feedback-modal
        [title]="successMessage()"
        [type]="feedbackType()"
        message="El estado del usuario quedo actualizado."
        (dismiss)="successMessage.set('')"
      />

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Empresa</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (user of filteredUsers; track user.id) {
              <tr>
                <td>
                  <strong>{{ user.fullName }}</strong>
                  <small class="muted-line">{{ formatDate(user.createdAt) }}</small>
                </td>
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.companyName }}</td>
                <td>
                  <div class="role-stack">
                    @for (role of user.roles; track role.id) {
                      <span class="role">{{ roleLabel(role.name) }}</span>
                    }
                  </div>
                </td>
                <td>
                  <span class="badge" [class]="user.active ? 'activo' : 'inactivo'">
                    {{ user.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="actions">
                  <button type="button" aria-label="Editar usuario" (click)="openEditUser(user)"><mat-icon>edit</mat-icon></button>
                  <button
                    type="button"
                    [attr.aria-label]="user.active ? 'Desactivar usuario' : 'Activar usuario'"
                    [disabled]="statusUpdatingId() === user.id"
                    (click)="toggleUserStatus(user)"
                  >
                    <mat-icon>{{ user.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="table-empty">
                    <mat-icon>person_search</mat-icon>
                    <strong>Sin usuarios para mostrar</strong>
                    <span>No hay usuarios registrados o el filtro no encontro coincidencias.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (pageInfo()) {
          <div class="pagination">
            <span>Mostrando {{ filteredUsers.length }} de {{ pageInfo()?.totalElements }} usuarios</span>
            <button type="button" [disabled]="pageInfo()?.first" (click)="previousPage()">Anterior</button>
            <button type="button" [disabled]="pageInfo()?.last" (click)="nextPage()">Siguiente</button>
          </div>
        }
      </div>

      @if (editUserOpen()) {
        <div class="modal-backdrop" (click)="closeEditUser()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon" [class.edit]="editingUserId()" [class.create]="!editingUserId()">
                  <mat-icon>{{ editingUserId() ? 'manage_accounts' : 'person_add' }}</mat-icon>
                </span>
                <div>
                  <h2>{{ editingUserId() ? 'Editar usuario' : 'Crear usuario' }}</h2>
                  <p>{{ editingUserId() ? 'Actualiza datos de contacto, estado y roles asignados.' : 'Registra un usuario para la empresa de tu sesion.' }}</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeEditUser()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (editError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ editError() }}</span>
                </div>
              }

              <div class="form-grid">
                @if (!editingUserId()) {
                  <label class="form-field">
                    <span>Usuario</span>
                    <input [value]="editUsername()" placeholder="Ej. jperez" (input)="editUsername.set($any($event.target).value)" />
                  </label>
                  <label class="form-field">
                    <span>Contrasena</span>
                    <input type="password" [value]="editPassword()" placeholder="Contrasena temporal" (input)="editPassword.set($any($event.target).value)" />
                  </label>
                }
                <label class="form-field">
                  <span>Nombre completo</span>
                  <input #fullName [value]="editFullName()" />
                </label>
                <label class="form-field">
                  <span>Correo</span>
                  <input #email type="email" [value]="editEmail()" />
                </label>
              </div>

              @if (editingUserId()) {
                <label class="toggle-field">
                  <input type="checkbox" [checked]="editActive()" (change)="editActive.set($any($event.target).checked)" />
                  <span>Usuario activo</span>
                </label>
              }

              <div class="permission-picker user-role-picker">
                <div class="permission-picker-header">
                  <div>
                    <strong>Roles</strong>
                    <small>{{ selectedRoleIds().length }} seleccionados</small>
                  </div>
                </div>

                <div class="role-options">
                  @for (role of availableRoles(); track role.id) {
                    <label class="permission-option">
                      <input
                        type="checkbox"
                        [checked]="selectedRoleIds().includes(role.id)"
                        (change)="toggleRole(role.id)"
                      />
                      <span>{{ roleLabel(role.name) }}</span>
                    </label>
                  }
                </div>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeEditUser()">Cancelar</button>
              <button class="primary-btn" type="button" [disabled]="savingUser()" (click)="saveUser(fullName.value, email.value, editUsername(), editPassword())">
                <mat-icon>save</mat-icon>
                {{ savingUser() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
})
export class UsersPage implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly auth = inject(AuthService);

  readonly users = signal<AppUser[]>([]);
  readonly availableRoles = signal<Role[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pageInfo = signal<Omit<UsersPageResponse, 'content'> | null>(null);
  readonly currentPage = signal(0);
  readonly search = signal('');
  readonly pageSize = 10;
  readonly editUserOpen = signal(false);
  readonly savingUser = signal(false);
  readonly editError = signal('');
  readonly successMessage = signal('');
  readonly feedbackType = signal<FeedbackType>('success');
  readonly statusUpdatingId = signal<number | null>(null);
  readonly editingUserId = signal<number | null>(null);
  readonly editUsername = signal('');
  readonly editPassword = signal('');
  readonly editFullName = signal('');
  readonly editEmail = signal('');
  readonly editActive = signal(true);
  readonly selectedRoleIds = signal<number[]>([]);

  ngOnInit(): void {
    this.loadInitialData();
  }

  get filteredUsers(): AppUser[] {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.users();
    }

    return this.users().filter((user) =>
      [user.fullName, user.username, user.email, user.companyName, ...user.roles.map((role) => role.name)]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }

  loadInitialData(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      usersPage: this.usersService.getPaginated({ page: this.currentPage(), size: this.pageSize }),
      rolesPage: this.rolesService.getPaginated({ page: 0, size: 50 }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ usersPage, rolesPage }) => {
          const { content, ...pageInfo } = usersPage;
          this.users.set(content);
          this.pageInfo.set(pageInfo);
          this.currentPage.set(usersPage.page);
          this.availableRoles.set(rolesPage.content);
        },
        error: (error: Error) => {
          this.users.set([]);
          this.availableRoles.set([]);
          this.pageInfo.set(null);
          this.error.set(error.message || 'Revisa que la sesion sea valida y que el backend este activo.');
        },
      });
  }

  loadUsers(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set('');

    this.usersService
      .getPaginated({ page, size: this.pageSize })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const { content, ...pageInfo } = response;
          this.users.set(content);
          this.pageInfo.set(pageInfo);
          this.currentPage.set(response.page);
        },
        error: (error: Error) => {
          this.users.set([]);
          this.pageInfo.set(null);
          this.error.set(error.message || 'Revisa que la sesion sea valida y que el backend este activo.');
        },
      });
  }

  previousPage(): void {
    if (!this.pageInfo()?.first) {
      this.loadUsers(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (!this.pageInfo()?.last) {
      this.loadUsers(this.currentPage() + 1);
    }
  }

  openCreateUser(): void {
    this.editError.set('');
    this.editingUserId.set(null);
    this.editUsername.set('');
    this.editPassword.set('');
    this.editFullName.set('');
    this.editEmail.set('');
    this.editActive.set(true);
    this.selectedRoleIds.set([]);
    this.editUserOpen.set(true);
  }

  openEditUser(user: AppUser): void {
    this.editError.set('');
    this.editingUserId.set(user.id);
    this.editUsername.set(user.username);
    this.editPassword.set('');
    this.editFullName.set(user.fullName);
    this.editEmail.set(user.email);
    this.editActive.set(user.active);
    this.selectedRoleIds.set(user.roles.map((role) => role.id));
    this.editUserOpen.set(true);
  }

  closeEditUser(): void {
    if (!this.savingUser()) {
      this.editUserOpen.set(false);
      this.editingUserId.set(null);
      this.editError.set('');
    }
  }

  toggleRole(roleId: number): void {
    this.selectedRoleIds.update((selected) =>
      selected.includes(roleId) ? selected.filter((id) => id !== roleId) : [...selected, roleId],
    );
  }

  toggleUserStatus(user: AppUser): void {
    this.error.set('');
    this.successMessage.set('');
    this.statusUpdatingId.set(user.id);

    this.usersService
      .update(user.id, {
        email: user.email,
        fullName: user.fullName,
        active: !user.active,
        roleIds: user.roles.map((role) => role.id),
      })
      .pipe(finalize(() => this.statusUpdatingId.set(null)))
      .subscribe({
        next: (updatedUser) => {
          this.users.update((users) => users.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
          this.feedbackType.set(updatedUser.active ? 'activate' : 'deactivate');
          this.successMessage.set(updatedUser.active ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente');
        },
        error: (error: Error) => this.error.set(error.message || 'No fue posible actualizar el estado del usuario.'),
      });
  }

  saveUser(fullName: string, email: string, username: string, password: string): void {
    const userId = this.editingUserId();
    const roleIds = this.selectedRoleIds();
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanFullName || !cleanEmail) {
      this.editError.set('Completa nombre y correo.');
      return;
    }

    if (roleIds.length === 0) {
      this.editError.set('Selecciona al menos un rol.');
      return;
    }

    this.savingUser.set(true);
    this.editError.set('');

    const saveRequest = userId
      ? this.usersService.update(userId, {
          email: cleanEmail,
          fullName: cleanFullName,
          active: this.editActive(),
          roleIds,
        })
      : this.usersService.create({
          companyId: this.auth.user()?.companyId ?? 0,
          username: cleanUsername,
          email: cleanEmail,
          password: cleanPassword,
          fullName: cleanFullName,
          roleIds,
        });

    if (!userId && (!cleanUsername || !cleanPassword)) {
      this.savingUser.set(false);
      this.editError.set('Completa usuario y contrasena.');
      return;
    }

    if (!userId && !this.auth.user()?.companyId) {
      this.savingUser.set(false);
      this.editError.set('No se pudo identificar la empresa de la sesion.');
      return;
    }

    saveRequest
      .pipe(finalize(() => this.savingUser.set(false)))
      .subscribe({
        next: () => {
          this.editUserOpen.set(false);
          this.editingUserId.set(null);
          this.editError.set('');
          this.loadUsers(userId ? this.currentPage() : 0);
        },
        error: (error: Error) => this.editError.set(error.message || 'No fue posible guardar el usuario.'),
      });
  }

  roleLabel(role: string): string {
    const normalized = role === 'ADMIN' ? 'ADMINISTRADOR' : role;
    return ROLE_LABELS[normalized as UserRole] ?? this.titleCase(role);
  }

  formatDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(date);
  }

  private titleCase(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
