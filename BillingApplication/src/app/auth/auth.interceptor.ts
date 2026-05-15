import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { FirebaseAuthService } from './firebase-auth.service';

/** Attach Firebase ID token to same-origin API calls (optional backend verification later). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(FirebaseAuthService);
  const token = auth.idToken();
  const base = environment.apiBaseUrl;
  if (!token || !req.url.startsWith(base)) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
