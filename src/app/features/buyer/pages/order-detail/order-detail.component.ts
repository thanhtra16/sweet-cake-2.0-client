import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

      <main class="main-container" *ngIf="order; else loadingTpl">
        <div class="top-bar">
          <button class="btn-back" (click)="goBack()">← Quay lại</button>
          <span class="status-pill" [ngClass]="'status-' + order.status">
            {{ getStatusLabel(order.status) }}
          </span>
        </div>

        <!-- THÔNG BÁO THÀNH CÔNG / LỖI -->
        <div *ngIf="toastMessage" class="alert-banner" [class.error]="toastType === 'error'">
          {{ toastMessage }}
        </div>

        <!-- THÔNG TIN CHÍNH -->
        <div class="detail-card">
          <div class="order-head">
            <div>
              <span class="mini-label">MÃ ĐƠN HÀNG</span>
              <h1>#{{ order.code }}</h1>
              <p class="sub-date">Đặt lúc {{ order.createdAt | date:'HH:mm - dd/MM/yyyy' }}</p>
            </div>

            <!-- CÁC NÚT HÀNH ĐỘNG CHÍNH -->
            <div class="action-buttons">
              <button
                *ngIf="canDirectCancel()"
                class="btn-danger-outline"
                (click)="openCancelModal('direct')"
              >
                Hủy đơn hàng
              </button>

              <button
                *ngIf="canRequestCancel()"
                class="btn-warning-outline"
                (click)="openCancelModal('request')"
              >
                Yêu cầu hủy đơn
              </button>

              <button
                *ngIf="canReorder()"
                class="btn-primary"
                (click)="openReorderModal()"
              >
                🔄 Mua lại đơn này
              </button>
            </div>
          </div>

          <!-- TRẠNG THÁI YÊU CẦU HỦY (NẾU CÓ) -->
          <div *ngIf="order.cancelRequest?.status" class="info-box warning-box">
            <strong>📌 Trạng thái yêu cầu hủy:</strong>
            <span *ngIf="order.cancelRequest.status === 'pending'">
              Đang chờ cửa hàng xem xét (Gửi lúc {{ order.cancelRequest.requestedAt | date:'HH:mm dd/MM' }})
            </span>
            <span *ngIf="order.cancelRequest.status === 'accepted'">
              Đã được chấp thuận hủy.
            </span>
            <span *ngIf="order.cancelRequest.status === 'rejected'">
              Bị từ chối — Lý do: "{{ order.cancelRequest.decisionReason || 'Bánh đã vào công đoạn hoàn thiện' }}"
            </span>
          </div>

          <!-- THÔNG TIN HỦY & HOÀN TIỀN (NẾU ĐÃ HỦY) -->
          <div *ngIf="order.status === 'cancelled'" class="info-box cancel-box">
            <h4>❌ Đơn hàng đã bị hủy</h4>
            <p><strong>Lý do:</strong> {{ order.cancel?.reason || order.cancel?.reasonCode || 'Không có ghi chú' }}</p>
            <p *ngIf="order.cancel?.cancelledAt"><strong>Thời gian hủy:</strong> {{ order.cancel.cancelledAt | date:'HH:mm dd/MM/yyyy' }}</p>

            <div *ngIf="order.refund && order.refund.status !== 'none'" class="refund-subbox">
              <h5>💰 Thông tin hoàn tiền</h5>
              <p><strong>Số tiền hoàn:</strong> <span class="price-highlight">{{ order.refund.amount | number }} đ</span></p>
              <p>
                <strong>Trạng thái hoàn:</strong>
                <span class="refund-badge" [ngClass]="'ref-' + order.refund.status">
                  {{ order.refund.status === 'completed' ? 'Đã hoàn tiền thành công' : 'Đang chờ xử lý hoàn tiền' }}
                </span>
              </p>
              <p *ngIf="order.refund.dueAt && order.refund.status === 'pending'">
                <strong>Hạn hoàn dự kiến:</strong> {{ order.refund.dueAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
              <p *ngIf="order.refund.completedAt">
                <strong>Đã hoàn lúc:</strong> {{ order.refund.completedAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
          </div>

          <!-- THÔNG TIN NGƯỜI NHẬN -->
          <div class="info-grid">
            <div class="info-col">
              <h4>Người nhận bánh</h4>
              <p><strong>{{ order.receiver?.name }}</strong></p>
              <p>SĐT: {{ order.receiver?.phone }}</p>
              <p *ngIf="order.receiveMethod === 'delivery'">
                Giao tận nơi: {{ order.shippingAddress?.street }}, {{ order.shippingAddress?.ward }}, {{ order.shippingAddress?.district }}
              </p>
              <p *ngIf="order.receiveMethod === 'pickup'">
                Nhận tại tiệm: {{ order.pickupBranch || 'Chi nhánh chính SweetCake' }}
              </p>
            </div>
            <div class="info-col">
              <h4>Thời gian nhận & Thanh toán</h4>
              <p>Ngày nhận: <strong>{{ order.receiveDate | date:'dd/MM/yyyy' }}</strong></p>
              <p>Khung giờ: <strong>{{ order.slotLabel }}</strong></p>
              <p>Thanh toán: {{ order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán' }}</p>
            </div>
          </div>

          <!-- DANH SÁCH SẢN PHẨM -->
          <div class="items-section">
            <h4>Chi tiết sản phẩm</h4>
            <div class="item-row" *ngFor="let item of order.items">
              <div class="item-left">
                <div class="item-title">{{ item.name }} <span class="qty">x{{ item.qty }}</span></div>
                <div class="item-meta" *ngIf="item.variant">Phân loại: {{ item.variant }}</div>
              </div>
              <div class="item-price">{{ item.lineTotal | number }} đ</div>
            </div>
          </div>

          <!-- TỔNG TIỀN -->
          <div class="summary-section">
            <div class="sum-row"><span>Tạm tính</span><span>{{ order.subtotal | number }} đ</span></div>
            <div class="sum-row" *ngIf="order.discount"><span>Giảm giá</span><span>-{{ order.discount | number }} đ</span></div>
            <div class="sum-row"><span>Phí giao hàng</span><span>{{ order.deliveryFee | number }} đ</span></div>
            <div class="sum-row total"><span>Tổng cộng</span><span>{{ order.total | number }} đ</span></div>
          </div>
        </div>
      </main>

      <ng-template #loadingTpl>
        <div class="main-container loading-state">
          <p *ngIf="!loadError">Đang tải thông tin đơn hàng...</p>
          <p *ngIf="loadError" class="error-text">{{ loadError }}</p>
        </div>
      </ng-template>

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

      <!-- ==================== MODAL 1: HỦY / YÊU CẦU HỦY ĐƠN ==================== -->
      <div class="modal-backdrop" *ngIf="showCancelModal" (click)="closeCancelModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>{{ cancelMode === 'direct' ? 'Xác nhận hủy đơn hàng' : 'Gửi yêu cầu hủy đơn hàng' }}</h3>
          <p class="modal-desc">
            {{ cancelMode === 'direct'
              ? 'Đơn hàng chưa tiến hành làm bánh nên sẽ được hủy ngay lập tức.'
              : 'Đơn hàng đã được tiếp nhận/chế biến. Yêu cầu của bạn sẽ được gửi tới quản lý tiệm để xem xét.' }}
          </p>

          <div class="policy-preview" *ngIf="order?.paymentStatus === 'paid'">
            <strong>Chính sách hoàn tiền ước tính:</strong>
            <span *ngIf="order.status === 'pending_approval'">Hoàn 100% ({{ order.total | number }} đ) do tiệm chưa duyệt đơn.</span>
            <span *ngIf="order.status === 'accepted'">Dự kiến hoàn 100% nếu tiệm chấp thuận trước khi vào bếp.</span>
            <span *ngIf="order.status === 'baking'">Bánh đang làm, mức hoàn tiền phụ thuộc vào tiến độ nguyên liệu thực tế.</span>
            <span *ngIf="order.status === 'delivering'">Đơn đang giao, có thể không được hoàn tiền nếu hủy ngang.</span>
          </div>

          <div class="form-group">
            <label>Chọn lý do hủy *</label>
            <select [(ngModel)]="cancelReasonCode" class="form-control">
              <option value="change_mind">Đổi ý / Không còn nhu cầu</option>
              <option value="wrong_info">Đặt nhầm mẫu bánh / sai thông tin nhận</option>
              <option value="change_schedule">Thay đổi lịch trình / thời gian tiệc</option>
              <option value="other">Lý do khác...</option>
            </select>
          </div>

          <div class="form-group">
            <label>Ghi chú chi tiết {{ cancelReasonCode === 'other' ? '*' : '(Không bắt buộc)' }}</label>
            <textarea
              rows="3"
              [(ngModel)]="cancelReasonText"
              class="form-control"
              placeholder="Nhập thêm chi tiết để cửa hàng hỗ trợ nhanh nhất..."
            ></textarea>
          </div>

          <p *ngIf="modalError" class="error-text">{{ modalError }}</p>

          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeCancelModal()" [disabled]="submittingCancel">Đóng</button>
            <button class="btn-danger" (click)="submitCancel()" [disabled]="submittingCancel">
              {{ submittingCancel ? 'Đang xử lý...' : (cancelMode === 'direct' ? 'Xác nhận hủy' : 'Gửi yêu cầu hủy') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== MODAL 2: MUA LẠI ĐƠN HÀNG ==================== -->
      <div class="modal-backdrop" *ngIf="showReorderModal" (click)="closeReorderModal()">
        <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
          <h3>🔄 Mua lại từ đơn #{{ order?.code }}</h3>
          <p class="modal-desc">Hệ thống đã kiểm tra tình trạng hiện tại và giá bán mới nhất của từng sản phẩm.</p>

          <div *ngIf="loadingPreview" class="loading-mini">Đang kiểm tra sản phẩm...</div>

          <div *ngIf="!loadingPreview && reorderPreview">
            <div *ngIf="reorderPreview.unavailableItems?.length > 0" class="unavailable-alert">
              <strong>⚠️ Một số sản phẩm hiện đã ngừng bán và không thể đặt lại:</strong>
              <ul>
                <li *ngFor="let u of reorderPreview.unavailableItems">
                  {{ u.name }} — <em>{{ u.reason }}</em>
                </li>
              </ul>
            </div>

            <div *ngIf="reorderPreview.availableItems?.length > 0" class="preview-list">
              <label class="section-sub">Chọn sản phẩm muốn mua lại:</label>
              <div class="preview-item" *ngFor="let item of reorderPreview.availableItems">
                <input
                  type="checkbox"
                  [checked]="selectedReorderIds.has(item.orderItemId)"
                  (change)="toggleReorderItem(item.orderItemId)"
                />
                <div class="p-info">
                  <div class="p-name">{{ item.name }} (x{{ item.qty }})</div>
                  <div class="p-sub" *ngIf="item.variant">{{ item.variant }}</div>
                  <div class="price-change-tag" *ngIf="item.priceChanged">
                    Giá cập nhật: <s>{{ item.oldUnitPrice | number }} đ</s> → <strong>{{ item.unitPrice | number }} đ</strong>
                  </div>
                </div>
                <div class="p-total">{{ item.lineTotal | number }} đ</div>
              </div>
            </div>

            <div class="slot-picker-grid" *ngIf="reorderPreview.availableItems?.length > 0">
              <div class="form-group">
                <label>Ngày nhận bánh mới *</label>
                <input type="date" [(ngModel)]="reorderDate" [min]="minDate" class="form-control" />
              </div>
              <div class="form-group">
                <label>Khung giờ nhận *</label>
                <select [(ngModel)]="reorderSlotId" class="form-control">
                  <option value="slot_morning">08:00 - 11:00 (Buổi sáng)</option>
                  <option value="slot_afternoon">14:00 - 17:00 (Buổi chiều)</option>
                  <option value="slot_evening">18:00 - 20:30 (Buổi tối)</option>
                </select>
              </div>
            </div>
          </div>

          <p *ngIf="modalError" class="error-text">{{ modalError }}</p>

          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeReorderModal()" [disabled]="submittingReorder">Hủy</button>
            <button
              class="btn-primary"
              (click)="submitReorder()"
              [disabled]="submittingReorder || loadingPreview || selectedReorderIds.size === 0"
            >
              {{ submittingReorder ? 'Đang tạo đơn...' : 'Đặt đơn mới ngay' }}
            </button>
          </div>
        </div>
      </div>
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
    .main-container { flex: 1; width: 100%; max-width: 860px; margin: 40px auto; padding: 0 20px; box-sizing: border-box; }
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .btn-back { background: #fff; border: 1px solid #dcd3cb; padding: 8px 16px; border-radius: 8px; cursor: pointer; color: #443831; font-weight: 500; }
    
    .status-pill { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; background: #f0e9e4; color: #593e32; }
    .status-cancelled { background: #fde8e8; color: #c81e1e; }
    .status-done { background: #def7ec; color: #03543f; }

    .alert-banner { background: #def7ec; color: #03543f; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; font-weight: 500; }
    .alert-banner.error { background: #fde8e8; color: #c81e1e; }

    .detail-card { background: #fff; border-radius: 16px; padding: 32px; border: 1px solid #f0e9e4; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
    .order-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f3efe9; padding-bottom: 24px; margin-bottom: 24px; flex-wrap: wrap; gap: 15px; }
    .mini-label { font-size: 11px; color: #8c7b72; font-weight: 600; letter-spacing: 0.8px; }
    h1 { font-family: serif; font-size: 28px; margin: 4px 0; }
    .sub-date { font-size: 13px; color: #777; margin: 0; }

    .action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-primary { background: #593e32; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { background: #422d24; }
    .btn-danger-outline { background: #fff; color: #c81e1e; border: 1px solid #f8b4b4; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-warning-outline { background: #fff; color: #b45309; border: 1px solid #fcd34d; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }

    .info-box { padding: 16px; border-radius: 10px; margin-bottom: 24px; font-size: 14px; line-height: 1.6; }
    .warning-box { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .cancel-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .cancel-box h4 { margin: 0 0 8px 0; }
    .refund-subbox { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #fca5a5; }
    .refund-subbox h5 { margin: 0 0 6px 0; font-size: 14px; }
    .price-highlight { font-weight: bold; font-size: 16px; }
    .refund-badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .ref-pending { background: #fef3c7; color: #92400e; }
    .ref-completed { background: #def7ec; color: #03543f; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .info-col h4 { font-size: 14px; color: #8c7b72; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-col p { margin: 4px 0; font-size: 14px; }

    .items-section h4 { font-size: 15px; margin: 0 0 12px 0; border-bottom: 1px solid #f3efe9; padding-bottom: 8px; }
    .item-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f9f7f5; }
    .item-title { font-weight: 600; font-size: 15px; }
    .qty { color: #8c7b72; font-weight: normal; margin-left: 6px; }
    .item-meta { font-size: 12px; color: #777; margin-top: 2px; }
    .item-price { font-weight: 600; }

    .summary-section { margin-top: 20px; max-width: 320px; margin-left: auto; }
    .sum-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; color: #665c54; }
    .sum-row.total { font-size: 17px; font-weight: bold; color: #9c4128; border-top: 1px solid #eee; padding-top: 10px; margin-top: 10px; }

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

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
    .modal-card.modal-lg { max-width: 600px; }
    .modal-card h3 { margin: 0 0 8px 0; font-family: serif; font-size: 22px; }
    .modal-desc { font-size: 13px; color: #665c54; margin-bottom: 18px; line-height: 1.5; }
    .policy-preview { background: #fdf8f3; border: 1px solid #f3e5d8; padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; color: #593e32; }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .form-control { width: 100%; padding: 10px 12px; border: 1px solid #dcd3cb; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    .error-text { color: #c81e1e; font-size: 13px; margin: 8px 0; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
    .btn-secondary { background: #f3efe9; color: #443831; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-danger { background: #c81e1e; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }

    /* Reorder Preview */
    .unavailable-alert { background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; font-size: 13px; color: #991b1b; margin-bottom: 14px; }
    .unavailable-alert ul { margin: 6px 0 0 18px; padding: 0; }
    .preview-list { max-height: 220px; overflow-y: auto; border: 1px solid #f0e9e4; border-radius: 10px; padding: 12px; margin-bottom: 16px; }
    .section-sub { font-size: 12px; font-weight: 600; color: #8c7b72; display: block; margin-bottom: 8px; }
    .preview-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f7f4f0; }
    .p-info { flex: 1; }
    .p-name { font-weight: 600; font-size: 14px; }
    .p-sub { font-size: 12px; color: #777; }
    .price-change-tag { font-size: 12px; color: #b45309; margin-top: 2px; }
    .p-total { font-weight: 600; font-size: 14px; }
    .slot-picker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .loading-state { text-align: center; padding: 80px 20px; }
  `]
})
export class OrderDetailComponent implements OnInit {
  orderId = '';
  order: any = null;
  loadError = '';
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  showCancelModal = false;
  cancelMode: 'direct' | 'request' = 'direct';
  cancelReasonCode = 'change_mind';
  cancelReasonText = '';
  submittingCancel = false;

  showReorderModal = false;
  loadingPreview = false;
  reorderPreview: any = null;
  selectedReorderIds = new Set<string>();
  reorderDate = '';
  reorderSlotId = 'slot_morning';
  minDate = new Date().toISOString().split('T')[0];
  submittingReorder = false;

  modalError = '';

  private slotLabels: Record<string, string> = {
    slot_morning: '08:00 - 11:00 (Buổi sáng)',
    slot_afternoon: '14:00 - 17:00 (Buổi chiều)',
    slot_evening: '18:00 - 20:30 (Buổi tối)'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.orderId = id;
        this.fetchOrder();
      }
    });
  }

  fetchOrder() {
    this.orderService.getCustomerOrderById(this.orderId).subscribe({
      next: (res) => {
        this.order = res;
      },
      error: (err) => {
        this.loadError = err.error?.message || 'Không thể tải chi tiết đơn hàng.';
      }
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending_payment: 'Chờ thanh toán',
      pending_approval: 'Chờ duyệt đơn',
      accepted: 'Đã tiếp nhận',
      baking: 'Đang làm bánh',
      delivering: 'Đang giao hàng',
      delivered: 'Đã giao tới nơi',
      done: 'Hoàn thành',
      cancelled: 'Đã hủy'
    };
    return map[status] || status;
  }

  canDirectCancel(): boolean {
    return ['pending_payment', 'pending_approval'].includes(this.order?.status);
  }

  canRequestCancel(): boolean {
    return (
      ['accepted', 'baking', 'delivering'].includes(this.order?.status) &&
      !this.order?.cancelRequest?.status
    );
  }

  canReorder(): boolean {
    return ['done', 'cancelled'].includes(this.order?.status);
  }

  openCancelModal(mode: 'direct' | 'request') {
    this.cancelMode = mode;
    this.cancelReasonCode = 'change_mind';
    this.cancelReasonText = '';
    this.modalError = '';
    this.showCancelModal = true;
  }

  closeCancelModal() {
    this.showCancelModal = false;
  }

  submitCancel() {
    if (this.cancelReasonCode === 'other' && !this.cancelReasonText.trim()) {
      this.modalError = 'Vui lòng nhập chi tiết lý do hủy đơn.';
      return;
    }

    this.submittingCancel = true;
    this.modalError = '';

    const obs =
      this.cancelMode === 'direct'
        ? this.orderService.cancelOrder(this.orderId, this.cancelReasonCode, this.cancelReasonText)
        : this.orderService.createCancelRequest(this.orderId, this.cancelReasonCode, this.cancelReasonText);

    obs.subscribe({
      next: (updatedOrder) => {
        this.order = updatedOrder;
        this.submittingCancel = false;
        this.showCancelModal = false;
        this.showToast(
          this.cancelMode === 'direct'
            ? 'Đã hủy đơn hàng thành công.'
            : 'Đã gửi yêu cầu hủy đơn tới cửa hàng!',
          'success'
        );
      },
      error: (err) => {
        this.submittingCancel = false;
        this.modalError = err.error?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      }
    });
  }

  openReorderModal() {
    this.showReorderModal = true;
    this.loadingPreview = true;
    this.modalError = '';
    this.selectedReorderIds.clear();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.reorderDate = tomorrow.toISOString().split('T')[0];

    this.orderService.reorderOrder(this.orderId, { mode: 'preview' }).subscribe({
      next: (res) => {
        this.reorderPreview = res;
        this.loadingPreview = false;
        (res.availableItems || []).forEach((item: any) => {
          this.selectedReorderIds.add(item.orderItemId);
        });
      },
      error: (err) => {
        this.loadingPreview = false;
        this.modalError = err.error?.message || 'Không thể kiểm tra dữ liệu đơn cũ.';
      }
    });
  }

  closeReorderModal() {
    this.showReorderModal = false;
  }

  toggleReorderItem(itemId: string) {
    if (this.selectedReorderIds.has(itemId)) {
      this.selectedReorderIds.delete(itemId);
    } else {
      this.selectedReorderIds.add(itemId);
    }
  }

  submitReorder() {
    if (!this.reorderDate) {
      this.modalError = 'Vui lòng chọn ngày nhận bánh mới.';
      return;
    }

    this.submittingReorder = true;
    this.modalError = '';

    const payload = {
      mode: 'create',
      selectedItemIds: Array.from(this.selectedReorderIds),
      receiveDate: this.reorderDate,
      slotId: this.reorderSlotId,
      slotLabel: this.slotLabels[this.reorderSlotId] || this.reorderSlotId
    };

    this.orderService.reorderOrder(this.orderId, payload).subscribe({
      next: (res) => {
        this.submittingReorder = false;
        this.showReorderModal = false;
        this.showToast(`Đã tạo đơn mới #${res.order.code} thành công!`, 'success');
        this.router.navigate(['/orders', res.order._id]);
      },
      error: (err) => {
        this.submittingReorder = false;
        this.modalError = err.error?.message || 'Không thể tạo đơn mua lại.';
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => (this.toastMessage = ''), 4500);
  }

  goBack() {
    this.router.navigate(['/orders']);
  }
}