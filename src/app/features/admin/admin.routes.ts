import { Routes } from '@angular/router';
import { AdminLayoutComponent } from '../../layouts/admin-layout/admin-layout';
import { AdminOrdersComponent } from './pages/admin-orders/admin-orders.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../auth/pages/login/login.component').then(
        (m) => m.LoginComponent
      ),
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
          import('./pages/admin-products/admin-products').then(
            (m) => m.AdminProductsComponent
          ),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import(
            './pages/admin-products/admin-product-form/admin-product-form'
          ).then((m) => m.AdminProductFormComponent),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import(
            './pages/admin-products/admin-product-form/admin-product-form'
          ).then((m) => m.AdminProductFormComponent),
      },
      {
        path: 'customizations',
        loadComponent: () =>
          import('./pages/admin-customizations/admin-customizations').then(
            (m) => m.AdminCustomizationsComponent
          ),
      },
      {
        path: 'users',
        title: 'Quản lý khách hàng | SweetCake',
        data: { title: 'Quản lý khách hàng' },
        loadComponent: () =>
          import('./pages/user-management/user-management').then(
            (m) => m.UserManagement
          ),
      },
      {
        path: 'time-slots',
        title: 'Khung giờ nhận bánh | SweetCake',
        data: { title: 'Khung giờ nhận bánh' },
        loadComponent: () =>
          import('./pages/time-slot-manage/time-slot-manage').then(
            (m) => m.TimeSlotManage
          ),
      },
      {
        path: 'vouchers',
        title: 'Quản lý voucher | SweetCake',
        data: { title: 'Quản lý voucher' },
        loadComponent: () =>
          import('./pages/voucher-manage/voucher-manage').then(
            (m) => m.VoucherManage
          ),
      },
    ],
  },
];