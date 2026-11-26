import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="orders-page">
      <div class="page-wrapper">
        <!-- 1. BANNER CHÀO KHÁCH HÀNG THÂN THIẾT -->
        <section class="welcome-banner">
          <div class="welcome-left">
            <div class="tier-icon"><i class="bi bi-award"></i></div>
            <div>
              <div class="tier-meta">KHÁCH HÀNG THÂN THIẾT • Thành viên từ 2026</div>
              <h1>Chào {{ customerName }}, sẵn sàng cho tiệc ngọt hôm nay?</h1>
            </div>
          </div>

          <div class="welcome-stats">
            <div class="stat-pill">
              <i class="bi bi-bag-check"></i>
              <div>
                <span class="st-label">Tổng đơn hoàn tất</span>
                <strong class="st-val">{{ completedCount | number: '2.0-0' }} đơn</strong>
              </div>
            </div>
            <div class="stat-pill">
              <i class="bi bi-stars"></i>
              <div>
                <span class="st-label">Điểm tích lũy</span>
                <strong class="st-val">{{ rewardPoints }} điểm</strong>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. THANH TÌM KIẾM & LỌC -->
        <section class="filter-bar">
          <div class="search-input-wrap">
            <i class="bi bi-search"></i>
            <input
              type="text"
              [(ngModel)]="searchKeyword"
              (input)="applyClientFilter()"
              placeholder="Tìm theo mã đơn (#SC-...) hoặc tên bánh kem..."
            />
          </div>

          <div class="filter-controls">
            <div class="phone-box">
              <i class="bi bi-telephone"></i>
              <input
                type="text"
                [(ngModel)]="phoneSearch"
                (keyup.enter)="loadOrders()"
                placeholder="SĐT nhận hàng..."
              />
            </div>

            <select [(ngModel)]="statusFilter" (change)="applyClientFilter()" class="status-select">
              <option value="">Tất cả trạng thái</option>
              <option value="pending_payment">Chờ thanh toán</option>
              <option value="pending_approval">Chờ duyệt</option>
              <option value="accepted">Đã tiếp nhận</option>
              <option value="baking">Đang làm bánh</option>
              <option value="delivering">Đang giao</option>
              <option value="done">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <a routerLink="/track" class="btn-track-mini">Tra cứu mã</a>
          </div>
        </section>

        <!-- 3. TABS CHUYỂN ĐỔI -->
        <div class="main-tabs">
          <button
            class="m-tab"
            [class.active]="activeTab === 'active'"
            (click)="switchTab('active')"
          >
            <i class="bi bi-clock-history"></i>
            Đang xử lý
            <span class="count-badge">{{ activeCount }}</span>
          </button>

          <button
            class="m-tab"
            [class.active]="activeTab === 'history'"
            (click)="switchTab('history')"
          >
            <i class="bi bi-journal-check"></i>
            Lịch sử đơn hàng
            <span class="count-badge">{{ historyCount }}</span>
          </button>
        </div>

        <!-- THÔNG BÁO TOAST KHI HỦY THÀNH CÔNG -->
        <div *ngIf="toastMessage" class="toast-banner">
          <i class="bi bi-check-circle-fill"></i> {{ toastMessage }}
        </div>

        <!-- 4. BỐ CỤC CHÍNH 2 CỘT -->
        <div class="content-grid">
          <!-- CỘT TRÁI: DANH SÁCH THẺ ĐƠN HÀNG -->
          <div class="left-column">
            <div *ngIf="loading" class="empty-card">Đang tải danh sách đơn hàng từ hệ thống...</div>

            <div *ngIf="!loading && errorMsg" class="empty-card error">
              <p>{{ errorMsg }}</p>
              <button class="btn-dark" (click)="loadOrders()">Thử tải lại</button>
            </div>

            <div *ngIf="!loading && !errorMsg && filteredOrders.length === 0" class="empty-card">
              <p>Không tìm thấy đơn hàng nào phù hợp trong mục này.</p>
              <a routerLink="/danh-sach-san-pham" class="btn-brown">Khám phá thực đơn bánh</a>
            </div>

            <div
              class="order-card"
              *ngFor="let o of filteredOrders"
              [class.selected-card]="selectedOrder?._id === o._id"
              (click)="selectOrderForTimeline(o)"
            >
              <div class="oc-header">
                <div class="oc-code-group">
                  <span class="oc-code">#{{ o.code }}</span>
                  <span class="oc-time">
                    {{ o.status === 'done' ? 'Hoàn thành:' : 'Đặt lúc:' }}
                    {{ o.createdAt | date: 'HH:mm - dd/MM/yyyy' }}
                  </span>
                </div>
                <span class="oc-status" [ngClass]="'st-' + o.status">
                  ● {{ getStatusLabel(o.status) }}
                </span>
              </div>

              <div class="oc-delivery-bar">
                <span class="method-pill">
                  <i
                    class="bi"
                    [ngClass]="o.receiveMethod === 'delivery' ? 'bi-truck' : 'bi-shop'"
                  ></i>
                  {{ o.receiveMethod === 'delivery' ? 'Giao hàng tận nơi' : 'Nhận tại cửa hàng' }}
                </span>
                <span class="slot-pill">
                  Nhận: {{ o.receiveDate | date: 'dd/MM/yyyy' }} ({{ o.slotLabel }})
                </span>
                <span
                  class="addr-text"
                  *ngIf="o.receiveMethod === 'delivery' && o.shippingAddress?.detail"
                >
                  <i class="bi bi-geo-alt"></i>
                  {{ o.shippingAddress.detail }}, {{ o.shippingAddress.district }},
                  {{ o.shippingAddress.province }}
                </span>
                <span class="addr-text" *ngIf="o.receiver?.fullName">
                  • Người nhận: {{ o.receiver.fullName }} ({{ o.receiver.phone }})
                </span>
              </div>

              <div class="oc-items">
                <div class="oc-item-row" *ngFor="let item of o.items">
                  <div class="thumb-wrap">
                    <img [src]="getItemImage(item)" [alt]="item.name" />
                    <span class="qty-tag">SL: {{ item.qty | number: '2.0-0' }}</span>
                  </div>

                  <div class="item-details">
                    <div class="item-top-line">
                      <h4>{{ item.name }}</h4>
                      <span class="item-price">{{ item.lineTotal | number }}đ</span>
                    </div>

                    <div class="item-specs" *ngIf="item.config || item.variant">
                      <span *ngIf="item.config?.size"
                        >Kích cỡ: <strong>{{ item.config.size }}</strong></span
                      >
                      <span *ngIf="item.config?.base">
                        • Cốt bánh: <strong>{{ item.config.base }}</strong></span
                      >
                      <span *ngIf="item.config?.filling">
                        • Nhân: <strong>{{ item.config.filling }}</strong></span
                      >
                      <span *ngIf="item.config?.sweetness">
                        • Độ ngọt: <strong>{{ item.config.sweetness }}</strong></span
                      >
                      <span *ngIf="item.variant"
                        >Phân loại: <strong>{{ item.variant }}</strong></span
                      >
                    </div>

                    <div class="cake-message" *ngIf="item.config?.message">
                      <i class="bi bi-pen"></i> Chữ viết trên bánh:
                      <em>"{{ item.config.message }}"</em>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Badge đã gửi yêu cầu hủy -->
              <div class="req-pending-box" *ngIf="o.cancelRequest?.status === 'pending'">
                <i class="bi bi-hourglass-split"></i>
                <span>Đã gửi yêu cầu hủy đơn • Đang chờ cửa hàng xem xét phản hồi</span>
              </div>

              <!-- Ghi chú lý do hủy nếu đơn đã hủy -->
              <div class="cancel-note-box" *ngIf="o.status === 'cancelled'">
                <i class="bi bi-info-circle"></i>
                <span>
                  Lý do hủy:
                  {{ o.cancellation?.reason || o.cancel?.reason || 'Khách hàng yêu cầu hủy đơn' }}
                </span>
              </div>

              <div class="oc-footer">
                <div class="total-block">
                  <span class="t-lbl">Tổng thanh toán:</span>
                  <strong class="t-val">{{ o.total | number }}đ</strong>
                  <span class="pay-badge" [class.paid]="o.payment?.status === 'paid'">
                    {{ o.payment?.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán' }}
                  </span>
                </div>

                <div class="oc-actions" (click)="$event.stopPropagation()">
                  <!-- Nút Hủy đơn trực tiếp (Frame 04) -->
                  <button
                    *ngIf="['pending_payment', 'pending_approval'].includes(o.status)"
                    class="btn-soft-danger"
                    (click)="openDirectCancelModal(o)"
                  >
                    Hủy đơn hàng
                  </button>

                  <!-- Nút Gửi yêu cầu hủy (Frame 05) -->
                  <button
                    *ngIf="
                      ['accepted', 'baking', 'delivering'].includes(o.status) &&
                      !o.cancelRequest?.status
                    "
                    class="btn-soft-warn"
                    (click)="openRequestCancelModal(o)"
                  >
                    Yêu cầu hủy đơn
                  </button>

                  <button class="btn-dark" (click)="viewDetail(o._id)">Xem chi tiết →</button>

                  <button
                    *ngIf="['done', 'cancelled'].includes(o.status)"
                    class="btn-brown"
                    (click)="viewDetail(o._id)"
                  >
                    <i class="bi bi-arrow-repeat"></i> Mua lại
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- CỘT PHẢI: SIDEBAR -->
          <aside class="right-sidebar">
            <div class="side-card" *ngIf="activeTab === 'active' && selectedOrder">
              <div class="sc-head">
                <div>
                  <span class="sc-sub">THEO DÕI ĐƠN HÀNG</span>
                  <h3>#{{ selectedOrder.code }}</h3>
                </div>
                <a (click)="viewDetail(selectedOrder._id)" class="link-detail">Chi tiết →</a>
              </div>

              <div class="timeline-list">
                <div
                  class="tl-step"
                  *ngFor="let step of timelineSteps; let i = index"
                  [class.completed]="getStepState(selectedOrder.status, step.key) === 'completed'"
                  [class.current]="getStepState(selectedOrder.status, step.key) === 'current'"
                >
                  <div class="tl-dot">
                    <i
                      class="bi bi-check"
                      *ngIf="getStepState(selectedOrder.status, step.key) === 'completed'"
                    ></i>
                    <span *ngIf="getStepState(selectedOrder.status, step.key) !== 'completed'">{{
                      i + 1
                    }}</span>
                  </div>
                  <div class="tl-info">
                    <div class="tl-title">
                      {{ step.label }}
                      <span
                        class="now-pill"
                        *ngIf="getStepState(selectedOrder.status, step.key) === 'current'"
                        >Hiện tại</span
                      >
                    </div>
                    <div class="tl-desc">{{ step.desc }}</div>
                  </div>
                </div>
              </div>
            </div>

            <ng-container *ngIf="activeTab === 'history'">
              <div class="side-card">
                <div class="sc-head">
                  <h3>Thống kê tích lũy</h3>
                  <span class="year-pill">Năm 2026</span>
                </div>
                <div class="spend-label">Tổng chi tiêu 2026</div>
                <div class="spend-amount">{{ totalSpent | number }}đ</div>
                <div class="member-bar-wrap">
                  <div class="mb-top">
                    <span>Hạng Bạc hiện tại</span>
                    <strong>{{ rewardPoints }} / 800 điểm</strong>
                  </div>
                  <div class="mb-track">
                    <div class="mb-fill" [style.width.%]="(rewardPoints / 800) * 100"></div>
                  </div>
                </div>
              </div>

              <div class="side-card">
                <div class="sc-head">
                  <h3>Mã giảm giá khả dụng</h3>
                  <span class="year-pill">2 mã</span>
                </div>
                <div class="voucher-box">
                  <div>
                    <strong>SWEETVIP10</strong>
                    <p>Giảm 10% tối đa 50k cho đơn từ 400k</p>
                  </div>
                  <a routerLink="/danh-sach-san-pham" class="btn-brown-sm">Dùng ngay</a>
                </div>
                <div class="voucher-box">
                  <div>
                    <strong>FREESHIPQ1</strong>
                    <p>Miễn phí vận chuyển lạnh bán kính 5km</p>
                  </div>
                  <a routerLink="/danh-sach-san-pham" class="btn-brown-sm">Dùng ngay</a>
                </div>
              </div>
            </ng-container>

            <div class="side-card">
              <h3>Hỗ trợ & Khiếu nại</h3>
              <p class="side-text">
                Nếu quý khách có bất kỳ băn khoăn nào về hương vị, quy cách đóng gói hay trải nghiệm
                giao hàng của các đơn đã đặt:
              </p>
              <div class="hotline-box">
                <i class="bi bi-telephone-fill"></i>
                <div>
                  <span>Hotline chăm sóc khách hàng</span>
                  <strong>0900 123 456</strong>
                  <small>Hỗ trợ từ 8h00 - 21h30 mỗi ngày</small>
                </div>
              </div>
            </div>

            <div class="side-card tip-card">
              <h4><i class="bi bi-snow2"></i> Mẹo bảo quản bánh kem tươi</h4>
              <p class="side-text">
                Bảo quản ở nhiệt độ 2°C - 6°C ngay khi nhận. Thưởng thức thơm ngon nhất trong vòng
                24 - 48 giờ. Tránh để nơi có ánh nắng chiếu trực tiếp hoặc gần nguồn nhiệt.
              </p>
            </div>
          </aside>
        </div>

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

      <!-- =========================================================================
           FRAME 04: MODAL XÁC NHẬN HỦY ĐƠN HÀNG TRỰC TIẾP
           ========================================================================= -->
      <div
        class="modal-backdrop"
        *ngIf="activeModal === 'direct_cancel' && targetOrder"
        (click)="closeModal()"
      >
        <div class="modal-box" (click)="$event.stopPropagation()">
          <button class="modal-close-btn" (click)="closeModal()">✕</button>

          <h2 class="modal-title">Xác nhận hủy đơn hàng</h2>
          <p class="modal-subtitle">
            Vui lòng kiểm tra thông tin đơn hàng và chính sách hoàn tiền trước khi xác nhận.
          </p>

          <!-- Box sản phẩm tóm tắt -->
          <div class="m-product-card">
            <img [src]="getItemImage(targetOrder.items?.[0])" alt="Bánh" />
            <div class="mp-mid">
              <div class="mp-top">
                <strong>#{{ targetOrder.code }}</strong>
                <span class="mp-badge">● {{ getStatusLabel(targetOrder.status) }}</span>
              </div>
              <div class="mp-name">{{ targetOrder.items?.[0]?.name }}</div>
              <div class="mp-meta">
                <span *ngIf="targetOrder.items?.[0]?.config?.size"
                  >Size {{ targetOrder.items[0].config.size }} •
                </span>
                <span *ngIf="targetOrder.items?.[0]?.config?.sweetness"
                  >Độ ngọt: {{ targetOrder.items[0].config.sweetness }} •
                </span>
                <span>Số lượng: {{ targetOrder.items?.[0]?.qty || 1 | number: '2.0-0' }} ổ</span>
              </div>
            </div>
            <div class="mp-right">
              <span>Tổng giá trị đơn hàng</span>
              <strong>{{ targetOrder.total | number }} đ</strong>
            </div>
          </div>

          <!-- Cảnh báo đỏ nhạt -->
          <div class="m-alert-red">
            <i class="bi bi-info-circle"></i>
            <span
              >Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái <strong>Đã hủy</strong>. Thao
              tác này không thể tự khôi phục.</span
            >
          </div>

          <!-- Chính sách thanh toán & hoàn tiền -->
          <div class="m-policy-box">
            <div class="mpol-head">
              <i class="bi bi-wallet2"></i> Chính sách thanh toán & hoàn tiền
            </div>

            <div class="mpol-grid">
              <div>
                <span class="lbl">Phương thức thanh toán:</span>
                <strong>Chuyển khoản VietQR Napas247</strong>
              </div>
              <div>
                <span class="lbl">Trạng thái thanh toán:</span>
                <strong>{{
                  targetOrder.payment?.status === 'paid'
                    ? 'Đã thanh toán (100%)'
                    : 'Chưa thanh toán'
                }}</strong>
              </div>
              <div>
                <span class="lbl">Số tiền hoàn dự kiến:</span>
                <strong class="big-refund"
                  >{{
                    (targetOrder.payment?.status === 'paid' ? targetOrder.total : 0) | number
                  }}
                  đ</strong
                >
                <small>{{
                  targetOrder.payment?.status === 'paid'
                    ? '(Hoàn 100% số tiền đã thanh toán, thời gian tối đa 3 ngày làm việc)'
                    : '(Đơn chưa thanh toán nên không phát sinh hoàn tiền)'
                }}</small>
              </div>
              <div>
                <span class="lbl">Voucher & Điểm thưởng:</span>
                <strong
                  >Tự động hoàn lại mã ưu đãi và điểm tích lũy vào tài khoản ví sau khi hủy thành
                  công.</strong
                >
              </div>
            </div>

            <div class="mpol-rules">
              <div class="rules-lbl">
                <i class="bi bi-info-circle"></i> Quy định hoàn tiền theo trạng thái xử lý:
              </div>
              <div class="rules-3col">
                <div
                  class="rule-card"
                  [class.active-rule]="targetOrder.status === 'pending_payment'"
                >
                  <span>Chờ thanh toán:</span>
                  <strong>Không hoàn tiền</strong>
                </div>
                <div
                  class="rule-card"
                  [class.active-rule]="
                    targetOrder.status === 'pending_approval' &&
                    targetOrder.payment?.status !== 'paid'
                  "
                >
                  <span>Chờ duyệt & chưa thanh toán:</span>
                  <strong>Không phát sinh hoàn tiền</strong>
                </div>
                <div
                  class="rule-card"
                  [class.active-rule]="
                    targetOrder.status === 'pending_approval' &&
                    targetOrder.payment?.status === 'paid'
                  "
                >
                  <span>Chờ duyệt & đã thanh toán:</span>
                  <strong>Hoàn 100% (tối đa 3 ngày)</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Dropdown chọn lý do hủy đơn -->
          <div class="m-field">
            <label>Lý do hủy đơn hàng <span class="req">*</span></label>
            <select [(ngModel)]="directReasonCode" class="m-select">
              <option value="">-- Chọn lý do hủy đơn --</option>
              <option value="change_mind">Đổi ý / Không còn nhu cầu đặt bánh</option>
              <option value="wrong_info">Đặt nhầm mẫu bánh hoặc sai thông tin nhận</option>
              <option value="change_schedule">Thay đổi lịch trình / thời gian tổ chức tiệc</option>
              <option value="other">Lý do khác</option>
            </select>
          </div>

          <div class="m-field" *ngIf="directReasonCode === 'other'">
            <label>Nhập chi tiết lý do <span class="req">*</span></label>
            <input
              type="text"
              [(ngModel)]="directReasonText"
              class="m-input"
              placeholder="Vui lòng nhập lý do hủy đơn..."
            />
          </div>

          <p *ngIf="modalError" class="m-error">{{ modalError }}</p>

          <div class="m-actions-row">
            <button class="btn-modal-outline" (click)="closeModal()" [disabled]="submitting">
              Quay lại / Giữ đơn hàng
            </button>
            <button class="btn-modal-dark" (click)="submitDirectCancel()" [disabled]="submitting">
              {{ submitting ? 'Đang hủy đơn...' : '✕ Xác nhận hủy đơn' }}
            </button>
          </div>

          <div class="m-footer-note">
            Hệ thống bảo vệ quyền lợi thành viên SweetCake • Hotline hỗ trợ: 0900 123 456
          </div>
        </div>
      </div>

      <!-- =========================================================================
           FRAME 05: MODAL GỬI YÊU CẦU HỦY ĐƠN HÀNG
           ========================================================================= -->
      <div
        class="modal-backdrop"
        *ngIf="activeModal === 'request_cancel' && targetOrder"
        (click)="closeModal()"
      >
        <div class="modal-box" (click)="$event.stopPropagation()">
          <button class="modal-close-btn" (click)="closeModal()">✕</button>

          <h2 class="modal-title">Gửi yêu cầu hủy đơn hàng</h2>
          <p class="modal-subtitle">
            Đơn hàng đã được cửa hàng tiếp nhận hoặc đang chuẩn bị. Bạn có thể gửi yêu cầu để cửa
            hàng xem xét.
          </p>

          <!-- Box sản phẩm -->
          <div class="m-product-card">
            <img [src]="getItemImage(targetOrder.items?.[0])" alt="Bánh" />
            <div class="mp-mid">
              <div class="mp-top">
                <span class="mp-code-line"
                  >Mã đơn: <strong>#{{ targetOrder.code }}</strong> • Ngày đặt:
                  {{ targetOrder.createdAt | date: 'HH:mm - dd/MM/yyyy' }}</span
                >
                <span class="mp-badge">● {{ getStatusLabel(targetOrder.status) }}</span>
              </div>
              <div class="mp-name">{{ targetOrder.items?.[0]?.name }}</div>
              <div class="mp-meta">
                <span *ngIf="targetOrder.items?.[0]?.config?.size"
                  >Size {{ targetOrder.items[0].config.size }} •
                </span>
                <span *ngIf="targetOrder.items?.[0]?.config?.sweetness"
                  >Độ ngọt: {{ targetOrder.items[0].config.sweetness }} •
                </span>
                <span>Số lượng: {{ targetOrder.items?.[0]?.qty || 1 | number: '2.0-0' }} ổ</span>
              </div>
            </div>
            <div class="mp-right">
              <span>Tổng tiền đơn hàng</span>
              <strong>{{ targetOrder.total | number }} đ</strong>
            </div>
          </div>

          <!-- Lưu ý & Hotline -->
          <div class="m-note-cream">
            <div class="mnc-top">
              <i class="bi bi-info-circle"></i>
              <span
                >Yêu cầu của bạn cần được cửa hàng xem xét. Đơn hàng vẫn tiếp tục được xử lý trong
                thời gian chờ phản hồi.</span
              >
            </div>
            <div class="mnc-bottom">
              <span>Hotline hỗ trợ:</span>
              <div class="mnc-contacts">
                <span><i class="bi bi-telephone"></i> 0900 123 456</span>
                <span><i class="bi bi-chat-dots"></i> Zalo Official Account</span>
              </div>
            </div>
          </div>

          <!-- 5 Radio Lý do yêu cầu hủy -->
          <div class="m-field">
            <div class="m-label-row">
              <label>Lý do yêu cầu hủy <span class="req">*</span></label>
              <span class="hint">Chọn 1 lý do chính</span>
            </div>

            <div class="radio-grid">
              <label
                *ngFor="let opt of requestReasonOptions"
                class="radio-card"
                [class.checked]="requestReasonOption === opt.value"
                [class.full-span]="opt.fullWidth"
              >
                <input
                  type="radio"
                  name="reqReason"
                  [value]="opt.value"
                  [(ngModel)]="requestReasonOption"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>

          <!-- Mô tả chi tiết lý do -->
          <div class="m-field">
            <div class="m-label-row">
              <label
                >Mô tả chi tiết lý do
                <span class="opt-txt"
                  >({{ requestReasonOption === 'other' ? 'Bắt buộc' : 'Không bắt buộc' }})</span
                ></label
              >
              <span class="hint">Tối đa 300 ký tự</span>
            </div>
            <textarea
              rows="3"
              maxlength="300"
              [(ngModel)]="requestReasonDetail"
              class="m-textarea"
              placeholder="Ví dụ: Tiệc gia đình dời sang cuối tuần, mong tiệm hỗ trợ bảo lưu hoặc kiểm tra công đoạn làm bánh giúp mình..."
            ></textarea>
          </div>

          <!-- Chính sách hoàn tiền dự kiến (3 thẻ) -->
          <div class="m-policy-box">
            <div class="mpol-head"><i class="bi bi-wallet2"></i> Chính sách hoàn tiền dự kiến</div>
            <div class="rules-3col">
              <div class="rule-card" [class.active-rule]="targetOrder.status === 'accepted'">
                <div class="rc-top">
                  <strong>Đã tiếp nhận</strong>
                  <span class="pct-pill">Hoàn 30%</span>
                </div>
                <p>
                  Nếu yêu cầu hủy được cửa hàng chấp nhận, mức hoàn tiền dự kiến là 30% tổng số tiền
                  đã thanh toán.
                </p>
              </div>
              <div
                class="rule-card"
                [class.active-rule]="
                  targetOrder.status === 'baking' || targetOrder.status === 'delivering'
                "
              >
                <div class="rc-top">
                  <strong>Đang làm bánh</strong>
                  <span class="pct-pill gray">Hoàn 0%</span>
                </div>
                <p>Mức hoàn tiền dự kiến là 0%. Nếu lỗi từ cửa hàng, khách hàng được hoàn 100%.</p>
              </div>
              <div class="rule-card">
                <div class="rc-top">
                  <strong>Lỗi từ cửa hàng</strong>
                  <span class="pct-pill">Hoàn 100%</span>
                </div>
                <p>
                  Khách hàng được hoàn 100% số tiền đã thanh toán nếu phát sinh lỗi từ tiệm bánh.
                </p>
              </div>
            </div>
          </div>

          <p *ngIf="modalError" class="m-error">{{ modalError }}</p>

          <div class="m-actions-row">
            <button class="btn-modal-text" (click)="closeModal()" [disabled]="submitting">
              Quay lại
            </button>
            <button class="btn-modal-dark" (click)="submitRequestCancel()" [disabled]="submitting">
              {{ submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu hủy ➤' }}
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           FRAME 06: MODAL KẾT QUẢ GỬI YÊU CẦU HỦY THÀNH CÔNG
           ========================================================================= -->
      <div
        class="modal-backdrop"
        *ngIf="activeModal === 'request_success' && targetOrder"
        (click)="closeModal()"
      >
        <div class="modal-box modal-success-box" (click)="$event.stopPropagation()">
          <button class="modal-close-btn" (click)="closeModal()">✕</button>

          <div class="success-top">
            <div class="hourglass-badge"><i class="bi bi-hourglass-split"></i></div>
            <h2 class="modal-title center">Gửi yêu cầu thành công</h2>
            <p class="modal-subtitle center">
              Yêu cầu hủy đơn của bạn đã được gửi đến cửa hàng. Vui lòng chờ cửa hàng xem xét và
              phản hồi.
            </p>
          </div>

          <!-- Thông tin đơn hàng -->
          <div class="m-product-card">
            <img [src]="getItemImage(targetOrder.items?.[0])" alt="Bánh" />
            <div class="mp-mid">
              <div class="mp-top">
                <strong
                  >#{{ targetOrder.code }} •
                  {{ targetOrder.createdAt | date: 'HH:mm - dd/MM/yyyy' }}</strong
                >
                <span class="mp-badge">● Đang chờ xử lý</span>
              </div>
              <div class="mp-name">{{ targetOrder.items?.[0]?.name }}</div>
              <div class="mp-meta">
                <span *ngIf="targetOrder.items?.[0]?.config?.size"
                  >Size {{ targetOrder.items[0].config.size }} •
                </span>
                <span *ngIf="targetOrder.items?.[0]?.config?.sweetness"
                  >Độ ngọt: {{ targetOrder.items[0].config.sweetness }} •
                </span>
                <span>SL: {{ targetOrder.items?.[0]?.qty || 1 | number: '2.0-0' }} ổ</span>
              </div>
              <div class="mp-price-inline">{{ targetOrder.total | number }}đ</div>
            </div>
          </div>

          <!-- Lý do yêu cầu đã gửi -->
          <div class="m-summary-strip">
            <div class="ms-lbl"><i class="bi bi-question-circle"></i> LÝ DO YÊU CẦU ĐÃ GỬI</div>
            <strong>{{ submittedRequestReason }}</strong>
          </div>

          <!-- Chính sách hoàn tiền dự kiến -->
          <div class="m-summary-strip flex-between">
            <div>
              <div class="ms-lbl"><i class="bi bi-wallet2"></i> CHÍNH SÁCH HOÀN TIỀN DỰ KIẾN</div>
              <span
                >Trạng thái: <strong>{{ getStatusLabel(targetOrder.status) }}</strong></span
              >
            </div>
            <span class="refund-pct-tag">
              Mức hoàn {{ targetOrder.status === 'accepted' ? '30%' : '0%' }}
            </span>
          </div>

          <!-- Lưu ý quan trọng -->
          <div class="m-note-cream">
            <div class="mnc-top">
              <i class="bi bi-info-circle"></i>
              <span>
                <strong>Lưu ý quan trọng:</strong> Đơn hàng vẫn giữ trạng thái hiện tại, chưa chuyển
                thành Đã hủy. Thợ làm bánh vẫn đang tiếp tục hoàn thiện đơn theo lịch hẹn đã cam
                kết.
              </span>
            </div>
          </div>

          <div class="m-hotline-right">
            <span>Cần hỗ trợ khẩn cấp?</span>
            <strong>Hotline: 0900 123 456</strong>
          </div>

          <div class="m-footer-note">
            Tiệm bánh thủ công SweetCake • Giữ trọn sự an tâm & hương vị tươi mới cho khách hàng
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .orders-page {
        background-color: #f9f6f2;
        color: #2d1b10;
        font-family: 'Inter', sans-serif;
        padding: 28px 20px 60px;
      }

      .page-wrapper {
        max-width: 1200px;
        margin: 0 auto;
      }

      /* Welcome Banner */
      .welcome-banner {
        background: #ffffff;
        border: 1px solid #eae2d9;
        border-radius: 14px;
        padding: 20px 26px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 18px;
        box-shadow: 0 2px 10px rgba(45, 27, 16, 0.03);
      }

      .welcome-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .tier-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #f4ece3;
        color: #7d562d;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      }
      .tier-meta {
        font-size: 11px;
        font-weight: 600;
        color: #8c7564;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .welcome-left h1 {
        font-family: 'Playfair Display', serif;
        font-size: 22px;
        margin: 0;
        color: #2d1b10;
      }
      .welcome-stats {
        display: flex;
        gap: 12px;
      }
      .stat-pill {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #faf7f4;
        border: 1px solid #ede5dc;
        padding: 10px 16px;
        border-radius: 10px;
      }
      .stat-pill i {
        font-size: 18px;
        color: #7d562d;
      }
      .st-label {
        display: block;
        font-size: 11px;
        color: #7d6b5d;
      }
      .st-val {
        font-size: 14px;
        color: #2d1b10;
      }

      /* Filter Bar */
      .filter-bar {
        background: #ffffff;
        border: 1px solid #eae2d9;
        border-radius: 12px;
        padding: 10px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      .search-input-wrap {
        flex: 1;
        min-width: 240px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #8c7564;
      }
      .search-input-wrap input {
        border: none;
        outline: none;
        width: 100%;
        font-size: 13px;
        color: #2d1b10;
      }
      .filter-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .phone-box {
        display: flex;
        align-items: center;
        gap: 6px;
        border: 1px solid #e2d9cf;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12px;
        color: #7d6b5d;
      }
      .phone-box input {
        border: none;
        outline: none;
        width: 115px;
        font-size: 12px;
      }
      .status-select {
        border: 1px solid #e2d9cf;
        border-radius: 8px;
        padding: 7px 12px;
        font-size: 12px;
        color: #2d1b10;
        background: #fff;
        outline: none;
      }
      .btn-track-mini {
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
        color: #7d562d;
        background: #f6efe7;
        padding: 7px 12px;
        border-radius: 8px;
      }

      /* Tabs */
      .main-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      .m-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 18px;
        border-radius: 24px;
        border: 1px solid #e2d9cf;
        background: #ffffff;
        color: #5e4b3e;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .m-tab.active {
        background: #7d562d;
        border-color: #7d562d;
        color: #ffffff;
      }
      .count-badge {
        background: rgba(0, 0, 0, 0.12);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
      }
      .m-tab.active .count-badge {
        background: rgba(255, 255, 255, 0.25);
      }

      .toast-banner {
        background: #e6f6ec;
        border: 1px solid #b7eb8f;
        color: #15803d;
        padding: 12px 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Content Grid */
      .content-grid {
        display: grid;
        grid-template-columns: 1fr 330px;
        gap: 22px;
        align-items: start;
      }
      .left-column {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .empty-card {
        background: #ffffff;
        border: 1px solid #eae2d9;
        border-radius: 14px;
        padding: 48px 20px;
        text-align: center;
        color: #7d6b5d;
        font-size: 14px;
      }
      .empty-card.error {
        color: #ba1a1a;
        border-color: #f5c2c7;
        background: #fff5f5;
      }

      /* Order Card */
      .order-card {
        background: #ffffff;
        border: 1px solid #eae2d9;
        border-radius: 14px;
        padding: 20px 22px;
        box-shadow: 0 2px 10px rgba(45, 27, 16, 0.02);
        cursor: pointer;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .order-card:hover,
      .order-card.selected-card {
        border-color: #7d562d;
        box-shadow: 0 6px 20px rgba(125, 86, 45, 0.08);
      }
      .oc-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .oc-code {
        font-weight: 700;
        font-size: 15px;
        color: #2d1b10;
        margin-right: 10px;
      }
      .oc-time {
        font-size: 12px;
        color: #8c7564;
      }
      .oc-status {
        font-size: 11px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 14px;
        background: #fdf3e7;
        color: #b45309;
      }
      .st-done {
        background: #e6f6ec;
        color: #15803d;
      }
      .st-cancelled {
        background: #fee2e2;
        color: #b91c1c;
      }

      .oc-delivery-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;
        color: #6b584c;
        padding-bottom: 14px;
        border-bottom: 1px solid #f3ece4;
        margin-bottom: 14px;
      }
      .method-pill {
        background: #f5efea;
        color: #2d1b10;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 6px;
      }
      .slot-pill {
        background: #faf6f2;
        border: 1px solid #ebe2d8;
        padding: 2px 8px;
        border-radius: 6px;
      }

      .oc-items {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .oc-item-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .thumb-wrap {
        position: relative;
        width: 84px;
        height: 84px;
        border-radius: 10px;
        overflow: hidden;
        flex-shrink: 0;
        border: 1px solid #ede5dc;
      }
      .thumb-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .qty-tag {
        position: absolute;
        bottom: 5px;
        left: 5px;
        background: rgba(45, 27, 16, 0.85);
        color: #fff;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .item-details {
        flex: 1;
      }
      .item-top-line {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 4px;
      }
      .item-top-line h4 {
        font-family: 'Playfair Display', serif;
        font-size: 16px;
        margin: 0;
        color: #2d1b10;
      }
      .item-price {
        font-weight: 700;
        font-size: 14px;
        color: #2d1b10;
      }
      .item-specs {
        font-size: 12px;
        color: #6b584c;
        line-height: 1.5;
      }
      .cake-message {
        margin-top: 6px;
        background: #faf6f2;
        border-left: 3px solid #7d562d;
        padding: 4px 10px;
        font-size: 12px;
        color: #5e4b3e;
        border-radius: 0 6px 6px 0;
      }

      .req-pending-box {
        margin-top: 12px;
        background: #fffbe6;
        border: 1px solid #ffe58f;
        color: #b45309;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cancel-note-box {
        margin-top: 12px;
        background: #fff5f5;
        border: 1px solid #fed7d7;
        color: #9b2c2c;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .oc-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px dashed #e6ddd3;
      }
      .total-block {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .t-lbl {
        font-size: 12px;
        color: #7d6b5d;
      }
      .t-val {
        font-size: 17px;
        color: #2d1b10;
      }
      .pay-badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 6px;
        background: #f3ece4;
        color: #7d562d;
        font-weight: 600;
      }
      .pay-badge.paid {
        background: #e6f6ec;
        color: #15803d;
      }

      .oc-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .btn-dark {
        background: #2d1b10;
        color: #fff;
        border: none;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-brown {
        background: #7d562d;
        color: #fff;
        border: none;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
      }
      .btn-soft-danger {
        background: #fff1f0;
        color: #cf1322;
        border: 1px solid #ffa39e;
        padding: 7px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-soft-warn {
        background: #fffbe6;
        color: #d46b08;
        border: 1px solid #ffe58f;
        padding: 7px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      /* Sidebar */
      .right-sidebar {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .side-card {
        background: #ffffff;
        border: 1px solid #eae2d9;
        border-radius: 14px;
        padding: 18px 20px;
      }
      .sc-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }
      .sc-sub {
        font-size: 10px;
        font-weight: 700;
        color: #8c7564;
        letter-spacing: 0.6px;
      }
      .side-card h3 {
        font-family: 'Playfair Display', serif;
        font-size: 17px;
        margin: 2px 0 0 0;
        color: #2d1b10;
      }
      .side-card h4 {
        font-size: 14px;
        margin: 0 0 8px 0;
        color: #2d1b10;
      }
      .link-detail {
        font-size: 12px;
        font-weight: 600;
        color: #7d562d;
        cursor: pointer;
      }

      .timeline-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .tl-step {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        opacity: 0.45;
      }
      .tl-step.completed,
      .tl-step.current {
        opacity: 1;
      }
      .tl-dot {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #eae2d9;
        color: #5e4b3e;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .tl-step.completed .tl-dot {
        background: #f6e6d4;
        color: #7d562d;
      }
      .tl-step.current .tl-dot {
        background: #7d562d;
        color: #ffffff;
      }
      .tl-title {
        font-size: 13px;
        font-weight: 600;
        color: #2d1b10;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .now-pill {
        background: #fdf3e7;
        color: #b45309;
        font-size: 10px;
        padding: 1px 7px;
        border-radius: 10px;
      }
      .tl-desc {
        font-size: 11px;
        color: #8c7564;
        margin-top: 2px;
      }

      .year-pill {
        background: #f6efe7;
        color: #7d562d;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 10px;
      }
      .spend-label {
        font-size: 11px;
        color: #8c7564;
      }
      .spend-amount {
        font-family: 'Playfair Display', serif;
        font-size: 24px;
        font-weight: 700;
        color: #2d1b10;
        margin: 4px 0 14px;
      }
      .mb-top {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-bottom: 6px;
      }
      .mb-track {
        height: 7px;
        background: #efe8e0;
        border-radius: 6px;
        overflow: hidden;
      }
      .mb-fill {
        height: 100%;
        background: #7d562d;
      }
      .voucher-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        background: #faf7f4;
        border: 1px dashed #d8cbbf;
        padding: 10px 12px;
        border-radius: 10px;
        margin-bottom: 10px;
      }
      .voucher-box strong {
        font-size: 12px;
        color: #7d562d;
      }
      .voucher-box p {
        font-size: 11px;
        color: #6b584c;
        margin: 2px 0 0 0;
      }
      .btn-brown-sm {
        background: #7d562d;
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        padding: 6px 10px;
        border-radius: 6px;
        text-decoration: none;
        white-space: nowrap;
      }
      .side-text {
        font-size: 12px;
        color: #6b584c;
        line-height: 1.55;
        margin: 8px 0 12px;
      }
      .hotline-box {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #faf7f4;
        border: 1px solid #ede5dc;
        padding: 12px;
        border-radius: 10px;
      }
      .hotline-box i {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #7d562d;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      .hotline-box span {
        display: block;
        font-size: 11px;
        color: #8c7564;
      }
      .hotline-box strong {
        display: block;
        font-size: 16px;
        color: #2d1b10;
      }
      .hotline-box small {
        font-size: 10px;
        color: #8c7564;
      }
      .tip-card {
        background: #faf7f4;
      }

      /* Guarantees Strip */
      .guarantees-strip {
        margin-top: 40px;
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

      /* =========================================================================
       STYLES CHO 3 HỘP THOẠI HỦY ĐƠN (FRAME 04, 05, 06)
       ========================================================================= */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(28, 17, 10, 0.55);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 16px;
        overflow-y: auto;
      }

      .modal-box {
        position: relative;
        background: #ffffff;
        border-radius: 16px;
        width: 100%;
        max-width: 620px;
        max-height: 92vh;
        overflow-y: auto;
        padding: 28px 32px 22px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
        color: #2d1b10;
      }

      .modal-success-box {
        max-width: 540px;
      }

      .modal-close-btn {
        position: absolute;
        top: 18px;
        right: 20px;
        background: transparent;
        border: none;
        font-size: 18px;
        color: #7d6b5d;
        cursor: pointer;
      }

      .modal-title {
        font-family: 'Playfair Display', serif;
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 6px 0;
        color: #2d1b10;
      }

      .modal-title.center,
      .modal-subtitle.center {
        text-align: center;
      }

      .modal-subtitle {
        font-size: 13px;
        color: #7d6b5d;
        margin: 0 0 18px 0;
        line-height: 1.5;
      }

      /* Product summary box in modal */
      .m-product-card {
        display: flex;
        align-items: center;
        gap: 14px;
        background: #faf7f4;
        border: 1px solid #ede5dc;
        border-radius: 12px;
        padding: 12px 14px;
        margin-bottom: 14px;
      }

      .m-product-card img {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
      }

      .mp-mid {
        flex: 1;
      }
      .mp-top {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 4px;
        font-size: 12px;
      }
      .mp-code-line {
        color: #6b584c;
        font-size: 11px;
      }
      .mp-badge {
        background: #fdf3e7;
        color: #b45309;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .mp-name {
        font-family: 'Playfair Display', serif;
        font-weight: 700;
        font-size: 15px;
        color: #2d1b10;
      }
      .mp-meta {
        font-size: 11px;
        color: #7d6b5d;
        margin-top: 2px;
      }
      .mp-price-inline {
        font-weight: 700;
        font-size: 14px;
        color: #2d1b10;
        margin-top: 4px;
      }

      .mp-right {
        text-align: right;
        flex-shrink: 0;
      }
      .mp-right span {
        display: block;
        font-size: 10px;
        color: #8c7564;
      }
      .mp-right strong {
        font-size: 16px;
        color: #2d1b10;
      }

      /* Alerts & Notes in modal */
      .m-alert-red {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #fff2f2;
        border: 1px solid #ffccc7;
        color: #a8071a;
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 12px;
        margin-bottom: 16px;
      }

      .m-note-cream {
        background: #faf6f1;
        border: 1px solid #eae0d5;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 12px;
        color: #5e4b3e;
        margin-bottom: 16px;
      }

      .mnc-top {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        line-height: 1.5;
      }
      .mnc-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed #e2d6c8;
        font-size: 11px;
      }
      .mnc-contacts {
        display: flex;
        gap: 14px;
        font-weight: 600;
        color: #2d1b10;
      }

      /* Policy Box */
      .m-policy-box {
        background: #faf8f5;
        border: 1px solid #eae2d9;
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 16px;
      }

      .mpol-head {
        font-size: 13px;
        font-weight: 700;
        color: #2d1b10;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .mpol-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 18px;
        font-size: 12px;
        margin-bottom: 14px;
      }

      .mpol-grid .lbl {
        display: block;
        font-size: 11px;
        color: #8c7564;
        margin-bottom: 2px;
      }
      .mpol-grid strong {
        display: block;
        color: #2d1b10;
        line-height: 1.4;
      }
      .mpol-grid .big-refund {
        font-size: 16px;
        color: #7d562d;
      }
      .mpol-grid small {
        display: block;
        font-size: 10px;
        color: #8c7564;
        margin-top: 2px;
      }

      .rules-lbl {
        font-size: 11px;
        color: #6b584c;
        margin-bottom: 8px;
      }
      .rules-3col {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .rule-card {
        background: #ffffff;
        border: 1px solid #e5ddd4;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 11px;
      }

      .rule-card.active-rule {
        border-color: #7d562d;
        background: #fdf8f2;
      }

      .rule-card span {
        display: block;
        color: #7d6b5d;
        font-size: 10px;
        margin-bottom: 3px;
      }
      .rule-card strong {
        color: #2d1b10;
        font-size: 11px;
      }
      .rule-card p {
        margin: 4px 0 0 0;
        font-size: 10px;
        color: #6b584c;
        line-height: 1.4;
      }
      .rc-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
      }
      .pct-pill {
        background: #fdf3e7;
        color: #b45309;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 8px;
      }
      .pct-pill.gray {
        background: #f0ece8;
        color: #6b584c;
      }

      /* Form Controls in Modal */
      .m-field {
        margin-bottom: 14px;
      }
      .m-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .m-field label {
        font-size: 12px;
        font-weight: 700;
        color: #2d1b10;
        display: block;
        margin-bottom: 6px;
      }
      .m-label-row label {
        margin-bottom: 0;
      }
      .req {
        color: #cf1322;
      }
      .opt-txt {
        font-weight: 400;
        color: #8c7564;
      }
      .hint {
        font-size: 11px;
        color: #8c7564;
      }

      .m-select,
      .m-input,
      .m-textarea {
        width: 100%;
        border: 1px solid #dcd2c8;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
        color: #2d1b10;
        background: #faf8f5;
        outline: none;
        box-sizing: border-box;
      }

      .m-select:focus,
      .m-input:focus,
      .m-textarea:focus {
        border-color: #7d562d;
        background: #ffffff;
      }

      .radio-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .radio-card {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #faf8f5;
        border: 1px solid #e5ddd4;
        border-radius: 8px;
        padding: 9px 12px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      }

      .radio-card.checked {
        border-color: #7d562d;
        background: #fdf7f0;
        font-weight: 600;
      }

      .radio-card.full-span {
        grid-column: span 2;
      }

      .m-error {
        color: #cf1322;
        font-size: 12px;
        font-weight: 500;
        margin: 6px 0;
      }

      .m-actions-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 16px;
      }

      .btn-modal-outline {
        background: #ffffff;
        border: 1px solid #dcd2c8;
        color: #2d1b10;
        padding: 11px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }

      .btn-modal-text {
        background: transparent;
        border: none;
        color: #2d1b10;
        padding: 11px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }

      .btn-modal-dark {
        background: #2d1b10;
        border: none;
        color: #ffffff;
        padding: 11px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }

      .btn-modal-dark:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Frame 06 Success Modal specifics */
      .success-top {
        text-align: center;
        margin-bottom: 16px;
      }
      .hourglass-badge {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: #f6efe7;
        color: #7d562d;
        font-size: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
      }

      .m-summary-strip {
        background: #faf8f5;
        border: 1px solid #eae2d9;
        border-radius: 10px;
        padding: 10px 14px;
        margin-bottom: 12px;
        font-size: 12px;
      }

      .m-summary-strip.flex-between {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ms-lbl {
        font-size: 10px;
        font-weight: 700;
        color: #8c7564;
        margin-bottom: 4px;
      }

      .refund-pct-tag {
        background: #fdf3e7;
        color: #b45309;
        font-weight: 700;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 8px;
      }

      .m-hotline-right {
        text-align: right;
        font-size: 12px;
        margin-top: 10px;
      }

      .m-hotline-right span {
        display: block;
        font-size: 10px;
        color: #8c7564;
      }
      .m-hotline-right strong {
        color: #2d1b10;
        font-size: 14px;
      }

      .m-footer-note {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #f0eae3;
        text-align: center;
        font-size: 11px;
        color: #8c7564;
      }

      @media (max-width: 960px) {
        .content-grid {
          grid-template-columns: 1fr;
        }
        .guarantees-strip {
          grid-template-columns: 1fr;
        }
        .mpol-grid,
        .rules-3col,
        .radio-grid,
        .m-actions-row {
          grid-template-columns: 1fr;
        }
        .radio-card.full-span {
          grid-column: span 1;
        }
      }
    `,
  ],
})
export class OrderListComponent implements OnInit {
  activeTab: 'active' | 'history' = 'active';
  phoneSearch = '';
  searchKeyword = '';
  statusFilter = '';

  allOrders: any[] = [];
  filteredOrders: any[] = [];
  selectedOrder: any = null;

  loading = false;
  errorMsg = '';
  toastMessage = '';

  // State cho 3 Modal Hủy Đơn (Frame 04, 05, 06)
  activeModal: 'none' | 'direct_cancel' | 'request_cancel' | 'request_success' = 'none';
  targetOrder: any = null;
  submitting = false;
  modalError = '';

  // Frame 04: Hủy trực tiếp
  directReasonCode = '';
  directReasonText = '';

  // Frame 05 & 06: Yêu cầu hủy
  requestReasonOption = 'wrong_info';
  requestReasonDetail = '';
  submittedRequestReason = '';

  requestReasonOptions = [
    { value: 'wrong_info', label: 'Đặt nhầm đơn hàng', fullWidth: false },
    {
      value: 'change_config',
      label: 'Muốn thay đổi sản phẩm hoặc cấu hình bánh',
      fullWidth: false,
    },
    { value: 'change_schedule', label: 'Muốn thay đổi thời gian nhận bánh', fullWidth: false },
    { value: 'change_mind', label: 'Đã tìm được cửa hàng khác', fullWidth: false },
    { value: 'other', label: 'Lý do khác (kèm ô nhập chi tiết)', fullWidth: true },
  ];

  timelineSteps = [
    { key: 'pending_payment', label: 'Chờ thanh toán', desc: 'Khởi tạo đơn hàng thành công' },
    { key: 'pending_approval', label: 'Chờ duyệt', desc: 'Tiệm đang kiểm tra lịch giao bánh' },
    { key: 'accepted', label: 'Đã tiếp nhận', desc: 'Bếp trung tâm đã nhận đơn' },
    { key: 'baking', label: 'Đang làm bánh', desc: 'Bếp trưởng đang phủ kem & trang trí' },
    { key: 'delivering', label: 'Đang giao', desc: 'Xe lạnh chuyên dụng đang di chuyển' },
    { key: 'done', label: 'Đã giao thành công', desc: 'Hoàn tất đơn hàng ngọt ngào' },
  ];

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
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadOrders();
    }
  }

  get customerName(): string {
    return this.allOrders[0]?.receiver?.fullName || 'Quý khách';
  }

  get activeCount(): number {
    return this.allOrders.filter((o) => !['done', 'cancelled'].includes(o.status)).length;
  }

  get historyCount(): number {
    return this.allOrders.filter((o) => ['done', 'cancelled'].includes(o.status)).length;
  }

  get completedCount(): number {
    return this.allOrders.filter((o) => o.status === 'done').length;
  }

  get totalSpent(): number {
    return this.allOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }

  get rewardPoints(): number {
    return Math.min(800, Math.floor(this.totalSpent / 5000));
  }

  loadOrders() {
    this.loading = true;
    this.errorMsg = '';

    const params: any = { limit: 50 };
    if (this.phoneSearch.trim()) {
      params.phone = this.phoneSearch.trim();
    }

    this.orderService.getOrders(params).subscribe({
      next: (res) => {
        this.allOrders = res.items || res.orders || (Array.isArray(res) ? res : []);
        this.loading = false;
        this.applyClientFilter();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.allOrders = [];
        this.filteredOrders = [];
        this.loading = false;
        this.errorMsg = err.error?.message || 'Không thể kết nối tới máy chủ (cổng 3000).';
        this.cdr.detectChanges();
      },
    });
  }

  switchTab(tab: 'active' | 'history') {
    this.activeTab = tab;
    this.statusFilter = '';
    this.applyClientFilter();
  }

  applyClientFilter() {
    const kw = this.searchKeyword.trim().toLowerCase();

    this.filteredOrders = this.allOrders.filter((o) => {
      const isHistory = ['done', 'cancelled'].includes(o.status);
      if (this.activeTab === 'active' && isHistory) return false;
      if (this.activeTab === 'history' && !isHistory) return false;

      if (this.statusFilter && o.status !== this.statusFilter) return false;

      if (kw) {
        const matchCode = (o.code || '').toLowerCase().includes(kw);
        const matchItem = (o.items || []).some((i: any) =>
          (i.name || '').toLowerCase().includes(kw),
        );
        return matchCode || matchItem;
      }
      return true;
    });

    if (this.filteredOrders.length > 0) {
      if (
        !this.selectedOrder ||
        !this.filteredOrders.some((o) => o._id === this.selectedOrder._id)
      ) {
        this.selectedOrder = this.filteredOrders[0];
      }
    } else {
      this.selectedOrder = null;
    }
  }

  selectOrderForTimeline(order: any) {
    this.selectedOrder = order;
  }

  // ==================== MỞ & XỬ LÝ 3 MODAL HỦY ĐƠN ====================

  openDirectCancelModal(order: any) {
    this.targetOrder = order;
    this.directReasonCode = '';
    this.directReasonText = '';
    this.modalError = '';
    this.activeModal = 'direct_cancel';
  }

  openRequestCancelModal(order: any) {
    this.targetOrder = order;
    this.requestReasonOption = 'wrong_info';
    this.requestReasonDetail = '';
    this.modalError = '';
    this.activeModal = 'request_cancel';
  }

  closeModal() {
    if (this.submitting) return;
    this.activeModal = 'none';
    this.targetOrder = null;
    this.modalError = '';
  }

  submitDirectCancel() {
    if (!this.directReasonCode) {
      this.modalError = 'Vui lòng chọn lý do hủy đơn hàng.';
      return;
    }
    if (this.directReasonCode === 'other' && !this.directReasonText.trim()) {
      this.modalError = 'Vui lòng nhập chi tiết lý do hủy đơn.';
      return;
    }

    const reasonLabelMap: Record<string, string> = {
      change_mind: 'Đổi ý / Không còn nhu cầu đặt bánh',
      wrong_info: 'Đặt nhầm mẫu bánh hoặc sai thông tin nhận',
      change_schedule: 'Thay đổi lịch trình / thời gian tổ chức tiệc',
      other: this.directReasonText.trim(),
    };

    this.submitting = true;
    this.modalError = '';

    this.orderService
      .cancelOrder(
        this.targetOrder._id,
        this.directReasonCode,
        reasonLabelMap[this.directReasonCode],
      )
      .subscribe({
        next: (updated) => {
          this.submitting = false;
          const idx = this.allOrders.findIndex((o) => o._id === updated._id);
          if (idx !== -1) this.allOrders[idx] = updated;
          this.activeModal = 'none';
          this.applyClientFilter();
          this.showToast(`Đã hủy đơn hàng #${updated.code} thành công.`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.submitting = false;
          this.modalError = err.error?.message || 'Không thể hủy đơn hàng, vui lòng thử lại.';
          this.cdr.detectChanges();
        },
      });
  }

  submitRequestCancel() {
    if (this.requestReasonOption === 'other' && !this.requestReasonDetail.trim()) {
      this.modalError = 'Vui lòng nhập mô tả chi tiết lý do yêu cầu hủy.';
      return;
    }

    const foundOpt = this.requestReasonOptions.find((o) => o.value === this.requestReasonOption);
    const displayReason = this.requestReasonDetail.trim()
      ? `${foundOpt?.label}: ${this.requestReasonDetail.trim()}`
      : foundOpt?.label || 'Yêu cầu hủy đơn';

    // Map sang mã chuẩn Backend chấp nhận (CUSTOMER_CANCEL_REASONS)
    const backendCodeMap: Record<string, string> = {
      wrong_info: 'wrong_info',
      change_config: 'wrong_info',
      change_schedule: 'change_schedule',
      change_mind: 'change_mind',
      other: 'other',
    };

    this.submitting = true;
    this.modalError = '';

    this.orderService
      .createCancelRequest(
        this.targetOrder._id,
        backendCodeMap[this.requestReasonOption] || 'other',
        displayReason,
      )
      .subscribe({
        next: (updated) => {
          this.submitting = false;
          const idx = this.allOrders.findIndex((o) => o._id === updated._id);
          if (idx !== -1) this.allOrders[idx] = updated;
          this.targetOrder = updated;
          this.submittedRequestReason = displayReason;
          this.applyClientFilter();
          // Chuyển sang Frame 06: Gửi yêu cầu thành công
          this.activeModal = 'request_success';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.submitting = false;
          this.modalError = err.error?.message || 'Không thể gửi yêu cầu hủy đơn.';
          this.cdr.detectChanges();
        },
      });
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => {
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 4500);
  }

  getStepState(orderStatus: string, stepKey: string): 'completed' | 'current' | 'upcoming' {
    const currentRank = this.statusRank[orderStatus] || 1;
    const stepRank = this.statusRank[stepKey] || 1;
    if (stepRank < currentRank) return 'completed';
    if (stepRank === currentRank) return 'current';
    return 'upcoming';
  }

  getItemImage(item: any): string {
    if (!item) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&q=80';
    if (item.imageUrl) return item.imageUrl;
    if (item.imageId) return `${environment.apiUrl}/files/${item.imageId}`;
    const name = (item.name || '').toLowerCase();
    if (name.includes('wedding') || name.includes('cưới')) {
      return 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=300&q=80';
    }
    if (name.includes('nến') || name.includes('phụ kiện')) {
      return 'https://images.unsplash.com/photo-1519869325930-281384150729?w=300&q=80';
    }
    return 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&q=80';
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
      cancelled: 'Đã hủy',
    };
    return map[status] || status;
  }

  viewDetail(id: string) {
    this.router.navigate(['/orders', id]);
  }
}
