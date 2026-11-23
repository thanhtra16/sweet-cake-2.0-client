import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CheckoutApiService } from '@core/services/checkout-api.service';
import {
  CreateOrderRequest,
  OrderQuote,
  PublicSettings,
  TimeSlot,
} from '@shared/models/checkout.model';
import { OrderQuote as ApiOrderQuote } from '@core/services/api.service';

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
  receiveMethod: 'pickup' | 'delivery';
  quote: ApiOrderQuote;
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

    this.api.getSettings().subscribe({
      next: (value) => {
        this.settings = value;

        if (!this.selectedBranch) {
          this.selectedBranch =
            value.branches?.[0]?._id ||
            value.branches?.[0]?.name ||
            '';
        }
      },
      error: () => {
        this.error = 'Không tải được cấu hình cửa hàng.';
      },
    });

    // Chỉ gọi lại báo giá nếu không có báo giá đã được
    // xác nhận từ bước Mua ngay.
    if (!this.quote && this.cartItems.length > 0) {
      this.loadQuote();
    }

    if (this.cartItems.length === 0) {
      this.error =
        'Không tìm thấy sản phẩm cần đặt hàng. Vui lòng quay lại trang sản phẩm và chọn Mua ngay.';
    }
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
        !data.quote ||
        !data.quote.valid ||
        !data.quote.items?.every((item) => item.valid)
      ) {
        this.error =
          'Thông tin sản phẩm không hợp lệ. Vui lòng thực hiện lại thao tác Mua ngay.';
        return;
      }

      this.cartItems = data.items;
      this.receiveMethod = data.receiveMethod || 'pickup';

      // Dùng báo giá đã được ApiService xác nhận ở trang sản phẩm.
      // Cấu trúc các trường tổng tiền tương thích với OrderQuote
      // mà giao diện Checkout đang sử dụng.
      this.quote = data.quote as unknown as OrderQuote;
    } catch (error) {
      console.error('[Checkout] Cannot restore Buy Now data:', error);

      this.error =
        'Không thể đọc thông tin sản phẩm. Vui lòng thực hiện lại thao tác Mua ngay.';
    }
  }

  // ========================================
  // TIME SLOTS
  // ========================================

  loadSlots(): void {
    if (!this.selectedDate) {
      return;
    }

    this.selectedSlotId = '';

    this.api.getTimeSlots(this.selectedDate).subscribe({
      next: (value) => {
        this.slots = value.items;
      },
      error: (err) => {
        this.error =
          err.error?.message ||
          'Không tải được khung giờ.';
      },
    });
  }

  // ========================================
  // QUOTE
  // ========================================

  loadQuote(): void {
    if (!this.cartItems.length) {
      return;
    }

    this.api
      .quote({
        items: this.cartItems,
        voucherCode: this.voucherCode || undefined,
        receiveMethod: this.receiveMethod,
      })
      .subscribe({
        next: (value) => {
          this.quote = value;
          this.voucherError = '';
        },
        error: (err) => {
          this.quote = undefined;

          this.voucherError =
            err.error?.message ||
            'Không thể tính giá đơn hàng.';
        },
      });
  }

  applyVoucher(): void {
    if (!this.voucherCode.trim() || !this.quote) {
      return;
    }

    this.api
      .validateVoucher(this.voucherCode, this.quote.subtotal)
      .subscribe({
        next: () => this.loadQuote(),
        error: (err) => {
          this.voucherError =
            err.error?.message ||
            'Voucher không hợp lệ.';
        },
      });
  }

  onReceiveMethodChange(): void {
    this.loadQuote();
  }

  // ========================================
  // CREATE ORDER
  // ========================================

  onSubmit(): void {
    this.error = '';

    if (!this.cartItems.length) {
      this.error = 'Không có sản phẩm để đặt hàng.';
      return;
    }

    if (
      !this.quote ||
      !this.selectedSlotId ||
      !this.receiver.fullName.trim() ||
      !this.receiver.phone.trim()
    ) {
      this.error =
        'Vui lòng nhập đủ thông tin và chọn khung giờ.';
      return;
    }

    const payload: CreateOrderRequest = {
      // Backend nhận variant là mã biến thể dạng string,
      // giống cấu trúc QuoteRequestItem của Cart.
      items: this.cartItems as unknown as CreateOrderRequest['items'],

      receiver: this.receiver,
      receiveMethod: this.receiveMethod,
      slotId: this.selectedSlotId,

      pickupBranch:
        this.receiveMethod === 'pickup'
          ? this.selectedBranch
          : undefined,

      note: this.note,
      voucherCode: this.voucherCode || undefined,
      expectedTotal: this.quote.total,
    };

    this.loading = true;

    this.api
      .createOrder(payload)
      .pipe(
        catchError((err) => {
          if (
            err.status === 409 &&
            err.error?.code === 'PRICE_CHANGED'
          ) {
            this.quote = err.error.details?.currentQuote;

            this.error =
              'Giá đơn hàng đã thay đổi. Vui lòng kiểm tra và bấm đặt hàng lại để xác nhận giá mới.';
          } else {
            this.error =
              err.error?.message ||
              'Không thể tạo đơn hàng.';
          }

          return of(null);
        })
      )
      .subscribe((result) => {
        this.loading = false;

        if (!result) {
          return;
        }

        sessionStorage.setItem(
          `track:${result.order._id}`,
          result.trackToken
        );

        sessionStorage.setItem(
          `order:${result.order._id}`,
          JSON.stringify(result.order)
        );

        // Xóa dữ liệu Mua ngay tạm thời sau khi tạo đơn thành công.
        sessionStorage.removeItem(this.BUY_NOW_STORAGE_KEY);

        this.router.navigate([
          '/payment',
          result.order._id,
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
