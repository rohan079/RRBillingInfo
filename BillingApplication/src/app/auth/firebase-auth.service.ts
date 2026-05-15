import { Injectable, computed, signal } from '@angular/core';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import { firebaseAuth, initFirebaseAnalytics } from '../core/firebase';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private readonly auth = firebaseAuth;

  /** Resolves once after Firebase finishes restoring persisted auth state. */
  private readonly authInitialized: Promise<void>;

  /** Current Firebase user (null when signed out). */
  readonly user = signal<User | null>(null);
  /** Latest ID token for API calls (null when signed out). */
  readonly idToken = signal<string | null>(null);

  readonly isLoggedIn = computed(() => this.user() !== null);

  constructor() {
    initFirebaseAnalytics();

    let resolveInit!: () => void;
    this.authInitialized = new Promise<void>((r) => {
      resolveInit = r;
    });

    let firstEmit = true;
    onIdTokenChanged(this.auth, (u) => {
      if (firstEmit) {
        firstEmit = false;
        resolveInit();
      }
      void this.applyUser(u);
    });
  }

  private async applyUser(u: User | null): Promise<void> {
    this.user.set(u);
    if (u) {
      this.idToken.set(await u.getIdToken());
    } else {
      this.idToken.set(null);
    }
  }

  /** Wait until Firebase has restored session from persistence (first token sync). */
  async whenReady(): Promise<void> {
    await this.authInitialized;
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.idToken.set(null);
    this.user.set(null);
  }
}
