import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, ROLE_LABELS, UserRole } from '../../services/auth';
import { UsersService } from '../../services/users';

type ViewKey =
  | 'dashboard'
  | 'productos'
  | 'ventas'
  | 'compras'
  | 'clientes'
  | 'proveedores'
  | 'inventario'
  | 'alertas'
  | 'usuarios'
  | 'roles'
  | 'empresas'
  | 'auditoria';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: string;
  scope: string;
  roles?: UserRole[];
  permissions?: string[];
}

interface NavGroup {
  title: string;
  icon?: string;
  items: NavItem[];
}

@Component({
  selector: 'app-stockalert-dashboard',
  imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './stockalert-dashboard.html',
  styleUrl: './stockalert-dashboard.css',
  encapsulation: ViewEncapsulation.None,
})
export class StockalertDashboard {
  readonly auth = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  readonly passwordModalOpen = signal(false);
  readonly passwordSaving = signal(false);
  readonly passwordError = signal('');
  readonly passwordSuccess = signal('');

  readonly navGroups: NavGroup[] = [
    {
      title: 'Inicio',
      items: [{ key: 'dashboard', label: 'Dashboard', icon: 'dashboard', scope: 'Resumen general', permissions: ['DASHBOARD_READ'] }],
    },
    {
      title: 'Empresas',
      icon: 'business',
      items: [
        { key: 'empresas', label: 'Empresas', icon: 'domain', scope: 'Super admin', roles: ['SUPER_ADMIN'], permissions: ['COMPANY_READ'] },
        { key: 'auditoria', label: 'Auditoria', icon: 'manage_history', scope: 'Sesiones y eventos', roles: ['SUPER_ADMIN', 'ADMINISTRADOR'], permissions: ['SESSION_LOG_READ', 'AUDIT_LOG_READ'] },
      ],
    },
    {
      title: 'Administracion',
      icon: 'admin_panel_settings',
      items: [
        { key: 'usuarios', label: 'Usuarios', icon: 'group', scope: 'Equipo y acceso', roles: ['SUPER_ADMIN', 'ADMINISTRADOR'], permissions: ['USER_READ'] },
        { key: 'roles', label: 'Roles y permisos', icon: 'verified_user', scope: 'Permisos', roles: ['SUPER_ADMIN', 'ADMINISTRADOR'], permissions: ['ROLE_READ', 'PERMISSION_READ'] },
      ],
    },
    {
      title: 'Operacion',
      items: [
        { key: 'productos', label: 'Productos', icon: 'inventory_2', scope: 'Catalogo', roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['PRODUCT_READ'] },
        { key: 'inventario', label: 'Inventario', icon: 'warehouse', scope: 'Ajustes y stock', roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['INVENTORY_READ'] },
        { key: 'ventas', label: 'Ventas', icon: 'point_of_sale', scope: 'Transacciones', roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'VENDEDOR', 'CONSULTOR'], permissions: ['SALE_READ'] },
        { key: 'compras', label: 'Compras', icon: 'shopping_cart_checkout', scope: 'Reposicion', roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['PURCHASE_READ'] },
        { key: 'clientes', label: 'Clientes', icon: 'badge', scope: 'Cartera comercial', roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'VENDEDOR', 'CONSULTOR'], permissions: ['CUSTOMER_READ'] },
        { key: 'proveedores', label: 'Proveedores', icon: 'local_shipping', scope: 'Abastecimiento', roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['SUPPLIER_READ'] },
        { key: 'alertas', label: 'Alertas', icon: 'notifications_active', scope: 'Reposicion', roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['ALERT_READ'] },
      ],
    },
  ];

  get visibleNavGroups(): NavGroup[] {
    return this.navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => this.auth.canAccess(item.roles) && this.canAccessPermission(item.permissions)),
      }))
      .filter((group) => group.items.length > 0);
  }

  private canAccessPermission(permissions?: string[]): boolean {
    return !permissions?.length || permissions.some((permission) => this.auth.hasPermission(permission));
  }

  get initials(): string {
    return (
      this.auth
        .user()
        ?.name.split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'SA'
    );
  }

  get roleLabel(): string {
    const role = this.auth.user()?.role;
    return role ? ROLE_LABELS[role] : '';
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => {
        this.auth.clearSession();
        void this.router.navigate(['/login']);
      },
    });
  }

  openPasswordModal(): void {
    this.passwordError.set('');
    this.passwordSuccess.set('');
    this.passwordModalOpen.set(true);
  }

  closePasswordModal(): void {
    if (!this.passwordSaving()) {
      this.passwordModalOpen.set(false);
    }
  }

  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): void {
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current || !next || !confirm) {
      this.passwordError.set('Completa la contrasena actual, la nueva y la confirmacion.');
      return;
    }

    if (next.length < 8) {
      this.passwordError.set('La nueva contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (next !== confirm) {
      this.passwordError.set('La confirmacion no coincide con la nueva contrasena.');
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');

    this.usersService
      .changeMyPassword({ currentPassword: current, newPassword: next })
      .pipe(finalize(() => this.passwordSaving.set(false)))
      .subscribe({
        next: (message) => {
          this.passwordSuccess.set(message || 'Contrasena actualizada correctamente.');
          setTimeout(() => this.closePasswordModal(), 900);
        },
        error: (error: Error) => this.passwordError.set(error.message || 'No fue posible cambiar la contrasena.'),
      });
  }
}
