import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Trạng thái đơn hàng khớp enum `status` ở Backend (models/order.js). */
export type OrderStatus =
  | 'pending_payment'
  | 'pending_approval'
  | 'accepted'
  | 'baking'
  | 'done'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface OrderRow {
  code: string;
  createdAt: string;
  summary: string;
  total: number;
  status: OrderStatus;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Chờ thanh toán',
  pending_approval: 'Chờ tiếp nhận',
  accepted: 'Đã tiếp nhận',
  baking: 'Đang làm bánh',
  done: 'Đã xong',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

@Component({
  selector: 'app-orders-tab',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './orders-tab.component.html',
  styleUrl: './orders-tab.component.css'
})
export class OrdersTabComponent {
  readonly statuses = Object.keys(STATUS_LABELS) as OrderStatus[];
  readonly labels = STATUS_LABELS;

  readonly filter = signal<OrderStatus | 'all'>('all');

  /**
   * Danh sách đơn của khách.
   * TODO: Backend hiện chỉ có POST /api/orders/quote, chưa có API "đơn của tôi"
   * (vd GET /api/orders/me). Khi có, gọi API tại đây và gán vào signal này.
   */
  readonly orders = signal<OrderRow[]>([]);

  readonly visibleOrders = computed(() =>
    this.filter() === 'all' ? this.orders() : this.orders().filter((o) => o.status === this.filter())
  );

  statusClass(status: OrderStatus): string {
    switch (status) {
      case 'delivered':
      case 'done':
        return 'status-delivered';
      case 'delivering':
        return 'status-delivering';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }
}
