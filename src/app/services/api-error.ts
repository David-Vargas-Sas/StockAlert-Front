import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';

interface BackendErrorBody {
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  message(error: unknown, fallback = 'No fue posible completar la operacion.'): string {
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) {
      return error.message || fallback;
    }

    if (error instanceof HttpErrorResponse) {
      const body = error.error as BackendErrorBody | string | null;

      if (typeof body === 'string' && body.trim()) {
        return body;
      }

      if (body && typeof body !== 'string' && body.message) {
        return body.message;
      }

      if (body && typeof body !== 'string' && body.error) {
        return body.error;
      }

      if (error.message) {
        return error.message;
      }
    }

    return fallback;
  }

  handle(fallback?: string) {
    return (error: unknown) => throwError(() => new Error(this.message(error, fallback)));
  }
}
