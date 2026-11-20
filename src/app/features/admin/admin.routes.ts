import { Routes } from '@angular/router';
import { AdminOrdersComponent } from './pages/admin-orders/admin-orders.component';

export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'orders', pathMatch: 'full' },
  { path: 'orders', component: AdminOrdersComponent }
];