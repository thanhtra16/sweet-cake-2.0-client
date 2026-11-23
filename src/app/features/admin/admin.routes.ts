// import { Routes } from '@angular/router';
// import { adminGuard } from '../../core/guards/admin.guard';
// import { AdminLayout } from './lay-out/admin-layout/admin-layout';

// export const ADMIN_ROUTES: Routes = [
//   {
//     path: '',
//     component: AdminLayout, // khung admin riêng: sidebar + topbar + toast
//     canActivate: [adminGuard],
//     children: [
//       { path: '', pathMatch: 'full', redirectTo: 'users' },
//       {
//         path: 'users',
//         title: 'Quản lý khách hàng | SweetCake',
//         data: { title: 'Quản lý khách hàng' }, // hiện ở breadcrumb của AdminLayout
//         loadComponent: () =>
//           import('./pages/user-management/user-management').then((m) => m.UserManagement),
//       },
//     ],
//   },
// ];

// Tạm thời bỏ adminGuard để xem và test giao diện Admin Frontend trước
// http://localhost:4200/admin/users
import { Routes } from '@angular/router';
import { AdminLayout } from './lay-out/admin-layout/admin-layout';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'users',
      },
      {
        path: 'users',
        title: 'Quản lý khách hàng | SweetCake',
        data: { title: 'Quản lý khách hàng' },
        loadComponent: () =>
          import('./pages/user-management/user-management')
            .then((m) => m.UserManagement),
      },
      {
        path: 'time-slots',
        title: 'Khung giờ nhận bánh | SweetCake',
        data: { title: 'Khung giờ nhận bánh' },
        loadComponent: () =>
          import('./pages/time-slot-manage/time-slot-manage').then((m) => m.TimeSlotManage),
      },
      {
        path: 'vouchers',
        title: 'Quản lý voucher | SweetCake',
        data: { title: 'Quản lý voucher' },
        loadComponent: () => import('./pages/voucher-manage/voucher-manage').then((m) => m.VoucherManage),
      },      
    ],
  },
];