import { Component, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-order-track',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="track-page">
      <div class="page-wrapper">

        <!-- 1. TIÊU ĐỀ TRANG -->
        <header class="track-hero">
          <span class="qr-pill">QR - TRA CỨU NHANH DÀNH CHO KHÁCH VÃNG LAI</span>
          <h1>Tra cứu đơn hàng</h1>
          <p>
            Dành cho khách hàng chưa đăng ký tài khoản. Vui lòng nhập mã đơn và số điện thoại đã sử dụng khi đặt bánh để theo dõi tiến độ thực hiện.
          </p>
        </header>

        <!-- 2. FORM CỔNG TRA CỨU KHÁCH HÀNG -->
        <section class="lookup-card">
          <div class="lc-head">
            <div class="lc-icon"><i class="bi bi-shield-lock"></i></div>
            <div>
              <h2>Cổng tra cứu khách hàng</h2>
              <span>Không cần đăng nhập tài khoản</span>
            </div>
          </div>

          <form (ngSubmit)="onSearch()" class="lc-form">
            <div class="f-group">
              <label>Mã đơn hàng <span class="req">*</span></label>
              <div class="input-box">
                <i class="bi bi-upc-scan"></i>
                <input
                  type="text"
                  name="code"
                  [(ngModel)]="code"
                  placeholder="Ví dụ: SC-SEED-001 hoặc SWC-2026-8892"
                />
              </div>
              <small>Mã đơn hàng được gửi trong tin nhắn xác nhận hoặc email đặt bánh.</small>
            </div>

            <div class="f-group">
              <label>Số điện thoại đặt hàng <span class="req">*</span></label>
              <div class="input-box">
                <i class="bi bi-phone"></i>
                <input
                  type="text"
                  name="phone"
                  [(ngModel)]="phone"
                  placeholder="Ví dụ: 0900000001"
                />
              </div>
              <small>Số điện thoại người nhận hoặc người đặt bánh.</small>
            </div>

            <div *ngIf="errorMsg" class="err-banner">
              <i class="bi bi-exclamation-circle"></i> {{ errorMsg }}
            </div>

            <button type="submit" class="btn-lookup" [disabled]="loading">
              <i class="bi bi-search"></i>
              {{ loading ? 'Đang kiểm tra thông tin...' : 'Tra cứu đơn hàng' }}
            </button>
          </form>

          <div class="security-note">
            <i class="bi bi-lock"></i>
            <span>
              <strong>Lưu ý bảo mật:</strong> Thông tin đơn hàng chỉ hiển thị đầy đủ sau khi hệ thống xác thực trùng khớp cả mã đơn và số điện thoại đăng ký.
            </span>
          </div>
        </section>

        <!-- 3. THẺ KẾT QUẢ TRA CỨU (HIỂN THỊ KHI TÌM THẤY ĐƠN) -->
        <section class="result-card" *ngIf="foundOrder">
          <div class="rc-top">
            <div>
              <span class="rc-eyebrow">MÃ ĐƠN BÁNH</span>
              <div class="rc-code">#{{ foundOrder.code }}</div>
            </div>
            <span class="rc-status" [ngClass]="'st-' + foundOrder.status">
              ● {{ getStatusLabel(foundOrder.status) }}
            </span>
          </div>

          <!-- Khung thông tin 3 cột -->
          <div class="rc-info-grid">
            <div>
              <span class="ig-lbl">Khách hàng</span>
              <strong>{{ foundOrder.receiver?.fullName }}</strong>
              <span class="ig-sub">{{ maskPhone(foundOrder.receiver?.phone) }}</span>
            </div>

            <div>
              <span class="ig-lbl">
                {{ foundOrder.receiveMethod === 'delivery' ? 'Thời gian giao dự kiến' : 'Thời gian nhận tại tiệm' }}
              </span>
              <strong>{{ foundOrder.slotLabel }}</strong>
              <span class="ig-sub brown">{{ foundOrder.receiveDate | date:'dd/MM/yyyy' }}</span>
            </div>

            <div>
              <span class="ig-lbl">Tổng giá trị đơn</span>
              <strong class="ig-price">{{ foundOrder.total | number }} đ</strong>
              <span class="ig-sub">
                {{ foundOrder.payment?.status === 'paid' ? 'Đã thanh toán qua chuyển khoản' : 'Thanh toán khi nhận / VietQR' }}
              </span>
            </div>
          </div>

          <!-- Khung bánh + Nút Xem chi tiết đơn hàng -->
          <div class="rc-product-strip">
            <div class="rcp-left">
              <img [src]="getItemImage(primaryItem)" [alt]="primaryItem?.name || 'Bánh SweetCake'" />
              <div>
                <h4>
                  {{ primaryItem?.name || 'Bánh kem SweetCake' }}
                  <span *ngIf="(foundOrder.items?.length || 0) > 1" class="more-items">
                    (+{{ foundOrder.items.length - 1 }} sản phẩm khác)
                  </span>
                </h4>
                <p>
                  <span *ngIf="primaryItem?.config?.size">Size {{ primaryItem.config.size }} • </span>
                  <span *ngIf="primaryItem?.config?.message; else qtyTpl">
                    Ghi chữ: "{{ primaryItem.config.message }}"
                  </span>
                  <ng-template #qtyTpl>Số lượng: {{ primaryItem?.qty || 1 }}</ng-template>
                </p>
              </div>
            </div>

            <button class="btn-view-detail" (click)="goToDetail()">
              Xem chi tiết đơn hàng →
            </button>
          </div>
        </section>

        <!-- 4. HỖ TRỢ TRA CỨU & ĐƠN HÀNG TIỆM -->
        <section class="support-section">
          <div class="sup-header">
            <h2>Hỗ trợ tra cứu & Đơn hàng tiệm</h2>
            <p>Giải đáp nhanh các thắc mắc thường gặp khi theo dõi bánh tiệc</p>
          </div>

          <div class="sup-2col">
            <div class="sup-card">
              <div class="sup-icon"><i class="bi bi-question-circle"></i></div>
              <h3>Không nhớ hoặc làm mất mã đơn?</h3>
              <p>
                Bạn có thể kiểm tra hộp thư điện tử hoặc tin nhắn Zalo/SMS được gửi từ SweetCake ngay sau khi đặt hàng. Nếu không tìm thấy, vui lòng bấm gọi bộ phận Chăm sóc Khách hàng để được tra soát theo tên và số điện thoại.
              </p>
              <a href="tel:0900123456" class="sup-btn">
                <i class="bi bi-telephone"></i> Gọi Hotline: 0900 123 456
              </a>
            </div>

            <div class="sup-card">
              <div class="sup-icon"><i class="bi bi-clock-history"></i></div>
              <h3>Cần thay đổi giờ giao hoặc địa chỉ?</h3>
              <p>
                Vì bánh kem tươi cần được bảo quản lạnh chuyên dụng khi vận chuyển, quý khách vui lòng thông báo đổi thời gian giao nhận trước tối thiểu 2 giờ để nghệ nhân và shipper chủ động điều phối tươi ngon nhất.
              </p>
              <a href="https://zalo.me" target="_blank" rel="noopener" class="sup-btn">
                <i class="bi bi-chat-dots"></i> Nhắn tin Zalo Official
              </a>
            </div>
          </div>

          <div class="event-banner">
            <h3>Quý khách đặt bánh cho sự kiện đặc biệt hoặc đám cưới?</h3>
            <p>
              Mọi yêu cầu setup tận nơi hoặc điều phối xe giao bánh đông lạnh hai chiều vui lòng kết nối trực tiếp chuyên viên bánh tiệc.
            </p>
            <div class="event-hotline">
              Tư vấn trực tiếp: <strong>0900 123 456</strong> (08:00 - 21:30 hàng ngày)
            </div>
          </div>
        </section>

        <!-- 5. DẢI 3 CAM KẾT CHẤT LƯỢNG -->
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
    </div>
  `,
  styles: [`
    .track-page {
      background-color: #F9F6F2;
      color: #2D1B10;
      font-family: 'Inter', sans-serif;
      padding: 40px 20px 64px;
    }

    .page-wrapper {
      max-width: 1060px;
      margin: 0 auto;
    }

    /* 1. Hero Header */
    .track-hero {
      text-align: center;
      max-width: 640px;
      margin: 0 auto 30px;
    }

    .qr-pill {
      display: inline-block;
      background: #EFE7DE;
      color: #7D562D;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.7px;
      padding: 5px 12px;
      border-radius: 16px;
      margin-bottom: 12px;
    }

    .track-hero h1 {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      font-weight: 700;
      margin: 0 0 10px 0;
      color: #2D1B10;
    }

    .track-hero p {
      font-size: 13.5px;
      color: #6B584C;
      line-height: 1.6;
      margin: 0;
    }

    /* 2. Lookup Form Card */
    .lookup-card {
      background: #FFFFFF;
      border: 1px solid #EAE2D9;
      border-radius: 18px;
      max-width: 580px;
      margin: 0 auto 28px;
      padding: 28px 32px;
      box-shadow: 0 8px 30px rgba(45, 27, 16, 0.04);
    }

    .lc-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid #F2ECE4;
      margin-bottom: 20px;
    }

    .lc-icon {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #F6EFE7;
      color: #7D562D;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
    }

    .lc-head h2 {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      margin: 0 0 2px 0;
      color: #2D1B10;
    }

    .lc-head span {
      font-size: 12px;
      color: #8C7564;
    }

    .f-group {
      margin-bottom: 18px;
    }

    .f-group label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: #2D1B10;
      margin-bottom: 6px;
    }

    .req { color: #CF1322; }

    .input-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #FAF8F5;
      border: 1px solid #E2D9CF;
      border-radius: 10px;
      padding: 11px 14px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .input-box:focus-within {
      border-color: #7D562D;
      background: #FFFFFF;
    }

    .input-box i {
      color: #8C7564;
      font-size: 15px;
    }

    .input-box input {
      border: none;
      outline: none;
      background: transparent;
      width: 100%;
      font-size: 13.5px;
      font-family: 'Inter', sans-serif;
      color: #2D1B10;
    }

    .f-group small {
      display: block;
      font-size: 11px;
      color: #8C7564;
      margin-top: 5px;
    }

    .err-banner {
      background: #FFF2F0;
      border: 1px solid #FFCCC7;
      color: #CF1322;
      font-size: 12.5px;
      padding: 10px 12px;
      border-radius: 8px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-lookup {
      width: 100%;
      background: #7D562D;
      color: #FFFFFF;
      border: none;
      border-radius: 10px;
      padding: 13px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s ease;
    }

    .btn-lookup:hover:not(:disabled) {
      background: #664422;
    }

    .btn-lookup:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .security-note {
      margin-top: 16px;
      background: #FAF7F4;
      border: 1px solid #EDE4DA;
      border-radius: 10px;
      padding: 11px 14px;
      font-size: 11.5px;
      color: #6B584C;
      line-height: 1.5;
      display: flex;
      align-items: flex-start;
      gap: 9px;
    }

    .security-note i {
      color: #7D562D;
      margin-top: 2px;
    }

    /* 3. Result Card (Ảnh 2) */
    .result-card {
      background: #FFFFFF;
      border: 1px solid #EAE2D9;
      border-radius: 20px;
      max-width: 720px;
      margin: 0 auto 44px;
      padding: 28px 32px;
      box-shadow: 0 12px 34px rgba(45, 27, 16, 0.06);
      animation: fadeIn 0.25s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .rc-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }

    .rc-eyebrow {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #7D562D;
      letter-spacing: 0.6px;
      margin-bottom: 4px;
    }

    .rc-code {
      font-family: 'Playfair Display', serif;
      font-size: 30px;
      font-weight: 700;
      color: #2D1B10;
      line-height: 1.1;
    }

    .rc-status {
      background: #FDE7D0;
      color: #9A4E12;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 20px;
    }

    .st-done { background: #E6F6EC; color: #15803D; }
    .st-cancelled { background: #FEE2E2; color: #B91C1C; }

    .rc-info-grid {
      background: #F7F4F0;
      border-radius: 14px;
      padding: 18px 22px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 18px;
    }

    .ig-lbl {
      display: block;
      font-size: 11.5px;
      color: #7D6B5D;
      margin-bottom: 5px;
    }

    .rc-info-grid strong {
      display: block;
      font-size: 16px;
      color: #2D1B10;
      margin-bottom: 3px;
    }

    .ig-price {
      font-family: 'Playfair Display', serif;
      font-size: 20px !important;
      color: #7D562D !important;
    }

    .ig-sub {
      display: block;
      font-size: 12px;
      color: #6B584C;
    }

    .ig-sub.brown {
      color: #7D562D;
      font-weight: 500;
    }

    .rc-product-strip {
      background: #F7F4F0;
      border-radius: 14px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }

    .rcp-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .rcp-left img {
      width: 56px;
      height: 56px;
      border-radius: 10px;
      object-fit: cover;
      border: 1px solid #E5DDD4;
    }

    .rcp-left h4 {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 3px 0;
      color: #2D1B10;
    }

    .more-items {
      font-size: 12px;
      font-weight: 500;
      color: #7D562D;
    }

    .rcp-left p {
      font-size: 12px;
      color: #6B584C;
      margin: 0;
    }

    .btn-view-detail {
      background: #1E1108;
      color: #FFFFFF;
      border: none;
      border-radius: 10px;
      padding: 12px 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease;
    }

    .btn-view-detail:hover {
      background: #3A2212;
    }

    /* 4. Support Section */
    .support-section {
      margin-top: 44px;
    }

    .sup-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .sup-header h2 {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      margin: 0 0 6px 0;
      color: #2D1B10;
    }

    .sup-header p {
      font-size: 13px;
      color: #7D6B5D;
      margin: 0;
    }

    .sup-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      max-width: 860px;
      margin: 0 auto 20px;
    }

    .sup-card {
      background: #FFFFFF;
      border: 1px solid #EAE2D9;
      border-radius: 14px;
      padding: 22px 24px;
    }

    .sup-icon {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #F6EFE7;
      color: #7D562D;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      margin-bottom: 12px;
    }

    .sup-card h3 {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #2D1B10;
    }

    .sup-card p {
      font-size: 12px;
      color: #6B584C;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }

    .sup-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FAF7F4;
      border: 1px solid #E2D9CF;
      color: #2D1B10;
      font-size: 12px;
      font-weight: 600;
      padding: 7px 14px;
      border-radius: 8px;
      text-decoration: none;
    }

    .event-banner {
      max-width: 860px;
      margin: 0 auto;
      background: #EFEBE6;
      border-radius: 14px;
      padding: 22px 26px;
      text-align: center;
    }

    .event-banner h3 {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #2D1B10;
    }

    .event-banner p {
      font-size: 12px;
      color: #6B584C;
      max-width: 520px;
      margin: 0 auto 10px;
      line-height: 1.5;
    }

    .event-hotline {
      font-size: 12px;
      color: #7D562D;
    }

    /* 5. Guarantees Strip */
    .guarantees-strip {
      margin-top: 48px;
      padding-top: 28px;
      border-top: 1px solid #E5DDD4;
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
      border: 1px solid #D8CBBF;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #7D562D;
      font-size: 18px;
      flex-shrink: 0;
    }

    .g-item h4 {
      font-size: 14px;
      margin: 0 0 4px 0;
      color: #2D1B10;
    }

    .g-item p {
      font-size: 12px;
      color: #7D6B5D;
      line-height: 1.5;
      margin: 0;
    }

    @media (max-width: 768px) {
      .rc-info-grid, .sup-2col, .guarantees-strip {
        grid-template-columns: 1fr;
      }
      .lookup-card, .result-card {
        padding: 20px;
      }
    }
  `]
})
export class OrderTrackComponent {
  code = '';
  phone = '';
  loading = false;
  errorMsg = '';

  foundOrder: any = null;
  trackToken = '';

  constructor(
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get primaryItem(): any {
    return this.foundOrder?.items?.[0] || null;
  }

  onSearch() {
    const cleanCode = this.code.trim().replace(/^#/, '');
    const cleanPhone = this.phone.trim();

    if (!cleanCode || !cleanPhone) {
      this.errorMsg = 'Vui lòng nhập đầy đủ cả Mã đơn hàng và Số điện thoại đặt hàng.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.foundOrder = null;

    this.orderService.trackOrder(cleanCode, cleanPhone).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.foundOrder = res.order || res;
        this.trackToken = res.trackToken || '';

        if (isPlatformBrowser(this.platformId) && this.trackToken) {
          sessionStorage.setItem('trackToken', this.trackToken);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Không tìm thấy đơn hàng hoặc số điện thoại không khớp.';
        this.cdr.detectChanges();
      }
    });
  }

  goToDetail() {
    if (!this.foundOrder?._id) return;
    if (isPlatformBrowser(this.platformId) && this.trackToken) {
      sessionStorage.setItem('trackToken', this.trackToken);
    }
    this.router.navigate(['/orders', this.foundOrder._id]);
  }

  maskPhone(phone?: string): string {
    if (!phone) return '';
    const digits = phone.trim();
    if (digits.length < 7) return digits;
    return `${digits.slice(0, 4)} ••• ${digits.slice(-3)}`;
  }

  getItemImage(item: any): string {
    if (!item) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&q=80';
    if (item.imageUrl) return item.imageUrl;
    if (item.imageId) return `http://localhost:3000/api/files/${item.imageId}`;
    const name = (item.name || '').toLowerCase();
    if (name.includes('wedding') || name.includes('cưới')) {
      return 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=300&q=80';
    }
    return 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&q=80';
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