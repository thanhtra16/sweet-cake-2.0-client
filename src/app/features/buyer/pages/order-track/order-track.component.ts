import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-order-track',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="track-page-container">
      <!-- HEADER -->
      <header class="site-header">
        <div class="logo-area">
          <span class="logo-text">SweetCake</span>
        </div>
        <nav class="nav-links">
          <a routerLink="/menu" class="nav-item">Menu</a>
          <a routerLink="/orders" class="nav-item">Đơn hàng</a>
          <a routerLink="/about" class="nav-item">Giới thiệu</a>
          <a routerLink="/blog" class="nav-item">Blog</a>
          <a routerLink="/contact" class="nav-item">Cửa hàng</a>
        </nav>
        <div class="header-actions">
          <a routerLink="/cart" class="icon-btn">🛒</a>
          <a routerLink="/profile" class="icon-btn">👤</a>
        </div>
      </header>

      <!-- MAIN CONTENT -->
      <main class="main-content">
        <div class="track-box-wrapper">
          <p class="sub-title">QR - Tra cứu nhanh dành cho khách vãng lai</p>
          <h1>Tra cứu đơn hàng</h1>
          <p class="desc">Dành cho khách hàng chưa đăng ký tài khoản. Vui lòng nhập mã đơn và số điện thoại đã sử dụng khi đặt bánh để theo dõi tiến độ thực hiện.</p>

          <!-- FORM TRA CỨU -->
          <div class="track-card">
            <div class="card-header">
              <span class="icon">🔍</span>
              <div>
                <h3>Công cụ tra cứu khách hàng</h3>
                <small>Không cần đăng nhập tài khoản</small>
              </div>
            </div>

            <div class="form-group">
              <label>Mã đơn hàng *</label>
              <div class="input-with-icon">
                <span>📦</span>
                <input type="text" [(ngModel)]="trackCode" placeholder="Ví dụ: SWC-2026-8892" />
              </div>
              <small class="hint">Mã đơn hàng được gửi trong tin nhắn xác nhận hoặc email đặt bánh.</small>
            </div>

            <div class="form-group">
              <label>Số điện thoại đặt hàng *</label>
              <div class="input-with-icon">
                <span>📞</span>
                <input type="text" [(ngModel)]="trackPhone" placeholder="Ví dụ: 0912 345 678" />
              </div>
              <small class="hint">Số điện thoại người nhận hoặc người đặt bánh.</small>
            </div>

            <button class="btn-submit" (click)="onTrackSubmit()" [disabled]="isLoading">
              {{ isLoading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng' }}
            </button>

            <div class="privacy-note">
              <span>🔒</span>
              <small>Lưu ý bảo mật: Thông tin đơn hàng chỉ hiển thị đầy đủ sau khi hệ thống xác thực trùng khớp cả mã đơn và số điện thoại đăng ký.</small>
            </div>
          </div>

          <!-- HIỂN THỊ LỖI -->
          <p *ngIf="errorMessage" class="error-msg">{{ errorMessage }}</p>

          <!-- POPUP KẾT QUẢ TRA CỨU NHANH -->
          <div *ngIf="searchResult" class="result-popup-card">
            <div class="result-top">
              <div>
                <span class="label-mini">MÃ ĐƠN BÁNH</span>
                <h2 class="order-code-text">#{{ searchResult.code }}</h2>
              </div>
              <span class="status-badge">{{ searchResult.status }}</span>
            </div>

            <div class="result-info-grid">
              <div>
                <span class="info-label">Khách hàng</span>
                <p class="info-value"><strong>{{ searchResult.receiver?.name || 'Nguyễn Lan Phương' }}</strong></p>
                <p class="info-sub">{{ searchResult.receiver?.phone || '0912 ••• 678' }}</p>
              </div>
              <div>
                <span class="info-label">Thời gian giao dự kiến</span>
                <p class="info-value">15:30 Hôm nay</p>
                <p class="info-sub">{{ searchResult.createdAt | date:'dd/MM/yyyy' }}</p>
              </div>
              <div>
                <span class="info-label">Tổng giá trị đơn</span>
                <p class="info-value price">{{ searchResult.totalAmount | number }} đ</p>
                <p class="info-sub">Đã thanh toán qua chuyển khoản</p>
              </div>
            </div>

            <div class="product-mini-card">
              <div class="product-info-left">
                <img src="assets/cake-sample.png" alt="Bánh" class="cake-thumb" />
                <div>
                  <h4>{{ searchResult.items?.[0]?.name || 'Bánh Kem Dâu Tươi Cốt Chiffon' }}</h4>
                  <p>Size 18cm • Ghi chú: "{{ searchResult.items?.[0]?.note || 'Chúc mừng sinh nhật Mai Anh' }}"</p>
                </div>
              </div>
              <button class="btn-detail-nav" (click)="goToDetail(searchResult._id)">
                Xem chi tiết đơn hàng &rarr;
              </button>
            </div>
          </div>

          <!-- SECTION: HỖ TRỢ TRA CỨU & ĐƠN HÀNG TIỆM -->
          <div class="support-section">
            <h2 class="section-title">Hỗ trợ tra cứu & Đơn hàng tiệm</h2>
            <p class="section-desc">Giải đáp nhanh các thắc mắc thường gặp khi theo dõi bánh tiệc.</p>

            <div class="support-grid">
              <div class="support-box">
                <div class="support-icon">🍰</div>
                <h4>Không nhớ hoặc làm mất mã đơn?</h4>
                <p>Bạn có thể kiểm tra hộp thư đến hoặc tin nhắn Zalo/SMS được gửi từ SweetCake ngay sau khi đặt hàng. Nếu không tìm thấy, vui lòng bấm gọi bộ phận Chăm sóc Khách hàng để được soát theo tên và số điện thoại.</p>
              </div>
              <div class="support-box">
                <div class="support-icon">🕒</div>
                <h4>Cần thay đổi giờ giao hoặc địa chỉ?</h4>
                <p>Vì bánh kem tươi cần được bảo quản lạnh chuyên dụng khi vận chuyển, quý khách vui lòng thông báo đổi thời gian giao nhận trước tối thiểu 2 giờ để nghệ nhân và shipper chủ động điều phối tươi ngon nhất.</p>
              </div>
            </div>

            <div class="event-banner-box">
              <p class="event-title">Quý khách đặt bánh cho sự kiện đặc biệt hoặc đám cưới?</p>
              <p class="event-desc">Mọi yêu cầu setup tận nơi hoặc điều phối xe giao bánh đông lạnh hai chiều vui lòng kết nối trực tiếp chuyên viên bánh tiệc.</p>
              <p class="event-hotline">Tư vấn trực tiếp: <strong>024 3828 9888</strong> (08:00 - 21:30 hàng ngày)</p>
            </div>
          </div>

          <!-- SECTION: CAM KẾT CHẤT LƯỢNG -->
          <div class="features-grid">
            <div class="feature-item">
              <span class="feat-icon">🌾</span>
              <h4>Chứng nhận Organic</h4>
              <p>Chúng tôi sử dụng 100% nguyên liệu hữu cơ từ các nông trại địa phương.</p>
            </div>
            <div class="feature-item">
              <span class="feat-icon">👩‍🍳</span>
              <h4>Thủ công 100%</h4>
              <p>Mỗi chiếc bánh là một tác phẩm được nhào nặn tỉ mỉ bởi nghệ nhân.</p>
            </div>
            <div class="feature-item">
              <span class="feat-icon">🛡️</span>
              <h4>Chuẩn ATVSTP</h4>
              <p>Quy trình sản xuất khép kín, đạt tiêu chuẩn vệ sinh an toàn quốc tế.</p>
            </div>
          </div>

        </div>
      </main>

      <!-- FOOTER CHUẨN XÁC 100% NHƯ ẢNH MẪU -->
      <footer class="site-footer">
        <div class="footer-content">
          <div class="footer-col brand-col">
            <h3 class="footer-logo">SweetCake</h3>
            <p class="footer-desc">Tiệm bánh thủ công với tâm huyết mang lại những trải nghiệm ngọt ngào và tinh tế nhất cho khách hàng.</p>
            <div class="social-icons">
              <a href="#" class="soc-icon">f</a>
              <a href="#" class="soc-icon">📷</a>
              <a href="#" class="soc-icon">💬</a>
              <a href="#" class="soc-icon">📞</a>
            </div>
          </div>
          <div class="footer-col">
            <h5>SẢN PHẨM</h5>
            <a routerLink="/menu">Menu</a>
            <a routerLink="/menu">Best Seller</a>
            <a routerLink="/menu">Phụ kiện</a>
          </div>
          <div class="footer-col">
            <h5>HỖ TRỢ</h5>
            <a routerLink="/contact">Câu hỏi thường gặp (FAQ)</a>
            <a routerLink="/contact">Chính sách</a>
            <a routerLink="/about">Giới thiệu</a>
          </div>
          <div class="footer-col">
            <h5>ĐỊA CHỈ</h5>
            <p>Nhóm 1, Đại học Kinh tế Luật</p>
            <p>Giờ mở cửa: 8:00 - 22:00</p>
          </div>
        </div>

        <!-- THANH NHẮN TIN TỪ CHÚNG TÔI NẰM NGANG PHÍA DƯỚI CÁC CỘT -->
        <div class="footer-newsletter-row">
          <div class="newsletter-inner">
            <span class="newsletter-label">NHẮN TIN TỪ CHÚNG TÔI</span>
            <div class="newsletter-input-group">
              <input type="email" placeholder="Email của bạn" />
              <button>Gửi</button>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; 2026 SweetCake. Tất cả quyền được bảo lưu.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .track-page-container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fcfbfa; color: #2c221e; min-height: 100vh; display: flex; flex-direction: column; }
    
    /* Header */
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 60px; background: #fff; border-bottom: 1px solid #f0e9e4; position: sticky; top: 0; z-index: 100; }
    .logo-text { font-size: 26px; font-weight: bold; font-family: serif; color: #2c221e; }
    .nav-links { display: flex; gap: 40px; }
    .nav-item { text-decoration: none; color: #555; font-weight: 500; font-size: 15px; }
    .nav-item:hover, .nav-item.active { color: #9c4128; }
    .header-actions { display: flex; gap: 15px; }
    .icon-btn { font-size: 18px; text-decoration: none; }

    /* Main Content */
    .main-content { flex: 1; padding: 50px 20px; }
    .track-box-wrapper { max-width: 720px; margin: 0 auto; text-align: center; }
    .sub-title { font-size: 11px; color: #8c7b72; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    h1 { font-size: 36px; font-family: serif; margin: 10px 0; color: #2c221e; }
    .desc { color: #665c54; font-size: 14px; margin-bottom: 35px; line-height: 1.6; }
    
    /* Track Card */
    .track-card { background: #fff; padding: 35px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); text-align: left; border: 1px solid #f3efe9; }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid #f3efe9; padding-bottom: 15px; }
    .card-header h3 { margin: 0; font-size: 16px; color: #2c221e; }
    .card-header small { color: #887a72; }
    
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #443831; }
    .input-with-icon { display: flex; align-items: center; background: #f9f8f6; border: 1px solid #e6e1db; border-radius: 8px; padding: 0 12px; }
    .input-with-icon input { width: 100%; padding: 12px 8px; border: none; background: transparent; outline: none; font-size: 15px; color: #2c221e; }
    .hint { display: block; font-size: 11px; color: #888; margin-top: 5px; }
    
    .btn-submit { width: 100%; padding: 14px; background: #593e32; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; margin-top: 10px; transition: background 0.2s; }
    .btn-submit:hover:not(:disabled) { background: #422d24; }
    
    .privacy-note { display: flex; gap: 8px; margin-top: 20px; background: #fdfbf7; padding: 12px; border-radius: 8px; font-size: 12px; color: #73655c; align-items: center; border: 1px solid #f7f2eb; }
    .error-msg { color: #d32f2f; margin-top: 15px; font-size: 14px; font-weight: 500; }
    
    /* Result Popup */
    .result-popup-card { background: #fff; border-radius: 16px; padding: 30px; margin-top: 30px; box-shadow: 0 8px 30px rgba(0,0,0,0.06); text-align: left; border: 1px solid #f0e9e4; }
    .result-top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f3efe9; padding-bottom: 20px; margin-bottom: 20px; }
    .label-mini { font-size: 11px; color: #887a72; letter-spacing: 0.5px; font-weight: 600; }
    .order-code-text { font-family: serif; font-size: 26px; margin: 5px 0 0 0; color: #2c221e; }
    .status-badge { background: #ffeacc; color: #b36b00; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    
    .result-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
    .info-label { font-size: 12px; color: #887a72; }
    .info-value { font-size: 15px; margin: 4px 0 2px 0; color: #2c221e; }
    .info-value.price { color: #9c4128; font-weight: bold; }
    .info-sub { font-size: 12px; color: #777; margin: 0; }
    
    .product-mini-card { background: #f7f5f0; border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; gap: 15px; }
    .product-info-left { display: flex; gap: 15px; align-items: center; }
    .cake-thumb { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; }
    .product-info-left h4 { margin: 0 0 4px 0; font-size: 14px; color: #2c221e; }
    .product-info-left p { margin: 0; font-size: 12px; color: #666; }
    .btn-detail-nav { background: #1a1614; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; white-space: nowrap; }

    /* Support Section */
    .support-section { margin-top: 70px; text-align: left; }
    .section-title { font-size: 24px; font-family: serif; text-align: center; margin-bottom: 8px; color: #2c221e; }
    .section-desc { text-align: center; color: #665c54; font-size: 14px; margin-bottom: 30px; }
    
    .support-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .support-box { background: #fff; padding: 25px; border-radius: 14px; border: 1px solid #f0e9e4; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
    .support-icon { font-size: 22px; margin-bottom: 12px; }
    .support-box h4 { font-size: 15px; margin: 0 0 10px 0; color: #2c221e; font-weight: 600; }
    .support-box p { font-size: 13px; color: #665c54; line-height: 1.6; margin: 0; }
    
    .event-banner-box { background: #fff; padding: 25px; border-radius: 14px; border: 1px solid #f0e9e4; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
    .event-title { font-weight: 600; font-size: 15px; color: #2c221e; margin-bottom: 8px; }
    .event-desc { font-size: 13px; color: #665c54; margin-bottom: 12px; line-height: 1.5; }
    .event-hotline { font-size: 13px; color: #593e32; margin: 0; }

    /* Features Grid */
    .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 60px; text-align: center; }
    .feature-item { background: #fff; padding: 30px 20px; border-radius: 14px; border: 1px solid #f0e9e4; }
    .feat-icon { font-size: 28px; display: block; margin-bottom: 15px; }
    .feature-item h4 { font-size: 15px; margin: 0 0 10px 0; color: #2c221e; font-weight: 600; }
    .feature-item p { font-size: 12px; color: #665c54; line-height: 1.5; margin: 0; }

    /* Footer Exact Match */
    .site-footer { background: #2c221e; color: #d4ccc6; padding: 60px 50px 25px 50px; margin-top: 80px; text-align: left; }
    .footer-content { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; max-width: 1100px; margin: 0 auto 35px auto; }
    .footer-logo { color: #fff; font-size: 22px; font-family: serif; margin-bottom: 12px; }
    .footer-desc { font-size: 13px; line-height: 1.6; color: #a3968e; margin-bottom: 20px; }
    .social-icons { display: flex; gap: 10px; }
    .soc-icon { width: 32px; height: 32px; background: #3f322b; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; text-decoration: none; font-size: 13px; }
    
    .footer-col h5 { color: #fff; font-size: 13px; margin-bottom: 15px; font-weight: 600; letter-spacing: 0.5px; }
    .footer-col a, .footer-col p { display: block; color: #a3968e; text-decoration: none; font-size: 13px; margin-bottom: 10px; line-height: 1.5; }
    .footer-col a:hover { color: #fff; }
    
    /* Newsletter Row */
    .footer-newsletter-row { max-width: 1100px; margin: 0 auto 35px auto; border-top: 1px solid #3f322b; border-bottom: 1px solid #3f322b; padding: 25px 0; display: flex; justify-content: flex-end; }
    .newsletter-inner { display: flex; align-items: center; gap: 20px; }
    .newsletter-label { font-size: 12px; font-weight: 600; letter-spacing: 1px; color: #fff; }
    .newsletter-input-group { display: flex; background: #3f322b; border-radius: 6px; overflow: hidden; }
    .newsletter-input-group input { background: transparent; border: none; padding: 10px 15px; color: #fff; outline: none; font-size: 13px; width: 240px; }
    .newsletter-input-group button { background: #593e32; color: #fff; border: none; padding: 0 22px; font-weight: bold; cursor: pointer; font-size: 13px; }

    .footer-bottom { text-align: center; font-size: 12px; color: #8c7b72; max-width: 1100px; margin: 0 auto; }
  `]
})
export class OrderTrackComponent {
  trackCode: string = '';
  trackPhone: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  searchResult: any = null;

  constructor(
    private orderService: OrderService,
    private router: Router
  ) {}

  onTrackSubmit() {
    if (!this.trackCode || !this.trackPhone) {
      this.errorMessage = 'Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.searchResult = null;

    this.orderService.trackOrder(this.trackCode, this.trackPhone).subscribe({
      next: (response: any) => {
        this.searchResult = response.order;
        this.isLoading = false;
        if (response.trackToken) {
          sessionStorage.setItem('trackToken', response.trackToken);
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Không tìm thấy đơn hàng khớp với thông tin đã nhập.';
      }
    });
  }

  goToDetail(orderId: string) {
    this.router.navigate(['/orders', orderId]);
  }
}