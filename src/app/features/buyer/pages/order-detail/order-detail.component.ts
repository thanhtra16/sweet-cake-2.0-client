import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="detail-page">
      <div class="page-wrapper" *ngIf="order; else stateTpl">
        <!-- 1. BREADCRUMB -->
        <nav class="breadcrumb">
          <a routerLink="/danh-sach-san-pham">Trang chủ</a>
          <span>/</span>
          <a routerLink="/orders">Tra cứu & Lịch sử</a>
          <span>/</span>
          <strong>Đơn hàng #{{ order.code }}</strong>
        </nav>

        <!-- 2. HEADER ĐƠN HÀNG -->
        <section class="order-top-header">
          <div>
            <div class="meta-pills">
              <span class="pill-tracking">MÃ THEO DÕI TRỰC TUYẾN</span>
              <span class="pill-date">
                <i class="bi bi-calendar3"></i> Ngày đặt:
                {{ order.createdAt | date: 'dd/MM/yyyy — HH:mm' }}
              </span>
            </div>
            <h1>Đơn hàng #{{ order.code }}</h1>
            <p class="workshop-sub">
              Được chế tác thủ công bởi Xưởng bánh nghệ thuật SweetCake Quận 3
            </p>
          </div>

          <div class="top-actions">
            <span class="status-pill-main" [ngClass]="'st-' + order.status">
              ● {{ getStatusLabel(order.status) }}
            </span>
            <button class="btn-print" (click)="printReceipt()">
              <i class="bi bi-printer"></i> In phiếu
            </button>
          </div>
        </section>

        <!-- 3. TIẾN ĐỘ THỰC HIỆN ĐƠN HÀNG (STEPPER NGANG) -->
        <section class="card-block stepper-card">
          <div class="card-head-row">
            <div>
              <span class="eyebrow">HÀNH TRÌNH LÀM BÁNH</span>
              <h2>Tiến độ thực hiện đơn hàng</h2>
            </div>
            <span class="live-badge">
              <i class="bi bi-clock"></i> Cập nhật thực tế: {{ order.updatedAt | date: 'HH:mm' }},
              hôm nay
            </span>
          </div>

          <div class="horizontal-stepper">
            <div
              class="h-step"
              *ngFor="let step of activeStepper; let i = index; let last = last"
              [class.completed]="getStepState(order.status, step.key) === 'completed'"
              [class.current]="getStepState(order.status, step.key) === 'current'"
            >
              <div
                class="step-line-right"
                *ngIf="!last"
                [class.filled]="getStepState(order.status, step.key) === 'completed'"
              ></div>

              <div class="step-circle">
                <i
                  class="bi bi-check-lg"
                  *ngIf="getStepState(order.status, step.key) === 'completed'"
                ></i>
                <i
                  class="bi"
                  [ngClass]="step.icon"
                  *ngIf="getStepState(order.status, step.key) !== 'completed'"
                ></i>
              </div>

              <div class="step-name">{{ step.label }}</div>
              <div class="step-time">{{ getStepTime(step.key) }}</div>
            </div>
          </div>
        </section>

        <!-- 4. ẢNH THỰC TẾ TỪ TIỆM BÁNH -->
        <section class="card-block photo-showcase-card">
          <div class="card-head-row">
            <div>
              <span class="eyebrow"><i class="bi bi-camera"></i> ẢNH THỰC TẾ TỪ TIỆM BÁNH</span>
              <h2>
                {{ isCakeReady ? 'Bánh đã hoàn thành' : 'Mẫu bánh nghệ thuật từ xưởng SweetCake' }}
              </h2>
            </div>
          </div>

          <div class="showcase-grid">
            <div class="showcase-img-wrap">
              <img [src]="showcaseImage" [alt]="primaryItem?.name || 'Bánh SweetCake'" />
              <span class="qc-tag">Mã kiểm duyệt: QA-{{ order.code }}</span>
              <div class="img-overlay-bottom">
                <div>
                  <strong>{{ primaryItem?.name || 'Bánh kem thủ công SweetCake' }}</strong>
                  <small *ngIf="primaryItem?.config?.message"
                    >Chữ viết trên bánh: "{{ primaryItem.config.message }}"</small
                  >
                </div>
                <button class="btn-zoom" (click)="zoomOpen = true">
                  <i class="bi bi-arrows-fullscreen"></i> Phóng to ảnh
                </button>
              </div>
            </div>

            <div class="showcase-note-col">
              <div class="baker-quote-box">
                <div class="bq-title">
                  <i class="bi bi-chat-quote"></i> Lời nhắn từ tiệm bánh SweetCake
                </div>
                <p>
                  "Chiếc bánh của bạn đang được chăm chút tỉ mỉ theo đúng yêu cầu. Tiệm luôn kiểm
                  tra kỹ phần trang trí và các chi tiết trước khi đóng gói. Cảm ơn bạn đã tin tưởng
                  và lựa chọn SweetCake!"
                </p>
              </div>

              <div class="qa-meta-box">
                <div class="qa-row">
                  <span>Người thực hiện:</span>
                  <strong>Nghệ nhân bếp SweetCake</strong>
                </div>
                <div class="qa-row">
                  <span>Thời gian dự kiến:</span>
                  <strong
                    >{{ order.receiveDate | date: 'dd/MM/yyyy' }} ({{ order.slotLabel }})</strong
                  >
                </div>
                <div class="qa-row">
                  <span>Tình trạng:</span>
                  <strong class="ok-txt">{{
                    isCakeReady ? 'Đã kiểm duyệt & sẵn sàng' : 'Đang theo dõi tiến độ'
                  }}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 5. BỐ CỤC 2 CỘT CHI TIẾT -->
        <div class="detail-2col">
          <!-- CỘT TRÁI -->
          <div class="col-left">
            <!-- Sản phẩm & Tùy chỉnh -->
            <section class="card-block">
              <div class="card-head-row">
                <h2>Sản phẩm & Tùy chỉnh</h2>
                <span class="count-pill">{{ order.items?.length || 1 }} sản phẩm thiết kế</span>
              </div>

              <div class="prod-item-card" *ngFor="let item of order.items">
                <div class="pi-top">
                  <img [src]="getItemImage(item)" [alt]="item.name" />
                  <div class="pi-info">
                    <div class="pi-name-row">
                      <h3>{{ item.name }}</h3>
                      <strong class="pi-price">{{ item.lineTotal | number }} đ</strong>
                    </div>
                    <p class="pi-desc">
                      Kích thước: {{ item.config?.size || 'Tiêu chuẩn 18cm' }} (6 - 8 người thưởng
                      thức)
                    </p>
                    <div class="pi-tags">
                      <span>Số lượng: {{ item.qty }}</span>
                      <span>Độ ngọt: {{ item.config?.sweetness || 'Ít ngọt 30%' }}</span>
                      <span>Tươi trong ngày</span>
                    </div>
                  </div>
                </div>

                <!-- Thông số bánh tùy biến theo yêu cầu -->
                <div class="custom-specs-box">
                  <div class="cs-title">
                    <i class="bi bi-sliders"></i> Thông số bánh tùy biến theo yêu cầu
                  </div>

                  <div class="cs-2col">
                    <div>
                      <span class="cs-lbl">Hương vị & Cốt bánh:</span>
                      <strong>{{
                        item.config?.base ||
                          'Cốt bông lan vani truyền thống, kem phô mai ít ngọt thanh dịu.'
                      }}</strong>
                    </div>
                    <div>
                      <span class="cs-lbl">Trang trí bề mặt:</span>
                      <strong>{{
                        item.config?.filling ||
                          'Trái cây tươi tuyển chọn Đà Lạt, lá bạc hà tươi và viền vàng thực phẩm.'
                      }}</strong>
                    </div>
                  </div>

                  <div class="cake-msg-pink">
                    <span class="cmp-lbl">THÔNG ĐIỆP VIẾT TRÊN BÁNH (PHỤ PHÍ: +20.000 Đ)</span>
                    <div class="cmp-text">
                      "{{
                        item.config?.message || 'Happy Birthday — Chúc mừng sinh nhật ngọt ngào'
                      }}"
                    </div>
                    <small>Chất liệu: Chocolate đen nguyên chất Bỉ nung chảy viết thủ công.</small>
                  </div>

                  <div class="free-acc-wrap">
                    <span class="cs-lbl">Phụ kiện đính kèm tiêu chuẩn miễn phí:</span>
                    <div class="acc-grid">
                      <span><i class="bi bi-check2"></i> 1 Dao cắt bánh mica chuyên dụng</span>
                      <span><i class="bi bi-check2"></i> Bộ 6 đĩa & dĩa giấy kraft cao cấp</span>
                      <span><i class="bi bi-check2"></i> 1 Nến pháo hoa sinh nhật cao cấp</span>
                      <span><i class="bi bi-check2"></i> 1 Thiệp chúc mừng viết tay SweetCake</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Hướng dẫn bảo quản & Sử dụng -->
            <section class="card-block">
              <h2><i class="bi bi-info-circle"></i> Hướng dẫn bảo quản & Sử dụng</h2>
              <div class="care-2col">
                <div class="care-box">
                  <h4><i class="bi bi-thermometer-snow"></i> Nhiệt độ bảo quản</h4>
                  <p>
                    Luôn giữ bánh ở 4°C - 6°C trong ngăn mát tủ lạnh. Bánh giữ trọn vẹn hương vị
                    ngon nhất trong vòng 24 - 48 giờ.
                  </p>
                </div>
                <div class="care-box">
                  <h4><i class="bi bi-shield-check"></i> Vận chuyển an toàn</h4>
                  <p>
                    Shipper SweetCake di chuyển bằng thùng lạnh chống nghiêng. Khi di chuyển bằng xe
                    cá nhân, giữ mặt phẳng đế bánh.
                  </p>
                </div>
              </div>
            </section>

            <div class="bottom-print-row">
              <button class="btn-outline-print" (click)="printReceipt()">
                <i class="bi bi-printer"></i> In hóa đơn / Lưu ảnh
              </button>
            </div>
          </div>

          <!-- CỘT PHẢI -->
          <div class="col-right">
            <!-- Thông tin nhận bánh -->
            <section class="card-block">
              <div class="card-head-row">
                <h2>Thông tin nhận bánh</h2>
                <span class="method-badge">
                  {{ order.receiveMethod === 'delivery' ? '🚚 Giao tận nơi' : '🏪 Lấy tại tiệm' }}
                </span>
              </div>

              <div class="info-list">
                <div class="info-item">
                  <i class="bi bi-person"></i>
                  <div>
                    <span class="i-lbl">Người nhận hàng</span>
                    <strong>{{ order.receiver?.fullName }}</strong>
                    <small>{{ order.receiver?.phone }}</small>
                  </div>
                </div>

                <div class="info-item">
                  <i class="bi bi-clock"></i>
                  <div>
                    <span class="i-lbl">{{
                      order.receiveMethod === 'delivery'
                        ? 'Thời gian giao dự kiến'
                        : 'Thời gian nhận bánh tại tiệm'
                    }}</span>
                    <strong
                      >{{ order.slotLabel }} — {{ order.receiveDate | date: 'dd/MM/yyyy' }}</strong
                    >
                    <small>Đúng giờ hẹn như đã đăng ký</small>
                  </div>
                </div>

                <div class="info-item">
                  <i class="bi bi-geo-alt"></i>
                  <div>
                    <span class="i-lbl">{{
                      order.receiveMethod === 'delivery'
                        ? 'Địa chỉ nhận bánh'
                        : 'Địa chỉ cửa hàng nhận bánh'
                    }}</span>
                    <strong *ngIf="order.receiveMethod === 'delivery'; else storeAddr">
                      {{ order.shippingAddress?.detail }}, {{ order.shippingAddress?.ward }},
                      {{ order.shippingAddress?.district }}, {{ order.shippingAddress?.province }}
                    </strong>
                    <ng-template #storeAddr>
                      <strong
                        >SweetCake Quận 3 — 128 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3,
                        TP.HCM</strong
                      >
                    </ng-template>
                  </div>
                </div>

                <div class="note-box">
                  <i class="bi bi-sticky"></i>
                  <div>
                    <span class="i-lbl">{{
                      order.receiveMethod === 'delivery'
                        ? 'Ghi chú giao hàng:'
                        : 'Ghi chú nhận tại tiệm:'
                    }}</span>
                    <p>
                      "{{
                        order.note ||
                          'Gọi trước khi giao 15 phút, bánh bảo quản lạnh xin giao cẩn thận.'
                      }}"
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Chi tiết thanh toán -->
            <section class="card-block">
              <div class="card-head-row">
                <h2>Chi tiết thanh toán</h2>
                <span class="paid-pill" [class.unpaid]="order.payment?.status !== 'paid'">
                  {{ order.payment?.status === 'paid' ? '✓ Đã thanh toán 100%' : 'Chờ thanh toán' }}
                </span>
              </div>

              <div class="pay-meta-box">
                <div class="pm-row">
                  <span>Phương thức:</span>
                  <strong>VietQR Dynamic</strong>
                </div>
                <div class="pm-row">
                  <span>Mã giao dịch:</span>
                  <strong>VQR{{ order.code }}</strong>
                </div>
                <div class="pm-row">
                  <span>Thời gian xác nhận:</span>
                  <strong>{{ order.createdAt | date: 'HH:mm:ss — dd/MM/yyyy' }}</strong>
                </div>
              </div>

              <div class="price-breakdown">
                <div class="pb-row">
                  <span>Tiền bánh ({{ primaryItem?.name || 'Bánh kem' }})</span>
                  <span>{{ order.subtotal | number }} đ</span>
                </div>
                <div class="pb-row">
                  <span>Phụ phí trang trí chữ chocolate</span>
                  <span>{{ order.addonFee || 0 | number }} đ</span>
                </div>
                <div class="pb-row">
                  <span>Phí vận chuyển thùng lạnh</span>
                  <span>{{ order.shippingFee || 0 | number }} đ</span>
                </div>
                <div class="pb-row discount" *ngIf="order.discount">
                  <span>Voucher tri ân khách hàng</span>
                  <span>-{{ order.discount | number }} đ</span>
                </div>
              </div>

              <div class="grand-total-box">
                <div>
                  <strong>Tổng thanh toán</strong>
                  <small>Đã bao gồm VAT & Phụ kiện</small>
                </div>
                <div class="gt-right">
                  <span class="gt-amount">{{ order.total | number }} đ</span>
                  <small>{{
                    order.payment?.status === 'paid'
                      ? 'Hoàn tất qua chuyển khoản'
                      : 'Thanh toán theo hướng dẫn'
                  }}</small>
                </div>
              </div>
            </section>

            <!-- Khung hỗ trợ thay đổi giờ nhận -->
            <section class="help-callout-card">
              <div class="hc-icon"><i class="bi bi-headset"></i></div>
              <div>
                <h4>Cần thay đổi thông tin giờ nhận?</h4>
                <p>
                  Vui lòng gọi trực tiếp hotline hỗ trợ vận chuyển để điều phối lộ trình kịp thời.
                </p>
                <strong>Hotline: 0900 123 456</strong>
              </div>
            </section>
          </div>
        </div>

        <!-- 6. DẢI 3 CAM KẾT CHẤT LƯỢNG -->
        <section class="guarantees-strip">
          <div class="g-item">
            <div class="g-icon"><i class="bi bi-flower1"></i></div>
            <div>
              <h4>Chứng nhận Organic</h4>
              <p>Chúng tôi sử dụng 100% nguyên liệu hữu cơ từ các nông trại địa phương.</p>
            </div>
          </div>

          <div class="g-item">
            <div class="g-icon"><i class="bi bi-hand-thumbs-up"></i></div>
            <div>
              <h4>Thủ công 100%</h4>
              <p>Mỗi chiếc bánh là một tác phẩm được nhào nặn tỉ mỉ bởi nghệ nhân.</p>
            </div>
          </div>

          <div class="g-item">
            <div class="g-icon"><i class="bi bi-shield-check"></i></div>
            <div>
              <h4>Chuẩn ATVSTP</h4>
              <p>Quy trình sản xuất khép kín, đạt tiêu chuẩn vệ sinh an toàn quốc tế.</p>
            </div>
          </div>
        </section>
      </div>

      <!-- LIGHTBOX PHÓNG TO ẢNH -->
      <div class="zoom-backdrop" *ngIf="zoomOpen" (click)="zoomOpen = false">
        <div class="zoom-box" (click)="$event.stopPropagation()">
          <button class="zoom-close" (click)="zoomOpen = false">✕</button>
          <img [src]="showcaseImage" [alt]="primaryItem?.name" />
        </div>
      </div>

      <ng-template #stateTpl>
        <div class="page-wrapper empty-state">
          <p *ngIf="loading">Đang tải chi tiết đơn hàng...</p>
          <p *ngIf="!loading && errorMsg" class="err-txt">{{ errorMsg }}</p>
          <a routerLink="/orders" class="btn-back">← Quay lại danh sách đơn hàng</a>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .detail-page {
        background-color: #f9f6f2;
        color: #2d1b10;
        font-family: 'Inter', sans-serif;
        padding: 22px 20px 60px;
      }

      .page-wrapper {
        max-width: 1180px;
        margin: 0 auto;
      }

      /* Breadcrumb */
      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #8c7564;
        margin-bottom: 18px;
      }
      .breadcrumb a {
        color: #7d6b5d;
        text-decoration: none;
      }
      .breadcrumb a:hover {
        text-decoration: underline;
      }
      .breadcrumb strong {
        color: #2d1b10;
      }

      /* Top Header */
      .order-top-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 22px;
      }

      .meta-pills {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 6px;
      }

      .pill-tracking {
        background: #f4e8dc;
        color: #7d562d;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 6px;
        letter-spacing: 0.4px;
      }

      .pill-date {
        font-size: 12px;
        color: #7d6b5d;
      }

      .order-top-header h1 {
        font-family: 'Playfair Display', serif;
        font-size: 32px;
        margin: 0 0 4px 0;
        color: #2d1b10;
      }

      .workshop-sub {
        font-size: 13px;
        color: #7d6b5d;
        margin: 0;
      }

      .top-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .status-pill-main {
        background: #fdf3e7;
        color: #b45309;
        font-size: 12px;
        font-weight: 600;
        padding: 7px 14px;
        border-radius: 20px;
      }

      .st-done {
        background: #e6f6ec;
        color: #15803d;
      }
      .st-cancelled {
        background: #fee2e2;
        color: #b91c1c;
      }

      .btn-print {
        background: #ffffff;
        border: 1px solid #dcd2c8;
        color: #2d1b10;
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      /* Card Block Common */
      .card-block {
        background: #ffffff;
        border: 1px solid #eae2d9;
        border-radius: 16px;
        padding: 22px 24px;
        margin-bottom: 18px;
        box-shadow: 0 2px 10px rgba(45, 27, 16, 0.02);
      }

      .card-head-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 18px;
      }

      .eyebrow {
        display: block;
        font-size: 10px;
        font-weight: 700;
        color: #8c7564;
        letter-spacing: 0.6px;
        margin-bottom: 3px;
      }

      .card-block h2 {
        font-family: 'Playfair Display', serif;
        font-size: 19px;
        margin: 0;
        color: #2d1b10;
      }

      .live-badge {
        background: #faf6f1;
        border: 1px solid #eae0d5;
        color: #6b584c;
        font-size: 11px;
        padding: 5px 12px;
        border-radius: 16px;
      }

      /* Horizontal Stepper */
      .horizontal-stepper {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        padding: 12px 10px 4px;
        overflow-x: auto;
      }

      .h-step {
        position: relative;
        flex: 1;
        min-width: 105px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .step-line-right {
        position: absolute;
        top: 18px;
        left: 50%;
        width: 100%;
        height: 2px;
        background: #e6ddd3;
        z-index: 1;
      }

      .step-line-right.filled {
        background: #7d562d;
      }

      .step-circle {
        position: relative;
        z-index: 2;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #f3ece4;
        color: #8c7564;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        margin-bottom: 8px;
        border: 2px solid #ffffff;
      }

      .h-step.completed .step-circle {
        background: #7d562d;
        color: #ffffff;
      }

      .h-step.current .step-circle {
        background: #2d1b10;
        color: #ffffff;
        box-shadow: 0 0 0 4px #efe5da;
      }

      .step-name {
        font-size: 12px;
        font-weight: 600;
        color: #2d1b10;
      }

      .h-step:not(.completed):not(.current) .step-name {
        color: #9c8b7e;
        font-weight: 500;
      }

      .step-time {
        font-size: 11px;
        color: #8c7564;
        margin-top: 2px;
      }

      /* Photo Showcase */
      .showcase-grid {
        display: grid;
        grid-template-columns: 1.25fr 1fr;
        gap: 20px;
        align-items: stretch;
      }

      .showcase-img-wrap {
        position: relative;
        border-radius: 14px;
        overflow: hidden;
        min-height: 270px;
        background: #efe8e0;
      }

      .showcase-img-wrap img {
        width: 100%;
        height: 100%;
        max-height: 310px;
        object-fit: cover;
        display: block;
      }

      .qc-tag {
        position: absolute;
        top: 12px;
        left: 12px;
        background: rgba(45, 27, 16, 0.8);
        color: #fff;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 6px;
      }

      .img-overlay-bottom {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 16px;
        background: linear-gradient(transparent, rgba(25, 14, 8, 0.85));
        color: #fff;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 10px;
      }

      .img-overlay-bottom strong {
        display: block;
        font-size: 15px;
      }
      .img-overlay-bottom small {
        font-size: 11px;
        opacity: 0.9;
      }

      .btn-zoom {
        background: rgba(255, 255, 255, 0.92);
        color: #2d1b10;
        border: none;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }

      .showcase-note-col {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 14px;
      }

      .baker-quote-box {
        background: #faf7f4;
        border: 1px solid #ede4da;
        border-radius: 12px;
        padding: 16px 18px;
      }

      .bq-title {
        font-size: 12px;
        font-weight: 700;
        color: #7d562d;
        margin-bottom: 8px;
      }

      .baker-quote-box p {
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: 14px;
        line-height: 1.6;
        color: #3e2a1e;
        margin: 0;
      }

      .qa-meta-box {
        background: #faf8f5;
        border: 1px solid #ede4da;
        border-radius: 12px;
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 12px;
      }

      .qa-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .qa-row span {
        color: #7d6b5d;
      }
      .qa-row strong {
        color: #2d1b10;
      }
      .ok-txt {
        color: #15803d !important;
      }

      /* 2 Columns Detail */
      .detail-2col {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 20px;
        align-items: start;
      }

      .count-pill {
        background: #f6efe7;
        color: #7d562d;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 12px;
      }

      .prod-item-card {
        margin-bottom: 16px;
      }

      .pi-top {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .pi-top img {
        width: 82px;
        height: 82px;
        border-radius: 12px;
        object-fit: cover;
        border: 1px solid #ede4da;
      }

      .pi-info {
        flex: 1;
      }
      .pi-name-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
      }
      .pi-name-row h3 {
        font-family: 'Playfair Display', serif;
        font-size: 17px;
        margin: 0;
      }
      .pi-price {
        font-size: 15px;
        color: #2d1b10;
      }
      .pi-desc {
        font-size: 12px;
        color: #7d6b5d;
        margin: 4px 0 8px;
      }
      .pi-tags {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pi-tags span {
        background: #faf6f1;
        border: 1px solid #e8dfd5;
        font-size: 11px;
        padding: 3px 9px;
        border-radius: 6px;
        color: #5e4b3e;
      }

      .custom-specs-box {
        background: #faf8f5;
        border: 1px solid #ede4da;
        border-radius: 12px;
        padding: 16px;
      }

      .cs-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 12px;
        color: #2d1b10;
      }
      .cs-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        font-size: 12px;
        margin-bottom: 14px;
      }
      .cs-lbl {
        display: block;
        font-size: 11px;
        color: #8c7564;
        margin-bottom: 3px;
      }
      .cs-2col strong {
        color: #2d1b10;
        line-height: 1.45;
      }

      .cake-msg-pink {
        background: #fdf4f6;
        border: 1px solid #f6dce2;
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 14px;
      }
      .cmp-lbl {
        display: block;
        font-size: 10px;
        font-weight: 700;
        color: #9d4b63;
        margin-bottom: 4px;
      }
      .cmp-text {
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: 15px;
        font-weight: 600;
        color: #2d1b10;
        margin-bottom: 3px;
      }
      .cake-msg-pink small {
        font-size: 11px;
        color: #7d6b5d;
      }

      .acc-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 12px;
        font-size: 11px;
        color: #4b3b30;
        margin-top: 6px;
      }
      .acc-grid i {
        color: #7d562d;
        margin-right: 4px;
      }

      /* Care boxes */
      .care-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-top: 14px;
      }
      .care-box {
        background: #faf8f5;
        border: 1px solid #ede4da;
        border-radius: 10px;
        padding: 14px;
      }
      .care-box h4 {
        font-size: 13px;
        margin: 0 0 6px 0;
        color: #2d1b10;
      }
      .care-box p {
        font-size: 12px;
        color: #6b584c;
        line-height: 1.5;
        margin: 0;
      }

      .btn-outline-print {
        background: #ffffff;
        border: 1px solid #dcd2c8;
        color: #2d1b10;
        padding: 9px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      /* Right Column Info */
      .method-badge {
        font-size: 11px;
        font-weight: 600;
        color: #7d562d;
        background: #f6efe7;
        padding: 4px 10px;
        border-radius: 10px;
      }
      .info-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .info-item {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        font-size: 13px;
      }
      .info-item i {
        color: #7d562d;
        font-size: 16px;
        margin-top: 2px;
      }
      .i-lbl {
        display: block;
        font-size: 11px;
        color: #8c7564;
        margin-bottom: 2px;
      }
      .info-item strong {
        display: block;
        color: #2d1b10;
        line-height: 1.4;
      }
      .info-item small {
        display: block;
        font-size: 11px;
        color: #7d6b5d;
        margin-top: 2px;
      }

      .note-box {
        display: flex;
        gap: 10px;
        background: #faf7f4;
        border: 1px solid #ede4da;
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 12px;
      }
      .note-box p {
        margin: 2px 0 0 0;
        font-style: italic;
        color: #5e4b3e;
      }

      .paid-pill {
        background: #e6f6ec;
        color: #15803d;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 12px;
      }
      .paid-pill.unpaid {
        background: #fdf3e7;
        color: #b45309;
      }

      .pay-meta-box {
        background: #faf8f5;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
      }
      .pm-row {
        display: flex;
        justify-content: space-between;
      }
      .pm-row span {
        color: #8c7564;
      }

      .price-breakdown {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 12px;
        padding-bottom: 14px;
        border-bottom: 1px dashed #e2d6c8;
        margin-bottom: 14px;
      }
      .pb-row {
        display: flex;
        justify-content: space-between;
        color: #5e4b3e;
      }
      .pb-row.discount {
        color: #15803d;
        font-weight: 600;
      }

      .grand-total-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .grand-total-box strong {
        display: block;
        font-size: 14px;
      }
      .grand-total-box small {
        display: block;
        font-size: 11px;
        color: #8c7564;
      }
      .gt-right {
        text-align: right;
      }
      .gt-amount {
        font-family: 'Playfair Display', serif;
        font-size: 24px;
        font-weight: 700;
        color: #7d562d;
      }

      .help-callout-card {
        background: #faf6f1;
        border: 1px solid #e8dfd5;
        border-radius: 14px;
        padding: 16px 18px;
        display: flex;
        gap: 14px;
        align-items: flex-start;
      }
      .hc-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #ffffff;
        color: #7d562d;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      .help-callout-card h4 {
        font-size: 13px;
        margin: 0 0 4px 0;
      }
      .help-callout-card p {
        font-size: 11px;
        color: #6b584c;
        margin: 0 0 6px 0;
        line-height: 1.45;
      }
      .help-callout-card strong {
        font-size: 13px;
        color: #2d1b10;
      }

      /* Guarantees Strip */
      .guarantees-strip {
        margin-top: 36px;
        padding-top: 28px;
        border-top: 1px solid #e5ddd4;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }
      .g-item {
        display: flex;
        gap: 14px;
        align-items: flex-start;
      }
      .g-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid #d8cbbf;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #7d562d;
        font-size: 18px;
        flex-shrink: 0;
      }
      .g-item h4 {
        font-size: 14px;
        margin: 0 0 4px 0;
        color: #2d1b10;
      }
      .g-item p {
        font-size: 12px;
        color: #7d6b5d;
        line-height: 1.5;
        margin: 0;
      }

      /* Lightbox */
      .zoom-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        padding: 20px;
      }
      .zoom-box {
        position: relative;
        max-width: 820px;
        width: 100%;
      }
      .zoom-box img {
        width: 100%;
        border-radius: 14px;
        display: block;
      }
      .zoom-close {
        position: absolute;
        top: -14px;
        right: -14px;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #fff;
        border: none;
        font-weight: 700;
        cursor: pointer;
      }

      .empty-state {
        text-align: center;
        padding: 80px 20px;
      }
      .err-txt {
        color: #ba1a1a;
      }
      .btn-back {
        display: inline-block;
        margin-top: 12px;
        color: #7d562d;
        font-weight: 600;
      }

      @media (max-width: 900px) {
        .showcase-grid,
        .detail-2col,
        .cs-2col,
        .acc-grid,
        .care-2col,
        .guarantees-strip {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class OrderDetailComponent implements OnInit {
  order: any = null;
  loading = false;
  errorMsg = '';
  zoomOpen = false;

  private statusRank: Record<string, number> = {
    pending_payment: 1,
    pending_approval: 2,
    accepted: 3,
    baking: 4,
    delivering: 5,
    delivered: 6,
    done: 7,
    cancelled: 0,
  };

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.loadOrder(id);
    }
  }

  get primaryItem(): any {
    return this.order?.items?.[0] || null;
  }

  get isCakeReady(): boolean {
    return ['delivering', 'delivered', 'done'].includes(this.order?.status);
  }

  get showcaseImage(): string {
    return this.getItemImage(this.primaryItem);
  }

  get activeStepper() {
    const baseSteps = [
      { key: 'pending_payment', label: 'Chờ thanh toán', icon: 'bi-credit-card' },
      { key: 'pending_approval', label: 'Chờ duyệt', icon: 'bi-clipboard-check' },
      { key: 'accepted', label: 'Đã tiếp nhận', icon: 'bi-shop' },
      { key: 'baking', label: 'Đang làm bánh', icon: 'bi-cake2' },
    ];

    if (this.order?.receiveMethod === 'pickup') {
      return [
        ...baseSteps,
        { key: 'delivering', label: 'Đã xong', icon: 'bi-box-seam' },
        { key: 'done', label: 'Đã nhận bánh', icon: 'bi-bag-heart' },
      ];
    }

    return [
      ...baseSteps,
      { key: 'delivered', label: 'Đã xong', icon: 'bi-box-seam' },
      { key: 'delivering', label: 'Đang giao', icon: 'bi-truck' },
      { key: 'done', label: 'Đã giao', icon: 'bi-house-check' },
    ];
  }

  loadOrder(id: string) {
    this.loading = true;
    this.orderService.getCustomerOrderById(id).subscribe({
      next: (res: any) => {
        this.order = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Không tìm thấy thông tin đơn hàng.';
        this.cdr.detectChanges();
      },
    });
  }

  getStepState(orderStatus: string, stepKey: string): 'completed' | 'current' | 'upcoming' {
    const currentRank = this.statusRank[orderStatus] || 1;
    const stepRank = this.statusRank[stepKey] || 1;
    if (stepRank < currentRank) return 'completed';
    if (stepRank === currentRank) return 'current';
    return 'upcoming';
  }

  getStepTime(stepKey: string): string {
    const state = this.getStepState(this.order?.status, stepKey);
    if (state === 'upcoming') return 'Dự kiến';
    const d = new Date(this.order?.createdAt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  getItemImage(item: any): string {
    if (!item) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80';
    if (item.imageUrl) return item.imageUrl;
    if (item.imageId) return `${environment.apiUrl}/files/${item.imageId}`;
    const name = (item.name || '').toLowerCase();
    if (name.includes('wedding') || name.includes('cưới')) {
      return 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80';
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
      cancelled: 'Đã hủy',
    };
    return map[status] || status;
  }

  printReceipt() {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }
}
