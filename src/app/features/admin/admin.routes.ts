import { Routes } from '@angular/router';
import { AdminLayoutComponent } from '../../layouts/admin-layout/admin-layout';
import { AdminOrdersComponent } from './pages/admin-orders/admin-orders.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../buyer/pages/login/login.component')
        .then(m => m.LoginComponent),
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
      { path: 'orders', component: AdminOrdersComponent },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/admin-products/admin-products')
            .then(m => m.AdminProductsComponent),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./pages/admin-products/admin-product-form/admin-product-form')
            .then(m => m.AdminProductFormComponent),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./pages/admin-products/admin-product-form/admin-product-form')
            .then(m => m.AdminProductFormComponent),
      },
      {
        path: 'customizations',
        loadComponent: () =>
          import('./pages/admin-customizations/admin-customizations')
            .then(m => m.AdminCustomizationsComponent),
      },
    ],
  },
];