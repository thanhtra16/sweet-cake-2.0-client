import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { CartDrawerComponent } from '@features/buyer/components/cart-drawer/cart-drawer';
import { CartService } from '@shared/services/cart.service';

@Component({
  selector: 'app-buyer-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    CartDrawerComponent,
  ],
  template: `
    <div class="buyer-shell">
      <!-- ==================== HEADER (MEGA MENU) ==================== -->
      <header (mouseleave)="showMegaMenu = false">
        <a routerLink="/danh-sach-san-pham" class="brand-link">
          <h1 class="tieu-de-lon logo-text">SweetCake</h1>
        </a>

        <nav class="chu-thuong nav-links">
          <a routerLink="/danh-sach-san-pham" routerLinkActive="active-nav" (mouseenter)="showMegaMenu = true">
            Sản phẩm <i class="bi bi-chevron-down" style="font-size: 11px;"></i>
          </a>
          <a routerLink="/orders" routerLinkActive="active-nav">Đơn hàng</a>
          <a routerLink="/track" routerLinkActive="active-nav">Tra cứu đơn</a>
          <a routerLink="/blog" routerLinkActive="active-nav">Blog</a>
          <a routerLink="/gioi-thieu" routerLinkActive="active-nav">Giới thiệu</a>
          <a routerLink="/lien-he" routerLinkActive="active-nav">Liên hệ</a>
        </nav>

        <div class="header-icons">
          <a routerLink="/orders" title="Đơn hàng của tôi" class="icon-btn">
            <i class="bi bi-receipt"></i>
          </a>

          <!-- Giỏ hàng: mở ngăn kéo -->
          <button
            type="button"
            class="icon-btn cart-btn"
            title="Giỏ hàng"
            aria-label="Mở giỏ hàng"
            (click)="openCart()"
          >
            <i class="bi bi-bag"></i>
            @if ((cartCount$ | async); as count) {
              <span class="cart-badge">{{ count > 99 ? '99+' : count }}</span>
            }
          </button>

          <a routerLink="/quan-ly-tai-khoan" title="Tài khoản" class="icon-btn">
            <i class="bi bi-person"></i>
          </a>
        </div>

        <!-- MEGA MENU THẢ XUỐNG -->
        <div class="khung-menu-tha-lon" [class.dang-kich-hoat]="showMegaMenu">
          <div class="hop-chia-hai-vung-menu">
            <div class="vung-danh-muc-trai">
              <a
                *ngFor="let cat of categories"
                href="javascript:void(0)"
                [class.dang-chon]="selectedCategory === cat.key"
                (mouseenter)="selectedCategory = cat.key"
                routerLink="/danh-sach-san-pham"
                (click)="showMegaMenu = false"
              >
                {{ cat.label }}
              </a>
            </div>

            <div class="vung-hien-thi-phai">
              <div class="chu-de-muc-menu-phai">Gợi ý nổi bật từ SweetCake</div>
              <div class="luoi-hai-cot-menu">
                <a routerLink="/danh-sach-san-pham" (click)="showMegaMenu = false" class="dong-chi-tiet-mon-an">
                  <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&q=80" alt="Bánh kem sinh nhật" />
                  <div class="chu-khoi-mon-an">
                    <h4>Bánh Kem Sinh Nhật</h4>
                    <p>Cốt bánh bông lan mềm mịn, kem tươi ít ngọt thủ công mỗi ngày.</p>
                  </div>
                </a>
                <a routerLink="/danh-sach-san-pham" (click)="showMegaMenu = false" class="dong-chi-tiet-mon-an">
                  <img src="https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=200&q=80" alt="Bánh Bento" />
                  <div class="chu-khoi-mon-an">
                    <h4>Bánh Bento Mini</h4>
                    <p>Thiết kế nhỏ gọn, vẽ hình theo yêu cầu cho mọi dịp kỷ niệm.</p>
                  </div>
                </a>
                <a routerLink="/danh-sach-san-pham" (click)="showMegaMenu = false" class="dong-chi-tiet-mon-an">
                  <img src="https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=200&q=80" alt="Bánh Cưới & Sự Kiện" />
                  <div class="chu-khoi-mon-an">
                    <h4>Bánh Cưới & Sự Kiện</h4>
                    <p>Chế tác tinh xảo theo chủ đề tiệc sang trọng của riêng bạn.</p>
                  </div>
                </a>
                <a routerLink="/danh-sach-san-pham" (click)="showMegaMenu = false" class="dong-chi-tiet-mon-an">
                  <img src="https://images.unsplash.com/photo-1519869325930-281384150729?w=200&q=80" alt="Phụ kiện tiệc" />
                  <div class="chu-khoi-mon-an">
                    <h4>Phụ Kiện & Nến Chữ</h4>
                    <p>Nến sinh nhật, thiệp chúc mừng và bộ dao dĩa thân thiện môi trường.</p>
                  </div>
                </a>
              </div>

              <div class="hop-banner-nho-uu-dai">
                <div class="chu-noi-dung-uu-dai">
                  <h5>Ưu đãi 10% cho đơn đặt bánh đầu tiên</h5>
                  <p>Nhập mã WELCOME10 tại bước thanh toán để nhận ưu đãi ngay.</p>
                </div>
                <button routerLink="/danh-sach-san-pham" (click)="showMegaMenu = false" class="nut-dang-ky-uu-dai">
                  ĐẶT BÁNH NGAY
                </button>
              </div>
            </div>
          </div>

          <div class="thanh-day-menu-duoi">
            <span>SweetCake — Tiệm bánh thủ công tươi mới mỗi ngày</span>
            <div class="nhom-icon-m-duoi">
              <i class="bi bi-facebook"></i>
              <i class="bi bi-instagram"></i>
              <i class="bi bi-telephone-fill"></i>
            </div>
          </div>
        </div>
      </header>

      <!-- ==================== NỘI DUNG TRANG CON ==================== -->
      <main class="page-outlet">
        <router-outlet></router-outlet>
      </main>

      <!-- ==================== FOOTER ==================== -->
      <footer>
        <div class="footer-chinh">
          <div class="footer-tung-cot khung-thuong-hieu">
            <div class="footer-logo">SweetCake</div>
            <p class="footer-mo-ta">
              Tiệm bánh thủ công với tâm huyết mang lại những trải nghiệm ngọt ngào và tinh tế nhất cho khách hàng.
            </p>
            <div class="social-icons">
              <span class="bi bi-facebook"></span>
              <span class="bi bi-instagram"></span>
              <span class="bi bi-telephone-fill"></span>
            </div>
          </div>

          <div class="footer-tung-cot chu-thuong">
            <p>SẢN PHẨM</p>
            <a routerLink="/danh-sach-san-pham">Menu</a>
            <a routerLink="/danh-sach-san-pham">Best Seller</a>
            <a routerLink="/danh-sach-san-pham">Phụ kiện</a>
          </div>

          <div class="footer-tung-cot chu-thuong">
            <p>HỖ TRỢ</p>
            <a routerLink="/faq">Câu hỏi thường gặp (FAQ)</a>
            <a routerLink="/policies">Chính sách</a>
            <a routerLink="/gioi-thieu">Giới thiệu</a>
            <a routerLink="/orders">Đơn hàng của tôi</a>
          </div>

          <div class="footer-tung-cot chu-thuong">
            <p>ĐỊA CHỈ</p>
            <a>Nhóm 1, Đại học Kinh tế Luật</a>
            <a>Giờ mở cửa: 8:00 - 22:00</a>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="newsletter-box">
            <span class="newsletter-title">NHẬN TIN TỪ CHÚNG TÔI</span>
            <div class="newsletter-email-group">
              <input class="newsletter-nhap-email" type="email" placeholder="Email của bạn" />
              <button class="newsletter-gui-email" type="button">Gửi</button>
            </div>
          </div>
          <div class="ban-quyen">
            © 2026 SweetCake. Tất cả quyền được bảo lưu.
          </div>
        </div>
      </footer>

      <!-- ==================== NGĂN KÉO GIỎ HÀNG ==================== -->
      <app-cart-drawer></app-cart-drawer>
    </div>
  `,
  styles: [`
    .buyer-shell {
      background-color: #F9F6F2;
      font-family: 'Inter', sans-serif;
      color: #2D1B10;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page-outlet {
      flex: 1;
    }

    /* ==================== HEADER ==================== */
    header {
      position: relative;
      z-index: 1000;
      display: flex;
      background-color: #F9F6F2;
      padding: 16px 32px;
      border-bottom: 1px solid #EDE6DF;
      justify-content: space-between;
      align-items: center;
    }

    .brand-link {
      text-decoration: none;
    }

    header .logo-text {
      margin: 0;
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
      color: #2D1B10;
    }

    header .chu-thuong {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    header .chu-thuong a {
      text-decoration: none;
      color: #2D1B10;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.15s ease;
    }

    header .chu-thuong a:hover,
    header .chu-thuong a.active-nav {
      color: #7D562D;
      font-weight: 700;
    }

    header .header-icons {
      display: flex;
      gap: 18px;
      align-items: center;
    }

    .icon-btn {
      color: #2D1B10;
      font-size: 20px;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s ease;
    }

    .icon-btn:hover {
      color: #7D562D;
    }

    /* Nút giỏ hàng (là <button>) + số lượng */
    .cart-btn {
      position: relative;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
    }

    .cart-badge {
      position: absolute;
      top: -8px;
      right: -10px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: #a46b70;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      line-height: 18px;
      text-align: center;
    }

    /* MEGA MENU */
    .khung-menu-tha-lon {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      background-color: #fff;
      z-index: 999;
      box-shadow: 0 15px 30px rgba(0,0,0,0.08);
      border-top: 1px solid #f2e7df;
      display: none;
    }
    .khung-menu-tha-lon.dang-kich-hoat { display: block; }

    .hop-chia-hai-vung-menu {
      display: flex;
      width: 100%;
    }

    .vung-danh-muc-trai {
      width: 24%;
      background-color: #f5f0eb;
      padding: 32px 0 32px 40px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .vung-danh-muc-trai a {
      font-size: 14px;
      color: #5c483c;
      font-weight: 500;
      letter-spacing: 0.05em;
      padding-right: 20px;
      text-decoration: none;
    }
    .vung-danh-muc-trai a.dang-chon {
      color: #2D1B10;
      font-weight: 700;
      border-right: 3px solid #7a5232;
    }

    .vung-hien-thi-phai {
      width: 76%;
      padding: 32px 48px;
      display: flex;
      flex-direction: column;
    }
    .chu-de-muc-menu-phai {
      font-size: 18px;
      color: #2D1B10;
      font-weight: 700;
      margin-bottom: 20px;
    }

    .luoi-hai-cot-menu {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      row-gap: 20px;
      column-gap: 36px;
      margin-bottom: 28px;
    }
    .dong-chi-tiet-mon-an {
      display: flex;
      align-items: center;
      gap: 15px;
      text-decoration: none;
    }
    .dong-chi-tiet-mon-an img {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
    }
    .chu-khoi-mon-an h4 {
      font-family: 'Playfair Display', serif;
      font-size: 15px;
      color: #2D1B10;
      margin: 0 0 3px 0;
      font-weight: bold;
    }
    .chu-khoi-mon-an p {
      font-size: 12px;
      color: #777;
      line-height: 1.4;
      margin: 0;
    }

    .hop-banner-nho-uu-dai {
      background-color: #fdf5f7;
      border-radius: 8px;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }
    .chu-noi-dung-uu-dai h5 {
      font-size: 15px;
      color: #2D1B10;
      font-weight: bold;
      margin: 0 0 3px 0;
    }
    .chu-noi-dung-uu-dai p {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
    .nut-dang-ky-uu-dai {
      background-color: #7a5232;
      color: #fff;
      border: none;
      padding: 10px 22px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
    }

    .thanh-day-menu-duoi {
      background-color: #2D1B10;
      color: #fff;
      padding: 10px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .thanh-day-menu-duoi .nhom-icon-m-duoi {
      display: flex;
      gap: 15px;
      font-size: 15px;
    }

    /* ==================== FOOTER ==================== */
    footer {
      background-color: #402C20;
      color: #FFEDE5;
      padding: 60px 20px 30px 20px;
      margin: 0;
    }
    footer a {
      color: #cbbcb1;
      text-decoration: none;
      margin-bottom: 12px;
      display: block;
      font-size: 14px;
    }
    footer a:hover { color: #fff; }

    .footer-chinh {
      max-width: 1240px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 30px;
    }
    .footer-tung-cot {
      display: flex;
      flex-direction: column;
    }
    footer .khung-thuong-hieu {
      flex: 2;
      max-width: 320px;
    }
    .footer-logo {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      color: #FFEDE5;
      margin-bottom: 20px;
      font-weight: bold;
    }
    .footer-mo-ta {
      font-family: 'Playfair Display', serif;
      line-height: 24px;
      color: #FFEDE5;
      font-size: 15px;
      font-weight: normal;
      text-align: justify;
      margin-bottom: 20px;
    }
    footer .chu-thuong {
      font-size: 14px;
      color: #CEC4C9;
      line-height: 16px;
      font-family: 'Inter', sans-serif;
    }
    footer p {
      font-size: 14px;
      color: #FFEDE5;
      line-height: 16px;
      font-family: 'Inter', sans-serif;
      font-weight: bold;
      margin-top: 0;
    }

    .social-icons { display: flex; gap: 12px; }
    .social-icons span {
      background-color: #fff;
      color: #3b2314;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
    }

    .footer-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 40px;
    }
    .newsletter-box {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .newsletter-title {
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 1px;
      color: #FFEDE5;
      font-family: 'Inter', sans-serif;
    }
    .newsletter-email-group { display: flex; gap: 10px; }
    .newsletter-nhap-email {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      width: 300px;
      background-color: #fdfaf7;
      outline: none;
      font-size: 14px;
    }
    .newsletter-gui-email {
      padding: 12px 24px;
      border: none;
      background-color: #724e32;
      color: #fff;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
    }
    .newsletter-email-group button:hover { background-color: #895d3d; }

    footer .ban-quyen {
      font-size: 14px;
      color: #FFEDE5;
      line-height: 16px;
      font-family: 'Inter', sans-serif;
      margin-top: 24px;
    }

    @media (max-width: 900px) {
      header .chu-thuong { display: none; }
      .footer-chinh { flex-wrap: wrap; }
    }
    @media (max-width: 520px) {
      .footer-chinh { flex-direction: column; }
      .newsletter-box { flex-direction: column; }
      .newsletter-nhap-email { width: 100%; }
    }
  `]
})
export class BuyerLayoutComponent {
  private readonly cartService = inject(CartService);

  /** Tổng số lượng trong giỏ, hiện trên icon giỏ hàng. */
  readonly cartCount$ = this.cartService.totalItems$;

  showMegaMenu = false;
  selectedCategory = 'birthday';

  categories = [
    { key: 'birthday', label: 'BÁNH KEM SINH NHẬT' },
    { key: 'bento', label: 'BÁNH BENTO MINI' },
    { key: 'wedding', label: 'BÁNH CƯỚI & SỰ KIỆN' },
    { key: 'accessories', label: 'PHỤ KIỆN & NẾN' }
  ];

  openCart(): void {
    this.showMegaMenu = false;
    this.cartService.openDrawer();
  }
}