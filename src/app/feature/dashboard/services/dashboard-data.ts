import { Injectable } from '@angular/core';

export interface Product {
  name: string;
  description: string;
  price: string;
  stock: number;
  min: number;
  state: string;
}

export interface Sale {
  code: string;
  date: string;
  seller: string;
  products: string;
  total: string;
  state: string;
}

export interface AlertItem {
  level: string;
  product: string;
  message: string;
  stock: number;
  min: number;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardData {
  readonly kpis = [
    { label: 'Productos activos', value: '1.248', trend: '+38 este mes', icon: 'inventory', tone: 'blue' },
    { label: 'Ventas del dia', value: '$2.840.000', trend: '72 facturas', icon: 'payments', tone: 'green' },
    { label: 'Ventas del mes', value: '$84.2M', trend: '+12.4% vs abril', icon: 'trending_up', tone: 'cyan' },
    { label: 'Bajo stock', value: '36', trend: '9 criticos', icon: 'warning', tone: 'amber' },
    { label: 'Alertas activas', value: '18', trend: '5 nuevas hoy', icon: 'priority_high', tone: 'red' },
  ];

  readonly products: Product[] = [
    { name: 'Cafe premium 500g', description: 'Linea gourmet', price: '$28.900', stock: 18, min: 20, state: 'Bajo stock' },
    { name: 'Arroz integral 1kg', description: 'Despensa', price: '$8.700', stock: 140, min: 30, state: 'Activo' },
    { name: 'Aceite vegetal 900ml', description: 'Canasta basica', price: '$12.500', stock: 0, min: 16, state: 'Sin stock' },
    { name: 'Jabon liquido 1L', description: 'Aseo', price: '$19.400', stock: 64, min: 12, state: 'Activo' },
  ];

  readonly sales: Sale[] = [
    { code: 'V-1048', date: '14/05/2026 13:42', seller: 'Laura Perez', products: '8 items', total: '$348.000', state: 'Pagada' },
    { code: 'V-1047', date: '14/05/2026 12:18', seller: 'Camilo Ruiz', products: '3 items', total: '$96.500', state: 'Pagada' },
    { code: 'V-1046', date: '14/05/2026 10:55', seller: 'Laura Perez', products: '11 items', total: '$512.900', state: 'Pagada' },
  ];

  readonly alerts: AlertItem[] = [
    { level: 'Critica', product: 'Aceite vegetal 900ml', message: 'Producto sin stock disponible', stock: 0, min: 16, date: '14/05/2026' },
    { level: 'Alta', product: 'Cafe premium 500g', message: 'Stock por debajo del minimo', stock: 18, min: 20, date: '14/05/2026' },
    { level: 'Media', product: 'Leche deslactosada 1L', message: 'Reposicion sugerida en 48 horas', stock: 24, min: 30, date: '13/05/2026' },
  ];

  readonly users = [
    { name: 'Andrea Molina', user: 'amolina', email: 'andrea@empresa.com', role: 'ADMINISTRADOR', state: 'Activo' },
    { name: 'Laura Perez', user: 'lperez', email: 'laura@empresa.com', role: 'VENDEDOR', state: 'Activo' },
    { name: 'Miguel Torres', user: 'mtorres', email: 'miguel@empresa.com', role: 'BODEGUERO', state: 'Inactivo' },
  ];

  readonly companies = [
    { name: 'Mercados La 80', admin: 'Andrea Molina', users: 18, state: 'Activa', created: '10/01/2026' },
    { name: 'Drogueria Central', admin: 'Felipe Cano', users: 9, state: 'Activa', created: '22/02/2026' },
    { name: 'Ferreteria Norte', admin: 'Paula Mejia', users: 6, state: 'Inactiva', created: '03/03/2026' },
  ];

  readonly logs = [
    { date: '15/05/2026 09:36', user: 'superadmin', company: 'StockAlert', ip: '127.0.0.1', event: 'LOGIN' },
    { date: '15/05/2026 09:28', user: 'superadmin', company: 'StockAlert', ip: '127.0.0.1', event: 'REFRESH_TOKEN' },
    { date: '15/05/2026 08:47', user: 'amolina', company: 'Mercados La 80', ip: '190.14.22.8', event: 'LOGIN' },
    { date: '15/05/2026 08:21', user: 'lperez', company: 'Mercados La 80', ip: '190.14.22.9', event: 'LOGIN' },
    { date: '14/05/2026 14:02', user: 'amolina', company: 'Mercados La 80', ip: '190.14.22.8', event: 'LOGIN' },
    { date: '14/05/2026 13:51', user: 'lperez', company: 'Mercados La 80', ip: '190.14.22.9', event: 'REFRESH_TOKEN' },
    { date: '14/05/2026 12:05', user: 'mtorres', company: 'Mercados La 80', ip: '190.14.22.11', event: 'LOGOUT' },
    { date: '14/05/2026 11:42', user: 'lperez', company: 'Mercados La 80', ip: '190.14.22.9', event: 'LOGOUT' },
  ];

  readonly permissions = [
    { module: 'Productos', view: true, create: true, edit: true, disable: true, resolve: false },
    { module: 'Ventas', view: true, create: true, edit: false, disable: false, resolve: false },
    { module: 'Alertas', view: true, create: false, edit: false, disable: false, resolve: true },
    { module: 'Usuarios', view: true, create: true, edit: true, disable: true, resolve: false },
    { module: 'Roles', view: true, create: true, edit: true, disable: false, resolve: false },
  ];

  stateClass(value: string): string {
    return value.toLowerCase().replaceAll(' ', '-');
  }
}
