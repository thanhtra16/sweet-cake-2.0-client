import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-wrapper">

        <!-- 1. HEADER -->
        <header class="admin-header">
          <div>
            <h1>Quản lý Đơn hàng & Hoàn tiền</h1>
            <p>Xử lý đơn đặt bánh, duyệt yêu cầu hủy và đối soát hoàn tiền khách hàng.</p>
          </div>
          <button class="btn-refresh" (click)="loadAdminOrders()" [disabled]="loading">
            <i class="bi bi-arrow-clockwise"></i> Làm mới
          </button>
        </header>

        <!-- 2. TABS & BỘ LỌC -->
        <div class="toolbar-row">
          <div class="filter-tabs">
            <button
              class="tab-pill"
              [class.active]="activeFilter === 'all'"
              (click)="setFilter('all')"
            >
              Tất cả đơn
            </button>
            <button
              class="tab-pill"
              [class.active]="activeFilter === 'cancel_request'"
              (click)="setFilter('cancel_request')"
            >
              🔔 Có yêu cầu hủy chờ duyệt
            </button>
            <button
              class="tab-pill"
              [class.active]="activeFilter === 'refund'"
              (click)="setFilter('refund')"
            >
              💸 Đơn đã hủy / Chờ hoàn tiền
            </button>
          </div>

          <div class="search-controls">
            <input
              type="text"
              [(ngModel)]="searchText"
              (keyup.enter)="loadAdminOrders()"
              placeholder="Tìm mã đơn, tên hoặc SĐT..."
              class="search-input"
            />
            <select [(ngModel)]="statusFilter" (change)="loadAdminOrders()" class="status-select">
              <option value="">Tất cả trạng thái</option>
              <option value="pending_payment">Chờ thanh toán</option>
              <option value="pending_approval">Chờ duyệt</option>
              <option value="accepted">Đã tiếp nhận</option>
              <option value="baking">Đang làm bánh</option>
              <option value="delivering">Đang giao</option>
              <option value="done">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <!-- THÔNG BÁO THAO TÁC -->
        <div *ngIf="toastMsg" class="toast-ok">
          <i class="bi bi-check-circle-fill"></i> {{ toastMsg }}
        </div>

        <!-- 3. TRẠNG THÁI LOADING / ERROR / EMPTY -->
        <div *ngIf="loading" class="state-card">
          Đang tải dữ liệu...
        </div>

        <div *ngIf="!loading && errorMsg" class="state-card error">
          <p>{{ errorMsg }}</p>
          <button class="btn-dark" (click)="loadAdminOrders()">Thử kết nối lại</button>
        </div>

        <div *ngIf="!loading && !errorMsg && orders.length === 0" class="state-card">
          Không có đơn hàng nào phù hợp với bộ lọc hiện tại.
        </div>

        <!-- 4. DANH SÁCH ĐƠN HÀNG ADMIN -->
        <div class="orders-table-card" *ngIf="!loading && !errorMsg && orders.length > 0">
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn & Ngày đặt</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm đặt</th>
                  <th>Tổng tiền & Thanh toán</th>
                  <th>Trạng thái & Yêu cầu</th>
                  <th class="text-right">Thao tác xử lý</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let o of orders">
                  <!-- Cột 1: Mã đơn -->
                  <td>
                    <strong class="code-txt">#{{ o.code }}</strong>
                    <div class="sub-txt">{{ o.createdAt | date:'HH:mm - dd/MM/yyyy' }}</div>
                    <span class="method-tag">
                      {{ o.receiveMethod === 'delivery' ? 'Giao tận nơi' : 'Lấy tại tiệm' }}
                    </span>
                  </td>

                  <!-- Cột 2: Khách hàng -->
                  <td>
                    <strong>{{ o.receiver?.fullName }}</strong>
                    <div class="sub-txt">{{ o.receiver?.phone }}</div>
                    <div class="sub-txt">Nhận: {{ o.receiveDate | date:'dd/MM' }} ({{ o.slotLabel }})</div>
                  </td>

                  <!-- Cột 3: Sản phẩm -->
                  <td>
                    <div *ngFor="let item of o.items" class="item-line">
                      <strong>{{ item.name }}</strong> × {{ item.qty }}
                      <div class="sub-txt" *ngIf="item.config?.size">Size {{ item.config.size }}</div>
                    </div>
                  </td>

                  <!-- Cột 4: Tiền & Hoàn tiền -->
                  <td>
                    <strong class="price-txt">{{ o.total | number }} đ</strong>
                    <div>
                      <span class="pay-tag" [class.paid]="o.payment?.status === 'paid'">
                        {{ o.payment?.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán' }}
                      </span>
                    </div>
                    <div *ngIf="o.payment?.latePayment" class="refund-tag rf-pending">
                      Thanh toán muộn - cần hoàn 100%
                    </div>
                    <div *ngIf="o.refund?.status" class="refund-tag" [ngClass]="'rf-' + o.refund.status">
                      Hoàn tiền: {{ o.refund.amount | number }}đ
                      ({{ ['processed', 'completed'].includes(o.refund.status) ? 'Đã hoàn' : 'Chờ hoàn' }})
                    </div>
                  </td>

                  <!-- Cột 5: Trạng thái & Yêu cầu hủy -->
                  <td>
                    <span class="status-badge" [ngClass]="'st-' + o.status">
                      ● {{ getStatusLabel(o.status) }}
                    </span>

                    <div *ngIf="o.cancelRequest?.status === 'pending'" class="cancel-req-alert">
                      <strong>🔔 Khách yêu cầu hủy:</strong>
                      <p>"{{ o.cancelRequest.reason }}"</p>
                    </div>

                    <div *ngIf="o.status === 'cancelled'" class="sub-txt mt-1">
                      Lý do: {{ o.cancellation?.reason || o.cancel?.reason || 'Đã hủy' }}
                    </div>
                  </td>

                  <!-- Cột 6: Hành động -->
                  <td class="actions-cell">
                    <!-- 1. Xác nhận thanh toán -->
                    <button
                      *ngIf="o.status === 'pending_payment' && o.payment?.status !== 'paid'"
                      class="btn-act blue"
                      (click)="onConfirmPaymentAndAccept(o)"
                    >
                      Xác nhận thanh toán & tiếp nhận
                    </button>

                    <!-- 2. Tiếp nhận đơn -->
                    <button
                      *ngIf="o.status === 'pending_approval'"
                      class="btn-act green"
                      (click)="onAcceptOrder(o)"
                    >
                      Tiếp nhận đơn
                    </button>

                    <!-- 3. Duyệt yêu cầu hủy của khách -->
                    <ng-container *ngIf="o.cancelRequest?.status === 'pending'">
                      <button class="btn-act warn" (click)="openActionModal('decide_cancel', o)">
                        Xử lý yêu cầu hủy
                      </button>
                    </ng-container>

                    <!-- 4. Từ chối / Hủy đơn thông thường -->
                    <button
                      *ngIf="['pending_payment', 'pending_approval', 'accepted', 'baking'].includes(o.status)"
                      class="btn-act danger"
                      (click)="openActionModal('reject', o)"
                    >
                      Từ chối / Hủy
                    </button>

                    <!-- 5. Hủy đặc biệt từ cửa hàng (Hoàn 100%) -->
                    <button
                      *ngIf="!['done', 'cancelled'].includes(o.status)"
                      class="btn-act outline"
                      (click)="openActionModal('special_cancel', o)"
                    >
                      Hủy lỗi tiệm (100%)
                    </button>

                    <!-- 6. Xác nhận hoàn tiền thủ công -->
                    <button
                      *ngIf="o.status === 'cancelled' && o.payment?.status === 'paid' && o.refund?.status !== 'completed'"
                      class="btn-act brown"
                      (click)="openActionModal('confirm_refund', o)"
                    >
                      💸 Xác nhận hoàn tiền
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MODAL XỬ LÝ NGHIỆP VỤ ADMIN -->
      <div class="modal-backdrop" *ngIf="modalType !== 'none' && selectedOrder" (click)="closeModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <button class="close-btn" (click)="closeModal()">✕</button>

          <!-- A. Duyệt hoặc từ chối yêu cầu hủy của khách -->
          <ng-container *ngIf="modalType === 'decide_cancel'">
            <h3>Xử lý yêu cầu hủy đơn #{{ selectedOrder.code }}</h3>
            <p class="m-sub">Lý do khách gửi: <strong>"{{ selectedOrder.cancelRequest?.reason }}"</strong></p>

            <div class="m-field">
              <label>Quyết định của cửa hàng:</label>
              <select [(ngModel)]="decisionChoice" class="m-control">
                <option value="accepted">Chấp nhận hủy đơn (Tính hoàn tiền theo quy định)</option>
                <option value="rejected">Từ chối yêu cầu hủy (Tiếp tục thực hiện đơn)</option>
              </select>
            </div>

            <div class="m-field">
              <label>Ghi chú phản hồi cho khách hàng:</label>
              <textarea rows="3" [(ngModel)]="actionNote" class="m-control" placeholder="Nhập lý do duyệt hoặc từ chối..."></textarea>
            </div>

            <div class="m-footer">
              <button class="btn-outline" (click)="closeModal()">Đóng</button>
              <button class="btn-dark" (click)="submitDecideCancel()" [disabled]="submitting">
                {{ submitting ? 'Đang lưu...' : 'Xác nhận quyết định' }}
              </button>
            </div>
          </ng-container>

          <!-- B. Từ chối / Hủy đơn thông thường -->
          <ng-container *ngIf="modalType === 'reject'">
            <h3>Từ chối / Hủy đơn hàng #{{ selectedOrder.code }}</h3>
            <div class="m-field">
              <label>Lý do hủy đơn <span class="req">*</span></label>
              <textarea rows="3" [(ngModel)]="actionNote" class="m-control" placeholder="Ví dụ: Quá tải khung giờ giao bánh hoặc khách báo hủy qua hotline..."></textarea>
            </div>
            <div class="m-footer">
              <button class="btn-outline" (click)="closeModal()">Đóng</button>
              <button class="btn-danger" (click)="submitRejectOrder()" [disabled]="submitting">
                {{ submitting ? 'Đang hủy...' : 'Xác nhận hủy đơn' }}
              </button>
            </div>
          </ng-container>

          <!-- C. Hủy đặc biệt từ cửa hàng (Hoàn 100%) -->
          <ng-container *ngIf="modalType === 'special_cancel'">
            <h3>Hủy đặc biệt từ phía cửa hàng (Hoàn 100%)</h3>
            <p class="m-sub">Áp dụng khi phát sinh sự cố từ xưởng bánh hoặc vận chuyển. Khách sẽ được hoàn 100% số tiền đã thanh toán.</p>
            <div class="m-field">
              <label>Lý do sự cố <span class="req">*</span></label>
              <textarea rows="3" [(ngModel)]="actionNote" class="m-control" placeholder="Nhập chi tiết lý do hủy đặc biệt..."></textarea>
            </div>
            <div class="m-footer">
              <button class="btn-outline" (click)="closeModal()">Đóng</button>
              <button class="btn-dark" (click)="submitSpecialCancel()" [disabled]="submitting">
                {{ submitting ? 'Đang xử lý...' : 'Xác nhận hủy & hoàn 100%' }}
              </button>
            </div>
          </ng-container>

          <!-- D. Xác nhận hoàn tiền thủ công -->
          <ng-container *ngIf="modalType === 'confirm_refund'">
            <h3>Xác nhận đã hoàn tiền cho đơn #{{ selectedOrder.code }}</h3>
            <p class="m-sub">Khách hàng: <strong>{{ selectedOrder.receiver?.fullName }}</strong> ({{ selectedOrder.receiver?.phone }})</p>
            <div class="m-field">
              <label>Số tiền hoàn thực tế (VNĐ):</label>
              <input type="number" [(ngModel)]="refundAmount" class="m-control" />
            </div>
            <div class="m-field">
              <label>Ghi chú đối soát (nếu có điều chỉnh số tiền):</label>
              <input type="text" [(ngModel)]="actionNote" class="m-control" placeholder="Ví dụ: Đã chuyển khoản hoàn qua VietQR..." />
            </div>
            <div class="m-footer">
              <button class="btn-outline" (click)="closeModal()">Đóng</button>
              <button class="btn-brown" (click)="submitConfirmRefund()" [disabled]="submitting">
                {{ submitting ? 'Đang xác nhận...' : 'Hoàn tất đối soát hoàn tiền' }}
              </button>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page {
      background: #F9F6F2;
      min-height: 100vh;
      padding: 28px 24px 60px;
      font-family: 'Inter', sans-serif;
      color: #2D1B10;
    }

    .admin-wrapper {
      max-width: 1240px;
      margin: 0 auto;
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 22px;
    }

    .admin-header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      margin: 0 0 6px 0;
      color: #2D1B10;
    }

    .admin-header p {
      font-size: 13.5px;
      color: #7D6B5D;
      margin: 0;
    }

    .btn-refresh {
      background: #FFFFFF;
      border: 1px solid #DCD2C8;
      border-radius: 10px;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #2D1B10;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toolbar-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 20px;
    }

    .filter-tabs {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .tab-pill {
      background: #FFFFFF;
      border: 1px solid #E2D9CF;
      color: #2D1B10;
      padding: 9px 18px;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .tab-pill.active {
      background: #241309;
      border-color: #241309;
      color: #FFFFFF;
    }

    .search-controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .search-input, .status-select {
      background: #FFFFFF;
      border: 1px solid #DCD2C8;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
      color: #2D1B10;
      outline: none;
    }

    .toast-ok {
      background: #E6F6EC;
      border: 1px solid #B7EB8F;
      color: #15803D;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .state-card {
      background: #FFFFFF;
      border: 1px solid #EAE2D9;
      border-radius: 14px;
      padding: 54px 20px;
      text-align: center;
      color: #7D6B5D;
      font-size: 14px;
    }

    .state-card.error {
      background: #FFF2F0;
      border-color: #FFCCC7;
      color: #CF1322;
    }

    .orders-table-card {
      background: #FFFFFF;
      border: 1px solid #EAE2D9;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(45, 27, 16, 0.03);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .admin-table th {
      background: #FAF7F4;
      text-align: left;
      padding: 14px 16px;
      font-size: 12px;
      font-weight: 700;
      color: #6B584C;
      border-bottom: 1px solid #EAE2D9;
    }

    .admin-table td {
      padding: 16px;
      border-bottom: 1px solid #F2ECE4;
      vertical-align: top;
    }

    .text-right { text-align: right !important; }
    .code-txt { font-size: 14px; color: #2D1B10; }
    .sub-txt { font-size: 11.5px; color: #7D6B5D; margin-top: 2px; }
    .mt-1 { margin-top: 6px; }

    .method-tag {
      display: inline-block;
      margin-top: 5px;
      background: #F4ECE3;
      color: #7D562D;
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .item-line { margin-bottom: 6px; }
    .price-txt { font-size: 14.5px; color: #2D1B10; }

    .pay-tag {
      display: inline-block;
      margin-top: 4px;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      background: #FDF3E7;
      color: #B45309;
      font-weight: 600;
    }

    .pay-tag.paid {
      background: #E6F6EC;
      color: #15803D;
    }

    .refund-tag {
      margin-top: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: #FFFBE6;
      color: #D46B08;
    }

    .rf-completed {
      background: #E6F6EC;
      color: #15803D;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 600;
      background: #FDF3E7;
      color: #B45309;
    }

    .st-done { background: #E6F6EC; color: #15803D; }
    .st-cancelled { background: #FEE2E2; color: #B91C1C; }

    .cancel-req-alert {
      margin-top: 8px;
      background: #FFFBE6;
      border: 1px solid #FFE58F;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11.5px;
      color: #874D00;
    }

    .cancel-req-alert p {
      margin: 3px 0 0 0;
      font-style: italic;
    }

    .actions-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .btn-act {
      border: none;
      border-radius: 7px;
      padding: 6px 11px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-act.blue { background: #E6F4FF; color: #0958D9; }
    .btn-act.green { background: #E6F6EC; color: #15803D; }
    .btn-act.warn { background: #FFFBE6; color: #D46B08; border: 1px solid #FFE58F; }
    .btn-act.danger { background: #FFF1F0; color: #CF1322; }
    .btn-act.outline { background: #FFFFFF; border: 1px solid #DCD2C8; color: #5E4B3E; }
    .btn-act.brown { background: #7D562D; color: #FFFFFF; }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(24, 14, 8, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2500;
      padding: 16px;
    }

    .modal-box {
      position: relative;
      background: #FFFFFF;
      border-radius: 16px;
      width: 100%;
      max-width: 480px;
      padding: 24px 26px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    }

    .close-btn {
      position: absolute;
      top: 14px;
      right: 16px;
      border: none;
      background: transparent;
      font-size: 16px;
      cursor: pointer;
    }

    .modal-box h3 {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      margin: 0 0 8px 0;
    }

    .m-sub { font-size: 12.5px; color: #6B584C; margin: 0 0 14px 0; }
    .m-field { margin-bottom: 14px; }
    .m-field label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; }
    .req { color: #CF1322; }
    .m-control { width: 100%; border: 1px solid #DCD2C8; border-radius: 8px; padding: 9px 12px; font-size: 13px; box-sizing: border-box; }

    .m-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
    .btn-outline { background: #fff; border: 1px solid #DCD2C8; padding: 9px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-dark { background: #2D1B10; color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-danger { background: #CF1322; color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-brown { background: #7D562D; color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  `]
})
export class AdminOrdersComponent implements OnInit {
  activeFilter: 'all' | 'cancel_request' | 'refund' = 'all';
  searchText = '';
  statusFilter = '';

  orders: any[] = [];
  loading = false;
  errorMsg = '';
  toastMsg = '';

  // Modal state
  modalType: 'none' | 'decide_cancel' | 'reject' | 'special_cancel' | 'confirm_refund' = 'none';
  selectedOrder: any = null;
  decisionChoice: 'accepted' | 'rejected' = 'accepted';
  actionNote = '';
  refundAmount = 0;
  submitting = false;

  constructor(
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAdminOrders();
    }
  }

  setFilter(tab: 'all' | 'cancel_request' | 'refund') {
    this.activeFilter = tab;
    this.statusFilter = '';
    this.loadAdminOrders();
  }

  loadAdminOrders() {
    this.loading = true;
    this.errorMsg = '';

    const params: any = { limit: 50 };
    if (this.searchText.trim()) params.search = this.searchText.trim();
    if (this.statusFilter) params.status = this.statusFilter;

    if (this.activeFilter === 'cancel_request') {
      params.hasCancelRequest = true;
    } else if (this.activeFilter === 'refund') {
      params.status = 'cancelled';
    }

    this.orderService.getAdminOrders(params).subscribe({
      next: (res: any) => {
        this.orders = res.items || res.orders || (Array.isArray(res) ? res : []);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.orders = [];
        this.loading = false;
        this.errorMsg = err.error?.message || 'Không thể tải dữ liệu từ máy chủ Admin (kiểm tra Backend cổng 3000 hoặc quyền Admin).';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Admin xác minh giao dịch thực nhận, sau đó tự động tiếp nhận đơn.
   * Backend vẫn đi đúng state machine: pending_payment -> pending_approval -> accepted.
   */
  onConfirmPaymentAndAccept(order: any) {
    const verified = window.confirm(
      `Chỉ tiếp tục khi đã kiểm tra tiền thực nhận trong tài khoản/cổng thanh toán.\n\nBạn xác nhận đã nhận đủ tiền của đơn #${order.code} và muốn tiếp nhận đơn này?`
    );
    if (!verified) return;

    const txnId = window.prompt('Nhập mã giao dịch đã đối soát:')?.trim() || '';
    if (!txnId) {
      alert('Cần nhập mã giao dịch trước khi xác nhận.');
      return;
    }

    const evidence = window.prompt('Nhập đường dẫn hoặc mã tham chiếu bằng chứng thanh toán (biên nhận/ảnh chụp...):')?.trim() || '';
    if (!evidence) {
      alert('Cần cung cấp bằng chứng thanh toán trước khi xác nhận.');
      return;
    }

    const note = window.prompt('Ghi chú đối soát (không bắt buộc):')?.trim() || '';

    this.orderService.confirmPaymentManual(order._id, { txnId, evidence, note }).subscribe({
      next: (paymentResult: any) => {
        const paidOrder = paymentResult?.data ?? paymentResult;

        // Nếu đơn bị hủy hoặc được ghi nhận là thanh toán muộn thì tuyệt đối không tiếp nhận.
        if (paidOrder?.payment?.latePayment || paidOrder?.status !== 'pending_approval') {
          this.showToast(
            `Đã ghi nhận thanh toán nhưng đơn #${order.code} chưa thể tiếp nhận. Vui lòng kiểm tra trạng thái/hoàn tiền.`
          );
          this.loadAdminOrders();
          return;
        }

        this.orderService.acceptOrder(order._id).subscribe({
          next: () => {
            this.showToast(`Đã xác nhận thanh toán và tiếp nhận đơn #${order.code}.`);
            this.loadAdminOrders();
          },
          error: (err: any) => {
            alert(err.error?.message || 'Đã xác nhận thanh toán nhưng chưa thể tiếp nhận đơn. Vui lòng tải lại danh sách và tiếp nhận lại.');
            this.loadAdminOrders();
          }
        });
      },
      error: (err: any) => alert(err.error?.message || 'Lỗi xác nhận thanh toán')
    });
  }

  onAcceptOrder(order: any) {
    this.orderService.acceptOrder(order._id).subscribe({
      next: () => {
        this.showToast(`Đã tiếp nhận đơn #${order.code} chuyển xuống bếp.`);
        this.loadAdminOrders();
      },
      error: (err: any) => alert(err.error?.message || 'Lỗi tiếp nhận đơn')
    });
  }

  openActionModal(type: 'decide_cancel' | 'reject' | 'special_cancel' | 'confirm_refund', order: any) {
    this.modalType = type;
    this.selectedOrder = order;
    this.decisionChoice = 'accepted';
    this.actionNote = '';
    this.refundAmount = order.refund?.amount ?? order.total ?? 0;
  }

  closeModal() {
    if (this.submitting) return;
    this.modalType = 'none';
    this.selectedOrder = null;
  }

  submitDecideCancel() {
    this.submitting = true;
    this.orderService.decideCancelRequest(this.selectedOrder._id, {
      decision: this.decisionChoice,
      decisionReason: this.actionNote.trim() || undefined
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.showToast(`Đã xử lý yêu cầu hủy cho đơn #${this.selectedOrder?.code}`);
        this.loadAdminOrders();
      },
      error: (err: any) => {
        this.submitting = false;
        alert(err.error?.message || 'Không thể xử lý yêu cầu hủy');
      }
    });
  }

  submitRejectOrder() {
    if (!this.actionNote.trim()) {
      alert('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    this.submitting = true;
    this.orderService.rejectOrCancelOrder(this.selectedOrder._id, {
      reason: this.actionNote.trim()
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.showToast(`Đã hủy đơn hàng #${this.selectedOrder?.code}`);
        this.loadAdminOrders();
      },
      error: (err: any) => {
        this.submitting = false;
        alert(err.error?.message || 'Không thể hủy đơn');
      }
    });
  }

  submitSpecialCancel() {
    if (!this.actionNote.trim()) {
      alert('Vui lòng nhập lý do hủy đặc biệt.');
      return;
    }
    this.submitting = true;
    this.orderService.specialCancelOrder(this.selectedOrder._id, {
      reason: this.actionNote.trim()
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.showToast(`Đã hủy đặc biệt (hoàn 100%) đơn #${this.selectedOrder?.code}`);
        this.loadAdminOrders();
      },
      error: (err: any) => {
        this.submitting = false;
        alert(err.error?.message || 'Không thể thực hiện hủy đặc biệt');
      }
    });
  }

  submitConfirmRefund() {
    this.submitting = true;
    this.orderService.confirmRefund(this.selectedOrder._id, {
      amount: Number(this.refundAmount),
      adjustReason: this.actionNote.trim() || undefined
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.showToast(`Đã xác nhận hoàn tiền cho đơn #${this.selectedOrder?.code}`);
        this.loadAdminOrders();
      },
      error: (err: any) => {
        this.submitting = false;
        alert(err.error?.message || 'Không thể xác nhận hoàn tiền');
      }
    });
  }

  showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => {
      this.toastMsg = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'Chờ thanh toán',
      pending_approval: 'Chờ duyệt',
      accepted: 'Đã tiếp nhận',
      baking: 'Đang làm bánh',
      delivering: 'Đang giao',
      delivered: 'Đã xong',
      done: 'Hoàn thành',
      cancelled: 'Đã hủy'
    };
    return map[status] || status;
  }
}