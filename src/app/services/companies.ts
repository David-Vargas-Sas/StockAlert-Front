import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { ApiErrorService } from './api-error';
import { AuthService } from './auth';

export interface CompanyOption {
  id: number;
  name: string;
  status: string;
  active: boolean;
}

export interface Company {
  id: number;
  name: string;
  tradeName: string;
  taxId: string;
  verificationDigit: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  country: string;
  legalRepresentative: string;
  legalRepresentativeDocument: string;
  website: string;
  logoPath: string;
  status: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  tradeName: string;
  taxId: string;
  verificationDigit: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  country: string;
  legalRepresentative: string;
  legalRepresentativeDocument: string;
  website: string;
  logoPath: string;
}

export interface UpdateCompanyRequest extends CreateCompanyRequest {
  active?: boolean;
  status?: string;
}

export interface CreateCompanyAdminRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface CompanyAdminUser {
  id: number;
  companyId: number;
  companyName: string;
  username: string;
  email: string;
  fullName: string;
  active: boolean;
  createdAt: string;
  roles: {
    id: number;
    companyId: number;
    name: string;
    description: string;
    permissions: {
      id: number;
      name: string;
      description: string;
    }[];
  }[];
}

export interface CompaniesPageResponse {
  content: Company[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CompaniesQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

interface ApiCompany {
  id?: number;
  companyId?: number;
  name?: string;
  companyName?: string;
  tradeName?: string;
  trade_name?: string;
  commercialName?: string;
  businessName?: string;
  taxId?: string;
  tax_id?: string;
  nit?: string;
  verificationDigit?: string;
  verification_digit?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  municipality?: string;
  department?: string;
  state?: string;
  country?: string;
  legalRepresentative?: string;
  legal_representative?: string;
  legalRepresentativeDocument?: string;
  legal_representative_document?: string;
  website?: string;
  logoPath?: string;
  logo_path?: string;
  status?: string;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiCompaniesPage {
  content?: ApiCompany[];
  page?: number;
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

const COMPANIES_URL = 'http://localhost:8080/api/companies';
const COMPANIES_PAGINATED_URL = `${COMPANIES_URL}/paginated`;

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);

  getOptions(): Observable<CompanyOption[]> {
    const token = this.auth.accessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return this.http.get<ApiResponse<ApiCompany[] | { content: ApiCompany[] }> | ApiCompany[]>(COMPANIES_URL, { headers }).pipe(
      map((response) => this.normalizeCompanies(response)),
      catchError(() => of(this.currentCompanyFallback())),
    );
  }

  getAll(): Observable<Company[]> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.get<ApiResponse<ApiCompany[] | { content: ApiCompany[] }> | ApiCompany[]>(COMPANIES_URL, { headers }).pipe(
      map((response) => this.normalizeCompanyList(response)),
      catchError(this.apiError.handle('No fue posible cargar las empresas.')),
    );
  }

  getPaginated(query: CompaniesQuery = {}): Observable<CompaniesPageResponse> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 10)
      .set('sortBy', query.sortBy ?? 'id')
      .set('sortDirection', query.sortDirection ?? 'asc');

    return this.http.get<ApiResponse<ApiCompaniesPage>>(COMPANIES_PAGINATED_URL, { headers, params }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible cargar las empresas.');
        }

        return this.normalizePaginatedResponse(response.data);
      }),
      catchError(this.apiError.handle('No fue posible cargar las empresas.')),
    );
  }

  create(request: CreateCompanyRequest): Observable<Company> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post<ApiResponse<ApiCompany>>(COMPANIES_URL, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible crear la empresa.');
        }

        return this.normalizeCompany(response.data);
      }),
      catchError(this.apiError.handle('No fue posible crear la empresa.')),
    );
  }

  update(companyId: number, request: UpdateCompanyRequest): Observable<Company> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.put<ApiResponse<ApiCompany>>(`${COMPANIES_URL}/${companyId}`, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible actualizar la empresa.');
        }

        return this.normalizeCompany(response.data);
      }),
      catchError(this.apiError.handle('No fue posible actualizar la empresa.')),
    );
  }

  createAdmin(companyId: number, request: CreateCompanyAdminRequest): Observable<CompanyAdminUser> {
    const token = this.auth.accessToken();

    if (!token) {
      return throwError(() => new Error('No hay token de acceso disponible.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post<ApiResponse<CompanyAdminUser>>(`${COMPANIES_URL}/${companyId}/admin`, request, { headers }).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'No fue posible crear el administrador.');
        }

        return response.data;
      }),
      catchError(this.apiError.handle('No fue posible crear el administrador.')),
    );
  }

  private normalizeCompanies(response: ApiResponse<ApiCompany[] | { content: ApiCompany[] }> | ApiCompany[]): CompanyOption[] {
    return this.normalizeCompanyList(response)
      .map((company) => ({
        id: company.id,
        name: company.name,
        status: company.status,
        active: company.active,
      }))
      .filter((company) => company.id > 0);
  }

  private normalizeCompanyList(response: ApiResponse<ApiCompany[] | { content: ApiCompany[] }> | ApiCompany[]): Company[] {
    const data = Array.isArray(response) ? response : response.data;
    const companies = Array.isArray(data) ? data : data.content;

    return companies.map((company) => this.normalizeCompany(company)).filter((company) => company.id > 0);
  }

  private normalizePaginatedResponse(data: ApiCompaniesPage): CompaniesPageResponse {
    return {
      content: (data.content ?? []).map((company) => this.normalizeCompany(company)).filter((company) => company.id > 0),
      page: data.page ?? data.number ?? 0,
      size: data.size ?? 10,
      totalElements: data.totalElements ?? 0,
      totalPages: data.totalPages ?? 0,
      first: data.first ?? true,
      last: data.last ?? true,
      empty: data.empty ?? false,
    };
  }

  private normalizeCompany(company: ApiCompany): Company {
    const status = company.status ?? (company.active === false ? 'INACTIVE' : 'ACTIVE');

    return {
      id: company.id ?? company.companyId ?? 0,
      name: company.name ?? company.companyName ?? 'Empresa sin nombre',
      tradeName: company.tradeName ?? company.trade_name ?? company.commercialName ?? company.businessName ?? '',
      taxId: company.taxId ?? company.tax_id ?? company.nit ?? '-',
      verificationDigit: company.verificationDigit ?? company.verification_digit ?? '',
      email: company.email ?? '',
      phone: company.phone ?? '',
      address: company.address ?? '',
      city: company.city ?? company.municipality ?? '',
      department: company.department ?? company.state ?? '',
      country: company.country ?? '',
      legalRepresentative: company.legalRepresentative ?? company.legal_representative ?? '',
      legalRepresentativeDocument: company.legalRepresentativeDocument ?? company.legal_representative_document ?? '',
      website: company.website ?? '',
      logoPath: company.logoPath ?? company.logo_path ?? '',
      status,
      active: company.active ?? status === 'ACTIVE',
      createdAt: company.createdAt ?? company.created_at ?? '',
      updatedAt: company.updatedAt ?? company.updated_at ?? '',
    };
  }

  private currentCompanyFallback(): CompanyOption[] {
    const user = this.auth.user();

    return user
      ? [
          {
            id: user.companyId,
            name: user.company,
            status: 'ACTIVE',
            active: true,
          },
        ]
      : [];
  }
}
