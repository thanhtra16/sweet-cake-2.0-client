import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CheckoutApiService } from '@core/services/checkout-api.service';
import { CreateOrderRequest, OrderQuote, PublicSettings, TimeSlot } from '@shared/models/checkout.model';

@Component({ selector: 'app-checkout-page', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './checkout.html', styleUrl: './checkout.scss' })
export class CheckoutPage implements OnInit {
  private readonly api = inject(CheckoutApiService); private readonly router = inject(Router);
  settings?: PublicSettings; slots: TimeSlot[] = []; quote?: OrderQuote;
  loading = false; error = ''; voucherError = ''; voucherCode = ''; selectedDate = ''; selectedSlotId = ''; selectedBranch = '';
  receiver = { fullName: '', phone: '' }; note = ''; receiveMethod: 'pickup' | 'delivery' = 'pickup';
  // TODO: CHECK WITH PROJECT – thay cartItems bằng CartService thật và map đúng item shape.
  cartItems: Array<{ productId: string; qty: number; config?: Record<string, unknown>; variant?: Record<string, unknown> }> = [];
  ngOnInit(): void {
    this.api.getSettings().subscribe({ next: value => { this.settings = value; this.selectedBranch = value.branches?.[0]?._id || value.branches?.[0]?.name || ''; }, error: () => this.error = 'Không tải được cấu hình cửa hàng.' });
    this.loadQuote();
  }
  loadSlots(): void { if (!this.selectedDate) return; this.api.getTimeSlots(this.selectedDate).subscribe({ next: value => this.slots = value.items, error: err => this.error = err.error?.message || 'Không tải được khung giờ.' }); }
  loadQuote(): void {
    if (!this.cartItems.length) return;
    this.api.quote({ items: this.cartItems, voucherCode: this.voucherCode || undefined, receiveMethod: this.receiveMethod }).subscribe({ next: value => { this.quote = value; this.voucherError = ''; }, error: err => { this.quote = undefined; this.voucherError = err.error?.message || 'Không thể tính giá đơn hàng.'; } });
  }
  applyVoucher(): void {
    if (!this.voucherCode.trim() || !this.quote) return;
    this.api.validateVoucher(this.voucherCode, this.quote.subtotal).subscribe({ next: () => this.loadQuote(), error: err => this.voucherError = err.error?.message || 'Voucher không hợp lệ.' });
  }
  onReceiveMethodChange(): void { this.loadQuote(); }
  onSubmit(): void {
    this.error = '';
    if (!this.quote || !this.selectedSlotId || !this.receiver.fullName.trim() || !this.receiver.phone.trim()) { this.error = 'Vui lòng nhập đủ thông tin và chọn khung giờ.'; return; }
    const payload: CreateOrderRequest = { items: this.cartItems, receiver: this.receiver, receiveMethod: this.receiveMethod, slotId: this.selectedSlotId, pickupBranch: this.receiveMethod === 'pickup' ? this.selectedBranch : undefined, note: this.note, voucherCode: this.voucherCode || undefined, expectedTotal: this.quote.total };
    this.loading = true;
    this.api.createOrder(payload).pipe(catchError(err => { if (err.status === 409 && err.error?.code === 'PRICE_CHANGED') { this.quote = err.error.details?.currentQuote; this.error = 'Giá đơn hàng đã thay đổi. Vui lòng kiểm tra và bấm đặt hàng lại để xác nhận giá mới.'; } else this.error = err.error?.message || 'Không thể tạo đơn hàng.'; return of(null); })).subscribe(result => {
      this.loading = false; if (!result) return;
      sessionStorage.setItem(`track:${result.order._id}`, result.trackToken);
      sessionStorage.setItem(`order:${result.order._id}`, JSON.stringify(result.order));
      this.router.navigate(['/payment', result.order._id]);
    });
  }
  formatVnd(value: number): string { return new Intl.NumberFormat('vi-VN').format(value) + ' ₫'; }
}
