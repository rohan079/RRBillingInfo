import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { NavApiService } from '../api/nav-api.service';
import { FirebaseAuthService } from '../auth/firebase-auth.service';
import { environment } from '../../environments/environment';
import { createFirebaseAuthMock } from '../testing/firebase-auth.mock';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        {
          provide: NavApiService,
          useValue: {
            getShell: () =>
              of({
                appName: 'Billing App',
                links: [{ path: '/home', label: 'Home', exact: true }],
              }),
          },
        },
        { provide: FirebaseAuthService, useValue: createFirebaseAuthMock() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows configured brand even when API returns an old appName', () => {
    fixture.detectChanges();
    const brand = fixture.nativeElement.querySelector('.brand-link') as HTMLElement;
    expect(brand.textContent?.trim()).toBe(environment.appDisplayName);
    expect(brand.textContent?.trim()).not.toBe('Billing App');
  });
});
