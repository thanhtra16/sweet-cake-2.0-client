import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-admin-order-full',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sc-shell">
      <div *ngIf="notice" class="sc-toast">
        <span class="sc-toast-dot"></span>
        <span>{{ notice }}</span>
      </div>

      <!-- =========================================================================
           MÀN HÌNH 1: SỔ ĐƠN HÀNG SWEETCAKE
           ========================================================================= -->
      <ng-container *ngIf="!selectedOrder">
        <div class="sc-hero">
          <div>
            <div class="sc-eyebrow">
              <span class="sc-eyebrow-badge">✓</span>
              <span>PHÂN HỆ ĐIỀU HÀNH XƯỞNG BÁNH</span>
            </div>
            <h1 class="sc-title">Sổ Đơn Hàng SweetCake</h1>
            <p class="sc-subtitle">
              Theo dõi tiến độ bếp nướng, duyệt đơn, xử lý yêu cầu hủy & đối soát hoàn tiền.
            </p>
          </div>
          <div class="sc-hero-actions">
            <button
              type="button"
              class="btn-sc-outline"
              (click)="loadOrders()"
              [disabled]="loading"
            >
              ↻ Làm mới
            </button>
          </div>
        </div>

        <!-- 4 THẺ KPI -->
        <div class="kpi-grid">
          <div
            class="kpi-card kpi-base"
            (click)="setQuickTab('all')"
            [class.active]="quickTab === 'all'"
          >
            <div class="kpi-top">
              <div>
                <div class="kpi-label">TỔNG ĐƠN HỆ THỐNG</div>
                <div class="kpi-val-row">
                  <span class="kpi-num">{{ allOrdersCache.length | number: '2.0-0' }}</span>
                  <span class="kpi-unit">đơn</span>
                </div>
              </div>
              <div class="kpi-icon-box">🧾</div>
            </div>
            <div class="kpi-foot muted">↗ Đồng bộ thời gian thực</div>
          </div>

          <div
            class="kpi-card kpi-brown"
            (click)="setQuickTab('pending')"
            [class.active]="quickTab === 'pending'"
          >
            <div class="kpi-top">
              <div>
                <div class="kpi-label">CHỜ DUYỆT ĐƠN</div>
                <div class="kpi-val-row">
                  <span class="kpi-num">{{ countPendingApproval | number: '2.0-0' }}</span>
                  <span class="kpi-unit">đơn mới</span>
                </div>
              </div>
              <div class="kpi-icon-box brown">📋</div>
            </div>
            <div class="kpi-foot">🕒 Cần duyệt để lập phiếu xưởng</div>
          </div>

          <div
            class="kpi-card kpi-dark"
            (click)="setQuickTab('baking')"
            [class.active]="quickTab === 'baking'"
          >
            <div class="kpi-top">
              <div>
                <div class="kpi-label">ĐANG LÀM BÁNH</div>
                <div class="kpi-val-row">
                  <span class="kpi-num">{{ countBaking | number: '2.0-0' }}</span>
                  <span class="kpi-unit">mẻ bánh</span>
                </div>
              </div>
              <div class="kpi-icon-box dark">♨</div>
            </div>
            <div class="kpi-foot">🔥 Bếp nướng & trang trí đang xử lý</div>
          </div>

          <div
            class="kpi-card kpi-danger"
            (click)="setQuickTab('cancel_req')"
            [class.active]="quickTab === 'cancel_req'"
          >
            <div class="kpi-top">
              <div>
                <div class="kpi-label">
                  YÊU CẦU HỦY / HOÀN <span *ngIf="countCancelOrRefund > 0" class="dot-red"></span>
                </div>
                <div class="kpi-val-row">
                  <span class="kpi-num">{{ countCancelOrRefund | number: '2.0-0' }}</span>
                  <span class="kpi-unit">đơn cần xử lý</span>
                </div>
              </div>
              <div class="kpi-icon-box danger">⚠</div>
            </div>
            <div class="kpi-foot danger-txt">! Duyệt hủy & đối soát hoàn tiền</div>
          </div>
        </div>

        <!-- CARD BỘ LỌC -->
        <div class="sc-card filter-card">
          <div class="filter-head">
            <div class="filter-title"><span>⧩</span> Bộ lọc & Phân loại nhanh</div>
            <div class="quick-tab-pills">
              <button
                type="button"
                class="qt-pill"
                [class.on]="quickTab === 'all'"
                (click)="setQuickTab('all')"
              >
                Tất cả đơn
              </button>
              <button
                type="button"
                class="qt-pill"
                [class.on]="quickTab === 'urgent'"
                (click)="setQuickTab('urgent')"
              >
                ⚡ Cần làm sớm
              </button>
              <button
                type="button"
                class="qt-pill"
                [class.on]="quickTab === 'cancel_req'"
                (click)="setQuickTab('cancel_req')"
              >
                🔔 Có yêu cầu hủy
              </button>
              <button
                type="button"
                class="qt-pill"
                [class.on]="quickTab === 'refund'"
                (click)="setQuickTab('refund')"
              >
                💸 Hoàn tiền / Quá 3 ngày
              </button>
            </div>
          </div>

          <div class="filter-grid-2">
            <div class="f-group">
              <label>TỪ KHÓA TÌM KIẾM</label>
              <div class="f-input-wrap">
                <span class="f-ico">🔍</span>
                <input
                  type="text"
                  [(ngModel)]="keyword"
                  (keyup.enter)="applyClientFilters()"
                  placeholder="Tìm mã đơn, tên khách hàng hoặc SĐT..."
                  class="sc-inp pl-32"
                />
              </div>
            </div>

            <div class="f-group">
              <label>TRẠNG THÁI XỬ LÝ</label>
              <select [(ngModel)]="statusFilter" (change)="applyClientFilters()" class="sc-inp">
                <option value="">Tất cả trạng thái</option>
                <option value="pending_payment">Chờ thanh toán</option>
                <option value="pending_approval">Chờ duyệt</option>
                <option value="accepted">Đã tiếp nhận</option>
                <option value="baking">Đang làm bánh</option>
                <option value="delivering">Đang giao</option>
                <option value="delivered">Đã giao</option>
                <option value="done">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>

          <div class="filter-footer">
            <div class="filter-active-note">
              <span>ⓘ</span>
              <span
                >Đang hiển thị: <strong>{{ getQuickTabLabel() }}</strong></span
              >
            </div>
            <div class="filter-btns">
              <button type="button" class="btn-sc-soft" (click)="resetFilters()">↻ Đặt lại</button>
              <button type="button" class="btn-sc-primary" (click)="applyClientFilters()">
                🔍 Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        <!-- CARD DANH SÁCH ĐƠN BÁNH -->
        <div class="sc-card table-wrapper-card">
          <div class="table-card-head">
            <div class="tch-left">
              <h2>Danh sách đơn bánh</h2>
              <span class="count-pill">{{ orders.length }} đơn hàng</span>
            </div>
            <div class="tch-right"><span class="live-dot"></span> Tự động đồng bộ dữ liệu</div>
          </div>

          <div *ngIf="loading" class="state-empty">Đang tải danh sách đơn bánh...</div>
          <div *ngIf="!loading && errorMsg" class="state-empty err">
            <p>{{ errorMsg }}</p>
            <button class="btn-sc-primary" (click)="loadOrders()">Thử kết nối lại</button>
          </div>
          <div *ngIf="!loading && !errorMsg && orders.length === 0" class="state-empty">
            Không tìm thấy đơn hàng nào khớp với bộ lọc hiện tại.
          </div>

          <div class="table-scroll" *ngIf="!loading && !errorMsg && orders.length > 0">
            <table class="sc-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN & SẢN PHẨM</th>
                  <th>KHÁCH HÀNG & SĐT</th>
                  <th>TỔNG TIỀN & HOÀN</th>
                  <th>TRẠNG THÁI & CẢNH BÁO</th>
                  <th style="text-align: right;">THAO TÁC NGHIỆP VỤ</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let o of orders" [class.row-cancelled]="o.status === 'cancelled'">
                  <td>
                    <span class="order-code" [class.strike]="o.status === 'cancelled'"
                      >#{{ o.code }}</span
                    >
                    <div class="sub-txt">
                      {{ o.items?.[0]?.name || 'Đơn bánh' }} (×{{
                        o.items?.[0]?.qty || o.items?.[0]?.quantity || 1
                      }})
                    </div>
                    <div class="sub-txt cancel-reason-line" *ngIf="o.cancelRequest?.reason">
                      Lý do hủy: <em>"{{ o.cancelRequest.reason }}"</em>
                    </div>
                  </td>

                  <td>
                    <div class="cust-name">
                      {{
                        o.receiver?.fullName ||
                          o.customer?.fullName ||
                          o.user?.fullName ||
                          'Khách vãng lai'
                      }}
                    </div>
                    <div class="sub-txt">
                      {{ o.receiver?.phone || o.customer?.phone || o.user?.phone || '—' }}
                    </div>
                  </td>

                  <td>
                    <div class="price-bold">{{ o.total || 0 | number }} đ</div>
                    <div class="sub-txt refund-note" *ngIf="o.refund?.status">
                      Đề xuất hoàn:
                      <strong
                        >{{ o.refund.suggestedAmount ?? o.refund.amount ?? 0 | number }}đ</strong
                      >
                      <span *ngIf="o.refund.status === 'processed'">
                        • Đã hoàn {{ o.refund.amount || 0 | number }}đ</span
                      >
                      <span *ngIf="o.refund.status === 'pending'"> (Chờ hoàn)</span>
                    </div>
                  </td>

                  <td>
                    <span class="status-pill" [ngClass]="'sp-' + o.status">
                      {{ getStatusLabel(o.status) }}
                    </span>
                    <div class="warn-sub urgent" *ngIf="isUrgent(o)">⚡ Cần làm sớm</div>
                    <div class="warn-sub cancel" *ngIf="o.cancelRequest?.status === 'pending'">
                      🔔 Có yêu cầu hủy
                    </div>
                    <div class="warn-sub cancel" *ngIf="isRefundOverdue(o)">
                      ⚠ Quá 3 ngày hoàn tiền
                    </div>
                  </td>

                  <td>
                    <div class="row-actions-wrap">
                      <button type="button" class="act-btn view" (click)="openOrderDetail(o)">
                        👁 Chi tiết / Phiếu / Ảnh
                      </button>

                      <button
                        *ngIf="o.status === 'pending_approval'"
                        type="button"
                        class="act-btn ok"
                        (click)="openAcceptConfirmModal(o)"
                      >
                        ✓ Tiếp nhận
                      </button>

                      <button
                        *ngIf="
                          !['done', 'cancelled'].includes(o.status) &&
                          o.cancelRequest?.status !== 'pending'
                        "
                        type="button"
                        class="act-btn bad"
                        (click)="openRejectModal(o)"
                      >
                        ✕ Từ chối đơn
                      </button>

                      <ng-container *ngIf="o.cancelRequest?.status === 'pending'">
                        <button
                          type="button"
                          class="act-btn warn"
                          (click)="decideCancel(o, 'accepted')"
                        >
                          ✓ Duyệt hủy
                        </button>
                        <button
                          type="button"
                          class="act-btn bad"
                          (click)="openRejectCancelReqModal(o)"
                        >
                          ✕ Từ chối hủy
                        </button>
                      </ng-container>

                      <button
                        *ngIf="!['done', 'cancelled'].includes(o.status)"
                        type="button"
                        class="act-btn neutral"
                        (click)="openSpecialCancelModal(o)"
                      >
                        ⚠ Hủy đặc biệt (100%)
                      </button>

                      <button
                        *ngIf="o.refund?.status === 'pending'"
                        type="button"
                        class="act-btn brown"
                        (click)="openRefundModal(o)"
                      >
                        💸 Xác nhận hoàn tiền
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- =========================================================================
           MÀN HÌNH 2: CHI TIẾT ĐƠN HÀNG (CHUẨN FRAME 03)
           ========================================================================= -->
      <ng-container *ngIf="selectedOrder">
        <div class="f3-header-wrap">
          <div class="f3-breadcrumb-row">
            <button type="button" class="btn-back-list" (click)="backToList()">
              ← Danh sách đơn hàng
            </button>
            <span class="slash">/</span>
            <h1 class="detail-order-title">
              Đơn hàng <span>#{{ selectedOrder.code }}</span>
            </h1>
            <span class="f3-warn-pill" *ngIf="selectedOrder.cancelRequest?.status === 'pending'">
              ⚠ Yêu cầu hủy chờ duyệt
            </span>
            <span
              class="status-pill lg"
              *ngIf="selectedOrder.cancelRequest?.status !== 'pending'"
              [ngClass]="'sp-' + selectedOrder.status"
            >
              {{ getStatusLabel(selectedOrder.status) }}
            </span>
          </div>

          <div class="f3-sub-actions">
            <button type="button" class="btn-print-guest" (click)="openTicketModal()">
              🖨 Phiếu làm bánh
            </button>
          </div>
        </div>

        <div class="f3-cancel-banner" *ngIf="selectedOrder.cancelRequest?.status === 'pending'">
          <div class="f3-cb-ico">🔔</div>
          <div class="f3-cb-body">
            <div class="f3-cb-top">
              <strong>CẢNH BÁO: Khách hàng gửi yêu cầu hủy đơn hàng</strong>
              <span class="f3-cb-badge" *ngIf="selectedOrder.cancelRequest?.requestedAt">
                Gửi lúc {{ selectedOrder.cancelRequest.requestedAt | date: 'HH:mm - dd/MM/yyyy' }}
              </span>
            </div>
            <div class="f3-cb-reason">
              Lý do từ khách hàng:
              <em>"{{ selectedOrder.cancelRequest?.reason || 'Khách hàng yêu cầu hủy đơn' }}"</em>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-col-main">
            <div class="sc-card d-card">
              <div class="d-card-head">
                <div class="d-card-title">🎂 THÔNG TIN SẢN PHẨM</div>
                <span class="ticket-tag" *ngIf="ticketInfo?.ticketCode"
                  >Mã phiếu: #{{ ticketInfo.ticketCode }}</span
                >
              </div>

              <div
                class="prod-item-box"
                *ngFor="let item of selectedOrder.items || []; let idx = index"
              >
                <div class="prod-thumb f3-thumb">
                  <img [src]="getItemImage(item)" alt="Ảnh mẫu đặt" />
                  <span class="thumb-badge">Ảnh mẫu đặt</span>
                </div>

                <div class="prod-info">
                  <div class="pi-top">
                    <div>
                      <h3 class="pi-name">{{ item.name }}</h3>
                      <div class="pi-sku">
                        Mã bánh: {{ item.sku || item.productCode || 'MS-CAKE-0' + (idx + 1) }}
                      </div>
                    </div>
                    <div class="pi-price">
                      <strong
                        >{{
                          item.price || item.unitPrice || selectedOrder.total || 0 | number
                        }}
                        đ</strong
                      >
                      <span>SL: {{ item.qty || item.quantity || 1 | number: '2.0-0' }} chiếc</span>
                    </div>
                  </div>

                  <div class="f3-specs-6">
                    <div class="f3-sp-item">
                      <span>📏 Kích cỡ:</span>
                      <strong>{{
                        item.size || item.variant?.size || 'Size 18cm (6 - 8 người)'
                      }}</strong>
                    </div>
                    <div class="f3-sp-item">
                      <span>🍰 Cốt bánh:</span>
                      <strong>{{ item.sponge || item.base || 'Theo công thức chuẩn' }}</strong>
                    </div>
                    <div class="f3-sp-item">
                      <span>🍓 Nhân bánh:</span>
                      <strong>{{ item.filling || 'Kem tươi & Mứt trái cây' }}</strong>
                    </div>
                    <div class="f3-sp-item">
                      <span>🎨 Màu kem phủ:</span>
                      <strong>{{
                        item.frostingColor || item.color || 'Hồng pastel tự nhiên'
                      }}</strong>
                    </div>
                    <div class="f3-sp-item">
                      <span>💧 Độ ngọt:</span>
                      <strong>{{ item.sweetness || 'Tiêu chuẩn (50%)' }}</strong>
                    </div>
                    <div class="f3-sp-item">
                      <span>🎁 Đóng gói:</span>
                      <strong>{{ item.packaging || 'Hộp mica trong cao cấp' }}</strong>
                    </div>
                  </div>

                  <div
                    class="cake-message-box"
                    *ngIf="item.message || item.note || selectedOrder.note"
                  >
                    <div class="cmb-lbl">✍ CHỮ VIẾT NẮN NÓT TRÊN MẶT BÁNH:</div>
                    <div class="cmb-text">
                      "{{ item.message || item.note || selectedOrder.note }}"
                    </div>
                  </div>

                  <div class="f3-addons-list">
                    <ng-container
                      *ngIf="item.addons?.length || item.accessories?.length; else defaultAddonsTpl"
                    >
                      <div class="f3-addon-row" *ngFor="let ad of item.addons || item.accessories">
                        <span class="f3-check">✓</span>
                        <span
                          >{{ ad.name || ad }}
                          <strong *ngIf="ad.price">(+{{ ad.price | number }} đ)</strong></span
                        >
                      </div>
                    </ng-container>
                    <ng-template #defaultAddonsTpl>
                      <div class="f3-addon-row">
                        <span class="f3-check">✓</span><span>Hộp mica trong suốt kèm ruy băng</span>
                      </div>
                      <div class="f3-addon-row">
                        <span class="f3-check">✓</span
                        ><span>Set nến xoắn & Bộ dao nĩa gỗ tiệc sinh nhật (Miễn phí)</span>
                      </div>
                    </ng-template>
                  </div>
                </div>
              </div>

              <!-- THANH MINH CHỨNG ẢNH BÁNH THỰC TẾ -->
              <div class="proof-photo-bar">
                <div class="ppb-left">
                  <span class="ppb-ico-box">📷</span>
                  <strong>Minh chứng ảnh bánh thực tế</strong>
                </div>
                <div>
                  <input
                    #cakeFileInput
                    type="file"
                    accept="image/*"
                    multiple
                    style="display: none;"
                    (change)="onLocalPhotoSelected($event)"
                  />
                  <button
                    type="button"
                    class="btn-sc-outline sm"
                    (click)="cakeFileInput.click()"
                    [disabled]="uploadingPhoto"
                  >
                    {{ uploadingPhoto ? '⏳ Đang tải ảnh...' : '📤 Tải ảnh bánh thực tế' }}
                  </button>
                </div>
              </div>

              <div class="photo-preview-strip" *ngIf="uploadedPhotoPreviews.length > 0">
                <div class="pps-item" *ngFor="let url of uploadedPhotoPreviews; let idx = index">
                  <img [src]="url" alt="Ảnh bánh thực tế" />
                  <span class="pps-tag">Ảnh thực tế #{{ idx + 1 }}</span>
                  <button
                    type="button"
                    class="pps-del"
                    (click)="removePreviewPhoto(idx)"
                    title="Xóa ảnh"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <!-- CARD LỊCH SỬ ĐƠN HÀNG -->
            <div class="sc-card d-card">
              <div class="d-card-head">
                <div class="d-card-title">🕒 LỊCH SỬ ĐƠN HÀNG</div>
                <span class="sub-txt"
                  >Mã phiếu xưởng:
                  <strong
                    >#{{ ticketInfo?.ticketCode || 'PLB-' + selectedOrder.code }}</strong
                  ></span
                >
              </div>

              <div class="timeline-list">
                <div class="tl-item done">
                  <span class="tl-dot">✓</span>
                  <div class="tl-content">
                    <strong>Khách hàng khởi tạo đơn hàng</strong>
                    <span>{{ selectedOrder.createdAt | date: 'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                </div>

                <div class="tl-item done" *ngIf="selectedOrder.payment?.status === 'paid'">
                  <span class="tl-dot">✓</span>
                  <div class="tl-content">
                    <strong>Thanh toán VietQR / Chuyển khoản thành công</strong>
                    <span>Đã xác nhận giao dịch</span>
                  </div>
                </div>

                <div
                  class="tl-item done"
                  *ngIf="
                    ['accepted', 'baking', 'delivering', 'delivered', 'done'].includes(
                      selectedOrder.status
                    )
                  "
                >
                  <span class="tl-dot">✓</span>
                  <div class="tl-content">
                    <strong>Quản trị viên tiếp nhận & Lập phiếu xưởng</strong>
                    <span>Đồng bộ bảng điều hành bếp</span>
                  </div>
                </div>

                <div
                  class="tl-item active"
                  *ngIf="
                    ['baking', 'delivering', 'delivered', 'done'].includes(selectedOrder.status)
                  "
                >
                  <span class="tl-dot">♨</span>
                  <div class="tl-content">
                    <strong
                      >Trạng thái bếp & giao nhận:
                      {{ getStatusLabel(selectedOrder.status) }}</strong
                    >
                    <span>Đã cập nhật</span>
                  </div>
                </div>

                <div class="tl-item warn" *ngIf="selectedOrder.cancelRequest?.status === 'pending'">
                  <span class="tl-dot">!</span>
                  <div class="tl-content">
                    <div>
                      <strong>Khách gửi yêu cầu hủy đơn hàng</strong>
                      <div class="sub-txt">Lý do: {{ selectedOrder.cancelRequest?.reason }}</div>
                    </div>
                    <span>{{
                      selectedOrder.cancelRequest?.requestedAt | date: 'dd/MM/yyyy HH:mm'
                    }}</span>
                  </div>
                </div>

                <div class="tl-item danger" *ngIf="selectedOrder.status === 'cancelled'">
                  <span class="tl-dot">✕</span>
                  <div class="tl-content">
                    <strong>Đơn hàng đã hủy</strong>
                    <span>{{ selectedOrder.cancellation?.reason || 'Đã đóng đơn hàng' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-col-side">
            <div class="sc-card d-card">
              <div class="d-card-head">
                <div class="d-card-title">👤 THÔNG TIN KHÁCH HÀNG & NHẬN BÁNH</div>
                <span class="f3-member-pill">{{
                  selectedOrder.user || selectedOrder.customer
                    ? 'Khách hàng thành viên'
                    : 'Khách đặt bánh'
                }}</span>
              </div>

              <div class="f3-cust-row">
                <div>
                  <div class="cust-name-lg">
                    {{
                      selectedOrder.receiver?.fullName ||
                        selectedOrder.receiver?.name ||
                        selectedOrder.customer?.fullName ||
                        selectedOrder.user?.fullName ||
                        'Khách hàng SweetCake'
                    }}
                  </div>
                  <div class="cust-phone">
                    📞
                    {{
                      selectedOrder.receiver?.phone ||
                        selectedOrder.customer?.phone ||
                        selectedOrder.user?.phone ||
                        selectedOrder.phone ||
                        'Chưa cập nhật SĐT'
                    }}
                  </div>
                  <div
                    class="sub-txt"
                    *ngIf="
                      selectedOrder.receiver?.email ||
                      selectedOrder.customer?.email ||
                      selectedOrder.user?.email
                    "
                  >
                    ✉
                    {{
                      selectedOrder.receiver?.email ||
                        selectedOrder.customer?.email ||
                        selectedOrder.user?.email
                    }}
                  </div>
                </div>
                <a
                  *ngIf="
                    selectedOrder.receiver?.phone ||
                    selectedOrder.customer?.phone ||
                    selectedOrder.user?.phone
                  "
                  [href]="
                    'tel:' +
                    (selectedOrder.receiver?.phone ||
                      selectedOrder.customer?.phone ||
                      selectedOrder.user?.phone)
                  "
                  class="f3-call-btn"
                  title="Gọi khách"
                  >📞</a
                >
              </div>

              <div class="delivery-box">
                <div class="db-badge">
                  {{
                    isDeliveryOrder(selectedOrder)
                      ? '🚚 HÌNH THỨC: GIAO HÀNG TẬN NƠI'
                      : '🏪 HÌNH THỨC: NHẬN TẠI CỬA HÀNG'
                  }}
                </div>
                <div class="db-addr">
                  {{
                    selectedOrder.receiver?.address ||
                      selectedOrder.shippingAddress?.address ||
                      selectedOrder.deliveryAddress ||
                      selectedOrder.branchName ||
                      'Chi nhánh SweetCake Thủ Đức, TP. Hồ Chí Minh'
                  }}
                </div>
              </div>

              <div class="slot-two-cols">
                <div class="stc-box">
                  <span>📅 Ngày hẹn lấy</span>
                  <strong>{{
                    selectedOrder.receiveDate ||
                      selectedOrder.deliveryDate ||
                      selectedOrder.createdAt | date: 'dd/MM/yyyy'
                  }}</strong>
                </div>
                <div class="stc-box">
                  <span>🕒 Khung giờ lấy</span>
                  <strong>{{
                    selectedOrder.slotLabel ||
                      selectedOrder.timeSlot ||
                      selectedOrder.receiveTime ||
                      '10:00 - 11:00'
                  }}</strong>
                </div>
              </div>

              <div class="f3-cust-note">
                <small>📝 Ghi chú riêng của khách:</small>
                <p>
                  "{{
                    selectedOrder.note ||
                      selectedOrder.customerNote ||
                      selectedOrder.items?.[0]?.note ||
                      'Không có ghi chú thêm.'
                  }}"
                </p>
              </div>
            </div>

            <div class="sc-card d-card">
              <div class="d-card-head">
                <div class="d-card-title">💳 CHI TIẾT THANH TOÁN</div>
                <span class="paid-tag" [class.unpaid]="selectedOrder.payment?.status !== 'paid'">
                  {{
                    selectedOrder.payment?.status === 'paid'
                      ? '✓ Đã thanh toán 100%'
                      : 'Chờ thanh toán'
                  }}
                </span>
              </div>

              <div class="f3-vietqr-box">
                <div>
                  <strong>Chuyển khoản QR Động (Dynamic VietQR)</strong>
                  <div class="sub-txt">
                    MÃ GD: {{ selectedOrder.payment?.transactionId || 'VQR-' + selectedOrder.code }}
                  </div>
                </div>
                <span class="f3-auto-reconcile">Tự động đối soát</span>
              </div>

              <div class="pay-rows">
                <div class="pr-line">
                  <span>Tạm tính sản phẩm</span>
                  <strong
                    >{{ selectedOrder.subtotal || selectedOrder.total || 0 | number }} đ</strong
                  >
                </div>
                <div class="pr-line" *ngIf="selectedOrder.addonFee">
                  <span>Phụ phí hộp mica & nến xoắn</span>
                  <strong>+{{ selectedOrder.addonFee | number }} đ</strong>
                </div>
                <div class="pr-line discount" *ngIf="selectedOrder.discount">
                  <span
                    >Giảm giá Voucher
                    <span class="f3-voucher-code" *ngIf="selectedOrder.voucherCode">{{
                      selectedOrder.voucherCode
                    }}</span></span
                  >
                  <strong>-{{ selectedOrder.discount | number }} đ</strong>
                </div>
                <div class="pr-line">
                  <span
                    >Phí vận chuyển ({{
                      isDeliveryOrder(selectedOrder) ? 'Giao tận nơi' : 'Nhận tại tiệm'
                    }})</span
                  >
                  <strong>{{ selectedOrder.shippingFee || 0 | number }} đ</strong>
                </div>
                <div class="pr-total">
                  <span>TỔNG CỘNG ĐƠN HÀNG</span>
                  <strong>{{ selectedOrder.total || 0 | number }} đ</strong>
                </div>
              </div>
            </div>

            <div class="sc-card d-card">
              <div class="d-card-head">
                <div class="d-card-title">⚡ TIẾN TRÌNH ĐƠN HÀNG</div>
              </div>

              <div class="f3-progress-meta">
                <span>Tiến trình hiện tại:</span>
                <strong
                  >Bước {{ getStepIndex(selectedOrder.status) }} / 5:
                  {{ getStatusLabel(selectedOrder.status) }}</strong
                >
              </div>

              <div class="f3-progress-bars">
                <div class="f3-pb-seg" [class.on]="getStepIndex(selectedOrder.status) >= 1"></div>
                <div class="f3-pb-seg" [class.on]="getStepIndex(selectedOrder.status) >= 2"></div>
                <div class="f3-pb-seg" [class.on]="getStepIndex(selectedOrder.status) >= 3"></div>
                <div class="f3-pb-seg" [class.on]="getStepIndex(selectedOrder.status) >= 4"></div>
                <div class="f3-pb-seg" [class.on]="getStepIndex(selectedOrder.status) >= 5"></div>
              </div>

              <div class="f3-progress-labels">
                <span [class.active]="getStepIndex(selectedOrder.status) === 1">1. Chờ duyệt</span>
                <span [class.active]="getStepIndex(selectedOrder.status) === 2">2. Tiếp nhận</span>
                <span [class.active]="getStepIndex(selectedOrder.status) === 3">3. Làm bánh</span>
                <span [class.active]="getStepIndex(selectedOrder.status) === 4">4. Đang giao</span>
                <span [class.active]="getStepIndex(selectedOrder.status) === 5">5. Hoàn tất</span>
              </div>

              <div class="action-stack" style="margin-top: 16px;">
                <button
                  *ngIf="selectedOrder.cancelRequest?.status === 'pending'"
                  type="button"
                  class="btn-sc-dark full"
                  (click)="decideCancel(selectedOrder, 'accepted')"
                >
                  ⚖ Xử lý yêu cầu hủy & Hoàn tiền
                </button>

                <button
                  *ngIf="selectedOrder.cancelRequest?.status === 'pending'"
                  type="button"
                  class="btn-sc-outline full"
                  (click)="openRejectCancelReqModal(selectedOrder)"
                >
                  ✕ Từ chối yêu cầu hủy (Tiếp tục đơn)
                </button>

                <button
                  *ngIf="selectedOrder.refund?.status === 'pending'"
                  type="button"
                  class="btn-sc-dark full"
                  (click)="openRefundModal(selectedOrder)"
                >
                  💸 Xác nhận hoàn tiền ({{
                    selectedOrder.refund?.suggestedAmount ?? selectedOrder.total ?? 0 | number
                  }}
                  đ)
                </button>

                <ng-container *ngIf="!['done', 'cancelled'].includes(selectedOrder.status)">
                  <button
                    *ngIf="selectedOrder.status === 'pending_approval'"
                    type="button"
                    class="btn-sc-primary full"
                    (click)="openAcceptConfirmModal(selectedOrder)"
                  >
                    → Chuyển sang "Đã tiếp nhận"
                  </button>

                  <button
                    *ngIf="selectedOrder.status === 'accepted'"
                    type="button"
                    class="btn-sc-primary full"
                    (click)="quickAdvanceStatus('baking')"
                  >
                    → Chuyển sang "Đang làm bánh"
                  </button>

                  <button
                    *ngIf="selectedOrder.status === 'baking'"
                    type="button"
                    class="btn-sc-primary full"
                    (click)="quickAdvanceStatus('delivering')"
                  >
                    → Chuyển sang "Đã xong bánh / Đang giao"
                  </button>

                  <button
                    *ngIf="selectedOrder.status === 'delivering'"
                    type="button"
                    class="btn-sc-primary full"
                    (click)="quickAdvanceStatus('delivered')"
                  >
                    → Chuyển sang "Đã giao khách"
                  </button>

                  <button
                    *ngIf="selectedOrder.status === 'delivered'"
                    type="button"
                    class="btn-sc-primary full"
                    (click)="quickAdvanceStatus('done')"
                  >
                    → Hoàn thành đơn hàng
                  </button>

                  <div class="danger-zone-btns">
                    <button
                      *ngIf="selectedOrder.cancelRequest?.status !== 'pending'"
                      type="button"
                      class="btn-sc-danger-outline full"
                      (click)="openRejectModal(selectedOrder)"
                    >
                      ✕ Từ chối / Hủy đơn hàng
                    </button>
                    <button
                      type="button"
                      class="btn-sc-soft full"
                      (click)="openSpecialCancelModal(selectedOrder)"
                    >
                      ⚠ Hủy đặc biệt từ xưởng (Hoàn 100%)
                    </button>
                  </div>
                </ng-container>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- =========================================================================
           POP-UP 1: XÁC NHẬN TIẾP NHẬN ĐƠN HÀNG
           ========================================================================= -->
      <div class="modal-bg" *ngIf="acceptConfirmOrder" (click)="acceptConfirmOrder = null">
        <div class="modal-box md" (click)="$event.stopPropagation()">
          <div class="modal-top-stripe brown"></div>
          <button class="x-close" (click)="acceptConfirmOrder = null">✕</button>

          <div class="modal-title-row">
            <div class="m-badge-icon brown">✓</div>
            <h2>
              Xác nhận tiếp nhận đơn hàng <span>#{{ acceptConfirmOrder.code }}</span>
            </h2>
          </div>

          <div class="modal-info-cream">
            Hệ thống sẽ chuyển đơn sang trạng thái <strong>[Đã tiếp nhận]</strong>, đồng thời tự
            động kích hoạt tính năng <strong>[Lập phiếu làm bánh]</strong> gửi trực tiếp về bảng
            điều hành xưởng bánh.
          </div>

          <div class="modal-foot">
            <button type="button" class="btn-sc-soft" (click)="acceptConfirmOrder = null">
              Hủy bỏ
            </button>
            <button type="button" class="btn-sc-primary" (click)="confirmAcceptOrder()">
              ✓ Xác nhận tiếp nhận
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 2: TỪ CHỐI ĐƠN HÀNG & HOÀN TIỀN
           ========================================================================= -->
      <div class="modal-bg" *ngIf="rejectTargetOrder" (click)="closeActionModal()">
        <div class="modal-box md" (click)="$event.stopPropagation()">
          <div class="modal-top-stripe danger"></div>
          <button class="x-close" (click)="closeActionModal()">✕</button>

          <div class="modal-title-row">
            <div class="m-badge-icon danger">⊘</div>
            <h2>
              Từ chối tiếp nhận đơn hàng <span>#{{ rejectTargetOrder.code }}</span>
            </h2>
          </div>

          <div class="modal-alert-red">
            <strong>⚠ Tác động tự động khi từ chối đơn:</strong>
            <p>
              Chuyển đơn sang <strong>[Đã hủy]</strong> và tạo đề xuất hoàn tiền tự động nếu khách
              đã thanh toán.
            </p>
          </div>

          <div class="sec-field">
            <div class="sf-head">
              <label>Lý do từ chối đơn hàng</label>
              <span class="req-italic">* Bắt buộc nhập</span>
            </div>
            <textarea
              rows="3"
              [(ngModel)]="rejectReasonInput"
              class="sc-inp full"
              placeholder="Nhập lý do từ chối đơn hàng..."
            ></textarea>
            <div class="quick-presets">
              <span>Gợi ý nhanh:</span>
              <button
                type="button"
                *ngFor="let p of rejectPresetReasons"
                class="qp-chip"
                [class.on]="rejectReasonInput === p"
                (click)="rejectReasonInput = p"
              >
                {{ p }}
              </button>
            </div>
          </div>

          <div *ngIf="actionModalError" class="err-line">{{ actionModalError }}</div>

          <div class="modal-foot">
            <button
              type="button"
              class="btn-sc-soft"
              (click)="closeActionModal()"
              [disabled]="actionSubmitting"
            >
              Quay lại
            </button>
            <button
              type="button"
              class="btn-sc-danger"
              (click)="submitRejectOrder()"
              [disabled]="actionSubmitting"
            >
              {{ actionSubmitting ? 'Đang xử lý...' : '✕ Xác nhận từ chối đơn' }}
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 3: PHIẾU LÀM BÁNH (PRODUCTION TICKET - CHUẨN XƯỞNG BẾP)
           ========================================================================= -->
      <div
        class="modal-bg"
        *ngIf="ticketModalOpen && selectedOrder"
        (click)="ticketModalOpen = false"
      >
        <div
          id="printable-production-ticket"
          class="modal-box pt-modal"
          (click)="$event.stopPropagation()"
        >
          <button class="x-close" (click)="ticketModalOpen = false">✕</button>

          <div class="pt-head">
            <div class="pt-head-icon">🎂</div>
            <div>
              <h2>PHIẾU LÀM BÁNH (PRODUCTION TICKET)</h2>
              <p>LƯU HÀNH NỘI BỘ XƯỞNG BẾP • TUÂN THỦ NGHIÊM NGẶT THÔNG SỐ KỸ THUẬT</p>
            </div>
          </div>

          <div class="pt-meta-wrap">
            <div class="pt-meta-pills">
              <span
                >Mã đơn hàng: <strong>#{{ selectedOrder.code }}</strong></span
              >
              <span
                >Mã phiếu xưởng:
                <strong class="txt-brown"
                  >#{{ ticketInfo?.ticketCode || 'PLB-' + selectedOrder.code }}</strong
                ></span
              >
              <span>
                🎂 Số lượng món:
                <span class="pt-count-tag">
                  {{ selectedOrder.items?.length || 1 | number: '2.0-0' }} loại bánh (Tổng
                  {{ getTotalCakeQty(selectedOrder) }} chiếc)
                </span>
              </span>
            </div>
            <div class="pt-oven-badge">
              🕒 Giờ hẹn xuất lò: <strong>{{ getOvenDeadline(selectedOrder) }}</strong>
            </div>
          </div>

          <div class="pt-sec-bar">
            <div class="pt-sec-title">☰ DANH SÁCH MÓN BÁNH CẦN SẢN XUẤT</div>
            <span class="pt-sec-chip"
              >{{ selectedOrder.items?.length || 1 }} sản phẩm trong đơn</span
            >
          </div>

          <div class="pt-items-stack">
            <div class="pt-item-card" *ngFor="let item of selectedOrder.items || []; let i = index">
              <div class="pt-ic-top">
                <div class="pt-ic-name-row">
                  <span class="pt-num-badge">#{{ i + 1 }}</span>
                  <strong>{{ item.name }}</strong>
                  <span class="pt-sku-chip"
                    >#{{ item.sku || item.productCode || 'SP-0' + (i + 1) }}</span
                  >
                </div>
                <div class="pt-ic-badges">
                  <span class="pt-qty-dark"
                    >🎂 Số lượng: {{ item.qty || item.quantity || 1 | number: '2.0-0' }} cái</span
                  >
                  <span class="pt-tier-pill">{{
                    item.tierLabel || (i === 0 ? 'Mẫu Tiêu Chuẩn VIP' : 'Signature Bestseller')
                  }}</span>
                </div>
              </div>

              <div class="pt-4-specs">
                <div class="pt-4s-cell">
                  <span>Kích thước</span>
                  <strong>{{ item.size || '18 cm' }}</strong>
                </div>
                <div class="pt-4s-cell">
                  <span>Độ ngọt</span>
                  <strong>{{ item.sweetness || '50%' }}</strong>
                </div>
                <div class="pt-4s-cell">
                  <span>Hình dạng</span>
                  <strong>{{ item.shape || 'Tròn Chuẩn' }}</strong>
                </div>
                <div class="pt-4s-cell">
                  <span>Khẩu phần</span>
                  <strong>{{ item.servings || '6 - 8 người' }}</strong>
                </div>
              </div>

              <div class="pt-2col-tech">
                <div class="pt-tech-col">
                  <div class="pt-tc-block">
                    <div class="pt-tc-lbl">🍰 CỐT BÁNH (CAKE BASE)</div>
                    <strong>{{ item.sponge || item.base || 'Cốt bông lan tươi' }}</strong>
                    <p>{{ item.spongeNote || 'Nướng đều nhiệt, mềm xốp ẩm, không khô viền.' }}</p>
                  </div>
                  <div class="pt-tc-block">
                    <div class="pt-tc-lbl">🍓 NHÂN BÁNH (LAYER FILLING)</div>
                    <strong>{{ item.filling || 'Kem tươi & Mứt trái cây' }}</strong>
                    <p>{{ item.fillingNote || 'Dàn đều 2 lớp xen kẽ, giữ độ tươi tự nhiên.' }}</p>
                  </div>
                </div>

                <div class="pt-tech-col">
                  <div class="pt-tc-block">
                    <div class="pt-tc-head-inline">
                      <span class="pt-tc-lbl">🎨 KEM & MÀU PHỦ</span>
                      <span class="pt-color-dot-tag">
                        <i class="pt-cdot"></i>
                        {{ item.frostingColor || item.color || 'Hồng Pastel' }}
                      </span>
                    </div>
                    <strong>{{
                      item.frostingDetail || 'Kem tươi whipped mịn nhẹ tự nhiên'
                    }}</strong>
                    <p>
                      {{ item.frostingNote || 'Phủ bề mặt láng mượt tự nhiên, viền gọn sắc nét.' }}
                    </p>
                  </div>
                  <div class="pt-tc-block">
                    <div class="pt-tc-lbl">🎯 ĐẶC TÍNH KỸ THUẬT BẢO QUẢN</div>
                    <strong
                      >Độ ngọt: {{ item.sweetness || '50%' }} • Giữ lạnh ổn định 4°C - 6°C</strong
                    >
                  </div>
                </div>
              </div>

              <div class="pt-msg-box">
                <div class="pt-msg-head">
                  <span>✍ THÔNG ĐIỆP TRÊN BÁNH</span>
                  <span class="pt-msg-tag">{{
                    (item.qty || item.quantity || 1) > 1
                      ? 'Áp dụng cả ' + (item.qty || item.quantity) + ' chiếc'
                      : 'Chữ nắn nót, đúng chính tả'
                  }}</span>
                </div>
                <div class="pt-msg-val">
                  "{{ item.message || item.note || selectedOrder.note || 'Chúc mừng sinh nhật!' }}"
                </div>
                <div class="pt-msg-note">
                  Note: Viết bằng chocolate mềm mại, nét chữ thanh thoát trang nhã.
                </div>
              </div>

              <div class="pt-chef-note">
                <div class="pt-cn-lbl">☆ GHI CHÚ KỸ THUẬT BÁNH #{{ i + 1 }} TỪ BẾP TRƯỞNG:</div>
                <p>
                  "{{
                    item.chefNote ||
                      'Trang trí trái cây tươi & phụ kiện đúng theo ảnh mẫu đặt. Kiểm tra độ phẳng mặt kem và độ lạnh cốt bánh trước khi đóng hộp.'
                  }}"
                </p>
              </div>
            </div>
          </div>

          <div class="pt-acc-card">
            <div class="pt-acc-head">
              <span>🎁 PHỤ KIỆN XƯỞNG CẦN CHUẨN BỊ CHO TOÀN ĐƠN</span>
              <span class="pt-acc-total"
                >Tổng cộng cho {{ getTotalCakeQty(selectedOrder) }} chiếc bánh</span
              >
            </div>

            <div class="pt-acc-grid">
              <label class="pt-acc-item">
                <input type="checkbox" checked />
                <span><strong>01 Hộp mica trong suốt thắt nơ</strong> (Theo kích cỡ bánh)</span>
              </label>
              <label class="pt-acc-item">
                <input type="checkbox" checked />
                <span><strong>01 Set nến xoắn gold</strong> + <strong>Bộ dao dĩa gỗ</strong></span>
              </label>
              <label class="pt-acc-item">
                <input type="checkbox" checked />
                <span><strong>Tem niêm phong & Thiệp chúc mừng</strong> SweetCake</span>
              </label>
            </div>

            <div class="pt-acc-foot">
              Lưu ý đóng gói: Gắn đúng tem mã bánh và phiếu dán xưởng lên từng hộp bánh trước khi
              bàn giao cho bộ phận Giao hàng.
            </div>
          </div>

          <div class="pt-footer">
            <button type="button" class="btn-sc-soft" (click)="ticketModalOpen = false">Hủy</button>
            <div class="pt-footer-right">
              <button type="button" class="btn-sc-outline" (click)="printTicketNow()">
                🖨 In phiếu (Ctrl + P)
              </button>
              <button
                *ngIf="['pending_approval', 'accepted'].includes(selectedOrder.status)"
                type="button"
                class="btn-sc-primary"
                (click)="ticketModalOpen = false; quickAdvanceStatus('baking')"
              >
                ♨ Chuyển sang Đang làm bánh
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 4: XÁC NHẬN HOÀN TIỀN
           ========================================================================= -->
      <div class="modal-bg" *ngIf="refundOrder" (click)="refundOrder = null">
        <div class="modal-box md" (click)="$event.stopPropagation()">
          <div class="modal-top-stripe brown"></div>
          <button class="x-close" (click)="refundOrder = null">✕</button>

          <div class="modal-title-row">
            <div class="m-badge-icon brown">💸</div>
            <h2>
              Xác nhận hoàn tiền đơn <span>#{{ refundOrder.code }}</span>
            </h2>
          </div>

          <div class="sec-field">
            <label>Số tiền hoàn thực tế cho khách (VNĐ)</label>
            <input
              type="number"
              [(ngModel)]="refundAmountInput"
              min="0"
              [max]="refundOrder.total"
              class="sc-inp full"
            />
          </div>

          <div
            class="sec-field"
            *ngIf="refundAmountInput !== (refundOrder.refund?.suggestedAmount ?? 0)"
          >
            <label
              >Lý do điều chỉnh số tiền hoàn
              <span class="req-italic">* Bắt buộc khi khác mức đề xuất</span></label
            >
            <input
              type="text"
              [(ngModel)]="refundAdjustReason"
              class="sc-inp full"
              placeholder="Nhập lý do điều chỉnh..."
            />
          </div>

          <div class="modal-foot">
            <button type="button" class="btn-sc-soft" (click)="refundOrder = null">Hủy</button>
            <button type="button" class="btn-sc-primary" (click)="submitConfirmRefund()">
              ✓ Xác nhận đã hoàn tiền
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 5: TỪ CHỐI YÊU CẦU HỦY CỦA KHÁCH HÀNG
           ========================================================================= -->
      <div class="modal-bg" *ngIf="rejectCancelReqOrder" (click)="closeActionModal()">
        <div class="modal-box md" (click)="$event.stopPropagation()">
          <div class="modal-top-stripe brown"></div>
          <button class="x-close" (click)="closeActionModal()">✕</button>

          <div class="modal-title-row">
            <div class="m-badge-icon brown">✕</div>
            <h2>
              Từ chối yêu cầu hủy đơn <span>#{{ rejectCancelReqOrder.code }}</span>
            </h2>
          </div>

          <div class="sec-field">
            <label
              >Lý do từ chối yêu cầu hủy gửi cho khách
              <span class="req-italic">* Bắt buộc nhập</span></label
            >
            <textarea
              rows="3"
              [(ngModel)]="decisionReasonInput"
              class="sc-inp full"
              placeholder="Nhập lý do giải thích cho khách hàng..."
            ></textarea>
          </div>

          <div *ngIf="actionModalError" class="err-line">{{ actionModalError }}</div>

          <div class="modal-foot">
            <button
              type="button"
              class="btn-sc-soft"
              (click)="closeActionModal()"
              [disabled]="actionSubmitting"
            >
              Quay lại
            </button>
            <button
              type="button"
              class="btn-sc-primary"
              (click)="submitRejectCancelReq()"
              [disabled]="actionSubmitting"
            >
              {{ actionSubmitting ? 'Đang gửi...' : 'Xác nhận từ chối yêu cầu hủy' }}
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 6: HỦY ĐẶC BIỆT TỪ PHÍA XƯỞNG (HOÀN 100%)
           ========================================================================= -->
      <div class="modal-bg" *ngIf="specialCancelOrderTarget" (click)="closeActionModal()">
        <div class="modal-box md" (click)="$event.stopPropagation()">
          <div class="modal-top-stripe danger"></div>
          <button class="x-close" (click)="closeActionModal()">✕</button>

          <div class="modal-title-row">
            <div class="m-badge-icon danger">⚠</div>
            <h2>
              Hủy đặc biệt đơn hàng <span>#{{ specialCancelOrderTarget.code }}</span>
            </h2>
          </div>

          <div class="sec-field">
            <label>Lý do hủy đặc biệt <span class="req-italic">* Bắt buộc nhập</span></label>
            <textarea
              rows="3"
              [(ngModel)]="specialCancelReasonInput"
              class="sc-inp full"
              placeholder="VD: Sự cố bảo quản lạnh / nguyên liệu tươi không đạt chuẩn..."
            ></textarea>
          </div>

          <div *ngIf="actionModalError" class="err-line">{{ actionModalError }}</div>

          <div class="modal-foot">
            <button
              type="button"
              class="btn-sc-soft"
              (click)="closeActionModal()"
              [disabled]="actionSubmitting"
            >
              Quay lại
            </button>
            <button
              type="button"
              class="btn-sc-danger"
              (click)="submitSpecialCancel()"
              [disabled]="actionSubmitting"
            >
              {{ actionSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy & Hoàn 100%' }}
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           POP-UP 7: CẬP NHẬT TRẠNG THÁI THÀNH CÔNG
           ========================================================================= -->
      <div class="modal-bg" *ngIf="successPopupData" (click)="successPopupData = null">
        <div class="modal-box sm center" (click)="$event.stopPropagation()">
          <button class="x-close" (click)="successPopupData = null">✕</button>
          <div class="success-circle">✓</div>
          <h2 class="success-serif">Cập nhật trạng thái thành công!</h2>
          <p class="success-sub">
            Đơn hàng <strong>#{{ successPopupData.code }}</strong> đã chuyển sang
            <span class="status-pill sp-done">• {{ successPopupData.statusLabel }}</span>
          </p>
          <div style="display: flex; justify-content: flex-end; margin-top: 18px;">
            <button type="button" class="btn-sc-dark" (click)="successPopupData = null">
              Tiếp tục xử lý →
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: 'DM Sans', 'Inter', sans-serif;
        color: #2d1b10;
      }
      .sc-shell {
        max-width: 1280px;
        margin: 0 auto;
        padding-bottom: 56px;
      }
      .sc-toast {
        position: fixed;
        top: 20px;
        right: 24px;
        z-index: 3500;
        background: #2d1b10;
        color: #fff;
        padding: 11px 18px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 12px 30px rgba(45, 27, 16, 0.25);
      }
      .sc-toast-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ade80;
      }

      .sc-hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 22px;
      }
      .sc-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8c6239;
        margin-bottom: 6px;
      }
      .sc-eyebrow-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #efe4d8;
        color: #5c3a21;
        font-size: 10px;
      }
      .sc-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 32px;
        font-weight: 700;
        margin: 0;
        color: #2d1b10;
        line-height: 1.15;
      }
      .sc-subtitle {
        font-size: 14px;
        color: #7d6b5d;
        margin: 6px 0 0;
      }

      .btn-sc-primary {
        border: none;
        background: #5c3a21;
        color: #fff;
        height: 40px;
        padding: 0 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        box-shadow: 0 4px 12px rgba(92, 58, 33, 0.18);
      }
      .btn-sc-primary:hover {
        background: #442916;
      }
      .btn-sc-dark {
        border: none;
        background: #2d1b10;
        color: #fff;
        height: 42px;
        padding: 0 20px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      }
      .btn-sc-outline {
        border: 1px solid #dfd3c7;
        background: #fff;
        color: #3d2314;
        height: 40px;
        padding: 0 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .btn-sc-outline.sm {
        height: 34px;
        padding: 0 12px;
        font-size: 12px;
      }
      .btn-sc-soft {
        border: 1px solid #eae0d5;
        background: #f8f3ee;
        color: #4a2c18;
        height: 40px;
        padding: 0 15px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .btn-sc-danger {
        border: none;
        background: #991b1b;
        color: #fff;
        height: 40px;
        padding: 0 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-sc-danger-outline {
        border: 1px solid #fca5a5;
        background: #fff1f0;
        color: #b91c1c;
        height: 38px;
        padding: 0 14px;
        border-radius: 10px;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
      }
      .full {
        width: 100%;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 20px;
      }
      .kpi-card {
        background: #fff;
        border: 1px solid #ece3da;
        border-radius: 16px;
        padding: 18px 20px;
        cursor: pointer;
        border-bottom-width: 3px;
      }
      .kpi-card.active {
        background: #fcf9f5;
      }
      .kpi-base {
        border-bottom-color: #e5d9cd;
      }
      .kpi-brown {
        border-bottom-color: #8c6239;
      }
      .kpi-dark {
        border-bottom-color: #4a2c18;
      }
      .kpi-danger {
        border-bottom-color: #dc2626;
      }
      .kpi-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .kpi-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: #8c7564;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .dot-red {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #dc2626;
        display: inline-block;
      }
      .kpi-val-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-top: 8px;
      }
      .kpi-num {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 32px;
        font-weight: 700;
        color: #2d1b10;
        line-height: 1;
      }
      .kpi-unit {
        font-size: 13px;
        color: #7d6b5d;
      }
      .kpi-icon-box {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: #f7f1eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }
      .kpi-icon-box.danger {
        background: #fee2e2;
        color: #dc2626;
      }
      .kpi-foot {
        margin-top: 12px;
        font-size: 12px;
        color: #6b584c;
      }
      .kpi-foot.danger-txt {
        color: #b91c1c;
      }

      .sc-card {
        background: #fff;
        border: 1px solid #ece3da;
        border-radius: 18px;
        box-shadow: 0 4px 20px rgba(45, 27, 16, 0.035);
        margin-bottom: 20px;
      }
      .filter-card {
        padding: 20px 22px;
      }
      .filter-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 16px;
      }
      .filter-title {
        font-size: 15px;
        font-weight: 700;
        color: #2d1b10;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .quick-tab-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }
      .qt-pill {
        border: 1px solid #e2d6ca;
        background: #faf7f4;
        color: #4a2c18;
        padding: 6px 13px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .qt-pill.on {
        background: #2d1b10;
        color: #fff;
        border-color: #2d1b10;
      }
      .filter-grid-2 {
        display: grid;
        grid-template-columns: 1.6fr 1fr;
        gap: 14px;
      }
      .f-group label {
        display: block;
        font-size: 10.5px;
        font-weight: 700;
        color: #8c7564;
        margin-bottom: 6px;
      }
      .f-input-wrap {
        position: relative;
      }
      .f-ico {
        position: absolute;
        left: 11px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 13px;
        color: #8c7564;
      }
      .sc-inp {
        width: 100%;
        box-sizing: border-box;
        height: 40px;
        border: 1px solid #e2d6ca;
        border-radius: 10px;
        padding: 0 12px;
        font-size: 13px;
        background: #faf7f4;
        color: #2d1b10;
        font-family: inherit;
        outline: none;
      }
      textarea.sc-inp {
        height: auto;
        padding: 10px 12px;
      }
      .sc-inp.pl-32 {
        padding-left: 34px;
      }
      .filter-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid #f3ece4;
      }
      .filter-active-note {
        font-size: 12.5px;
        color: #7d6b5d;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .filter-btns {
        display: flex;
        gap: 8px;
      }

      .table-wrapper-card {
        overflow: hidden;
      }
      .table-card-head {
        padding: 18px 22px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f0e8df;
      }
      .tch-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .tch-left h2 {
        font-family: 'Playfair Display', serif;
        font-size: 20px;
        margin: 0;
      }
      .count-pill {
        background: #f5ebe0;
        color: #6b4423;
        font-size: 12px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 20px;
      }
      .tch-right {
        font-size: 12px;
        color: #7d6b5d;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #5c3a21;
        display: inline-block;
      }

      .table-scroll {
        overflow-x: auto;
      }
      .sc-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .sc-table th {
        background: #faf7f4;
        color: #8c7564;
        font-size: 11px;
        font-weight: 700;
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid #efe7de;
        white-space: nowrap;
      }
      .sc-table td {
        padding: 15px 16px;
        border-bottom: 1px solid #f5efe8;
        vertical-align: middle;
      }
      .sc-table tbody tr:hover td {
        background: #fcf9f6;
      }
      .order-code {
        font-weight: 700;
        color: #6b4423;
        font-size: 13.5px;
      }
      .order-code.strike {
        text-decoration: line-through;
        color: #9ca3af;
      }
      .cust-name {
        font-weight: 700;
        color: #2d1b10;
      }
      .sub-txt {
        font-size: 11.5px;
        color: #8c7564;
        margin-top: 2px;
      }
      .cancel-reason-line {
        color: #b91c1c;
        max-width: 260px;
      }
      .price-bold {
        font-weight: 700;
        color: #2d1b10;
        font-size: 13.5px;
      }
      .refund-note {
        color: #15803d;
        font-weight: 600;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        padding: 4px 11px;
        border-radius: 20px;
        font-size: 11.5px;
        font-weight: 700;
        background: #f5ece3;
        color: #6b4423;
        white-space: nowrap;
      }
      .status-pill.lg {
        padding: 5px 14px;
        font-size: 12.5px;
      }
      .sp-pending_payment,
      .sp-pending_approval {
        background: #fef3c7;
        color: #b45309;
      }
      .sp-accepted,
      .sp-baking {
        background: #fde8d7;
        color: #9a3412;
      }
      .sp-delivering {
        background: #e0f2fe;
        color: #0369a1;
      }
      .sp-delivered,
      .sp-done {
        background: #dcfce7;
        color: #15803d;
      }
      .sp-cancelled {
        background: #fee2e2;
        color: #b91c1c;
      }

      .warn-sub {
        font-size: 11px;
        font-weight: 700;
        margin-top: 4px;
      }
      .warn-sub.urgent {
        color: #d97706;
      }
      .warn-sub.cancel {
        color: #dc2626;
      }

      .row-actions-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: flex-end;
        max-width: 340px;
        margin-left: auto;
      }
      .act-btn {
        border: 1px solid #dfd3c7;
        background: #fff;
        color: #3d2314;
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .act-btn.view {
        background: #faf7f4;
      }
      .act-btn.view:hover {
        background: #5c3a21;
        color: #fff;
        border-color: #5c3a21;
      }
      .act-btn.ok {
        background: #dcfce7;
        color: #15803d;
        border-color: #bbf7d0;
      }
      .act-btn.bad {
        background: #fee2e2;
        color: #b91c1c;
        border-color: #fecaca;
      }
      .act-btn.warn {
        background: #fef3c7;
        color: #b45309;
        border-color: #fde68a;
      }
      .act-btn.neutral {
        background: #f5ece3;
        color: #5c3a21;
        border-color: #e5d5c5;
      }
      .act-btn.brown {
        background: #5c3a21;
        color: #fff;
        border-color: #5c3a21;
      }

      .state-empty {
        padding: 44px 20px;
        text-align: center;
        color: #7d6b5d;
        font-size: 14px;
      }

      /* FRAME 03 DETAIL STYLES */
      .f3-header-wrap {
        margin-bottom: 16px;
      }
      .f3-breadcrumb-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .btn-back-list {
        border: none;
        background: transparent;
        color: #6b4423;
        font-size: 13.5px;
        font-weight: 700;
        cursor: pointer;
        padding: 4px 0;
      }
      .slash {
        color: #c4b5a6;
      }
      .detail-order-title {
        font-family: 'Playfair Display', serif;
        font-size: 24px;
        margin: 0;
        color: #2d1b10;
      }
      .detail-order-title span {
        color: #8c6239;
      }
      .f3-warn-pill {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
        font-size: 11.5px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 20px;
      }
      .f3-sub-actions {
        margin-top: 10px;
        display: flex;
        gap: 10px;
      }
      .btn-print-guest {
        border: 1px solid #e2d6ca;
        background: #f5ece3;
        color: #4a2c18;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .f3-cancel-banner {
        background: #fbf4ee;
        border: 1px solid #ebd9c8;
        border-radius: 14px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
      }
      .f3-cb-ico {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #6b4423;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .f3-cb-top {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        font-size: 13.5px;
      }
      .f3-cb-badge {
        background: #6b4423;
        color: #fff;
        font-size: 10.5px;
        font-weight: 700;
        padding: 2px 9px;
        border-radius: 6px;
      }
      .f3-cb-reason {
        font-size: 12.5px;
        color: #6b584c;
        margin-top: 3px;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: 1.55fr 1fr;
        gap: 20px;
        align-items: start;
      }
      .d-card {
        padding: 20px 22px;
      }
      .d-card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f3ece4;
      }
      .d-card-title {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #4a2c18;
      }
      .ticket-tag {
        background: #f5ece3;
        color: #6b4423;
        font-size: 11.5px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 8px;
      }

      .prod-item-box {
        display: flex;
        gap: 16px;
        padding-bottom: 16px;
        margin-bottom: 16px;
        border-bottom: 1px dashed #eae0d5;
      }
      .prod-thumb {
        position: relative;
        width: 135px;
        height: 135px;
        border-radius: 14px;
        overflow: hidden;
        background: #f7f1eb;
        flex-shrink: 0;
        border: 1px solid #eadfd3;
      }
      .prod-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .thumb-badge {
        position: absolute;
        bottom: 6px;
        left: 6px;
        background: rgba(45, 27, 16, 0.78);
        color: #fff;
        font-size: 10px;
        padding: 2px 7px;
        border-radius: 6px;
      }
      .prod-info {
        flex: 1;
      }
      .pi-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .pi-name {
        font-family: 'Playfair Display', serif;
        font-size: 18px;
        margin: 0;
      }
      .pi-sku {
        font-size: 11.5px;
        color: #8c7564;
        margin-top: 2px;
      }
      .pi-price {
        text-align: right;
      }
      .pi-price strong {
        display: block;
        font-size: 16px;
      }
      .pi-price span {
        font-size: 11.5px;
        color: #8c7564;
      }

      .f3-specs-6 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 18px;
        margin-top: 12px;
        font-size: 12px;
      }
      .f3-sp-item {
        display: flex;
        justify-content: space-between;
        gap: 6px;
        padding-bottom: 4px;
        border-bottom: 1px dashed #f0e8df;
      }
      .f3-sp-item span {
        color: #8c7564;
      }
      .f3-sp-item strong {
        color: #2d1b10;
        text-align: right;
      }

      .cake-message-box {
        margin-top: 12px;
        background: #fdf6ee;
        border: 1px solid #f0dfc8;
        border-radius: 12px;
        padding: 10px 14px;
      }
      .cmb-lbl {
        font-size: 10.5px;
        font-weight: 700;
        color: #8c6239;
      }
      .cmb-text {
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: 15px;
        font-weight: 700;
        color: #3d2314;
        margin-top: 3px;
      }

      .f3-addons-list {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .f3-addon-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #4a2c18;
      }
      .f3-check {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #efe4d8;
        color: #6b4423;
        font-size: 10px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .proof-photo-bar {
        margin-top: 16px;
        background: #faf7f4;
        border: 1px solid #eae0d5;
        border-radius: 12px;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .ppb-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ppb-ico-box {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #efe4d8;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .photo-preview-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 12px;
      }
      .pps-item {
        position: relative;
        width: 112px;
        height: 112px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #dfd3c7;
      }
      .pps-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .pps-tag {
        position: absolute;
        bottom: 4px;
        left: 4px;
        background: rgba(45, 27, 16, 0.8);
        color: #fff;
        font-size: 9.5px;
        padding: 2px 6px;
        border-radius: 5px;
      }
      .pps-del {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: none;
        background: rgba(45, 27, 16, 0.8);
        color: #fff;
        font-size: 11px;
        cursor: pointer;
      }

      .timeline-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .tl-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .tl-dot {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .tl-item.active .tl-dot {
        background: #fef3c7;
        color: #b45309;
      }
      .tl-item.warn .tl-dot,
      .tl-item.danger .tl-dot {
        background: #fee2e2;
        color: #b91c1c;
      }
      .tl-content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
        flex-wrap: wrap;
        font-size: 13px;
      }
      .tl-content span {
        font-size: 11.5px;
        color: #8c7564;
      }

      .f3-member-pill {
        background: #f5ece3;
        color: #6b4423;
        font-size: 10.5px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 12px;
      }
      .f3-cust-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .cust-name-lg {
        font-size: 16px;
        font-weight: 700;
      }
      .cust-phone {
        font-size: 13px;
        color: #6b584c;
        margin-top: 3px;
      }
      .f3-call-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #faf7f4;
        border: 1px solid #e5d9cd;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        font-size: 13px;
      }
      .delivery-box {
        margin-top: 14px;
        background: #faf7f4;
        border-radius: 12px;
        padding: 12px 14px;
      }
      .db-badge {
        font-size: 10.5px;
        font-weight: 800;
        color: #8c6239;
      }
      .db-addr {
        font-size: 13px;
        font-weight: 600;
        margin-top: 4px;
        line-height: 1.45;
      }
      .slot-two-cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 12px;
      }
      .stc-box {
        background: #faf7f4;
        border-radius: 10px;
        padding: 10px 12px;
      }
      .stc-box span {
        display: block;
        font-size: 11px;
        color: #8c7564;
      }
      .stc-box strong {
        display: block;
        font-size: 13px;
        margin-top: 2px;
      }
      .f3-cust-note {
        margin-top: 12px;
        background: #fdf8f3;
        border: 1px solid #efe4d8;
        border-radius: 10px;
        padding: 10px 12px;
      }
      .f3-cust-note small {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #8c6239;
      }
      .f3-cust-note p {
        margin: 4px 0 0;
        font-size: 12px;
        font-style: italic;
        color: #4a2c18;
      }

      .paid-tag {
        background: #dcfce7;
        color: #15803d;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 20px;
      }
      .paid-tag.unpaid {
        background: #fef3c7;
        color: #b45309;
      }
      .f3-vietqr-box {
        background: #faf7f4;
        border: 1px solid #eae0d5;
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 12px;
      }
      .f3-auto-reconcile {
        background: #fff;
        border: 1px solid #e2d6ca;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 10.5px;
        font-weight: 700;
        color: #5c3a21;
      }
      .f3-voucher-code {
        background: #f5ece3;
        color: #6b4423;
        font-size: 10.5px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 700;
      }
      .pay-rows {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 13px;
      }
      .pr-line {
        display: flex;
        justify-content: space-between;
        color: #5e4b3e;
      }
      .pr-line.discount strong {
        color: #15803d;
      }
      .pr-total {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-top: 10px;
        margin-top: 4px;
        border-top: 1px dashed #e5d9cd;
      }
      .pr-total span {
        font-size: 11.5px;
        font-weight: 800;
        color: #4a2c18;
      }
      .pr-total strong {
        font-family: 'Playfair Display', serif;
        font-size: 20px;
      }

      .f3-progress-meta {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #7d6b5d;
        margin-bottom: 8px;
      }
      .f3-progress-meta strong {
        color: #2d1b10;
      }
      .f3-progress-bars {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }
      .f3-pb-seg {
        height: 6px;
        border-radius: 6px;
        background: #efe7de;
      }
      .f3-pb-seg.on {
        background: #6b4423;
      }
      .f3-progress-labels {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #9c8b7e;
        margin-top: 6px;
      }
      .f3-progress-labels span.active {
        color: #2d1b10;
        font-weight: 700;
      }
      .action-stack {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .danger-zone-btns {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 6px;
        padding-top: 12px;
        border-top: 1px solid #f3ece4;
      }

      /* MODALS */
      .modal-bg {
        position: fixed;
        inset: 0;
        background: rgba(28, 17, 10, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        padding: 16px;
      }
      .modal-box {
        position: relative;
        background: #fff;
        border-radius: 20px;
        width: 100%;
        padding: 26px 28px;
        max-height: 90vh;
        overflow-y: auto;
      }
      .modal-box.sm {
        max-width: 440px;
      }
      .modal-box.md {
        max-width: 560px;
      }
      .modal-box.center {
        text-align: center;
      }
      .modal-top-stripe {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        border-radius: 20px 20px 0 0;
      }
      .modal-top-stripe.brown {
        background: #6b4423;
      }
      .modal-top-stripe.danger {
        background: #991b1b;
      }
      .x-close {
        position: absolute;
        top: 16px;
        right: 18px;
        border: none;
        background: transparent;
        font-size: 18px;
        cursor: pointer;
      }
      .modal-title-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .modal-title-row h2 {
        font-family: 'Playfair Display', serif;
        font-size: 21px;
        margin: 0;
      }
      .m-badge-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 700;
      }
      .m-badge-icon.brown {
        background: #f5ece3;
        color: #6b4423;
      }
      .m-badge-icon.danger {
        background: #fee2e2;
        color: #991b1b;
      }
      .modal-info-cream {
        background: #faf6f2;
        border: 1px solid #eae0d5;
        border-radius: 12px;
        padding: 14px 16px;
        font-size: 13px;
      }
      .modal-alert-red {
        background: #fff5f5;
        border: 1px solid #fecaca;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 12.5px;
        color: #7f1d1d;
      }
      .sec-field {
        margin-top: 14px;
      }
      .sf-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .req-italic {
        font-size: 11px;
        font-style: italic;
        color: #991b1b;
      }
      .quick-presets {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 8px;
        font-size: 11.5px;
      }
      .qp-chip {
        border: 1px solid #e2d6ca;
        background: #faf7f4;
        padding: 4px 10px;
        border-radius: 16px;
        font-size: 11px;
        cursor: pointer;
      }
      .err-line {
        color: #b91c1c;
        font-size: 12px;
        font-weight: 600;
        margin-top: 10px;
      }
      .modal-foot {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 14px;
        border-top: 1px solid #f0e8df;
      }

      /* PRODUCTION TICKET MODAL */
      .modal-box.pt-modal {
        max-width: 780px;
        padding: 24px 28px;
        background: #fdfbf9;
      }
      .pt-head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
      }
      .pt-head-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: #f3e8dc;
        color: #5c3a21;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }
      .pt-head h2 {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        color: #2d1b10;
      }
      .pt-head p {
        margin: 2px 0 0;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: #8c7564;
      }
      .pt-meta-wrap {
        background: #f6efe8;
        border: 1px solid #eae0d5;
        border-radius: 12px;
        padding: 10px 14px;
        margin-bottom: 16px;
      }
      .pt-meta-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        align-items: center;
        font-size: 12px;
        color: #5e4b3e;
      }
      .txt-brown {
        color: #6b4423;
      }
      .pt-count-tag {
        background: #eadbc9;
        color: #4a2c18;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 6px;
        margin-left: 4px;
      }
      .pt-oven-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        background: #5c3a21;
        color: #fff;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 7px;
      }
      .pt-sec-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .pt-sec-title {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.05em;
        color: #3d2314;
      }
      .pt-sec-chip {
        background: #f3e8dc;
        color: #6b4423;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 12px;
      }
      .pt-items-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .pt-item-card {
        background: #fff;
        border: 1px solid #e6d9cc;
        border-radius: 16px;
        padding: 16px 18px;
      }
      .pt-ic-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        padding-bottom: 12px;
        border-bottom: 1px solid #f2eae1;
      }
      .pt-ic-name-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pt-num-badge {
        background: #5c3a21;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 6px;
      }
      .pt-ic-name-row strong {
        font-family: 'Playfair Display', serif;
        font-size: 17px;
        color: #2d1b10;
      }
      .pt-sku-chip {
        background: #f5ece3;
        color: #8c6239;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
      }
      .pt-ic-badges {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pt-qty-dark {
        background: #4a2c18;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 8px;
      }
      .pt-tier-pill {
        background: #f5ece3;
        color: #5c3a21;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 8px;
      }
      .pt-4-specs {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        background: #faf6f2;
        border-radius: 10px;
        padding: 10px 12px;
        margin: 12px 0;
        text-align: center;
      }
      .pt-4s-cell span {
        display: block;
        font-size: 10.5px;
        color: #8c7564;
      }
      .pt-4s-cell strong {
        display: block;
        font-family: 'Playfair Display', serif;
        font-size: 14px;
        color: #2d1b10;
        margin-top: 2px;
      }
      .pt-2col-tech {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }
      .pt-tech-col {
        background: #faf7f4;
        border: 1px solid #efe7de;
        border-radius: 12px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pt-tc-lbl {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        color: #8c7564;
        margin-bottom: 3px;
      }
      .pt-tc-head-inline {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
      }
      .pt-color-dot-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #fff;
        border: 1px solid #e5d9cd;
        padding: 1px 7px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 700;
        color: #5c3a21;
      }
      .pt-cdot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f4a7b9;
        display: inline-block;
      }
      .pt-tc-block strong {
        display: block;
        font-size: 12.5px;
        color: #2d1b10;
      }
      .pt-tc-block p {
        margin: 2px 0 0;
        font-size: 11px;
        color: #7d6b5d;
        line-height: 1.4;
      }
      .pt-msg-box {
        background: #fdf6ee;
        border: 1px solid #eedbc5;
        border-radius: 12px;
        padding: 10px 14px;
        margin-bottom: 10px;
      }
      .pt-msg-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10.5px;
        font-weight: 800;
        color: #6b4423;
      }
      .pt-msg-tag {
        background: #fff;
        border: 1px solid #e5d5c5;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
      }
      .pt-msg-val {
        background: #fff;
        border-radius: 8px;
        padding: 8px 12px;
        margin: 7px 0 5px;
        text-align: center;
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: 15px;
        font-weight: 700;
        color: #2d1b10;
      }
      .pt-msg-note {
        font-size: 10.5px;
        font-style: italic;
        color: #8c7564;
      }
      .pt-chef-note {
        background: #f5efe8;
        border-radius: 10px;
        padding: 10px 14px;
      }
      .pt-cn-lbl {
        font-size: 10.5px;
        font-weight: 800;
        color: #5c3a21;
      }
      .pt-chef-note p {
        margin: 4px 0 0;
        font-size: 11.5px;
        color: #4a2c18;
        line-height: 1.45;
      }
      .pt-acc-card {
        background: #fff;
        border: 1px solid #e6d9cc;
        border-radius: 14px;
        padding: 14px 16px;
        margin-top: 14px;
      }
      .pt-acc-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 11.5px;
        font-weight: 800;
        color: #3d2314;
        margin-bottom: 10px;
      }
      .pt-acc-total {
        background: #f5ece3;
        color: #6b4423;
        font-size: 10.5px;
        padding: 2px 9px;
        border-radius: 10px;
      }
      .pt-acc-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .pt-acc-item {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        font-size: 11.5px;
        color: #3d2314;
        background: #faf7f4;
        padding: 8px 10px;
        border-radius: 8px;
      }
      .pt-acc-item input {
        accent-color: #5c3a21;
        margin-top: 2px;
      }
      .pt-acc-foot {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px dashed #eae0d5;
        font-size: 11px;
        font-style: italic;
        color: #7d6b5d;
        text-align: center;
      }
      .pt-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid #eae0d5;
      }
      .pt-footer-right {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .success-circle {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #fde8d7;
        color: #6b4423;
        font-size: 24px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 14px;
      }
      .success-serif {
        font-family: 'Playfair Display', serif;
        font-size: 23px;
        margin: 0 0 8px;
      }
      .success-sub {
        font-size: 13px;
        color: #6b584c;
      }

      @media (max-width: 1024px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 680px) {
        .pt-4-specs,
        .pt-2col-tech,
        .pt-acc-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminOrderFullComponent implements OnInit {
  private adminBase = `${environment.apiUrl}/admin/orders`;
  private serverOrigin = environment.apiUrl.replace(/\/api\/?$/, '');

  quickTab: 'all' | 'pending' | 'baking' | 'urgent' | 'cancel_req' | 'refund' = 'all';
  keyword = '';
  statusFilter = '';

  allOrdersCache: any[] = [];
  orders: any[] = [];
  loading = false;
  errorMsg = '';
  notice = '';

  selectedOrder: any = null;
  nextStatus = 'baking';
  statusReason = '';
  photoIdsInput = '';
  uploadingPhoto = false;
  uploadedPhotoPreviews: string[] = [];
  ticketInfo: any = null;

  acceptConfirmOrder: any = null;
  ticketModalOpen = false;
  successPopupData: { code: string; statusLabel: string } | null = null;

  refundOrder: any = null;
  refundAmountInput = 0;
  refundAdjustReason = '';

  rejectTargetOrder: any = null;
  rejectReasonInput = '';
  rejectPresetReasons = [
    'Khung giờ giao đã kín lịch làm bánh tươi',
    'Hết nguyên liệu đặc thù cho mẫu bánh này',
    'Không liên hệ được số điện thoại người nhận',
  ];

  rejectCancelReqOrder: any = null;
  decisionReasonInput = '';

  specialCancelOrderTarget: any = null;
  specialCancelReasonInput = '';

  actionSubmitting = false;
  actionModalError = '';

  private fallbackCakeSvg =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">' +
        '<rect width="320" height="320" fill="#F8EFE6"/>' +
        '<ellipse cx="160" cy="235" rx="95" ry="18" fill="#E6D5C3"/>' +
        '<rect x="85" y="155" width="150" height="72" rx="14" fill="#FFFDF9" stroke="#D9C3AE" stroke-width="3"/>' +
        '<path d="M85 182 Q110 198 135 182 T185 182 T235 182 L235 155 Q160 148 85 155 Z" fill="#F4A7B9"/>' +
        '<circle cx="130" cy="145" r="10" fill="#DC2626"/>' +
        '<circle cx="160" cy="142" r="11" fill="#DC2626"/>' +
        '<circle cx="190" cy="145" r="10" fill="#DC2626"/>' +
        '<text x="160" y="275" font-family="sans-serif" font-size="13" font-weight="bold" fill="#6B4423" text-anchor="middle">SWEETCAKE ARTISAN</text>' +
        '</svg>',
    );

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadOrders();
    }
  }

  get countPendingApproval(): number {
    return this.allOrdersCache.filter((o) => o.status === 'pending_approval').length;
  }

  get countBaking(): number {
    return this.allOrdersCache.filter((o) => ['accepted', 'baking'].includes(o.status)).length;
  }

  get countCancelOrRefund(): number {
    return this.allOrdersCache.filter(
      (o) => o.cancelRequest?.status === 'pending' || o.refund?.status === 'pending',
    ).length;
  }

  getQuickTabLabel(): string {
    const map: Record<string, string> = {
      all: 'Tất cả đơn hàng',
      pending: 'Chờ duyệt đơn',
      baking: 'Đang làm bánh',
      urgent: 'Cần làm sớm',
      cancel_req: 'Có yêu cầu hủy',
      refund: 'Hoàn tiền / Quá 3 ngày',
    };
    return map[this.quickTab] || 'Tất cả đơn hàng';
  }

  setQuickTab(tab: 'all' | 'pending' | 'baking' | 'urgent' | 'cancel_req' | 'refund') {
    this.quickTab = tab;
    this.applyClientFilters();
  }

  resetFilters() {
    this.quickTab = 'all';
    this.keyword = '';
    this.statusFilter = '';
    this.applyClientFilters();
  }

  loadOrders() {
    this.loading = true;
    this.errorMsg = '';

    this.http.get(this.adminBase, { params: { limit: 100 } }).subscribe({
      next: (res: any) => {
        const list = res.items || res.orders || res.data || (Array.isArray(res) ? res : []);
        this.allOrdersCache = list;
        this.applyClientFilters();
        if (this.selectedOrder) {
          const fresh = list.find((x: any) => x._id === this.selectedOrder._id);
          if (fresh) this.openOrderDetail(fresh);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Không tải được danh sách đơn Admin.';
        this.cdr.detectChanges();
      },
    });
  }

  applyClientFilters() {
    let list = [...this.allOrdersCache];
    if (this.quickTab === 'pending') list = list.filter((o) => o.status === 'pending_approval');
    else if (this.quickTab === 'baking')
      list = list.filter((o) => ['accepted', 'baking'].includes(o.status));
    else if (this.quickTab === 'urgent') list = list.filter((o) => this.isUrgent(o));
    else if (this.quickTab === 'cancel_req')
      list = list.filter((o) => o.cancelRequest?.status === 'pending');
    else if (this.quickTab === 'refund')
      list = list.filter((o) => o.refund?.status === 'pending' || o.refund?.status === 'processed');

    if (this.statusFilter) list = list.filter((o) => o.status === this.statusFilter);

    if (this.keyword.trim()) {
      const kw = this.keyword.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.code || '').toLowerCase().includes(kw) ||
          (o.receiver?.fullName || o.customer?.fullName || '').toLowerCase().includes(kw) ||
          (o.receiver?.phone || o.customer?.phone || '').toLowerCase().includes(kw),
      );
    }
    this.orders = list;
  }

  isUrgent(o: any): boolean {
    if (!o?.receiveDate || ['done', 'cancelled'].includes(o.status)) return false;
    return (new Date(o.receiveDate).getTime() - Date.now()) / (1000 * 60 * 60) <= 24;
  }

  isRefundOverdue(o: any): boolean {
    if (typeof o?.isRefundOverdue === 'boolean') return o.isRefundOverdue;
    if (o?.refund?.status !== 'pending') return false;
    const baseTime = new Date(
      o.refund?.dueAt || o.cancellation?.at || o.updatedAt || Date.now(),
    ).getTime();
    return o.refund?.dueAt
      ? Date.now() > baseTime
      : (Date.now() - baseTime) / (1000 * 60 * 60 * 24) > 3;
  }

  isDeliveryOrder(o: any): boolean {
    const t = (o?.deliveryType || o?.shippingMethod || '').toLowerCase();
    return t === 'delivery' || t === 'shipping' || (!!o?.receiver?.address && !o?.branchName);
  }

  getStepIndex(status: string): number {
    const map: Record<string, number> = {
      pending_payment: 1,
      pending_approval: 1,
      accepted: 2,
      baking: 3,
      delivering: 4,
      delivered: 5,
      done: 5,
    };
    return map[status] || 1;
  }

  getTotalCakeQty(o: any): number {
    if (!Array.isArray(o?.items) || o.items.length === 0) return 1;
    return o.items.reduce((sum: number, it: any) => sum + Number(it.qty || it.quantity || 1), 0);
  }

  getOvenDeadline(o: any): string {
    if (o?.slotLabel) {
      const startPart = o.slotLabel.split('-')[0]?.trim();
      if (startPart) return `${startPart} theo lịch hẹn`;
    }
    return '14:00 hôm nay';
  }

  getItemImage(item: any): string {
    const raw = item?.image || item?.thumbnail || item?.product?.image || item?.product?.thumbnail;
    if (!raw) return this.fallbackCakeSvg;
    if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
    return `${this.serverOrigin}${raw.startsWith('/') ? '' : '/'}${raw}`;
  }

  openOrderDetail(o: any) {
    this.selectedOrder = o;
    this.nextStatus = o.status || 'baking';
    this.statusReason = '';
    this.photoIdsInput = Array.isArray(o.photoIds) ? o.photoIds.join(', ') : '';

    const rawPhotos = o.photos || o.proofPhotos || o.realPhotos || o.images || [];
    let resolvedUrls: string[] = Array.isArray(rawPhotos)
      ? rawPhotos
          .map((p: any) => {
            if (typeof p === 'string') {
              return p.startsWith('http') || p.startsWith('data:')
                ? p
                : `${environment.apiUrl}/images/${p}`;
            }
            return (
              p?.url ||
              p?.secure_url ||
              p?.path ||
              (p?._id ? `${environment.apiUrl}/images/${p._id}` : '')
            );
          })
          .filter(Boolean)
      : [];

    if (resolvedUrls.length === 0 && Array.isArray(o.photoIds) && o.photoIds.length > 0) {
      resolvedUrls = o.photoIds.map((id: string) =>
        id.startsWith('http') || id.startsWith('data:') ? id : `${environment.apiUrl}/images/${id}`,
      );
    }

    if (resolvedUrls.length === 0 && ['delivered', 'done'].includes(o.status)) {
      resolvedUrls = [this.getItemImage(o.items?.[0])];
    }

    this.uploadedPhotoPreviews = resolvedUrls;
    this.ticketInfo = null;
  }

  backToList() {
    this.selectedOrder = null;
  }

  onLocalPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.selectedOrder?._id) return;

    const files = Array.from(input.files);
    this.uploadingPhoto = true;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.uploadedPhotoPreviews = [...this.uploadedPhotoPreviews, reader.result];
          this.cdr.detectChanges();
        }
      };
      reader.readAsDataURL(file);
    });

    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    if (files.length === 1) formData.append('image', files[0]);

    this.http.post(`${environment.apiUrl}/images/upload`, formData).subscribe({
      next: (res: any) => {
        this.uploadingPhoto = false;
        const uploadedList = res?.data || res?.images || (Array.isArray(res) ? res : [res]);
        const newIds = uploadedList.map((item: any) => item?._id || item?.id).filter(Boolean);
        const existingIds = this.photoIdsInput
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        const mergedIds = Array.from(new Set([...existingIds, ...newIds]));

        this.photoIdsInput = mergedIds.join(', ');
        if (mergedIds.length > 0) {
          this.savePhotos();
        } else {
          this.doneMsg('Đã tải ảnh bánh thực tế từ máy tính.');
        }
        input.value = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.uploadingPhoto = false;
        this.doneMsg('Đã hiển thị ảnh bánh thực tế từ máy tính.');
        input.value = '';
        this.cdr.detectChanges();
      },
    });
  }

  removePreviewPhoto(index: number) {
    this.uploadedPhotoPreviews = this.uploadedPhotoPreviews.filter((_, i) => i !== index);
  }

  // CHỈ IN DUY NHẤT PHIẾU LÀM BÁNH TRÊN KHỔ A4 SẠCH SẼ
  printTicketNow() {
    const ticketEl = document.getElementById('printable-production-ticket');
    if (!ticketEl) {
      window.print();
      return;
    }

    const clone = ticketEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.x-close, .pt-footer').forEach((el) => el.remove());

    const styles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.innerHTML)
      .join('\n');

    const printWin = window.open('', '_blank', 'width=860,height=960');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.open();
    printWin.document.write(`
      <!doctype html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Phiếu Làm Bánh - #${this.selectedOrder?.code || ''}</title>
        <style>
          ${styles}
          @page { size: A4 portrait; margin: 10mm; }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-production-ticket {
            position: static !important;
            max-width: 100% !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .pt-item-card, .pt-acc-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              window.close();
            }, 250);
          };
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  openAcceptConfirmModal(o: any) {
    this.acceptConfirmOrder = o;
  }

  confirmAcceptOrder() {
    if (!this.acceptConfirmOrder?._id) return;
    const target = this.acceptConfirmOrder;
    this.http.post(`${this.adminBase}/${target._id}/accept`, {}).subscribe({
      next: () => {
        this.acceptConfirmOrder = null;
        this.successPopupData = { code: target.code, statusLabel: 'Đã tiếp nhận' };
        this.loadOrders();
      },
      error: (err: any) => alert(err.error?.message || 'Không thể tiếp nhận đơn'),
    });
  }

  openRejectModal(o: any) {
    this.rejectTargetOrder = o;
    this.rejectReasonInput = '';
    this.actionModalError = '';
  }

  submitRejectOrder() {
    if (!this.rejectReasonInput.trim()) {
      this.actionModalError = 'Vui lòng chọn hoặc nhập lý do từ chối đơn hàng.';
      return;
    }
    this.actionSubmitting = true;
    this.http
      .post(`${this.adminBase}/${this.rejectTargetOrder._id}/reject`, {
        reason: this.rejectReasonInput.trim(),
        cause: 'shop_fault',
      })
      .subscribe({
        next: (updatedOrder: any) => {
          this.actionSubmitting = false;
          const code = this.rejectTargetOrder.code;
          this.rejectTargetOrder = null;
          this.doneMsg(`Đã từ chối / hủy đơn #${code}`);
          this.loadOrders();
          if (updatedOrder?.refund?.status === 'pending') this.openRefundModal(updatedOrder);
        },
        error: (err: any) => {
          this.actionSubmitting = false;
          this.actionModalError = err.error?.message || 'Không thể từ chối đơn hàng.';
        },
      });
  }

  decideCancel(o: any, decision: 'accepted' | 'rejected') {
    this.http
      .post(`${this.adminBase}/${o._id}/cancel-request/decision`, { decision, decisionReason: '' })
      .subscribe({
        next: (updatedOrder: any) => {
          this.doneMsg(`Đã duyệt hủy đơn #${o.code}`);
          this.loadOrders();
          if (updatedOrder?.refund?.status === 'pending') this.openRefundModal(updatedOrder);
        },
        error: (err: any) => alert(err.error?.message || 'Lỗi xử lý yêu cầu hủy'),
      });
  }

  openRejectCancelReqModal(o: any) {
    this.rejectCancelReqOrder = o;
    this.decisionReasonInput = '';
    this.actionModalError = '';
  }

  submitRejectCancelReq() {
    if (!this.decisionReasonInput.trim()) {
      this.actionModalError = 'Vui lòng nhập lý do từ chối yêu cầu hủy.';
      return;
    }
    this.actionSubmitting = true;
    this.http
      .post(`${this.adminBase}/${this.rejectCancelReqOrder._id}/cancel-request/decision`, {
        decision: 'rejected',
        decisionReason: this.decisionReasonInput.trim(),
      })
      .subscribe({
        next: () => {
          this.actionSubmitting = false;
          const code = this.rejectCancelReqOrder.code;
          this.rejectCancelReqOrder = null;
          this.doneMsg(`Đã từ chối yêu cầu hủy đơn #${code}`);
          this.loadOrders();
        },
        error: (err: any) => {
          this.actionSubmitting = false;
          this.actionModalError = err.error?.message || 'Lỗi xử lý từ chối yêu cầu hủy.';
        },
      });
  }

  openSpecialCancelModal(o: any) {
    this.specialCancelOrderTarget = o;
    this.specialCancelReasonInput = '';
    this.actionModalError = '';
  }

  submitSpecialCancel() {
    if (!this.specialCancelReasonInput.trim()) {
      this.actionModalError = 'Vui lòng nhập lý do hủy đặc biệt.';
      return;
    }
    this.actionSubmitting = true;
    this.http
      .post(`${this.adminBase}/${this.specialCancelOrderTarget._id}/special-cancel`, {
        reason: this.specialCancelReasonInput.trim(),
        cause: 'shop_fault',
      })
      .subscribe({
        next: (updatedOrder: any) => {
          this.actionSubmitting = false;
          const code = this.specialCancelOrderTarget.code;
          this.specialCancelOrderTarget = null;
          this.doneMsg(`Đã hủy đặc biệt (hoàn 100%) #${code}`);
          this.loadOrders();
          if (updatedOrder?.refund?.status === 'pending') this.openRefundModal(updatedOrder);
        },
        error: (err: any) => {
          this.actionSubmitting = false;
          this.actionModalError = err.error?.message || 'Lỗi hủy đặc biệt.';
        },
      });
  }

  closeActionModal() {
    if (this.actionSubmitting) return;
    this.rejectTargetOrder = null;
    this.rejectCancelReqOrder = null;
    this.specialCancelOrderTarget = null;
    this.actionModalError = '';
  }

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
    this.http
      .post(`${this.adminBase}/${this.refundOrder._id}/refund/confirm`, {
        amount: Number(this.refundAmountInput),
        adjustReason: this.refundAdjustReason.trim(),
      })
      .subscribe({
        next: () => {
          this.doneMsg(
            `Đã xác nhận hoàn ${Number(this.refundAmountInput).toLocaleString()}đ cho đơn #${this.refundOrder.code}`,
          );
          this.refundOrder = null;
          this.loadOrders();
        },
        error: (err: any) => alert(err.error?.message || 'Lỗi xác nhận hoàn tiền'),
      });
  }

  quickAdvanceStatus(targetStatus: string) {
    this.nextStatus = targetStatus;
    this.changeStatus();
  }

  changeStatus() {
    if (!this.selectedOrder?._id) return;
    const current = this.selectedOrder;
    this.http
      .patch(`${this.adminBase}/${current._id}/status`, {
        nextStatus: this.nextStatus,
        reason: this.statusReason.trim(),
      })
      .subscribe({
        next: (res: any) => {
          const finalSt = res.status || this.nextStatus;
          this.selectedOrder = { ...this.selectedOrder, status: finalSt };
          if (['delivered', 'done'].includes(finalSt) && this.uploadedPhotoPreviews.length === 0) {
            this.uploadedPhotoPreviews = [this.getItemImage(this.selectedOrder.items?.[0])];
          }
          this.successPopupData = { code: current.code, statusLabel: this.getStatusLabel(finalSt) };
          this.loadOrders();
        },
        error: (err: any) => alert(err.error?.message || 'Không thể đổi trạng thái'),
      });
  }

  openTicketModal() {
    this.ticketModalOpen = true;
    if (!this.selectedOrder?._id) return;
    this.http.get(`${this.adminBase}/${this.selectedOrder._id}/production-ticket`).subscribe({
      next: (res: any) => {
        this.ticketInfo = res;
      },
      error: () => {
        this.http
          .post(`${this.adminBase}/${this.selectedOrder._id}/production-ticket`, {})
          .subscribe({
            next: (created: any) => {
              this.ticketInfo = created;
            },
            error: () => {},
          });
      },
    });
  }

  savePhotos() {
    if (!this.selectedOrder?._id) return;
    const photoIds = this.photoIdsInput
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    this.http.put(`${this.adminBase}/${this.selectedOrder._id}/photos`, { photoIds }).subscribe({
      next: () => {
        this.doneMsg('Đã lưu ảnh bánh thực tế.');
        this.loadOrders();
      },
      error: () => {},
    });
  }

  private doneMsg(msg: string) {
    this.notice = msg;
    setTimeout(() => {
      this.notice = '';
      this.cdr.detectChanges();
    }, 3500);
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
      cancelled: 'Đã hủy',
    };
    return m[s] || s;
  }
}
