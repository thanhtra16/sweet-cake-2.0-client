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
          <p>Lọc đơn, nhãn cảnh báo, pop-up chi tiết, duyệt hủy & hoàn tiền theo chính sách, lập phiếu làm bánh.</p>
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
          id="orderSearchInput"
          name="orderSearch"
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
                <div class="muted">{{ o.items?.[0]?.name || 'Đơn bánh' }} (×{{ o.items?.[0]?.qty || o.items?.[0]?.quantity || 1 }})</div>
                <div class="muted" *ngIf="o.cancelRequest?.reason">
                  Lý do hủy: <em>"{{ o.cancelRequest.reason }}"</em>
                </div>
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
                  Đề xuất hoàn: <strong>{{ (o.refund.suggestedAmount ?? o.refund.amount ?? 0) | number }}đ</strong>
                  <span *ngIf="o.refund.status === 'processed'"> • Đã hoàn {{ (o.refund.amount || 0) | number }}đ</span>
                  <span *ngIf="o.refund.status === 'pending'"> (Chờ hoàn)</span>
                </div>
              </td>

              <td>
                <span class="st-chip" [ngClass]="'st-' + o.status">{{ getStatusLabel(o.status) }}</span>
              </td>

              <td class="act-col">
                <button class="btn-mini" (click)="openDetailPopup(o)">Chi tiết / Phiếu / Ảnh</button>
                <button *ngIf="o.status === 'pending_approval'" class="btn-mini ok" (click)="acceptOrder(o)">Tiếp nhận</button>
                <button
                  *ngIf="!['done', 'cancelled'].includes(o.status) && o.cancelRequest?.status !== 'pending'"
                  class="btn-mini bad"
                  (click)="openRejectModal(o)"
                >
                  Từ chối đơn
                </button>

                <ng-container *ngIf="o.cancelRequest?.status === 'pending'">
                  <button class="btn-mini warn" (click)="decideCancel(o, 'accepted')">✓ Duyệt hủy</button>
                  <button class="btn-mini bad" (click)="openRejectCancelReqModal(o)">✕ Từ chối hủy</button>
                </ng-container>

                <button *ngIf="!['done', 'cancelled'].includes(o.status)" class="btn-mini" (click)="openSpecialCancelModal(o)">
                  Hủy đặc biệt (100%)
                </button>

                <button
                  *ngIf="o.refund?.status === 'pending'"
                  class="btn-mini brown"
                  (click)="openRefundModal(o)"
                >
                  💸 Xác nhận hoàn tiền
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- =========================================================================
           POP-UP 1: CHI TIẾT, ĐỔI TRẠNG THÁI, PHIẾU LÀM BÁNH, CẬP NHẬT ẢNH
           ========================================================================= -->
      <div class="modal-bg" *ngIf="activeOrder" (click)="activeOrder = null">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <button class="x-btn" (click)="activeOrder = null">✕</button>
          <h3>Chi tiết đơn #{{ activeOrder.code }}</h3>
          <p class="muted">
            Khách: {{ activeOrder.receiver?.fullName }} — {{ activeOrder.receiver?.phone }}
            <span *ngIf="activeOrder.receiver?.address"> • {{ activeOrder.receiver?.address }}</span>
          </p>

          <div class="sec-box">
            <label>Đổi trạng thái đơn hàng:</label>
            <div class="row-gap">
              <select [(ngModel)]="nextStatus" class="inp">
                <option value="pending_approval">Chờ duyệt</option>
                <option value="accepted">Đã tiếp nhận</option>
                <option value="baking">Đang làm bánh</option>
                <option value="delivering">Đang giao</option>
                <option value="delivered">Đã giao</option>
                <option value="done">Hoàn thành</option>
              </select>
              <input type="text" [(ngModel)]="statusReason" placeholder="Lý do đổi trạng thái (tùy chọn)" class="inp flex-1" />
              <button class="btn-main" (click)="changeStatus()">Cập nhật trạng thái</button>
            </div>
          </div>

          <div class="sec-box">
            <label>Phiếu làm bánh:</label>
            <div class="row-gap">
              <button class="btn-sec" (click)="createTicket()">Lập phiếu làm bánh</button>
              <button class="btn-sec" (click)="viewTicket()">Xem / In phiếu</button>
            </div>
            <pre *ngIf="ticketInfo" class="ticket-pre">{{ ticketInfo | json }}</pre>
          </div>

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

      <!-- =========================================================================
           POP-UP 2: XÁC NHẬN HOÀN TIỀN THEO REFUND POLICY
           ========================================================================= -->
      <div class="modal-bg" *ngIf="refundOrder" (click)="refundOrder = null">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <button class="x-btn" (click)="refundOrder = null">✕</button>
          <h3>Xác nhận hoàn tiền đơn #{{ refundOrder.code }}</h3>
          <p class="muted">
            Tổng đơn khách đã thanh toán: <strong>{{ (refundOrder.total || 0) | number }} đ</strong> •
            Mức đề xuất theo chính sách (refundPolicy):
            <strong style="color: #15803D;">{{ (refundOrder.refund?.suggestedAmount ?? 0) | number }} đ</strong>
          </p>

          <div *ngIf="isRefundOverdue(refundOrder)" class="tag overdue" style="margin-top: 8px;">
            ⚠ Đơn này đã quá hạn 3 ngày hoàn tiền, vui lòng xử lý ngay!
          </div>

          <div class="sec-box">
            <label>Số tiền hoàn thực tế (VNĐ):</label>
            <input type="number" [(ngModel)]="refundAmountInput" min="0" [max]="refundOrder.total" class="inp" style="width: 100%;" />
          </div>

          <div class="sec-box" *ngIf="refundAmountInput !== (refundOrder.refund?.suggestedAmount ?? 0)">
            <label>Lý do điều chỉnh số tiền hoàn (bắt buộc khi khác mức đề xuất):</label>
            <input
              type="text"
              [(ngModel)]="refundAdjustReason"
              placeholder="VD: Hỗ trợ khách hàng thân thiết / trừ chi phí nguyên liệu đã chuẩn bị..."
              class="inp"
              style="width: 100%;"
            />
          </div>

          <div class="row-gap" style="margin-top: 16px; justify-content: flex-end;">
            <button class="btn-sec" (click)="refundOrder = null">Hủy</button>
            <button class="btn-main" (click)="submitConfirmRefund()">Xác nhận đã hoàn tiền</button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 3: TỪ CHỐI / HỦY ĐƠN HÀNG (THAY THẾ WINDOW.PROMPT)
           ========================================================================= -->
      <div class="modal-bg" *ngIf="rejectTargetOrder" (click)="closeActionModal()">
        <div class="modal-panel modal-reject" (click)="$event.stopPropagation()">
          <button class="x-btn" (click)="closeActionModal()">✕</button>

          <div class="modal-header-tag danger-tag">THAO TÁC QUẢN TRỊ</div>
          <h3>Từ chối / Hủy đơn hàng #{{ rejectTargetOrder.code }}</h3>
          <p class="muted">Vui lòng chọn lý do từ chối đơn để hệ thống thông báo cho khách hàng và tính toán chính sách hoàn tiền.</p>

          <!-- Tóm tắt đơn hàng -->
          <div class="order-summary-card">
            <div class="osc-row">
              <div>
                <div class="osc-title">{{ rejectTargetOrder.items?.[0]?.name || 'Đơn bánh SweetCake' }}</div>
                <div class="muted">
                  Khách: <strong>{{ rejectTargetOrder.receiver?.fullName }}</strong> ({{ rejectTargetOrder.receiver?.phone }}) •
                  Giao: {{ rejectTargetOrder.slotLabel || (rejectTargetOrder.receiveDate | date:'dd/MM/yyyy') }}
                </div>
              </div>
              <div class="osc-price">
                <span>Tổng đơn</span>
                <strong>{{ (rejectTargetOrder.total || 0) | number }} đ</strong>
                <span class="pay-pill" [class.paid]="rejectTargetOrder.payment?.status === 'paid'">
                  {{ rejectTargetOrder.payment?.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Chọn nguyên nhân phát sinh -->
          <div class="sec-box">
            <label>Nguyên nhân từ chối <span class="req">*</span></label>
            <div class="cause-grid">
              <label class="cause-card" [class.selected]="rejectCause === 'shop_fault'">
                <input type="radio" name="rejectCause" value="shop_fault" [(ngModel)]="rejectCause" />
                <div>
                  <strong>Lỗi / Quá tải từ cửa hàng</strong>
                  <small>Hoàn 100% nếu khách đã thanh toán</small>
                </div>
              </label>

              <label class="cause-card" [class.selected]="rejectCause === 'customer_fault'">
                <input type="radio" name="rejectCause" value="customer_fault" [(ngModel)]="rejectCause" />
                <div>
                  <strong>Sai thông tin / Không liên hệ được khách</strong>
                  <small>Áp dụng hoàn tiền theo chính sách trạng thái</small>
                </div>
              </label>
            </div>
          </div>

          <!-- Chọn nhanh mẫu lý do -->
          <div class="sec-box">
            <label>Lý do nhanh:</label>
            <div class="preset-chips">
              <button
                type="button"
                *ngFor="let preset of rejectPresetReasons"
                class="preset-chip"
                [class.active]="rejectReasonInput === preset"
                (click)="rejectReasonInput = preset"
              >
                {{ preset }}
              </button>
            </div>
          </div>

          <!-- Ô nhập chi tiết lý do -->
          <div class="sec-box">
            <label>Chi tiết lý do từ chối / hủy đơn <span class="req">*</span></label>
            <textarea
              rows="3"
              [(ngModel)]="rejectReasonInput"
              class="inp full-textarea"
              placeholder="Nhập lý do cụ thể gửi tới khách hàng (VD: Khung giờ giao đã kín lịch làm bánh tươi, mong quý khách thông cảm)..."
            ></textarea>
          </div>

          <div *ngIf="actionModalError" class="inline-err">{{ actionModalError }}</div>

          <div class="modal-footer-btns">
            <button class="btn-sec" (click)="closeActionModal()" [disabled]="actionSubmitting">Quay lại</button>
            <button class="btn-danger-solid" (click)="submitRejectOrder()" [disabled]="actionSubmitting">
              {{ actionSubmitting ? 'Đang xử lý...' : '✕ Xác nhận từ chối đơn' }}
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 4: TỪ CHỐI YÊU CẦU HỦY CỦA KHÁCH HÀNG
           ========================================================================= -->
      <div class="modal-bg" *ngIf="rejectCancelReqOrder" (click)="closeActionModal()">
        <div class="modal-panel modal-reject" (click)="$event.stopPropagation()">
          <button class="x-btn" (click)="closeActionModal()">✕</button>

          <div class="modal-header-tag warn-tag">PHẢN HỒI YÊU CẦU HỦY</div>
          <h3>Từ chối yêu cầu hủy đơn #{{ rejectCancelReqOrder.code }}</h3>
          <p class="muted">Đơn hàng sẽ tiếp tục được sản xuất & giao theo lịch hẹn ban đầu.</p>

          <div class="order-summary-card">
            <div class="muted">Khách hàng yêu cầu hủy với lý do:</div>
            <div style="font-weight: 600; margin-top: 4px; color: #2D1B10;">
              "{{ rejectCancelReqOrder.cancelRequest?.reason || 'Khách hàng yêu cầu hủy đơn' }}"
            </div>
          </div>

          <div class="sec-box">
            <label>Lý do từ chối yêu cầu hủy (bắt buộc) <span class="req">*</span></label>
            <div class="preset-chips" style="margin-bottom: 8px;">
              <button
                type="button"
                class="preset-chip"
                (click)="decisionReasonInput = 'Bánh đã vào công đoạn nướng và trang trí kem tươi, không thể dừng đơn.'"
              >
                Bánh đang nướng/trang trí
              </button>
              <button
                type="button"
                class="preset-chip"
                (click)="decisionReasonInput = 'Đơn hàng đã bàn giao cho đơn vị vận chuyển lạnh.'"
              >
                Đơn đã giao shipper
              </button>
            </div>
            <textarea
              rows="3"
              [(ngModel)]="decisionReasonInput"
              class="inp full-textarea"
              placeholder="Nhập lý do gửi lại cho khách hàng..."
            ></textarea>
          </div>

          <div *ngIf="actionModalError" class="inline-err">{{ actionModalError }}</div>

          <div class="modal-footer-btns">
            <button class="btn-sec" (click)="closeActionModal()" [disabled]="actionSubmitting">Hủy</button>
            <button class="btn-main" (click)="submitRejectCancelReq()" [disabled]="actionSubmitting">
              {{ actionSubmitting ? 'Đang gửi...' : 'Xác nhận từ chối yêu cầu hủy' }}
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 5: HỦY ĐẶC BIỆT TỪ PHÍA CỬA HÀNG (HOÀN 100%)
           ========================================================================= -->
      <div class="modal-bg" *ngIf="specialCancelOrderTarget" (click)="closeActionModal()">
        <div class="modal-panel modal-reject" (click)="$event.stopPropagation()">
          <button class="x-btn" (click)="closeActionModal()">✕</button>

          <div class="modal-header-tag danger-tag">HỦY ĐẶC BIỆT • HOÀN 100%</div>
          <h3>Hủy đặc biệt đơn hàng #{{ specialCancelOrderTarget.code }}</h3>
          <p class="muted">
            Áp dụng khi phát sinh sự cố từ phía tiệm bánh. Nếu khách đã thanh toán, hệ thống tự động tạo đề xuất hoàn <strong>100% ({{ (specialCancelOrderTarget.total || 0) | number }} đ)</strong>.
          </p>

          <div class="sec-box">
            <label>Lý do hủy đặc biệt <span class="req">*</span></label>
            <textarea
              rows="3"
              [(ngModel)]="specialCancelReasonInput"
              class="inp full-textarea"
              placeholder="VD: Nguyên liệu tươi nhập trong ngày không đạt chuẩn chất lượng của tiệm..."
            ></textarea>
          </div>

          <div *ngIf="actionModalError" class="inline-err">{{ actionModalError }}</div>

          <div class="modal-footer-btns">
            <button class="btn-sec" (click)="closeActionModal()" [disabled]="actionSubmitting">Quay lại</button>
            <button class="btn-danger-solid" (click)="submitSpecialCancel()" [disabled]="actionSubmitting">
              {{ actionSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy & Hoàn 100%' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 20px 60px; font-family: 'Inter', sans-serif; color: #2D1B10; }
    .admin-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
    h1 { font-family: 'Playfair Display', serif; font-size: 26px; margin: 0 0 4px; }
    h3 { font-family: 'Playfair Display', serif; font-size: 20px; margin: 0 0 4px; color: #2D1B10; }
    .muted { font-size: 12px; color: #7D6B5D; margin-top: 2px; line-height: 1.45; }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; align-items: center; }
    .pill { border: 1px solid #DCD2C8; background: #fff; padding: 7px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .pill.on { background: #2D1B10; color: #fff; border-color: #2D1B10; }
    .inp { border: 1px solid #DCD2C8; border-radius: 8px; padding: 8px 11px; font-size: 13px; background: #FAF8F5; color: #2D1B10; outline: none; font-family: 'Inter', sans-serif; }
    .inp:focus { border-color: #7D562D; background: #fff; }
    .full-textarea { width: 100%; box-sizing: border-box; resize: vertical; }
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
    .tag.overdue { background: #FFF1F0; color: #CF1322; border: 1px solid #FFA39E; }
    .st-chip { background: #FDF3E7; color: #B45309; padding: 3px 9px; border-radius: 12px; font-size: 11.5px; font-weight: 600; display: inline-block; }
    .st-chip.st-done { background: #E6F6EC; color: #15803D; }
    .st-chip.st-cancelled { background: #FEE2E2; color: #B91C1C; }
    .act-col { display: flex; flex-direction: column; gap: 5px; }
    .btn-mini { border: 1px solid #DCD2C8; background: #fff; padding: 5px 9px; border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer; text-align: left; }
    .btn-mini:hover { background: #FAF7F4; }
    .btn-mini.ok { background: #E6F6EC; color: #15803D; border-color: transparent; }
    .btn-mini.bad { background: #FFF1F0; color: #CF1322; border-color: transparent; }
    .btn-mini.warn { background: #FFFBE6; color: #D46B08; }
    .btn-mini.brown { background: #7D562D; color: #fff; border-color: transparent; }
    .btn-sec { border: 1px solid #DCD2C8; background: #fff; color: #2D1B10; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-main { border: none; background: #2D1B10; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-danger-solid { border: none; background: #B91C1C; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-danger-solid:disabled, .btn-main:disabled, .btn-sec:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Modal Styles */
    .modal-bg { position: fixed; inset: 0; background: rgba(28, 17, 10, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 2700; padding: 16px; }
    .modal-panel { position: relative; background: #fff; border-radius: 16px; max-width: 600px; width: 100%; padding: 24px 26px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24); }
    .modal-reject { max-width: 560px; }
    .x-btn { position: absolute; top: 16px; right: 18px; border: none; background: transparent; font-size: 17px; color: #7D6B5D; cursor: pointer; }
    .modal-header-tag { display: inline-block; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 6px; letter-spacing: 0.5px; margin-bottom: 8px; }
    .danger-tag { background: #FFF1F0; color: #CF1322; }
    .warn-tag { background: #FFFBE6; color: #B45309; }

    .order-summary-card { background: #FAF7F4; border: 1px solid #EAE2D9; border-radius: 12px; padding: 12px 14px; margin-top: 14px; }
    .osc-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .osc-title { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 15px; color: #2D1B10; }
    .osc-price { text-align: right; flex-shrink: 0; }
    .osc-price span { display: block; font-size: 11px; color: #8C7564; }
    .osc-price strong { display: block; font-size: 15px; color: #2D1B10; }
    .pay-pill { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 6px; background: #F3ECE4; color: #7D562D; margin-top: 3px; }
    .pay-pill.paid { background: #E6F6EC; color: #15803D; }

    .sec-box { margin-top: 14px; padding-top: 12px; border-top: 1px solid #F0E8DF; }
    .sec-box label { display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 6px; color: #2D1B10; }
    .req { color: #CF1322; }
    .row-gap { display: flex; gap: 8px; flex-wrap: wrap; }
    .ticket-pre { background: #FAF7F4; padding: 10px; border-radius: 8px; font-size: 11px; overflow-x: auto; margin-top: 8px; }

    .cause-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .cause-card { display: flex; align-items: flex-start; gap: 8px; background: #FAF8F5; border: 1px solid #E5DDD4; border-radius: 10px; padding: 10px 12px; cursor: pointer; }
    .cause-card.selected { border-color: #7D562D; background: #FDF7F0; }
    .cause-card strong { display: block; font-size: 12px; color: #2D1B10; }
    .cause-card small { display: block; font-size: 10.5px; color: #7D6B5D; margin-top: 2px; }

    .preset-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .preset-chip { border: 1px solid #DCD2C8; background: #FAF7F4; color: #5E4B3E; font-size: 11.5px; padding: 5px 10px; border-radius: 16px; cursor: pointer; }
    .preset-chip.active, .preset-chip:hover { border-color: #7D562D; background: #F5ECE2; color: #2D1B10; font-weight: 600; }

    .inline-err { color: #CF1322; font-size: 12px; font-weight: 500; margin-top: 10px; }
    .modal-footer-btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid #F0E8DF; }

    @media (max-width: 600px) { .cause-grid { grid-template-columns: 1fr; } }
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

  // Pop-up 1: Chi tiết / Phiếu / Ảnh
  activeOrder: any = null;
  nextStatus = 'baking';
  statusReason = '';
  photoIdsInput = '';
  ticketInfo: any = null;

  // Pop-up 2: Hoàn tiền
  refundOrder: any = null;
  refundAmountInput = 0;
  refundAdjustReason = '';

  // Pop-up 3: Từ chối / Hủy đơn
  rejectTargetOrder: any = null;
  rejectCause: 'shop_fault' | 'customer_fault' = 'shop_fault';
  rejectReasonInput = '';
  rejectPresetReasons = [
    'Khung giờ giao đã kín lịch làm bánh tươi',
    'Hết nguyên liệu đặc thù cho mẫu bánh này',
    'Không liên hệ được số điện thoại người nhận',
    'Địa chỉ giao hàng nằm ngoài phạm vi xe lạnh'
  ];

  // Pop-up 4: Từ chối yêu cầu hủy của khách
  rejectCancelReqOrder: any = null;
  decisionReasonInput = '';

  // Pop-up 5: Hủy đặc biệt (100%)
  specialCancelOrderTarget: any = null;
  specialCancelReasonInput = '';

  actionSubmitting = false;
  actionModalError = '';

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

    this.http.get(this.adminBase, { params }).subscribe({
      next: (res: any) => {
        let list = res.items || res.orders || res.data || (Array.isArray(res) ? res : []);
        if (this.quickTab === 'urgent') {
          list = list.filter((x: any) => this.isUrgent(x));
        } else if (this.quickTab === 'refund') {
          list = list.filter((x: any) => x.refund?.status === 'pending' || x.refund?.status === 'processed');
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
    if (typeof o?.isRefundOverdue === 'boolean') return o.isRefundOverdue;
    if (o?.refund?.status !== 'pending') return false;
    const baseTime = new Date(o.refund?.dueAt || o.cancellation?.at || o.updatedAt || Date.now()).getTime();
    return o.refund?.dueAt ? Date.now() > baseTime : (Date.now() - baseTime) / (1000 * 60 * 60 * 24) > 3;
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

  // ==================== MODAL TỪ CHỐI / HỦY ĐƠN ====================

  openRejectModal(o: any) {
    this.rejectTargetOrder = o;
    this.rejectCause = 'shop_fault';
    this.rejectReasonInput = '';
    this.actionModalError = '';
  }

  submitRejectOrder() {
    if (!this.rejectReasonInput.trim()) {
      this.actionModalError = 'Vui lòng chọn hoặc nhập lý do từ chối đơn hàng.';
      return;
    }

    this.actionSubmitting = true;
    this.actionModalError = '';

    this.http.post(`${this.adminBase}/${this.rejectTargetOrder._id}/reject`, {
      reason: this.rejectReasonInput.trim(),
      cause: this.rejectCause
    }).subscribe({
      next: (updatedOrder: any) => {
        this.actionSubmitting = false;
        const code = this.rejectTargetOrder.code;
        this.rejectTargetOrder = null;
        this.doneMsg(`Đã từ chối / hủy đơn #${code}`);
        this.loadOrders();
        if (updatedOrder?.refund?.status === 'pending') {
          this.openRefundModal(updatedOrder);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.actionSubmitting = false;
        this.actionModalError = err.error?.message || 'Không thể từ chối đơn hàng.';
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== DUYỆT / TỪ CHỐI YÊU CẦU HỦY ====================

  decideCancel(o: any, decision: 'accepted' | 'rejected') {
    this.http.post(`${this.adminBase}/${o._id}/cancel-request/decision`, {
      decision,
      decisionReason: ''
    }).subscribe({
      next: (updatedOrder: any) => {
        this.doneMsg(`Đã duyệt hủy #${o.code}`);
        this.loadOrders();
        if (updatedOrder?.refund?.status === 'pending') {
          this.openRefundModal(updatedOrder);
        }
      },
      error: (err: any) => alert(err.error?.message || 'Lỗi xử lý yêu cầu hủy')
    });
  }

  openRejectCancelReqModal(o: any) {
    this.rejectCancelReqOrder = o;
    this.decisionReasonInput = '';
    this.actionModalError = '';
  }

  submitRejectCancelReq() {
    if (!this.decisionReasonInput.trim()) {
      this.actionModalError = 'Vui lòng nhập lý do từ chối yêu cầu hủy của khách.';
      return;
    }

    this.actionSubmitting = true;
    this.actionModalError = '';

    this.http.post(`${this.adminBase}/${this.rejectCancelReqOrder._id}/cancel-request/decision`, {
      decision: 'rejected',
      decisionReason: this.decisionReasonInput.trim()
    }).subscribe({
      next: () => {
        this.actionSubmitting = false;
        const code = this.rejectCancelReqOrder.code;
        this.rejectCancelReqOrder = null;
        this.doneMsg(`Đã từ chối yêu cầu hủy đơn #${code}`);
        this.loadOrders();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.actionSubmitting = false;
        this.actionModalError = err.error?.message || 'Lỗi xử lý từ chối yêu cầu hủy.';
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== HỦY ĐẶC BIỆT (HOÀN 100%) ====================

  openSpecialCancelModal(o: any) {
    this.specialCancelOrderTarget = o;
    this.specialCancelReasonInput = '';
    this.actionModalError = '';
  }

  submitSpecialCancel() {
    if (!this.specialCancelReasonInput.trim()) {
      this.actionModalError = 'Vui lòng nhập lý do hủy đặc biệt từ phía cửa hàng.';
      return;
    }

    this.actionSubmitting = true;
    this.actionModalError = '';

    this.http.post(`${this.adminBase}/${this.specialCancelOrderTarget._id}/special-cancel`, {
      reason: this.specialCancelReasonInput.trim(),
      cause: 'shop_fault'
    }).subscribe({
      next: (updatedOrder: any) => {
        this.actionSubmitting = false;
        const code = this.specialCancelOrderTarget.code;
        this.specialCancelOrderTarget = null;
        this.doneMsg(`Đã hủy đặc biệt (hoàn 100%) #${code}`);
        this.loadOrders();
        if (updatedOrder?.refund?.status === 'pending') {
          this.openRefundModal(updatedOrder);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.actionSubmitting = false;
        this.actionModalError = err.error?.message || 'Lỗi hủy đặc biệt.';
        this.cdr.detectChanges();
      }
    });
  }

  closeActionModal() {
    if (this.actionSubmitting) return;
    this.rejectTargetOrder = null;
    this.rejectCancelReqOrder = null;
    this.specialCancelOrderTarget = null;
    this.actionModalError = '';
  }

  // ==================== HOÀN TIỀN & PHIẾU LÀM BÁNH ====================

  openRefundModal(o: any) {
    this.refundOrder = o;
    this.refundAmountInput = o.refund?.suggestedAmount ?? o.refund?.amount ?? o.total ?? 0;
    this.refundAdjustReason = '';
  }

  submitConfirmRefund() {
    if (!this.refundOrder?._id) return;
    const suggested = this.refundOrder.refund?.suggestedAmount ?? 0;
    if (Number(this.refundAmountInput) !== Number(suggested) && !this.refundAdjustReason.trim()) {
      alert('Vui lòng nhập lý do điều chỉnh khi số tiền hoàn khác với mức đề xuất.');
      return;
    }

    this.http.post(`${this.adminBase}/${this.refundOrder._id}/refund/confirm`, {
      amount: Number(this.refundAmountInput),
      adjustReason: this.refundAdjustReason.trim()
    }).subscribe({
      next: () => {
        this.doneMsg(`Đã xác nhận hoàn ${Number(this.refundAmountInput).toLocaleString()}đ cho đơn #${this.refundOrder.code}`);
        this.refundOrder = null;
        this.loadOrders();
      },
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
      delivered: 'Đã giao',
      done: 'Hoàn thành',
      cancelled: 'Đã hủy'
    };
    return m[s] || s;
  }
}