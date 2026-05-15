import { Component, AfterViewInit, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { NavApiService, type NavLinkDto } from '../api/nav-api.service';
import { FirebaseAuthService } from '../auth/firebase-auth.service';
import { environment } from '../../environments/environment';

const FALLBACK_LINKS: NavLinkDto[] = [
  { path: '/home', label: 'Home', exact: true },
  { path: '/dashboard', label: 'Dashboard', exact: true },
  { path: '/invoices', label: 'Invoices', exact: true },
  { path: '/barcode-print', label: 'Barcode print', exact: true },
  { path: '/products', label: 'Products', exact: true },
];

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements AfterViewInit, OnInit {
  private readonly navApi = inject(NavApiService);
  private readonly auth = inject(FirebaseAuthService);
  private readonly router = inject(Router);

  /** Fixed in UI so a stale API response cannot revert the brand after deploy. */
  protected readonly appName = environment.appDisplayName;
  protected readonly links = signal<NavLinkDto[]>(FALLBACK_LINKS);

  protected readonly isLoggedIn = this.auth.isLoggedIn;
  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  ngOnInit(): void {
    this.navApi.getShell().subscribe({
      next: (shell) => {
        if (shell.links?.length) {
          this.links.set(shell.links);
        }
      },
      error: () => {
        /* keep FALLBACK_LINKS */
      },
    });
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/home');
  }

  ngAfterViewInit() {
    const toggleButton = document.getElementById('mobile-menu') as HTMLElement;
    const navbarMenu = document.getElementById('navbar-menu') as HTMLElement;

    if (toggleButton && navbarMenu) {
      toggleButton.addEventListener('click', () => {
        navbarMenu.classList.toggle('active');
        toggleButton.classList.toggle('active');
      });
    }
  }
}
