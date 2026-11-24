
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CheckoutPage implements OnInit {
  private readonly api = inject(CheckoutApiService);
  private readonly router = inject(Router);

  private readonly BUY_NOW_STORAGE_KEY = 'sweetcake_buy_now';

  settings?: PublicSettings;
  slots: TimeSlot[] = [];
  quote?: OrderQuote;

  loading = false;
  loadingSlots = false;
  loadingQuote = false;

  error = '';
  voucherError = '';

  voucherCode = '';
  selectedDate = '';
  selectedSlotId = '';
  selectedBranch = '';

  receiver = {
    fullName: '',
    phone: '',
  };

  note = '';

  receiveMethod: 'pickup' | 'delivery' = 'pickup';

  cartItems: BuyNowData['items'] = [];

  ngOnInit(): void {
    this.restoreBuyNowData();

    if (this.cartItems.length === 0) {
      this.error =
        'Không tìm thấy sản phẩm cần đặt hàng. Vui lòng quay lại trang sản phẩm và chọn Mua ngay.';
      return;
    }

    this.loadSettings();

    // Luôn lấy báo giá mới nhất từ Backend.
    // Không sử dụng giá được lưu từ trang sản phẩm.
    this.loadQuote();
  }

  // ========================================
  // RESTORE BUY NOW DATA
  // ========================================

  private restoreBuyNowData(): void {
    try {
      const rawData = sessionStorage.getItem(
        this.BUY_NOW_STORAGE_KEY
      );

      if (!rawData) {
        return;
      }

      const data = JSON.parse(rawData) as BuyNowData;

      if (
        !Array.isArray(data.items) ||
        data.items.length === 0 ||
        !data.items.every(
          (item) =>
            !!item.productId &&
            Number.isInteger(item.qty) &&
            item.qty > 0
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
      console.error(
        '[Checkout] Cannot restore Buy Now data:',
        err
      );

      this.error =
        'Không thể đọc thông tin sản phẩm. Vui lòng thực hiện lại thao tác Mua ngay.';
    }
  }

  // ========================================
  // SETTINGS
  // ========================================

  private loadSettings(): void {
    this.api.getSettings().subscribe({
      next: (value) => {
        this.settings = value;

        // Chỉ sử dụng ID của chi nhánh, không dùng tên chi nhánh
        // thay thế cho ID khi gửi request tạo đơn.
        if (!this.selectedBranch) {
          this.selectedBranch =
            value.branches?.[0]?._id || '';
        }
      },
      error: (err) => {
        console.error(
          '[Checkout] Cannot load settings:',
          err
        );

        this.error =
          err.error?.message ||
          'Không tải được cấu hình cửa hàng. Vui lòng thử lại.';
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

    this.api
      .getTimeSlots(this.selectedDate)
      .pipe(
        finalize(() => {
          this.loadingSlots = false;
        })
      )
      .subscribe({
        next: (value) => {
          this.slots = value.items || [];
        },
        error: (err) => {
          console.error(
            '[Checkout] Cannot load time slots:',
            err
          );

          this.slots = [];

          this.error =
            err.error?.message ||
            'Không tải được khung giờ nhận bánh. Vui lòng thử lại.';
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

    this.api
      .quote({
        items: this.cartItems,
        voucherCode: this.voucherCode.trim() || undefined,
        receiveMethod: this.receiveMethod,
      })
      .pipe(
        finalize(() => {
          this.loadingQuote = false;
        })
      )
      .subscribe({
        next: (value) => {
          this.quote = value;

          if (!value.valid) {
            this.voucherError =
              'Một hoặc nhiều sản phẩm không còn hợp lệ. Vui lòng kiểm tra lại đơn hàng.';
            return;
          }

          this.voucherError = '';
        },
        error: (err) => {
          console.error(
            '[Checkout] Cannot calculate quote:',
            err
          );

          this.quote = undefined;

          this.voucherError =
            err.error?.message ||
            'Không thể tính giá đơn hàng. Vui lòng thử lại.';
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
      this.voucherError =
        'Vui lòng chờ hệ thống tính giá đơn hàng trước.';
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
    // Xóa lựa chọn khung giờ cũ để tránh gửi nhầm dữ liệu.
    this.selectedSlotId = '';
    this.slots = [];

    // Khi chuyển phương thức nhận hàng, cần tính lại phí.
    this.loadQuote();
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
      this.error =
        'Báo giá chưa hợp lệ. Vui lòng kiểm tra lại đơn hàng.';
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
      this.error =
        'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
      return false;
    }

    if (
      this.receiveMethod === 'pickup' &&
      !this.selectedBranch
    ) {
      this.error = 'Vui lòng chọn chi nhánh nhận bánh.';
      return false;
    }

    return true;
  }

  // ========================================
  // CREATE ORDER
  // ========================================

  onSubmit(): void {
    // Chặn gửi nhiều request khi người dùng bấm liên tục.
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
        this.receiveMethod === 'pickup'
          ? this.selectedBranch
          : undefined,

      note: this.note.trim(),
      voucherCode: this.voucherCode.trim() || undefined,

      // Backend sẽ đối chiếu với báo giá hiện tại.
      expectedTotal: this.quote!.total,
    };

    this.loading = true;

    this.api
      .createOrder(payload)
      .pipe(
        catchError((err) => {
          console.error(
            '[Checkout] Cannot create order:',
            err
          );

          if (
            err.status === 409 &&
            err.error?.code === 'PRICE_CHANGED'
          ) {
            this.quote =
              err.error.details?.currentQuote;

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
        })
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const orderId = result.order?._id;
        const trackToken = result.trackToken;

        if (!orderId || !trackToken) {
          this.error =
            'Đơn hàng đã được phản hồi nhưng thiếu thông tin theo dõi. Vui lòng liên hệ cửa hàng.';
          return;
        }

        sessionStorage.setItem(
          `track:${orderId}`,
          trackToken
        );

        sessionStorage.setItem(
          `order:${orderId}`,
          JSON.stringify(result.order)
        );

        // Chỉ xóa dữ liệu Mua ngay sau khi tạo đơn thành công.
        sessionStorage.removeItem(
          this.BUY_NOW_STORAGE_KEY
        );

        this.router.navigate([
          '/payment',
          orderId,
        ]);
      });
  }

  // ========================================
  // FORMAT
  // ========================================

  formatVnd(value: number): string {
    return (
      new Intl.NumberFormat('vi-VN').format(value) +
      ' ₫'
    );
  }
}
