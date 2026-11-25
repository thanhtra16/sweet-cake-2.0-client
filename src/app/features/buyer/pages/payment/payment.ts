import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription, switchMap, catchError, of } from 'rxjs';
import { CheckoutApiService } from '@core/services/checkout-api.service';

@Component({
  selector: 'app-payment-page', standalone: true, imports: [CommonModule],
  templateUrl: './payment.html', styleUrl: './payment.scss'
})
export class PaymentPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CheckoutApiService);
  orderId = ''; order: any; token = '';
  secondsLeft = 600; message = ''; loadingQr = false; simulating = false;
  private timer?: Subscription; private poller?: Subscription;

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId') || '';
    this.token = sessionStorage.getItem(`track:${this.orderId}`) || '';
    const saved = sessionStorage.getItem(`order:${this.orderId}`);
    if (saved) { try { this.order = JSON.parse(saved); } catch { /* refresh from server */ } }
    this.refreshStatus();
    this.poller = interval(5000).pipe(
      switchMap(() => this.api.getOrder(this.orderId, this.token).pipe(catchError(() => of(null))))
    ).subscribe(value => { if (value) this.applyOrder(value); });
  }

  private applyOrder(value: any): void {
    this.order = value;
    sessionStorage.setItem(`order:${this.orderId}`, JSON.stringify(value));
    if (value.payment?.status === 'paid' && value.status === 'pending_approval') {
      this.message = 'Thanh toán thành công! Đơn hàng đang chờ cửa hàng duyệt.';
    } else if (value.payment?.latePayment || value.payment?.latePaymentStatus === 'refund_required') {
      this.message = 'Hệ thống ghi nhận thanh toán muộn. Đơn không được khôi phục và đang chờ hoàn tiền 100%.';
    } else if (value.status === 'cancelled') {
      this.message = 'Đơn hàng đã bị hủy. Vui lòng chọn khung giờ khác để đặt đơn mới.';
    }
    this.setCountdown();
  }

  private setCountdown(): void {
    const attempt = this.currentAttempt;
    const expiresAt = new Date(attempt?.deadlineAt || attempt?.expiresAt || 0).getTime();
    this.timer?.unsubscribe();
    if (!expiresAt) { this.secondsLeft = 0; return; }
    const tick = () => {
      this.secondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      if (!this.secondsLeft && this.order?.status === 'pending_payment') {
        this.message = this.canRecreate
          ? 'Mã QR đã hết hạn. Bạn có thể tạo mã mới.'
          : 'Mã QR cuối cùng đã hết hạn. Hệ thống đang hủy đơn và giải phóng khung giờ.';
        this.refreshStatus();
      }
    };
    tick();
    this.timer = interval(1000).subscribe(tick);
  }

  refreshStatus(): void {
    if (!this.orderId || !this.token) return;
    this.api.getOrder(this.orderId, this.token).subscribe({
      next: value => this.applyOrder(value),
      error: () => this.message = 'Không tải được trạng thái đơn hàng. Vui lòng tải lại trang.'
    });
  }

  recreateQr(): void {
    if (!this.canRecreate) return;
    this.loadingQr = true;
    this.api.createQr(this.orderId, this.token).subscribe({
      next: value => {
        this.loadingQr = false;
        this.message = 'Đã tạo mã QR mới. Mã có hiệu lực trong 10 phút.';
        this.refreshStatus();
        if (value?.attempt) {
          this.order = { ...this.order, payment: { ...this.order?.payment, attempts: [...(this.order?.payment?.attempts || []), value.attempt], recreateCount: value.recreateCount } };
          this.setCountdown();
        }
      },
      error: err => { this.loadingQr = false; this.message = err.error?.message || 'Không thể tạo lại QR.'; this.refreshStatus(); }
    });
  }

  simulatePayment(result: 'success' | 'failed'): void {
    const txnId = this.currentAttempt?.txnId || this.currentAttempt?.qrCode;
    if (!txnId || this.simulating) return;
    this.simulating = true;
    this.api.simulatePaymentWebhook(this.orderId, txnId, result).subscribe({
      next: value => {
        this.simulating = false;
        this.message = result === 'success'
          ? (value?.latePayment ? 'Thanh toán muộn: cần hoàn tiền 100%, đơn không được khôi phục.' : 'Webhook mô phỏng đã xác nhận thanh toán thành công.')
          : 'Giao dịch mô phỏng thất bại. Bạn có thể tạo lại QR nếu còn lượt.';
        this.refreshStatus();
      },
      error: err => { this.simulating = false; this.message = err.error?.message || 'Webhook mô phỏng gặp lỗi. Admin có thể kiểm tra giao dịch thủ công.'; }
    });
  }

  get currentAttempt(): any { return this.order?.payment?.attempts?.slice(-1)[0]; }
  get recreateCount(): number { return Number(this.order?.payment?.recreateCount || 0); }
  get canRecreate(): boolean {
    return this.order?.status === 'pending_payment' && this.order?.payment?.status !== 'paid' &&
      (this.secondsLeft === 0 || this.currentAttempt?.result === 'failed') && this.recreateCount < 3;
  }
  get timeLabel(): string { return `${String(Math.floor(this.secondsLeft / 60)).padStart(2, '0')}:${String(this.secondsLeft % 60).padStart(2, '0')}`; }
  formatVnd(value: number): string { return new Intl.NumberFormat('vi-VN').format(value || 0) + ' ₫'; }
  ngOnDestroy(): void { this.timer?.unsubscribe(); this.poller?.unsubscribe(); }
}
