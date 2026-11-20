import { Routes } from '@angular/router';
import { OrderTrackComponent } from './pages/order-track/order-track.component';
import { OrderListComponent } from './pages/order-list/order-list.component';
import { OrderDetailComponent } from './pages/order-detail/order-detail.component';

export const BUYER_ROUTES: Routes = [
  { path: '', component: OrderTrackComponent },
  { path: 'track', component: OrderTrackComponent },
  { path: 'orders', component: OrderListComponent },
  { path: 'orders/:id', component: OrderDetailComponent }
];