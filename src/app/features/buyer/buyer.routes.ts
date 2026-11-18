import { Routes } from '@angular/router';
import { OrderTrackComponent } from './pages/order-track/order-track.component';

export const BUYER_ROUTES: Routes = [
  {
    path: '',
    component: OrderTrackComponent // Hiển thị trang tra cứu ngay khi vào trang chủ
  },
  {
    path: 'track',
    component: OrderTrackComponent // Hoặc truy cập qua đường dẫn /track
  }
];