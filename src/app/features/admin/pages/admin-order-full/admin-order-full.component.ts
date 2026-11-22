import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-order-full',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-wrap">
      <div class="admin-top">
        <div>
          <h1>Quản lý Đơn hàng & Hoàn tiền</h1>
          <p>Lọc đơn, nhãn cảnh báo, pop-up chi tiết, lập phiếu làm bánh, cập nhật ảnh & đổi trạng thái.</p>
        </div>
        <button class="btn-sec" (click)="loadOrders()" [disabled]="loading">↻ Làm mới</button>
      </div>

      <!-- BỘ LỌC & NHÃN NHANH -->
      <div class="filter-bar">
        <button class="pill" [class.on]="quickTab === 'all'" (click)="setQuickTab('all')">Tất cả đơn</button>
        <button class="pill" [class.on]="quickTab === 'urgent'" (click)="setQuickTab('urgent')">⚡ Cần làm sớm</button>
        <button class="pill" [class.on]="quickTab === 'cancel_req'" (click)="setQuickTab('cancel_req')">🔔 Có yêu cầu hủy</button>
        <button class="pill" [class.on]="quickTab === 'refund'" (click)="setQuickTab('refund')">💸 Hoàn tiền / Quá 3 ngày</button>

        <input
          type="text"
          [(ngModel)]="keyword"
          (keyup.enter)="loadOrders()"
          placeholder="Tìm mã đơn, tên, SĐT..."
          class="inp"
        />
      </div>

      <div *ngIf="notice" class="notice-ok">{{ notice }}</div>
      <div *ngIf="loading" class="box-state">Đang tải dữ liệu...</div>
      <div *ngIf="!loading && errorMsg" class="box-state err">
        <div>{{ errorMsg }}</div>
        <button class="btn-main mt-8" (click)="loadOrders()">Thử kết nối lại</button>
      </div>
      <div *ngIf="!loading && !errorMsg && orders.length === 0" class="box-state">
        Không có đơn hàng nào phù hợp.
      </div>

      <!-- BẢNG ĐƠN HÀNG -->
      <div class="table-card" *ngIf="!loading && !errorMsg && orders.length > 0">
        <table>
          <thead>
            <tr>
              <th>Đơn hàng</th>
              <th>Nhãn cảnh báo</th>
              <th>Khách & Giờ nhận</th>
              <th>Tổng tiền & Hoàn</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let o of orders">
              <td>
                <strong>#{{ o.code }}</strong>
                <div class="muted">{{ o.items?.[0]?.name || 'Đơn bánh' }} (×{{ o.items?.[0]?.qty || 1 }})</div>
              </td>

              <td>
                <span class="tag urgent" *ngIf="isUrgent(o)">⚡ Cần làm sớm</span>
                <span class="tag req-cancel" *ngIf="o.cancelRequest?.status === 'pending'">🔔 Có yêu cầu hủy</span>
                <span class="tag overdue" *ngIf="isRefundOverdue(o)">⚠ Quá 3 ngày hoàn tiền</span>
              </td>

              <td>
                <div><strong>{{ o.receiver?.fullName }}</strong></div>
                <div class="muted">{{ o.receiver?.phone }} • {{ o.slotLabel || (o.receiveDate | date:'dd/MM') }}</div>
              </td>

              <td>
                <strong>{{ (o.total || 0) | number }} đ</strong>
                <div class="muted" *ngIf="o.refund?.status">
                  Hoàn: {{ (o.refund.amount || 0) | number }}đ ({{ o.refund.status }})
                </div>
              </td>

              <td>
                <span class="st-chip">{{ getStatusLabel(o.status) }}</span>
              </td>

              <td class="act-col">
                <button class="btn-mini" (click)="openDetailPopup(o)">Chi tiết / Phiếu / Ảnh</button>
                <button *ngIf="o.status === 'pending_approval'" class="btn-mini ok" (click)="acceptOrder(o)">Tiếp nhận</button>
                <button *ngIf="!['done', 'cancelled'].includes(o.status)" class="btn-mini bad" (click)="rejectOrder(o)">Từ chối</button>
                <button *ngIf="o.cancelRequest?.status === 'pending'" class="btn-mini warn" (click)="decideCancel(o, 'accepted')">Duyệt hủy</button>
                <button *ngIf="!['done', 'cancelled'].includes(o.status)" class="btn-mini" (click)="specialCancel(o)">Hủy đặc biệt (100%)</button>
                <button
                  *ngIf="o.status === 'cancelled' && o.payment?.status === 'paid' && o.refund?.status !== 'completed'"
                  class="btn-mini brown"
                  (click)="confirmRefund(o)"
                >
                  Xác nhận hoàn
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- POP-UP CHI TIẾT: ĐỔI TRẠNG THÁI, PHIẾU LÀM BÁNH, CẬP NHẬT ẢNH -->
      <div class="modal-bg" *ngIf="activeOrder" (click)="activeOrder = null">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <button class="x-btn" (click)="activeOrder = null">✕</button>
          <h3>Chi tiết đơn #{{ activeOrder.code }}</h3>
          <p class="muted">
            Khách: {{ activeOrder.receiver?.fullName }} — {{ activeOrder.receiver?.phone }}
            <span *ngIf="activeOrder.receiver?.address"> • {{ activeOrder.receiver?.address }}</span>
          </p>

          <!-- 1. Đổi trạng thái -->
          <div class="sec-box">
            <label>Đổi trạng thái đơn hàng:</label>
            <div class="row-gap">
              <select [(ngModel)]="nextStatus" class="inp">
                <option value="pending_approval">Chờ duyệt</option>
                <option value="accepted">Đã tiếp nhận</option>
                <option value="baking">Đang làm bánh</option>
                <option value="delivered">Đã xong</option>
                <option value="delivering">Đang giao</option>
                <option value="done">Hoàn thành</option>
              </select>
              <input type="text" [(ngModel)]="statusReason" placeholder="Lý do đổi trạng thái (tùy chọn)" class="inp flex-1" />
              <button class="btn-main" (click)="changeStatus()">Cập nhật trạng thái</button>
            </div>
          </div>

          <!-- 2. Phiếu làm bánh -->
          <div class="sec-box">
            <label>Phiếu làm bánh:</label>
            <div class="row-gap">
              <button class="btn-sec" (click)="createTicket()">Lập phiếu làm bánh</button>
              <button class="btn-sec" (click)="viewTicket()">Xem / In phiếu</button>
            </div>
            <pre *ngIf="ticketInfo" class="ticket-pre">{{ ticketInfo | json }}</pre>
          </div>

          <!-- 3. Cập nhật ảnh sản phẩm thực tế (photoIds) -->
          <div class="sec-box">
            <label>Cập nhật ảnh sản phẩm thực tế (nhập ID ảnh, cách nhau bởi dấu phẩy nếu nhiều):</label>
            <div class="row-gap">
              <input
                type="text"
                [(ngModel)]="photoIdsInput"
                placeholder="VD: 65f1a2b3c4d5e6f7a8b9c0d1, ..."
                class="inp flex-1"
              />
              <button class="btn-main" (click)="savePhotos()">Lưu ảnh</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 20px 60px; font-family: 'Inter', sans-serif; color: #2D1B10; }
    .admin-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
    h1 { font-family: 'Playfair Display', serif; font-size: 26px; margin: 0 0 4px; }
    h3 { font-family: 'Playfair Display', serif; font-size: 20px; margin: 0 0 4px; }
    .muted { font-size: 12px; color: #7D6B5D; }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; align-items: center; }
    .pill { border: 1px solid #DCD2C8; background: #fff; padding: 7px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .pill.on { background: #2D1B10; color: #fff; border-color: #2D1B10; }
    .inp { border: 1px solid #DCD2C8; border-radius: 8px; padding: 7px 11px; font-size: 13px; background: #fff; }
    .flex-1 { flex: 1; min-width: 200px; }
    .mt-8 { margin-top: 10px; }
    .notice-ok { background: #E6F6EC; color: #15803D; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .box-state { background: #fff; border: 1px solid #EAE2D9; border-radius: 12px; padding: 36px; text-align: center; }
    .box-state.err { color: #CF1322; background: #FFF2F0; }
    .table-card { background: #fff; border: 1px solid #EAE2D9; border-radius: 14px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 12px 14px; border-bottom: 1px solid #F2ECE4; text-align: left; vertical-align: top; }
    th { background: #FAF7F4; font-size: 12px; color: #6B584C; }
    .tag { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin: 2px 4px 2px 0; }
    .tag.urgent { background: #FFF7E6; color: #D46B08; }
    .tag.req-cancel { background: #FFF1F0; color: #CF1322; }
    .tag.overdue { background: #F9F0FF; color: #531DAB; }
    .st-chip { background: #FDF3E7; color: #B45309; padding: 3px 9px; border-radius: 12px; font-size: 11.5px; font-weight: 600; }
    .act-col { display: flex; flex-direction: column; gap: 5px; }
    .btn-mini { border: 1px solid #DCD2C8; background: #fff; padding: 5px 9px; border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer; text-align: left; }
    .btn-mini.ok { background: #E6F6EC; color: #15803D; border-color: transparent; }
    .btn-mini.bad { background: #FFF1F0; color: #CF1322; border-color: transparent; }
    .btn-mini.warn { background: #FFFBE6; color: #D46B08; }
    .btn-mini.brown { background: #7D562D; color: #fff; border-color: transparent; }
    .btn-sec { border: 1px solid #DCD2C8; background: #fff; padding: 7px 12px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-main { border: none; background: #2D1B10; color: #fff; padding: 7px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2700; padding: 16px; }
    .modal-panel { position: relative; background: #fff; border-radius: 14px; max-width: 600px; width: 100%; padding: 22px; max-height: 88vh; overflow-y: auto; }
    .x-btn { position: absolute; top: 12px; right: 14px; border: none; background: transparent; font-size: 16px; cursor: pointer; }
    .sec-box { margin-top: 14px; padding-top: 12px; border-top: 1px solid #F0E8DF; }
    .sec-box label { display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 6px; }
    .row-gap { display: flex; gap: 8px; flex-wrap: wrap; }
    .ticket-pre { background: #FAF7F4; padding: 10px; border-radius: 8px; font-size: 11px; overflow-x: auto; margin-top: 8px; }
  `]
})
export class AdminOrderFullComponent implements OnInit {
  private adminBase = 'http://localhost:3000/api/admin/orders';

  quickTab: 'all' | 'urgent' | 'cancel_req' | 'refund' = 'all';
  keyword = '';
  orders: any[] = [];
  loading = false;
  errorMsg = '';
  notice = '';

  activeOrder: any = null;
  nextStatus = 'baking';
  statusReason = '';
  photoIdsInput = '';
  ticketInfo: any = null;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadOrders();
    }
  }

  setQuickTab(tab: 'all' | 'urgent' | 'cancel_req' | 'refund') {
    this.quickTab = tab;
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.errorMsg = '';

    const params: any = { limit: 50 };
    if (this.keyword.trim()) params.search = this.keyword.trim();
    if (this.quickTab === 'cancel_req') params.hasCancelRequest = true;
    if (this.quickTab === 'refund') params.refundOverdue = true;

    this.http.get(this.adminBase, { params }).subscribe({
      next: (res: any) => {
        let list = res.items || res.orders || res.data || (Array.isArray(res) ? res : []);
        if (this.quickTab === 'urgent') {
          list = list.filter((x: any) => this.isUrgent(x));
        } else if (this.quickTab === 'refund') {
          list = list.filter((x: any) => x.status === 'cancelled' || x.refund?.status);
        }
        this.orders = list;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Không tải được danh sách đơn Admin.';
        this.cdr.detectChanges();
      }
    });
  }

  isUrgent(o: any): boolean {
    if (!o?.receiveDate || ['done', 'cancelled'].includes(o.status)) return false;
    const diffHours = (new Date(o.receiveDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  isRefundOverdue(o: any): boolean {
    if (o?.refund?.status !== 'pending' && o?.refund?.status !== 'processing') return false;
    const baseTime = new Date(o.cancelledAt || o.updatedAt || Date.now()).getTime();
    return (Date.now() - baseTime) / (1000 * 60 * 60 * 24) > 3;
  }

  openDetailPopup(o: any) {
    this.activeOrder = o;
    this.nextStatus = o.status || 'baking';
    this.statusReason = '';
    this.photoIdsInput = Array.isArray(o.photoIds) ? o.photoIds.join(', ') : '';
    this.ticketInfo = null;
  }

  acceptOrder(o: any) {
    this.http.post(`${this.adminBase}/${o._id}/accept`, {}).subscribe({
      next: () => { this.doneMsg(`Đã tiếp nhận #${o.code}`); this.loadOrders(); },
      error: (err: any) => alert(err.error?.message || 'Không thể tiếp nhận đơn')
    });
  }

  rejectOrder(o: any) {
    const reason = prompt('Nhập lý do từ chối / hủy đơn:') || '';
    if (!reason.trim()) return;
    this.http.post(`${this.adminBase}/${o._id}/reject`, { reason: reason.trim() }).subscribe({
      next: () => { this.doneMsg(`Đã từ chối #${o.code}`); this.loadOrders(); },
      error: (err: any) => alert(err.error?.message || 'Không thể từ chối đơn')
    });
  }

  decideCancel(o: any, decision: 'accepted' | 'rejected') {
    this.http.post(`${this.adminBase}/${o._id}/cancel-request/decision`, { decision }).subscribe({
      next: () => { this.doneMsg(`Đã cập nhật yêu cầu hủy #${o.code}`); this.loadOrders(); },
      error: (err: any) => alert(err.error?.message || 'Lỗi xử lý yêu cầu hủy')
    });
  }

  specialCancel(o: any) {
    const reason = prompt('Lý do hủy đặc biệt (hoàn 100%):') || '';
    if (!reason.trim()) return;
    this.http.post(`${this.adminBase}/${o._id}/special-cancel`, { reason: reason.trim() }).subscribe({
      next: () => { this.doneMsg(`Đã hủy đặc biệt (100%) #${o.code}`); this.loadOrders(); },
      error: (err: any) => alert(err.error?.message || 'Lỗi hủy đặc biệt')
    });
  }

  confirmRefund(o: any) {
    this.http.post(`${this.adminBase}/${o._id}/refund/confirm`, { amount: o.refund?.amount ?? o.total }).subscribe({
      next: () => { this.doneMsg(`Đã xác nhận hoàn tiền #${o.code}`); this.loadOrders(); },
      error: (err: any) => alert(err.error?.message || 'Lỗi xác nhận hoàn tiền')
    });
  }

  changeStatus() {
    if (!this.activeOrder?._id) return;
    this.http.patch(`${this.adminBase}/${this.activeOrder._id}/status`, {
      nextStatus: this.nextStatus,
      reason: this.statusReason.trim()
    }).subscribe({
      next: (res: any) => {
        this.doneMsg(`Đã đổi trạng thái #${this.activeOrder.code} -> ${res.status || this.nextStatus}`);
        this.activeOrder = { ...this.activeOrder, status: res.status || this.nextStatus };
        this.loadOrders();
      },
      error: (err: any) => alert(err.error?.message || 'Không thể đổi trạng thái')
    });
  }

  createTicket() {
    if (!this.activeOrder?._id) return;
    this.http.post(`${this.adminBase}/${this.activeOrder._id}/production-ticket`, {}).subscribe({
      next: (res: any) => {
        this.ticketInfo = res;
        this.doneMsg('Đã lập phiếu làm bánh.');
      },
      error: (err: any) => alert(err.error?.message || 'Lỗi lập phiếu')
    });
  }

  viewTicket() {
    if (!this.activeOrder?._id) return;
    this.http.get(`${this.adminBase}/${this.activeOrder._id}/production-ticket`).subscribe({
      next: (res: any) => { this.ticketInfo = res; },
      error: (err: any) => alert(err.error?.message || 'Chưa có phiếu làm bánh')
    });
  }

  savePhotos() {
    if (!this.activeOrder?._id) return;
    const photoIds = this.photoIdsInput
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    this.http.put(`${this.adminBase}/${this.activeOrder._id}/photos`, { photoIds }).subscribe({
      next: (res: any) => {
        this.doneMsg('Đã cập nhật hình ảnh sản phẩm.');
        this.activeOrder = { ...this.activeOrder, photoIds: res.photoIds || photoIds };
        this.loadOrders();
      },
      error: (err: any) => alert(err.error?.message || 'Lỗi lưu ảnh')
    });
  }

  private doneMsg(msg: string) {
    this.notice = msg;
    setTimeout(() => { this.notice = ''; this.cdr.detectChanges(); }, 3500);
  }

  getStatusLabel(s: string): string {
    const m: Record<string, string> = {
      pending_payment: 'Chờ thanh toán',
      pending_approval: 'Chờ duyệt',
      accepted: 'Đã tiếp nhận',
      baking: 'Đang làm bánh',
      delivering: 'Đang giao',
      delivered: 'Đã xong',
      done: 'Hoàn thành',
      cancelled: 'Đã hủy'
    };
    return m[s] || s;
  }
}