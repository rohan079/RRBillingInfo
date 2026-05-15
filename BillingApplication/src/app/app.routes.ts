import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'invoices',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./invoices/invoices').then((m) => m.Invoices),
  },
  {
    path: 'products',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./products/products').then((m) => m.Products),
  },
  {
    path: 'barcode-print',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./barcode-print/barcode-print').then((m) => m.BarcodePrint),
  },
  { path: '**', redirectTo: 'home' },
];
