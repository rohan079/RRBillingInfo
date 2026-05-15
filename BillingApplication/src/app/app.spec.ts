import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { NavApiService } from './api/nav-api.service';
import { App } from './app';
import { routes } from './app.routes';
import { createFirebaseAuthMock } from './testing/firebase-auth.mock';
import { FirebaseAuthService } from './auth/firebase-auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: NavApiService,
          useValue: {
            getShell: () =>
              of({
                appName: 'RR Silks Inventory Info',
                links: [
                  { path: '/home', label: 'Home', exact: true },
                  { path: '/dashboard', label: 'Dashboard', exact: true },
                  { path: '/invoices', label: 'Invoices', exact: true },
                ],
              }),
          },
        },
        { provide: FirebaseAuthService, useValue: createFirebaseAuthMock() },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render shell with navbar and outlet', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
