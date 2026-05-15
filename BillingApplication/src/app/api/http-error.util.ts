import { HttpErrorResponse } from '@angular/common/http';

export function httpErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body && typeof body === 'object') {
      const o = body as { message?: string; detail?: string };
      if (o.message) return String(o.message);
      if (o.detail) return String(o.detail);
    }
    if (typeof body === 'string' && body.length) return body;
    if (err.status === 0) {
      return 'Cannot reach billing API — start Spring Boot and check CORS / URL.';
    }
    return err.message || `Request failed (${err.status})`;
  }
  return 'Request failed';
}
