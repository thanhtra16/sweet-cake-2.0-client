import { Routes } from '@angular/router';
import { AdminOrderFullComponent } from './pages/admin-order-full/admin-order-full.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'orders',
    pathMatch: 'full'
  },
  {
    path: 'orders',
    component: AdminOrderFullComponent
  }
];