import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: ':businessSlug',
    loadComponent: () =>
      import('./pages/catalog/catalog.page').then((m) => m.CatalogPage),
  },
  {
    path: ':businessSlug/product/:slugOrUuid',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.page').then(
        (m) => m.ProductDetailPage,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.page').then((m) => m.LandingPage),
  },
  { path: '**', redirectTo: '' },
];
