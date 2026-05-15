import { inject } from '@angular/core';
import { Router, type CanMatchFn, type UrlSegment } from '@angular/router';

import { FirebaseAuthService } from './firebase-auth.service';

export const authGuard: CanMatchFn = async (_route, segments: UrlSegment[]) => {
  const auth = inject(FirebaseAuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.user()) {
    return true;
  }
  const path = '/' + segments.map((s) => s.path).join('/');
  const next = path === '/' ? '/invoices' : path;
  return router.parseUrl(`/login?next=${encodeURIComponent(next)}`);
};
