import { Routes } from '@angular/router';
import { StockalertDashboard } from './feature/dashboard/stockalert-dashboard';
import { AlertsPage } from './feature/dashboard/pages/alerts/alerts';
import { AuditPage } from './feature/dashboard/pages/audit/audit';
import { CompaniesPage } from './feature/dashboard/pages/companies/companies';
import { CustomersPage } from './feature/dashboard/pages/customers/customers';
import { DashboardHomePage } from './feature/dashboard/pages/dashboard-home/dashboard-home';
import { InventoryPage } from './feature/dashboard/pages/inventory/inventory';
import { ProductsPage } from './feature/dashboard/pages/products/products';
import { PurchasesPage } from './feature/dashboard/pages/purchases/purchases';
import { RolesPage } from './feature/dashboard/pages/roles/roles';
import { SalesPage } from './feature/dashboard/pages/sales/sales';
import { SuppliersPage } from './feature/dashboard/pages/suppliers/suppliers';
import { UsersPage } from './feature/dashboard/pages/users/users';
import { Login } from './feature/login/login';
import { Register } from './feature/register/register';
import { authGuard } from './services/auth';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'app', redirectTo: 'app/dashboard', pathMatch: 'full' },
  {
    path: 'app',
    component: StockalertDashboard,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardHomePage, canActivate: [authGuard], data: { permissions: ['DASHBOARD_READ'] } },
      { path: 'productos', component: ProductsPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['PRODUCT_READ'] } },
      { path: 'inventario', component: InventoryPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['INVENTORY_READ'] } },
      { path: 'ventas', component: SalesPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'VENDEDOR', 'CONSULTOR'], permissions: ['SALE_READ'] } },
      { path: 'compras', component: PurchasesPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['PURCHASE_READ'] } },
      { path: 'clientes', component: CustomersPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'VENDEDOR', 'CONSULTOR'], permissions: ['CUSTOMER_READ'] } },
      { path: 'proveedores', component: SuppliersPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['SUPPLIER_READ'] } },
      { path: 'alertas', component: AlertsPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR', 'BODEGUERO', 'CONSULTOR'], permissions: ['ALERT_READ'] } },
      { path: 'usuarios', component: UsersPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR'], permissions: ['USER_READ'] } },
      { path: 'roles', component: RolesPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR'], permissions: ['ROLE_READ', 'PERMISSION_READ'] } },
      { path: 'empresas', component: CompaniesPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN'], permissions: ['COMPANY_READ'] } },
      { path: 'auditoria', component: AuditPage, canActivate: [authGuard], data: { roles: ['SUPER_ADMIN', 'ADMINISTRADOR'], permissions: ['SESSION_LOG_READ', 'AUDIT_LOG_READ'] } },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'app/dashboard' },
];
