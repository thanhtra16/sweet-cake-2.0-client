import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-wrapper">
      <div class="admin-header">
        <div>
          <h1>Quản lý Đơn hàng & Hoàn tiền</h1>
          <p>Xử lý đơn đặt bánh, duyệt yêu cầu hủy và đối soát hoàn tiền khách hàng.</p>
        </div>
        <button class="btn-refresh" (click)="loadOrders()">🔄 Làm mới</button>
      </div>

      <!-- BỘ LỌC NHANH -->
      <div class="filter-bar">
        <button class="filter-chip" [class.active]="filterMode === 'all'" (click)="setFilter('all')">
          Tất cả đơn
        </button>
        <button class="filter-chip warn" [class.active]="filterMode === 'cancel_req'" (click)="setFilter('cancel_req')">
          🔔 Có yêu cầu hủy chờ duyệt
        </button>
        <button class="filter-chip danger" [class.active]="filterMode === 'cancelled'" (click)="setFilter('cancelled')">
          💸 Đơn đã hủy / Chờ hoàn tiền
        </button>
      </div>

      <div *ngIf="toastMsg" class="toast-box">{{ toastMsg }}</div>

      <!-- BẢNG ĐƠN HÀNG -->
      <div class="table-card">
        <table class="admin-table" *ngIf="!loading && orders.length > 0">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Yêu cầu hủy / Hoàn tiền</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let o of orders">
              <td>
                <strong>#{{ o.code }}</strong>
                <div class="sub">{{ o.receiveDate | date:'dd/MM' }} ({{ o.slotLabel }})</div>
              </td>
              <td>
                <div>{{ o.receiver?.name }}</div>
                <div class="sub">{{ o.receiver?.phone }}</div>
              </td>
              <td>
                <strong>{{ o.total | number }} đ</strong>
                <div class="sub">{{ o.paymentStatus === 'paid' ? 'Đã TT' : 'Chưa TT' }}</div>
              </td>
              <td>
                <span class="status-tag" [ngClass]="'st-' + o.status">{{ o.status }}</span>
              </td>
              <td>
                <!-- Yêu cầu hủy pending -->
                <div *ngIf="o.cancelRequest?.status === 'pending'" class="tag-alert">
                  ⚠️ Khách xin hủy: "{{ o.cancelRequest.reason || o.cancelRequest.reasonCode }}"
                </div>
                <!-- Hoàn tiền pending -->
                <div *ngIf="o.refund?.status === 'pending'" class="tag-refund">
                  ⏳ Chờ hoàn: <strong>{{ o.refund.amount | number }} đ</strong>
                </div>
                <div *ngIf="o.refund?.status === 'completed'" class="tag-done">
                  ✅ Đã hoàn: {{ o.refund.amount | number }} đ
                </div>
              </td>
              <td class="actions-cell">
                <!-- Duyệt / Từ chối yêu cầu hủy -->
                <ng-container *ngIf="o.cancelRequest?.status === 'pending'">
                  <button class="btn-sm btn-approve" (click)="openDecisionModal(o, 'accepted')">Duyệt hủy</button>
                  <button class="btn-sm btn-reject" (click)="openDecisionModal(o, 'rejected')">Từ chối</button>
                </ng-container>

                <!-- Hủy đặc biệt (Lỗi cửa hàng - hoàn 100%) -->
                <button
                  *ngIf="o.status !== 'cancelled' && o.status !== 'done'"
                  class="btn-sm btn-special"
                  (click)="openSpecialCancelModal(o)"
                >
                  Hủy đặc biệt (100%)
                </button>

                <!-- Xác nhận hoàn tiền -->
                <button
                  *ngIf="o.refund?.status === 'pending'"
                  class="btn-sm btn-refund"
                  (click)="openRefundModal(o)"
                >
                  Xác nhận hoàn tiền
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="loading" class="empty-state">Đang tải dữ liệu...</div>
        <div *ngIf="!loading && orders.length === 0" class="empty-state">Không có đơn hàng phù hợp bộ lọc.</div>
      </div>

      <!-- MODAL 1: DUYỆT / TỪ CHỐI YÊU CẦU HỦY -->
      <div class="modal-backdrop" *ngIf="decisionOrder" (click)="decisionOrder = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>{{ decisionType === 'accepted' ? 'Chấp thuận hủy đơn #' + decisionOrder.code : 'Từ chối yêu cầu hủy #' + decisionOrder.code }}</h3>
          <div class="form-group">
            <label>Ghi chú phản hồi cho khách hàng *</label>
            <textarea rows="3" [(ngModel)]="decisionReason" class="form-control" placeholder="Nhập lý do duyệt hoặc từ chối..."></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="decisionOrder = null">Đóng</button>
            <button class="btn-confirm" (click)="submitDecision()">Xác nhận</button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: HỦY ĐẶC BIỆT (LỖI TIỆM HOÀN 100%) -->
      <div class="modal-backdrop" *ngIf="specialCancelOrderObj" (click)="specialCancelOrderObj = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Hủy đặc biệt đơn #{{ specialCancelOrderObj.code }}</h3>
          <p class="desc">Áp dụng khi sự cố phát sinh từ cửa hàng (hết nguyên liệu, sự cố giao nhận...). Hệ thống sẽ tự động tạo phiếu hoàn tiền <strong>100%</strong> nếu khách đã thanh toán.</p>
          <div class="form-group">
            <label>Lý do hủy đặc biệt *</label>
            <textarea rows="3" [(ngModel)]="specialCancelReason" class="form-control" placeholder="Ví dụ: Tiệm gặp sự cố lò nướng không kịp giao đúng giờ..."></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="specialCancelOrderObj = null">Đóng</button>
            <button class="btn-danger" (click)="submitSpecialCancel()">Xác nhận hủy 100%</button>
          </div>
        </div>
      </div>

      <!-- MODAL 3: XÁC NHẬN HOÀN TIỀN THỦ CÔNG -->
      <div class="modal-backdrop" *ngIf="refundOrderObj" (click)="refundOrderObj = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Xác nhận đã chuyển khoản hoàn tiền</h3>
          <p class="desc">Đơn hàng <strong>#{{ refundOrderObj.code }}</strong> — Số tiền hoàn mặc định: <strong>{{ refundOrderObj.refund?.amount | number }} đ</strong></p>
          <div class="form-group">
            <label>Số tiền thực hoàn (VNĐ)</label>
            <input type="number" [(ngModel)]="refundAmount" class="form-control" />
          </div>
          <div class="form-group" *ngIf="refundAmount !== refundOrderObj.refund?.amount">
            <label>Lý do điều chỉnh số tiền hoàn *</label>
            <input type="text" [(ngModel)]="refundAdjustReason" class="form-control" placeholder="Nhập lý do chênh lệch..." />
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="refundOrderObj = null">Đóng</button>
            <button class="btn-confirm" (click)="submitConfirmRefund()">Hoàn tất hoàn tiền</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-wrapper { padding: 30px 40px; font-family: 'Segoe UI', sans-serif; background: #f8f6f4; min-height: 100vh; color: #2c221e; }
    .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-family: serif; margin: 0 0 4px 0; font-size: 28px; }
    .admin-header p { margin: 0; color: #665c54; font-size: 14px; }
    .btn-refresh { background: #fff; border: 1px solid #dcd3cb; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }

    .filter-bar { display: flex; gap: 10px; margin-bottom: 20px; }
    .filter-chip { background: #fff; border: 1px solid #e6e1db; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .filter-chip.active { background: #2c221e; color: #fff; border-color: #2c221e; }

    .toast-box { background: #def7ec; color: #03543f; padding: 12px 18px; border-radius: 8px; margin-bottom: 16px; font-weight: 600; }

    .table-card { background: #fff; border-radius: 14px; border: 1px solid #ebe5df; overflow: hidden; }
    .admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .admin-table th { background: #faf8f6; text-align: left; padding: 14px 16px; border-bottom: 1px solid #ebe5df; color: #665c54; font-size: 12px; text-transform: uppercase; }
    .admin-table td { padding: 14px 16px; border-bottom: 1px solid #f4f0ec; vertical-align: top; }
    .sub { font-size: 12px; color: #8c7b72; margin-top: 2px; }

    .status-tag { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #f3efe9; }
    .st-cancelled { background: #fde8e8; color: #c81e1e; }

    .tag-alert { background: #fef3c7; color: #92400e; padding: 6px 10px; border-radius: 6px; font-size: 12px; margin-bottom: 4px; }
    .tag-refund { background: #e0f2fe; color: #075985; padding: 6px 10px; border-radius: 6px; font-size: 12px; }
    .tag-done { background: #def7ec; color: #03543f; padding: 6px 10px; border-radius: 6px; font-size: 12px; }

    .actions-cell { display: flex; flex-direction: column; gap: 6px; }
    .btn-sm { padding: 6px 10px; border-radius: 6px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; text-align: left; }
    .btn-approve { background: #def7ec; color: #03543f; }
    .btn-reject { background: #fde8e8; color: #c81e1e; }
    .btn-special { background: #fef3c7; color: #92400e; }
    .btn-refund { background: #593e32; color: #fff; }

    .empty-state { padding: 40px; text-align: center; color: #888; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: #fff; border-radius: 14px; padding: 26px; width: 100%; max-width: 450px; }
    .modal-card h3 { margin: 0 0 10px 0; font-family: serif; }
    .desc { font-size: 13px; color: #665c54; margin-bottom: 14px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .form-control { width: 100%; padding: 10px; border: 1px solid #dcd3cb; border-radius: 8px; box-sizing: border-box; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
    .btn-cancel { background: #f3efe9; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-confirm { background: #593e32; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .btn-danger { background: #c81e1e; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
  `]
})
export class AdminOrdersComponent implements OnInit {
  orders: any[] = [];
  loading = false;
  filterMode: 'all' | 'cancel_req' | 'cancelled' = 'all';
  toastMsg = '';

  // Modals state
  decisionOrder: any = null;
  decisionType: 'accepted' | 'rejected' = 'accepted';
  decisionReason = '';

  specialCancelOrderObj: any = null;
  specialCancelReason = '';

  refundOrderObj: any = null;
  refundAmount = 0;
  refundAdjustReason = '';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  setFilter(mode: 'all' | 'cancel_req' | 'cancelled') {
    this.filterMode = mode;
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    const params: any = {};
    if (this.filterMode === 'cancel_req') params.hasCancelRequest = true;
    if (this.filterMode === 'cancelled') params.status = 'cancelled';

    this.orderService.getAdminOrders(params).subscribe({
      next: (res) => {
        this.orders = res.items || res || [];
        this.loading = false;
      },
      error: () => {
        this.orders = [];
        this.loading = false;
      }
    });
  }

  openDecisionModal(order: any, type: 'accepted' | 'rejected') {
    this.decisionOrder = order;
    this.decisionType = type;
    this.decisionReason = '';
  }

  submitDecision() {
    this.orderService
      .decideCancelRequest(this.decisionOrder._id, {
        decision: this.decisionType,
        decisionReason: this.decisionReason
      })
      .subscribe(() => {
        this.decisionOrder = null;
        this.notify('Đã cập nhật quyết định yêu cầu hủy!');
        this.loadOrders();
      });
  }

  openSpecialCancelModal(order: any) {
    this.specialCancelOrderObj = order;
    this.specialCancelReason = '';
  }

  submitSpecialCancel() {
    if (!this.specialCancelReason.trim()) return;
    this.orderService
      .specialCancelOrder(this.specialCancelOrderObj._id, {
        reason: this.specialCancelReason,
        cause: 'shop_fault'
      })
      .subscribe(() => {
        this.specialCancelOrderObj = null;
        this.notify('Đã thực hiện hủy đặc biệt & tạo phiếu hoàn tiền 100%!');
        this.loadOrders();
      });
  }

  openRefundModal(order: any) {
    this.refundOrderObj = order;
    this.refundAmount = order.refund?.amount || 0;
    this.refundAdjustReason = '';
  }

  submitConfirmRefund() {
    this.orderService
      .confirmRefund(this.refundOrderObj._id, {
        amount: this.refundAmount,
        adjustReason: this.refundAdjustReason
      })
      .subscribe(() => {
        this.refundOrderObj = null;
        this.notify('Đã xác nhận hoàn tiền thành công!');
        this.loadOrders();
      });
  }

  notify(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => (this.toastMsg = ''), 4000);
  }
}