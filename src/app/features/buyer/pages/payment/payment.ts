
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  interval,
  Subscription,
  catchError,
  of,
  exhaustMap,
  finalize,
  timeout,
} from 'rxjs';


import { CheckoutApiService } from '@core/services/checkout-api.service';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class PaymentPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CheckoutApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  orderId = '';
  order: any = null;
  token = '';

  secondsLeft = 0;
  message = '';

  loading = true;
  loadingQr = false;
  simulating = false;

  private timer?: Subscription;
  private poller?: Subscription;

  // Theo dõi lần thanh toán hiện tại để tránh reset countdown
  private countdownKey = '';

  // Tránh xử lý hết hạn nhiều lần cho cùng một giao dịch
  private expiryHandledFor = '';

  // Tránh gọi API lấy trạng thái chồng nhau
  private refreshing = false;

  ngOnInit(): void {
    this.orderId =
      this.route.snapshot.paramMap.get('orderId') || '';

    this.token =
      sessionStorage.getItem(`track:${this.orderId}`) || '';

    if (!this.orderId || !this.token) {
      this.loading = false;
      this.message =
        'Không tìm thấy thông tin truy cập đơn hàng. Vui lòng mở lại liên kết thanh toán từ trang đặt hàng.';
      this.cdr.markForCheck();
      return;
    }

    // Tải trạng thái đơn hàng lần đầu
    this.refreshStatus();

    // Tự động kiểm tra trạng thái mỗi 5 giây
    // exhaustMap tránh tạo request mới khi request trước chưa hoàn thành
    this.poller = interval(5000)
      .pipe(
        exhaustMap(() =>
          this.api.getOrder(this.orderId, this.token).pipe(
            catchError(() => of(null))
          )
        )
      )
      .subscribe(value => {
        if (value) {
          this.applyOrder(value);
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Chuẩn hóa dữ liệu đơn hàng từ nhiều dạng response API.
   */
  private normalizeOrder(value: any): any {
    if (!value) return null;

    const data = value?.data ?? value;

    const order =
      data?.order ??
      data?.data?.order ??
      data?.data ??
      data;

    if (!order || typeof order !== 'object') {
      return null;
    }

    return order;
  }

  /**
   * Cập nhật dữ liệu đơn hàng.
   */
  private applyOrder(value: any): void {
    const normalizedOrder = this.normalizeOrder(value);

    if (!normalizedOrder) {
      this.loading = false;
      return;
    }

    this.order = normalizedOrder;
    this.loading = false;
    console.log('===== PAYMENT DEBUG =====');

console.log('ORDER STATUS:', this.order?.status);

console.log('PAYMENT STATUS:', this.order?.payment?.status);

console.log('PAYMENT DEADLINE:', this.order?.payment?.deadlineAt);

console.log('ALL ATTEMPTS:', this.order?.payment?.attempts);

console.log('CURRENT ATTEMPT:', this.currentAttempt);

console.log('ATTEMPT RESULT:', this.currentAttempt?.result);

console.log('ATTEMPT STATUS:', this.currentAttempt?.status);

console.log('CURRENT DEADLINE:', this.currentDeadline);

console.log('DATE NOW:', Date.now());

console.log('SECONDS LEFT:', this.secondsLeft);

console.log('=========================');

    try {
      sessionStorage.setItem(
        `order:${this.orderId}`,
        JSON.stringify(this.order)
      );
    } catch {
      // Không làm gián đoạn thanh toán nếu sessionStorage lỗi
    }

    // Cập nhật thông báo theo trạng thái đơn hàng
    if (
      this.order?.payment?.status === 'paid' &&
      this.order?.status === 'pending_approval'
    ) {
      this.message =
        'Thanh toán thành công. Đơn hàng đã chuyển sang trạng thái Chờ duyệt.';
    } else if (
      this.order?.payment?.latePaymentStatus === 'refund_required' ||
      this.order?.payment?.latePayment
    ) {
      this.message =
        'Đã ghi nhận thanh toán muộn. Đơn hàng không được khôi phục và đang chờ hoàn tiền 100%.';
    } else if (this.order?.status === 'cancelled') {
      this.message =
        'Đơn hàng đã hủy. Khung giờ đã được giải phóng và voucher (nếu có) được hoàn lượt theo quy tắc hệ thống.';
    } else if (
      this.order?.payment?.status === 'paid'
    ) {
      this.message =
        'Thanh toán đã được xác nhận thành công.';
    } else if (
      this.order?.status === 'pending_payment' &&
      this.currentAttempt?.result === 'pending' &&
      this.secondsLeft > 0
    ) {
      // Không xóa thông báo đang hiển thị khi polling
      // nếu giao dịch vẫn đang chờ thanh toán
    } else if (
      this.order?.status !== 'pending_payment'
    ) {
      this.message = '';
    }

    this.updateCountdown();
    this.cdr.markForCheck();
  }

  /**
   * Lấy thời hạn thanh toán.
   * Ưu tiên deadline của attempt mới nhất.
   */
  private get currentDeadline(): number {
    const attempt = this.currentAttempt;
    const payment = this.order?.payment;

    const deadlineValue =
      attempt?.deadlineAt ||
      attempt?.expiresAt ||
      payment?.deadlineAt ||
      payment?.expiresAt;

    if (!deadlineValue) return 0;

    const timestamp = new Date(deadlineValue).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  /**
   * Countdown độc lập với polling.
   * Chỉ tạo timer mới khi giao dịch hoặc deadline thay đổi.
   */
  private updateCountdown(): void {
    const attempt = this.currentAttempt;
    const deadline = this.currentDeadline;

    const attemptKey = [
      attempt?.txnId || attempt?._id || '',
      deadline,
    ].join(':');

    if (
      !deadline ||
      this.order?.status !== 'pending_payment' ||
      attempt?.result !== 'pending'
    ) {
      this.timer?.unsubscribe();
      this.timer = undefined;

      this.countdownKey = '';
      this.secondsLeft = 0;

      return;
    }

    // Cùng một giao dịch thì giữ nguyên timer đang chạy
    if (
      this.countdownKey === attemptKey &&
      this.timer &&
      !this.timer.closed
    ) {
      return;
    }

    this.timer?.unsubscribe();
    this.timer = undefined;

    this.countdownKey = attemptKey;

    const tick = (): void => {
      this.secondsLeft = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000)
      );
      this.cdr.markForCheck();

      if (
        this.secondsLeft === 0 &&
        this.expiryHandledFor !== attemptKey
      ) {
        this.expiryHandledFor = attemptKey;

        this.message = this.canRecreate
          ? 'Mã QR đã hết hạn. Bạn có thể tạo mã mới để tiếp tục thanh toán.'
          : 'Mã QR đã hết hạn. Hệ thống đang cập nhật trạng thái đơn hàng.';

        this.timer?.unsubscribe();
        this.timer = undefined;

        this.refreshStatus();
      }
    };

    // Chạy ngay lần đầu
    tick();

    // Sau đó cập nhật mỗi giây
    if (this.secondsLeft > 0) {
      this.timer = interval(1000).subscribe(tick);
    }
  }

  /**
   * Tải lại trạng thái đơn hàng.
   */
  refreshStatus(): void {
    if (!this.orderId || !this.token) {
      this.loading = false;
      this.message =
        'Thiếu mã đơn hàng hoặc mã truy cập. Vui lòng quay lại trang đặt hàng.';
      console.error('Payment missing data:', {
        orderId: this.orderId,
        tokenExists: !!this.token,
      });
      this.cdr.markForCheck();
      return;
    }

    this.api
      .getOrder(this.orderId, this.token)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (value) => {
          console.log('PAYMENT ORDER RESPONSE:', value);
          this.applyOrder(value);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('PAYMENT ORDER ERROR:', err);
          this.message =
            err?.name === 'TimeoutError'
              ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'
              : err?.error?.message ||
                'Không thể tải thông tin đơn hàng.';
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Tạo lại mã QR thanh toán.
   */
  recreateQr(): void {
    if (!this.canRecreate || this.loadingQr) {
      return;
    }

    this.loadingQr = true;

    this.api
      .createQr(this.orderId, this.token)
      .pipe(
        finalize(() => {
          this.loadingQr = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: response => {
          const data =
            response?.data ?? response;

          // Trường hợp API trả về toàn bộ order mới
          const returnedOrder =
            data?.order ||
            (data?.status ? data : null);

          if (returnedOrder) {
            this.expiryHandledFor = '';
            this.applyOrder(returnedOrder);

            this.message =
              'Mã QR mới đã được tạo thành công. Vui lòng thanh toán trong thời gian quy định.';
            this.cdr.markForCheck();

            return;
          }

          // Hỗ trợ các tên trường attempt phổ biến
          const newAttempt =
            data?.attempt ||
            data?.paymentAttempt ||
            data?.payment?.attempt;

          if (newAttempt) {
            const oldAttempts =
              this.order?.payment?.attempts || [];

            // Không thêm trùng attempt
            const exists = oldAttempts.some(
              (item: any) =>
                (item?.txnId &&
                  item.txnId === newAttempt?.txnId) ||
                (item?._id &&
                  item._id === newAttempt?._id)
            );

            const attempts = exists
              ? oldAttempts
              : [...oldAttempts, newAttempt];

            this.order = {
              ...this.order,
              payment: {
                ...this.order?.payment,
                ...data?.payment,
                attempts,
                recreateCount:
                  data?.recreateCount ??
                  data?.payment?.recreateCount ??
                  this.recreateCount + 1,
                deadlineAt:
                  newAttempt?.deadlineAt ||
                  data?.deadlineAt ||
                  data?.payment?.deadlineAt,
              },
            };

            this.expiryHandledFor = '';

            this.message =
              'Mã QR mới đã được tạo thành công. Vui lòng thanh toán trong thời gian quy định.';

            this.applyOrder(this.order);
            this.cdr.markForCheck();

            return;
          }

          // API thành công nhưng cấu trúc response chưa có attempt
          this.message =
            'Đã gửi yêu cầu tạo mã QR. Hệ thống đang cập nhật thông tin thanh toán.';

          this.cdr.markForCheck();
          this.refreshStatus();
        },

        error: err => {
          this.message =
            err?.error?.message ||
            'Không thể tạo mã QR mới. Vui lòng thử tải lại trạng thái đơn hàng.';
          this.cdr.markForCheck();
          this.refreshStatus();
        },
      });
  }

  /**
   * Mô phỏng webhook thanh toán.
   */
  simulatePayment(
    result: 'success' | 'failed'
  ): void {
    const attempt = this.currentAttempt;
    const txnId = attempt?.txnId;

    if (
      !txnId ||
      this.simulating ||
      this.secondsLeft <= 0 ||
      attempt?.result !== 'pending'
    ) {
      return;
    }

    this.simulating = true;

    this.api
      .simulatePaymentWebhook(
        this.orderId,
        txnId,
        result
      )
      .pipe(
        finalize(() => {
          this.simulating = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: response => {
          const data =
            response?.data ?? response;

          if (data?.latePayment) {
            this.message =
              'Thanh toán được xác minh là thanh toán muộn. Đơn hàng không được khôi phục và cần hoàn tiền 100%.';
          } else if (result === 'success') {
            this.message =
              'Webhook mô phỏng đã xác nhận thanh toán thành công.';
          } else {
            this.message =
              'Giao dịch mô phỏng thất bại. Bạn có thể tạo lại QR nếu còn lượt.';
          }

          this.cdr.markForCheck();
          this.refreshStatus();
        },

        error: err => {
          this.message =
            err?.error?.message ||
            'Không nhận được kết quả tự động. Vui lòng chờ Admin đối soát giao dịch.';
          this.cdr.markForCheck();
          this.refreshStatus();
        },
      });
  }

  /**
   * Lần thanh toán mới nhất.
   */
  get currentAttempt(): any {
    const attempts =
      this.order?.payment?.attempts || [];

    return Array.isArray(attempts) && attempts.length
      ? attempts[attempts.length - 1]
      : null;
  }

  /**
   * Số lần tạo lại QR.
   */
  get recreateCount(): number {
    return Number(
      this.order?.payment?.recreateCount || 0
    );
  }

  /**
   * Kiểm tra có thể tạo lại QR không.
   */
  get canRecreate(): boolean {
    const attempt = this.currentAttempt;

    if (
      this.order?.status !== 'pending_payment' ||
      this.order?.payment?.status === 'paid' ||
      this.recreateCount >= 3
    ) {
      return false;
    }

    if (!attempt) {
      return false;
    }

    if (
      attempt.result === 'failed' ||
      attempt.result === 'expired'
    ) {
      return true;
    }

    return (
      attempt.result === 'pending' &&
      this.currentDeadline > 0 &&
      this.currentDeadline <= Date.now()
    );
  }

  /**
   * Kiểm tra có thể mô phỏng thanh toán không.
   */
  get canSimulate(): boolean {
    return (
      this.order?.status === 'pending_payment' &&
      this.currentAttempt?.result === 'pending' &&
      this.secondsLeft > 0 &&
      !this.simulating
    );
  }

  /**
   * Hiển thị countdown MM:SS.
   */
  get timeLabel(): string {
    const minutes = Math.floor(
      this.secondsLeft / 60
    );

    const seconds = this.secondsLeft % 60;

    return (
      `${String(minutes).padStart(2, '0')}:` +
      `${String(seconds).padStart(2, '0')}`
    );
  }

  /**
   * Tên trạng thái đơn hàng.
   */
  get statusLabel(): string {
    const labels: Record<string, string> = {
      pending_payment: 'Chờ thanh toán',
      pending_approval: 'Chờ duyệt',
      accepted: 'Đã tiếp nhận',
      baking: 'Đang làm bánh',
      done: 'Đã hoàn thành',
      delivering: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };

    return (
      labels[this.order?.status] ||
      this.order?.status ||
      'Đang cập nhật'
    );
  }

  /**
   * Định dạng tiền Việt Nam.
   */
  formatVnd(value: number): string {
    return (
      new Intl.NumberFormat('vi-VN').format(
        Number(value) || 0
      ) + ' ₫'
    );
  }

  /**
   * Hủy các subscription khi rời trang.
   */
  ngOnDestroy(): void {
    this.timer?.unsubscribe();
    this.poller?.unsubscribe();
  }
}
