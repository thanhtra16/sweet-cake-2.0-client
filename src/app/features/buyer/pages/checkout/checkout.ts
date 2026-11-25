import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { CheckoutApiService } from '@core/services/checkout-api.service';

import {
  CreateOrderRequest,
  OrderQuote,
  PublicSettings,
  TimeSlot,
} from '@shared/models/checkout.model';

interface BuyNowData {
  items: Array<{
    productId: string;
    qty: number;
    config?: {
      size: string;
      base: string;
      filling: string;
      frostingColor: string;
      sweetness: string;
      message: string;
    };
    variant?: string;
  }>;
  receiveMethod?: 'pickup' | 'delivery';
}

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CheckoutPage implements OnInit {
  private readonly api = inject(CheckoutApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly elRef = inject(ElementRef);

  private readonly BUY_NOW_STORAGE_KEY = 'sweetcake_buy_now';

  settings?: PublicSettings;
  slots: TimeSlot[] = [];
  quote?: OrderQuote;

  loading = false;
  loadingSlots = false;
  loadingQuote = false;
  branchDropdownOpen = false;

  error = '';
  voucherError = '';

  voucherCode = '';
  selectedDate = '';
  selectedSlotId = '';
  selectedBranch = '';
  minDate = '';

  receiver = {
    fullName: '',
    phone: '',
  };

  note = '';

  receiveMethod: 'pickup' | 'delivery' = 'pickup';

  cartItems: BuyNowData['items'] = [];

  ngOnInit(): void {
    this.minDate = this.getTodayIso();
    this.restoreBuyNowData();

    if (this.cartItems.length === 0) {
      this.error =
        'Không tìm thấy sản phẩm cần đặt hàng. Vui lòng quay lại trang sản phẩm và chọn Mua ngay.';
      return;
    }

    this.loadSettings();
    this.loadQuote();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.branchDropdownOpen) return;
    const dropdownEl =
      this.elRef.nativeElement.querySelector('.sc-branch-select');
    if (dropdownEl && !dropdownEl.contains(event.target as Node)) {
      this.branchDropdownOpen = false;
    }
  }

  get selectedBranchObj() {
    return this.settings?.branches?.find(
      (b) => (b._id || b.name) === this.selectedBranch
    );
  }

  toggleBranchDropdown(): void {
    if (this.loading) return;
    this.branchDropdownOpen = !this.branchDropdownOpen;
  }

  selectBranch(branch: any): void {
    this.selectedBranch = branch._id || branch.name;
    this.branchDropdownOpen = false;
  }

  private getTodayIso(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ========================================
  // RESTORE BUY NOW DATA
  // ========================================

  private restoreBuyNowData(): void {
    try {
      const rawData = sessionStorage.getItem(this.BUY_NOW_STORAGE_KEY);

      if (!rawData) {
        return;
      }

      const data = JSON.parse(rawData) as BuyNowData;

      if (
        !Array.isArray(data.items) ||
        data.items.length === 0 ||
        !data.items.every(
          (item) =>
            !!item.productId && Number.isInteger(item.qty) && item.qty > 0
        )
      ) {
        this.error =
          'Thông tin sản phẩm không hợp lệ. Vui lòng thực hiện lại thao tác Mua ngay.';
        return;
      }

      this.cartItems = data.items;
      this.receiveMethod =
        data.receiveMethod === 'delivery' ? 'delivery' : 'pickup';
    } catch (err) {
      console.error('[Checkout] Cannot restore Buy Now data:', err);

      this.error =
        'Không thể đọc thông tin sản phẩm. Vui lòng thực hiện lại thao tác Mua ngay.';
    }
  }

  // ========================================
  // SETTINGS
  // ========================================

  private loadSettings(): void {
    this.api.getSettings().subscribe({
      next: (value: any) => {
        const payload = value?.data ?? value;
        this.settings = payload;

        if (!this.selectedBranch) {
          this.selectedBranch = payload?.branches?.[0]?._id || '';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Checkout] Cannot load settings:', err);

        this.error =
          err.error?.message ||
          'Không tải được cấu hình cửa hàng. Vui lòng thử lại.';
        this.cdr.detectChanges();
      },
    });
  }

  // ========================================
  // TIME SLOTS
  // ========================================

  loadSlots(): void {
    this.selectedSlotId = '';
    this.slots = [];

    if (!this.selectedDate) {
      return;
    }

    this.loadingSlots = true;
    this.cdr.detectChanges();

    this.api
      .getTimeSlots(this.selectedDate)
      .pipe(
        finalize(() => {
          this.loadingSlots = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (value: any) => {
          const payload = value?.data ?? value;
          this.slots = payload?.items || [];
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Checkout] Cannot load time slots:', err);

          this.slots = [];
          this.error =
            err.error?.message ||
            'Không tải được khung giờ nhận bánh. Vui lòng thử lại.';
          this.cdr.detectChanges();
        },
      });
  }

  // ========================================
  // QUOTE
  // ========================================

  loadQuote(): void {
    if (!this.cartItems.length) {
      this.quote = undefined;
      return;
    }

    this.loadingQuote = true;
    this.quote = undefined;
    this.cdr.detectChanges();

    this.api
      .quote({
        items: this.cartItems,
        voucherCode: this.voucherCode.trim() || undefined,
        receiveMethod: this.receiveMethod,
      })
      .pipe(
        finalize(() => {
          this.loadingQuote = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (value: any) => {
          const payload = value?.data ?? value;
          this.quote = payload;

          if (!payload?.valid) {
            this.voucherError =
              'Một hoặc nhiều sản phẩm không còn hợp lệ. Vui lòng kiểm tra lại đơn hàng.';
            this.cdr.detectChanges();
            return;
          }

          this.voucherError = '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Checkout] Cannot calculate quote:', err);

          this.quote = undefined;
          this.voucherError =
            err.error?.message ||
            'Không thể tính giá đơn hàng. Vui lòng thử lại.';
          this.cdr.detectChanges();
        },
      });
  }

  // ========================================
  // VOUCHER
  // ========================================

  applyVoucher(): void {
    const code = this.voucherCode.trim();

    if (!code) {
      this.voucherError = 'Vui lòng nhập mã giảm giá.';
      return;
    }

    if (!this.quote || !this.quote.valid) {
      this.voucherError = 'Vui lòng chờ hệ thống tính giá đơn hàng trước.';
      return;
    }

    this.voucherCode = code;
    this.loadQuote();
  }

  removeVoucher(): void {
    this.voucherCode = '';
    this.voucherError = '';
    this.loadQuote();
  }

  // ========================================
  // RECEIVE METHOD
  // ========================================

  onReceiveMethodChange(): void {
    this.selectedSlotId = '';
    this.branchDropdownOpen = false;
    this.loadQuote();

    if (this.selectedDate) {
      this.loadSlots();
    } else {
      this.slots = [];
    }
  }

  // ========================================
  // VALIDATION
  // ========================================

  private validateCheckout(): boolean {
    if (!this.cartItems.length) {
      this.error = 'Không có sản phẩm để đặt hàng.';
      return false;
    }

    if (!this.quote || !this.quote.valid) {
      this.error = 'Báo giá chưa hợp lệ. Vui lòng kiểm tra lại đơn hàng.';
      return false;
    }

    if (!this.selectedDate) {
      this.error = 'Vui lòng chọn ngày nhận bánh.';
      return false;
    }

    if (!this.selectedSlotId) {
      this.error = 'Vui lòng chọn khung giờ nhận bánh.';
      return false;
    }

    if (!this.receiver.fullName.trim()) {
      this.error = 'Vui lòng nhập họ và tên người nhận.';
      return false;
    }

    const phone = this.receiver.phone.trim();
    const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;

    if (!phoneRegex.test(phone)) {
      this.error = 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
      return false;
    }

    if (this.receiveMethod === 'pickup' && !this.selectedBranch) {
      this.error = 'Vui lòng chọn chi nhánh nhận bánh.';
      return false;
    }

    return true;
  }

  // ========================================
  // CREATE ORDER
  // ========================================

  onSubmit(): void {
    if (this.loading || this.loadingQuote || this.loadingSlots) {
      return;
    }

    this.error = '';

    if (!this.validateCheckout()) {
      return;
    }

    const payload: CreateOrderRequest = {
      items: this.cartItems as unknown as CreateOrderRequest['items'],
      receiver: {
        fullName: this.receiver.fullName.trim(),
        phone: this.receiver.phone.trim(),
      },
      receiveMethod: this.receiveMethod,
      slotId: this.selectedSlotId,
      pickupBranch:
        this.receiveMethod === 'pickup' ? this.selectedBranch : undefined,
      note: this.note.trim(),
      voucherCode: this.voucherCode.trim() || undefined,
      expectedTotal: this.quote!.total,
    };

    this.loading = true;
    this.cdr.detectChanges();

    this.api
      .createOrder(payload)
      .pipe(
        catchError((err) => {
          console.error('[Checkout] Cannot create order:', err);

          if (err.status === 409 && err.error?.code === 'PRICE_CHANGED') {
            this.quote = err.error.details?.currentQuote;

            this.error =
              'Giá đơn hàng đã thay đổi. Vui lòng kiểm tra tổng tiền mới trước khi đặt hàng lại.';
          } else {
            this.error =
              err.error?.message ||
              'Không thể tạo đơn hàng. Vui lòng thử lại.';
          }

          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe((result: any) => {
        if (!result) {
          return;
        }

        const payload = result?.data ?? result;
        const orderId = payload?.order?._id;
        const trackToken = payload?.trackToken;

        if (!orderId || !trackToken) {
          this.error =
            'Đơn hàng đã được phản hồi nhưng thiếu thông tin theo dõi. Vui lòng liên hệ cửa hàng.';
          this.cdr.detectChanges();
          return;
        }

        sessionStorage.setItem(`track:${orderId}`, trackToken);
        sessionStorage.setItem(
          `order:${orderId}`,
          JSON.stringify(payload.order)
        );
        sessionStorage.removeItem(this.BUY_NOW_STORAGE_KEY);

        this.router.navigate(['/payment', orderId]);
      });
  }

  // ========================================
  // FORMAT
  // ========================================

  formatVnd(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  }
}