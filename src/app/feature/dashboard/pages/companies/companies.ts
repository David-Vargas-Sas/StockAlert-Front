import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { CompaniesPageResponse, CompaniesService, Company } from '../../../../services/companies';
import { PageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-companies-page',
  imports: [MatIconModule, PageTitle],
  template: `
    <section class="page">
      <app-page-title title="Empresas" subtitle="Modulo exclusivo para SUPER_ADMIN." />

      <div class="toolbar">
        <label>
          <mat-icon>search</mat-icon>
          <input placeholder="Buscar empresa" (input)="search.set($any($event.target).value)" />
        </label>
        <button class="primary-btn" (click)="openCreateCompany()"><mat-icon>business</mat-icon>Crear empresa</button>
      </div>

      @if (loading()) {
        <div class="audit-status-card">
          <span class="loading-dot"></span>
          <div>
            <h3>Cargando empresas</h3>
            <p>Consultando empresas registradas en StockAlert.</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="audit-status-card error">
          <mat-icon>error</mat-icon>
          <div>
            <h3>No se pudieron cargar las empresas</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="secondary-btn" type="button" (click)="loadCompanies()">Reintentar</button>
        </div>
      }

      <div class="table-card company-table-card">
        <table class="company-table">
          <colgroup>
            <col class="company-name-col" />
            <col class="company-tax-col" />
            <col class="company-city-col" />
            <col class="company-state-col" />
            <col class="company-actions-col" />
          </colgroup>
          <thead>
            <tr><th>Empresa</th><th>NIT</th><th>Ciudad</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @for (company of filteredCompanies; track company.id) {
              <tr>
                <td>
                  <strong>{{ company.name }}</strong>
                  <small class="muted-line">{{ companySubtitle(company) }}</small>
                </td>
                <td>{{ companyNit(company) }}</td>
                <td>{{ companyLocation(company) }}</td>
                <td>
                  <span class="badge" [class]="isCompanyActive(company) ? 'activa' : 'inactiva'">
                    {{ companyStatusLabel(company) }}
                  </span>
                </td>
                <td class="action-cell">
                  <div class="actions">
                    <button type="button" aria-label="Ver usuarios"><mat-icon>groups</mat-icon></button>
                    <button class="action-label edit-action" type="button" aria-label="Editar empresa" (click)="openEditCompany(company)">
                      <mat-icon>edit</mat-icon>
                      Editar
                    </button>
                    <button type="button" aria-label="Crear administrador" (click)="openCreateAdmin(company)"><mat-icon>person_add</mat-icon></button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">
                  <div class="table-empty">
                    <mat-icon>business</mat-icon>
                    <strong>Sin empresas para mostrar</strong>
                    <span>No hay empresas registradas o el filtro no encontro coincidencias.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (pageInfo()) {
          <div class="pagination">
            <span>Mostrando {{ filteredCompanies.length }} de {{ pageInfo()?.totalElements }} empresas</span>
            <button type="button" [disabled]="pageInfo()?.first" (click)="previousPage()">Anterior</button>
            <button type="button" [disabled]="pageInfo()?.last" (click)="nextPage()">Siguiente</button>
          </div>
        }
      </div>

      @if (createCompanyOpen()) {
        <div class="modal-backdrop" (click)="closeCreateCompany()">
          <section class="modal company-create-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon" [class.edit]="editingCompanyId()" [class.create]="!editingCompanyId()">
                  <mat-icon>{{ editingCompanyId() ? 'edit_square' : 'add_business' }}</mat-icon>
                </span>
                <div>
                  <h2>{{ editingCompanyId() ? 'Editar empresa' : 'Crear empresa' }}</h2>
                  <p>{{ editingCompanyId() ? 'Actualiza datos comerciales, contacto y estado.' : 'Registra una nueva empresa para operar dentro de StockAlert.' }}</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeCreateCompany()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
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
                  <span>Razon social</span>
                  <input #companyName [value]="companyFormName()" placeholder="Ej. Mercados La 80" />
                </label>
                <label class="form-field">
                  <span>Nombre comercial</span>
                  <input #tradeName [value]="companyFormTradeName()" placeholder="Ej. Mercados La 80" />
                </label>
                <label class="form-field">
                  <span>NIT / Tax ID</span>
                  <input #taxId [value]="companyFormTaxId()" placeholder="Ej. 900123456-7" />
                </label>
                <label class="form-field">
                  <span>Digito verificacion</span>
                  <input #verificationDigit [value]="companyFormVerificationDigit()" maxlength="8" placeholder="Ej. 7" />
                </label>
                <label class="form-field">
                  <span>Correo</span>
                  <input #email type="email" [value]="companyFormEmail()" placeholder="empresa@correo.com" />
                </label>
                <label class="form-field">
                  <span>Telefono</span>
                  <input #phone [value]="companyFormPhone()" placeholder="Ej. 3001234567" />
                </label>
                <label class="form-field">
                  <span>Direccion</span>
                  <input #address [value]="companyFormAddress()" placeholder="Direccion principal" />
                </label>
                <label class="form-field">
                  <span>Ciudad</span>
                  <input #city [value]="companyFormCity()" placeholder="Ej. Medellin" />
                </label>
                <label class="form-field">
                  <span>Departamento</span>
                  <input #department [value]="companyFormDepartment()" placeholder="Ej. Antioquia" />
                </label>
                <label class="form-field">
                  <span>Pais</span>
                  <input #country [value]="companyFormCountry()" placeholder="Ej. Colombia" />
                </label>
                <label class="form-field">
                  <span>Representante legal</span>
                  <input #legalRepresentative [value]="companyFormLegalRepresentative()" />
                </label>
                <label class="form-field">
                  <span>Documento representante</span>
                  <input #legalRepresentativeDocument [value]="companyFormLegalRepresentativeDocument()" />
                </label>
                <label class="form-field">
                  <span>Sitio web</span>
                  <input #website [value]="companyFormWebsite()" placeholder="https://empresa.com" />
                </label>
                <label class="form-field">
                  <span>Logo path</span>
                  <input #logoPath [value]="companyFormLogoPath()" placeholder="/logos/empresa.png" />
                </label>
              </div>

              @if (editingCompanyId()) {
                <label class="toggle-field">
                  <input type="checkbox" [checked]="companyFormActive()" (change)="companyFormActive.set($any($event.target).checked)" />
                  <span>Empresa activa</span>
                </label>
              }
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeCreateCompany()">Cancelar</button>
              <button
                class="primary-btn"
                type="button"
                [disabled]="creatingCompany()"
                (click)="saveCompany({
                  name: companyName.value,
                  tradeName: tradeName.value,
                  taxId: taxId.value,
                  verificationDigit: verificationDigit.value,
                  email: email.value,
                  phone: phone.value,
                  address: address.value,
                  city: city.value,
                  department: department.value,
                  country: country.value,
                  legalRepresentative: legalRepresentative.value,
                  legalRepresentativeDocument: legalRepresentativeDocument.value,
                  website: website.value,
                  logoPath: logoPath.value
                })"
              >
                <mat-icon>save</mat-icon>
                {{ creatingCompany() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </section>
        </div>
      }

      @if (createAdminOpen()) {
        <div class="modal-backdrop" (click)="closeCreateAdmin()">
          <section class="modal user-edit-modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon admin"><mat-icon>admin_panel_settings</mat-icon></span>
                <div>
                  <h2>Crear administrador</h2>
                  <p>{{ selectedAdminCompany()?.name }} recibira un usuario con rol Administrador.</p>
                </div>
              </div>
              <button class="modal-close" type="button" (click)="closeCreateAdmin()" aria-label="Cerrar modal"><mat-icon>close</mat-icon></button>
            </header>

            <div class="modal-body">
              @if (adminError()) {
                <div class="inline-error">
                  <mat-icon>error</mat-icon>
                  <span>{{ adminError() }}</span>
                </div>
              }

              <div class="form-grid">
                <label class="form-field">
                  <span>Usuario</span>
                  <input #adminUsername placeholder="Ej. admin.mercados80" />
                </label>
                <label class="form-field">
                  <span>Contrasena temporal</span>
                  <input #adminPassword type="password" placeholder="Admin123*" />
                </label>
                <label class="form-field">
                  <span>Nombre completo</span>
                  <input #adminFullName placeholder="Ej. Andrea Molina" />
                </label>
                <label class="form-field">
                  <span>Correo</span>
                  <input #adminEmail type="email" placeholder="admin@empresa.com" />
                </label>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="secondary-btn" type="button" (click)="closeCreateAdmin()">Cancelar</button>
              <button
                class="primary-btn"
                type="button"
                [disabled]="creatingAdmin()"
                (click)="saveCompanyAdmin({
                  username: adminUsername.value,
                  password: adminPassword.value,
                  fullName: adminFullName.value,
                  email: adminEmail.value
                })"
              >
                <mat-icon>person_add</mat-icon>
                {{ creatingAdmin() ? 'Creando...' : 'Crear administrador' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
})
export class CompaniesPage implements OnInit {
  private readonly companiesService = inject(CompaniesService);

  readonly companies = signal<Company[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pageInfo = signal<Omit<CompaniesPageResponse, 'content'> | null>(null);
  readonly currentPage = signal(0);
  readonly search = signal('');
  readonly createCompanyOpen = signal(false);
  readonly creatingCompany = signal(false);
  readonly createError = signal('');
  readonly editingCompanyId = signal<number | null>(null);
  readonly companyFormName = signal('');
  readonly companyFormTradeName = signal('');
  readonly companyFormTaxId = signal('');
  readonly companyFormVerificationDigit = signal('');
  readonly companyFormEmail = signal('');
  readonly companyFormPhone = signal('');
  readonly companyFormAddress = signal('');
  readonly companyFormCity = signal('');
  readonly companyFormDepartment = signal('');
  readonly companyFormCountry = signal('');
  readonly companyFormLegalRepresentative = signal('');
  readonly companyFormLegalRepresentativeDocument = signal('');
  readonly companyFormWebsite = signal('');
  readonly companyFormLogoPath = signal('');
  readonly companyFormActive = signal(true);
  readonly createAdminOpen = signal(false);
  readonly creatingAdmin = signal(false);
  readonly adminError = signal('');
  readonly selectedAdminCompany = signal<Company | null>(null);
  readonly pageSize = 10;

  ngOnInit(): void {
    this.loadCompanies();
  }

  get filteredCompanies(): Company[] {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.companies();
    }

    return this.companies().filter((company) =>
      [company.name, company.tradeName, company.taxId, company.email, company.city, company.department, this.companyStatusLabel(company)]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }

  loadCompanies(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set('');

    this.companiesService
      .getPaginated({ page, size: this.pageSize })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const { content, ...pageInfo } = response;
          this.companies.set(content);
          this.pageInfo.set(pageInfo);
          this.currentPage.set(response.page);
        },
        error: (error: Error) => {
          this.companies.set([]);
          this.pageInfo.set(null);
          this.error.set(error.message || 'Revisa que la sesion sea valida y que el backend este activo.');
        },
      });
  }

  previousPage(): void {
    if (!this.pageInfo()?.first) {
      this.loadCompanies(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (!this.pageInfo()?.last) {
      this.loadCompanies(this.currentPage() + 1);
    }
  }

  openCreateCompany(): void {
    this.createError.set('');
    this.editingCompanyId.set(null);
    this.setCompanyForm();
    this.companyFormActive.set(true);
    this.createCompanyOpen.set(true);
  }

  openEditCompany(company: Company): void {
    this.createError.set('');
    this.editingCompanyId.set(company.id);
    this.setCompanyForm(company);
    this.companyFormActive.set(company.active);
    this.createCompanyOpen.set(true);
  }

  closeCreateCompany(): void {
    if (!this.creatingCompany()) {
      this.createCompanyOpen.set(false);
    }
  }

  openCreateAdmin(company: Company): void {
    this.adminError.set('');
    this.selectedAdminCompany.set(company);
    this.createAdminOpen.set(true);
  }

  closeCreateAdmin(): void {
    if (!this.creatingAdmin()) {
      this.createAdminOpen.set(false);
    }
  }

  saveCompanyAdmin(form: { username: string; password: string; fullName: string; email: string }): void {
    const company = this.selectedAdminCompany();
    const request = {
      username: form.username.trim(),
      password: form.password.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
    };

    if (!company) {
      this.adminError.set('Selecciona una empresa para crear el administrador.');
      return;
    }

    if (!request.username || !request.password || !request.fullName || !request.email) {
      this.adminError.set('Completa usuario, contrasena, nombre y correo.');
      return;
    }

    this.creatingAdmin.set(true);
    this.adminError.set('');

    this.companiesService
      .createAdmin(company.id, request)
      .pipe(finalize(() => this.creatingAdmin.set(false)))
      .subscribe({
        next: () => {
          this.createAdminOpen.set(false);
          this.selectedAdminCompany.set(null);
        },
        error: (error: Error) => this.adminError.set(error.message || 'No fue posible crear el administrador.'),
      });
  }

  saveCompany(form: {
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
  }): void {
    const request = {
      name: form.name.trim(),
      tradeName: form.tradeName.trim(),
      taxId: form.taxId.trim(),
      verificationDigit: form.verificationDigit.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      department: form.department.trim(),
      country: form.country.trim(),
      legalRepresentative: form.legalRepresentative.trim(),
      legalRepresentativeDocument: form.legalRepresentativeDocument.trim(),
      website: form.website.trim(),
      logoPath: form.logoPath.trim(),
    };

    if (!request.name || !request.taxId || !request.email) {
      this.createError.set('Completa razon social, NIT / Tax ID y correo.');
      return;
    }

    this.creatingCompany.set(true);
    this.createError.set('');

    const editingCompanyId = this.editingCompanyId();
    const saveRequest = editingCompanyId
      ? this.companiesService.update(editingCompanyId, {
          ...request,
          active: this.companyFormActive(),
        })
      : this.companiesService.create(request);

    saveRequest
      .pipe(finalize(() => this.creatingCompany.set(false)))
      .subscribe({
        next: () => {
          this.createCompanyOpen.set(false);
          this.editingCompanyId.set(null);
          this.loadCompanies(editingCompanyId ? this.currentPage() : 0);
        },
        error: (error: Error) => this.createError.set(error.message || 'No fue posible crear la empresa.'),
      });
  }

  private setCompanyForm(company?: Company): void {
    this.companyFormName.set(company?.name ?? '');
    this.companyFormTradeName.set(company?.tradeName ?? '');
    this.companyFormTaxId.set(company?.taxId ?? '');
    this.companyFormVerificationDigit.set(company?.verificationDigit ?? '');
    this.companyFormEmail.set(company?.email ?? '');
    this.companyFormPhone.set(company?.phone ?? '');
    this.companyFormAddress.set(company?.address ?? '');
    this.companyFormCity.set(company?.city ?? '');
    this.companyFormDepartment.set(company?.department ?? '');
    this.companyFormCountry.set(company?.country ?? '');
    this.companyFormLegalRepresentative.set(company?.legalRepresentative ?? '');
    this.companyFormLegalRepresentativeDocument.set(company?.legalRepresentativeDocument ?? '');
    this.companyFormWebsite.set(company?.website ?? '');
    this.companyFormLogoPath.set(company?.logoPath ?? '');
  }

  isCompanyActive(company: Company): boolean {
    const status = String(company.status || '').toUpperCase();

    if (status) {
      return status === 'ACTIVE';
    }

    return company.active;
  }

  companyStatusLabel(company: Company): string {
    return this.isCompanyActive(company) ? 'Activa' : 'Inactiva';
  }

  companySubtitle(company: Company): string {
    return company.tradeName || company.email || 'Sin nombre comercial';
  }

  companyNit(company: Company): string {
    if (!company.taxId || company.taxId === '-') {
      return 'Sin NIT';
    }

    return company.verificationDigit ? `${company.taxId}-${company.verificationDigit}` : company.taxId;
  }

  companyLocation(company: Company): string {
    return [company.city, company.department].filter(Boolean).join(', ') || 'Sin ciudad';
  }

  formatDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? '-'
      : new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(date);
  }
}
