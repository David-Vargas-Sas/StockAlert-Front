import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface TopProduct {
  productId: number;
  productName: string;
  quantitySold: number;
  totalSold: number;
}

export interface DashboardSummary {
  todaySalesTotal: number;
  todaySalesCount: number;
  monthSalesTotal: number;
  monthSalesVariationPercentage: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  activeAlerts: number;
  todayNewAlerts: number;
  stockValue: number;
}

export interface InventorySummary {
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  stockValue: number;
}

export type SalesPeriod = 'DAY' | 'WEEK' | 'MONTH';

export interface SalesPeriodPoint {
  label: string;
  total: number;
  count: number;
}

export interface LatestSale {
  id: number;
  saleNumber: string;
  customerId: number;
  customerName: string;
  total: number;
  status: string;
  saleDate: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

const DASHBOARD_URL = 'http://localhost:8080/api/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getTopProducts(limit = 5): Observable<TopProduct[]> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const params = new HttpParams().set('limit', limit);

    return this.http.get<ApiResponse<TopProduct[]>>(`${DASHBOARD_URL}/top-products`, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar los productos mas vendidos.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar los productos mas vendidos.')),
    );
  }

  getLatestSales(limit = 5): Observable<LatestSale[]> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const params = new HttpParams().set('limit', limit);

    return this.http.get<ApiResponse<LatestSale[]>>(`${DASHBOARD_URL}/latest-sales`, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar las ultimas ventas.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar las ultimas ventas.')),
    );
  }

  getSummary(): Observable<DashboardSummary> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<DashboardSummary>>(`${DASHBOARD_URL}/summary`, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar el resumen del dashboard.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar el resumen del dashboard.')),
    );
  }

  getInventorySummary(): Observable<InventorySummary> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    return this.http.get<ApiResponse<InventorySummary>>(`${DASHBOARD_URL}/inventory-summary`, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar el resumen de inventario.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar el resumen de inventario.')),
    );
  }

  getSalesPeriod(period: SalesPeriod): Observable<SalesPeriodPoint[]> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<SalesPeriodPoint[]>>(`${DASHBOARD_URL}/sales-period`, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar las ventas por periodo.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible cargar las ventas por periodo.')),
    );
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.auth.accessToken();

    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : null;
  }
}
