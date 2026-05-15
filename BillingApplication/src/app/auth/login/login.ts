import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { firebaseAuthUserMessage } from '../firebase-auth-errors';
import { FirebaseAuthService } from '../firebase-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(FirebaseAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.auth.whenReady().then(() => {
      if (this.auth.user()) {
        void this.router.navigateByUrl(this.nextUrl());
      }
    });
  }

  protected async submit(): Promise<void> {
    const email = this.email.trim();
    const password = this.password;
    if (!email || !password) {
      this.error.set('Enter email and password.');
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.auth.signInWithEmail(email, password);
      await this.router.navigateByUrl(this.nextUrl());
    } catch (e: unknown) {
      this.error.set(firebaseAuthUserMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  private nextUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('next');
    if (!raw || !raw.startsWith('/')) {
      return '/invoices';
    }
    return raw;
  }
}
