import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription, switchMap, catchError, of } from 'rxjs';
import { CheckoutApiService } from '@core/services/checkout-api.service';

@Component({ selector: 'app-payment-page', standalone: true, imports: [CommonModule], templateUrl: './payment.html', styleUrl: './payment.scss' })
export class PaymentPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly api = inject(CheckoutApiService);
  orderId = ''; order: any; token = ''; secondsLeft = 600; message = ''; loadingQr = false; private timer?: Subscription; private poller?: Subscription;
  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId') || ''; this.token = sessionStorage.getItem(`track:${this.orderId}`) || '';
    const saved = sessionStorage.getItem(`order:${this.orderId}`); if (saved) { this.order = JSON.parse(saved); this.setCountdown(); }
    this.refreshStatus();
    this.poller = interval(5000).pipe(switchMap(() => this.api.getOrder(this.orderId, this.token).pipe(catchError(() => of(null))))).subscribe(value => { if (value) { this.order = value; if (value.payment?.status === 'paid') this.message = 'Thanh toán thành công!'; } });
  }
  private setCountdown(): void {
    const attempt = this.order?.payment?.attempts?.slice(-1)[0]; if (!attempt?.expiresAt) return;
    const expiresAt = new Date(attempt.expiresAt).getTime(); this.timer?.unsubscribe();
    this.timer = interval(1000).subscribe(() => { this.secondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)); if (!this.secondsLeft) this.message = 'Mã QR đã hết hạn. Bạn có thể tạo lại mã nếu đơn vẫn còn thời gian.'; });
  }
  refreshStatus(): void { if (!this.orderId || !this.token) return; this.api.getOrder(this.orderId, this.token).subscribe({ next: value => { this.order = value; if (value.payment?.status === 'paid') this.message = 'Thanh toán thành công!'; }, error: () => this.message = 'Không tải được trạng thái đơn hàng.' }); }
  recreateQr(): void { this.loadingQr = true; this.api.createQr(this.orderId).subscribe({ next: value => { this.loadingQr = false; this.order = { ...this.order, payment: { ...this.order?.payment, attempts: [...(this.order?.payment?.attempts || []), value.attempt] } }; this.setCountdown(); this.message = ''; }, error: err => { this.loadingQr = false; this.message = err.error?.message || 'Không thể tạo lại QR.'; } }); }
  get currentAttempt(): any { return this.order?.payment?.attempts?.slice(-1)[0]; }
  get timeLabel(): string { return `${String(Math.floor(this.secondsLeft / 60)).padStart(2, '0')}:${String(this.secondsLeft % 60).padStart(2, '0')}`; }
  formatVnd(value: number): string { return new Intl.NumberFormat('vi-VN').format(value || 0) + ' ₫'; }
  ngOnDestroy(): void { this.timer?.unsubscribe(); this.poller?.unsubscribe(); }
}
