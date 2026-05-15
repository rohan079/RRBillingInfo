import { computed, signal } from '@angular/core';
import type { User } from 'firebase/auth';

import type { FirebaseAuthService } from '../auth/firebase-auth.service';

/** Use in tests to avoid initializing the real Firebase SDK. */
export function createFirebaseAuthMock(): FirebaseAuthService {
  const user = signal<User | null>(null);
  const idToken = signal<string | null>(null);
  return {
    user,
    idToken,
    isLoggedIn: computed(() => user() !== null),
    whenReady: async () => {},
    signInWithEmail: async () => {},
    signOut: async () => {},
  } as unknown as FirebaseAuthService;
}
