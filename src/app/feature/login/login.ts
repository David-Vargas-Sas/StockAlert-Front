import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [MatIconModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  readonly form = new FormGroup({
    username: new FormControl('superadmin', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('Admin123*', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
    remember: new FormControl(true, { nonNullable: true }),
  });

  errorMessage = '';
  loading = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Revisa el usuario, la contrasena y el rol.';
      return;
    }

    this.loading = true;

    const { username, password } = this.form.getRawValue();

    this.auth
      .login(username, password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
        void this.router.navigate(['/app/dashboard']);
        },
        error: (error: Error) => {
          this.errorMessage = error.message || 'No fue posible iniciar sesion. Verifica credenciales o conexion con el servidor.';
        },
      });
  }
}
