import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-wrapper">
      <!-- HEADER CHUẨN SWEETCAKE -->
      <header class="site-header">
        <div class="logo-area">
          <a routerLink="/" class="logo-text">SweetCake</a>
        </div>
        <nav class="nav-links">
          <a routerLink="/menu" class="nav-item">Menu</a>
          <a routerLink="/orders" class="nav-item active">Đơn hàng</a>
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
      <main class="main-container">
        <div class="header-row">
          <div>
            <h1>Đơn hàng của tôi</h1>
            <p class="subtitle">Theo dõi trạng thái làm bánh, quản lý yêu cầu hủy hoặc đặt lại hương vị yêu thích.</p>
          </div>
          <a routerLink="/track" class="btn-track-link">🔍 Tra cứu đơn vãng lai</a>
        </div>

        <!-- TABS LỌC NHÓM TRẠNG THÁI -->
        <div class="tabs-bar">
          <button
            *ngFor="let tab of tabs"
            class="tab-btn"
            [class.active]="activeGroup === tab.key"
            (click)="selectTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div *ngIf="loading" class="state-box">Đang tải danh sách đơn hàng...</div>

        <div *ngIf="!loading && orders.length === 0" class="state-box">
          <p>Chưa có đơn hàng nào trong mục này.</p>
          <a routerLink="/track" class="btn-outline">Tra cứu đơn bằng mã & SĐT</a>
        </div>

        <!-- DANH SÁCH THẺ ĐƠN HÀNG -->
        <div class="orders-grid" *ngIf="!loading && orders.length > 0">
          <div class="order-card" *ngFor="let o of orders">
            <div class="card-top">
              <div>
                <span class="order-code">#{{ o.code }}</span>
                <span class="order-date"> • {{ o.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <span class="badge" [ngClass]="'st-' + o.status">{{ getStatusLabel(o.status) }}</span>
            </div>

            <div class="card-body">
              <div class="items-summary">
                <p *ngFor="let item of o.items">
                  <strong>{{ item.name }}</strong> (x{{ item.qty }})
                  <span *ngIf="item.variant" class="muted"> - {{ item.variant }}</span>
                </p>
              </div>
              <div class="card-right">
                <span class="total-label">Tổng thanh toán</span>
                <span class="total-price">{{ o.total | number }} đ</span>
              </div>
            </div>

            <div class="card-footer">
              <span class="slot-info">Nhận bánh: {{ o.receiveDate | date:'dd/MM/yyyy' }} ({{ o.slotLabel }})</span>
              <div class="card-actions">
                <button class="btn-detail" (click)="viewDetail(o._id)">
                  {{ (o.status === 'done' || o.status === 'cancelled') ? 'Xem chi tiết / Mua lại' : 'Xem chi tiết' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- FOOTER CHUẨN SWEETCAKE -->
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
    .page-wrapper { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fcfbfa; color: #2c221e; min-height: 100vh; display: flex; flex-direction: column; }
    
    /* Header đồng bộ 100% */
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 60px; background: #fff; border-bottom: 1px solid #f0e9e4; position: sticky; top: 0; z-index: 100; }
    .logo-text { font-size: 26px; font-weight: bold; font-family: serif; color: #2c221e; text-decoration: none; }
    .nav-links { display: flex; gap: 40px; }
    .nav-item { text-decoration: none; color: #555; font-weight: 500; font-size: 15px; }
    .nav-item:hover, .nav-item.active { color: #9c4128; }
    .header-actions { display: flex; gap: 15px; }
    .icon-btn { font-size: 18px; text-decoration: none; }

    /* Main Content */
    .main-container { flex: 1; width: 100%; max-width: 860px; margin: 45px auto; padding: 0 20px; box-sizing: border-box; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    h1 { font-family: serif; font-size: 34px; margin: 0 0 6px 0; color: #2c221e; }
    .subtitle { color: #665c54; font-size: 14px; margin: 0; }
    .btn-track-link { text-decoration: none; font-size: 13px; font-weight: 600; color: #593e32; background: #fff; border: 1px solid #e6e1db; padding: 8px 14px; border-radius: 8px; }

    .tabs-bar { display: flex; gap: 10px; border-bottom: 1px solid #e6e1db; padding-bottom: 14px; margin-bottom: 24px; }
    .tab-btn { background: transparent; border: none; padding: 8px 18px; border-radius: 20px; font-size: 14px; font-weight: 600; color: #665c54; cursor: pointer; }
    .tab-btn.active { background: #593e32; color: #fff; }

    .state-box { background: #fff; padding: 55px 20px; text-align: center; border-radius: 16px; border: 1px solid #f0e9e4; color: #777; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
    .btn-outline { display: inline-block; margin-top: 12px; padding: 10px 18px; border: 1px solid #593e32; border-radius: 8px; color: #593e32; text-decoration: none; font-weight: 600; font-size: 13px; }

    .orders-grid { display: flex; flex-direction: column; gap: 16px; }
    .order-card { background: #fff; border-radius: 14px; padding: 22px; border: 1px solid #f0e9e4; box-shadow: 0 2px 12px rgba(0,0,0,0.02); }
    .card-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f5f1ed; padding-bottom: 12px; margin-bottom: 14px; }
    .order-code { font-weight: bold; font-size: 16px; font-family: serif; }
    .order-date { font-size: 12px; color: #8c7b72; }

    .badge { padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; background: #f3efe9; color: #593e32; }
    .st-cancelled { background: #fde8e8; color: #c81e1e; }
    .st-done { background: #def7ec; color: #03543f; }

    .card-body { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 16px; }
    .items-summary p { margin: 4px 0; font-size: 14px; }
    .muted { color: #888; font-size: 13px; }
    .card-right { text-align: right; }
    .total-label { display: block; font-size: 11px; color: #8c7b72; }
    .total-price { font-size: 17px; font-weight: bold; color: #9c4128; }

    .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px dashed #eee; font-size: 13px; color: #665c54; }
    .btn-detail { background: #1a1614; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; }

    /* Footer đồng bộ 100% */
    .site-footer { background: #2c221e; color: #d4ccc6; padding: 60px 50px 25px 50px; margin-top: 80px; text-align: left; }
    .footer-content { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; max-width: 1100px; margin: 0 auto 35px auto; }
    .footer-logo { color: #fff; font-size: 22px; font-family: serif; margin-bottom: 12px; }
    .footer-desc { font-size: 13px; line-height: 1.6; color: #a3968e; margin-bottom: 20px; }
    .social-icons { display: flex; gap: 10px; }
    .soc-icon { width: 32px; height: 32px; background: #3f322b; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; text-decoration: none; font-size: 13px; }
    .footer-col h5 { color: #fff; font-size: 13px; margin-bottom: 15px; font-weight: 600; letter-spacing: 0.5px; }
    .footer-col a, .footer-col p { display: block; color: #a3968e; text-decoration: none; font-size: 13px; margin-bottom: 10px; line-height: 1.5; }
    .footer-col a:hover { color: #fff; }
    .footer-newsletter-row { max-width: 1100px; margin: 0 auto 35px auto; border-top: 1px solid #3f322b; border-bottom: 1px solid #3f322b; padding: 25px 0; display: flex; justify-content: flex-end; }
    .newsletter-inner { display: flex; align-items: center; gap: 20px; }
    .newsletter-label { font-size: 12px; font-weight: 600; letter-spacing: 1px; color: #fff; }
    .newsletter-input-group { display: flex; background: #3f322b; border-radius: 6px; overflow: hidden; }
    .newsletter-input-group input { background: transparent; border: none; padding: 10px 15px; color: #fff; outline: none; font-size: 13px; width: 240px; }
    .newsletter-input-group button { background: #593e32; color: #fff; border: none; padding: 0 22px; font-weight: bold; cursor: pointer; font-size: 13px; }
    .footer-bottom { text-align: center; font-size: 12px; color: #8c7b72; max-width: 1100px; margin: 0 auto; }
  `]
})
export class OrderListComponent implements OnInit {
  tabs = [
    { key: 'active', label: 'Đang xử lý' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' }
  ];
  activeGroup = 'active';
  orders: any[] = [];
  loading = false;

  constructor(private orderService: OrderService, private router: Router) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  selectTab(group: string) {
    this.activeGroup = group;
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.orderService.getOrders({ group: this.activeGroup }).subscribe({
      next: (res) => {
        this.orders = res.items || [];
        this.loading = false;
      },
      error: () => {
        this.orders = [];
        this.loading = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'Chờ thanh toán',
      pending_approval: 'Chờ duyệt',
      accepted: 'Đã tiếp nhận',
      baking: 'Đang làm bánh',
      delivering: 'Đang giao',
      delivered: 'Đã giao',
      done: 'Hoàn thành',
      cancelled: 'Đã hủy'
    };
    return map[status] || status;
  }

  viewDetail(id: string) {
    this.router.navigate(['/orders', id]);
  }
}