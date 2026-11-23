import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChildren
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { parseApiError } from '../../../../core/services/api-error';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css'
})
export class VerifyOtpComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly digits = signal<string[]>(Array(OTP_LENGTH).fill(''));
  readonly invalid = signal<boolean[]>(Array(OTP_LENGTH).fill(false));
  readonly error = signal('');
  readonly loading = signal(false);
  readonly resending = signal(false);
  readonly countdown = signal(RESEND_SECONDS);

  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('otpBox');
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    afterNextRender(() => this.focusBox(0));
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  ngOnInit(): void {
    // Vào thẳng trang này mà chưa qua bước "Quên mật khẩu" -> quay lại đúng bước
    if (!this.auth.getResetPhone()) {
      this.router.navigate(['/auth/forgot-password']);
      return;
    }
    // OTP đã được gửi ở bước trước, chỉ cần bắt đầu đếm ngược cho nút "Gửi lại mã"
    this.startCountdown();
  }

  // ==================== Ô NHẬP OTP ====================

  private focusBox(index: number): void {
    this.boxes()[index]?.nativeElement.focus();
  }

  private clearErrors(): void {
    this.invalid.set(Array(OTP_LENGTH).fill(false));
    this.error.set('');
  }

  onInput(index: number, event: Event): void {
    const el = event.target as HTMLInputElement;
    const char = el.value.slice(-1); // mỗi ô chỉ giữ ký tự cuối vừa nhập
    el.value = char;

    this.digits.update((d) => d.map((v, i) => (i === index ? char : v)));
    this.clearErrors();

    if (char && index < OTP_LENGTH - 1) this.focusBox(index + 1);
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      this.focusBox(index - 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const text = (event.clipboardData?.getData('text') ?? '').replace(/\s/g, '');
    if (!text) return;
    event.preventDefault();

    const chars = text.slice(0, OTP_LENGTH).split('');
    this.digits.set(Array.from({ length: OTP_LENGTH }, (_, i) => chars[i] ?? ''));
    this.clearErrors();
    this.focusBox(Math.min(chars.length, OTP_LENGTH - 1));
  }

  // ==================== XÁC NHẬN ====================

  submit(): void {
    if (this.loading()) return;

    const digits = this.digits();

    // 1) Đã nhập đủ 6 ô chưa
    if (digits.some((d) => d === '')) {
      this.invalid.set(digits.map((d) => d === ''));
      this.error.set('Vui lòng nhập đầy đủ 6 ký tự trước khi xác nhận.');
      this.focusBox(digits.findIndex((d) => d === ''));
      return;
    }

    // 2) Có ký tự không phải số không
    if (digits.some((d) => !/^[0-9]$/.test(d))) {
      this.invalid.set(digits.map((d) => !/^[0-9]$/.test(d)));
      this.error.set('Mã không hợp lệ. Vui lòng chỉ nhập số (0-9).');
      return;
    }

    const phone = this.auth.getResetPhone();
    if (!phone) {
      this.router.navigate(['/auth/forgot-password']);
      return;
    }

    this.loading.set(true);

    this.auth.verifyResetOtp(phone, digits.join('')).subscribe({
      next: ({ resetToken }) => {
        // resetToken dùng ở bước đặt mật khẩu mới
        this.auth.setResetToken(resetToken);
        this.router.navigate(['/auth/reset-password']);
      },
      error: (err) => {
        const info = parseApiError(err, 'Không thể xác minh OTP.');
        this.error.set(info.fields['otp'] || info.message);
        this.invalid.set(Array(OTP_LENGTH).fill(true));
        this.loading.set(false);
      }
    });
  }

  // ==================== GỬI LẠI MÃ ====================

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startCountdown(): void {
    this.stopTimer();
    this.countdown.set(RESEND_SECONDS);

    this.timer = setInterval(() => {
      this.countdown.update((s) => s - 1);
      if (this.countdown() <= 0) this.stopTimer();
    }, 1000);
  }

  resend(): void {
    const phone = this.auth.getResetPhone();
    if (!phone || this.countdown() > 0 || this.resending()) return;

    this.resending.set(true);

    this.auth.forgotPassword(phone).subscribe({
      next: () => {
        this.digits.set(Array(OTP_LENGTH).fill(''));
        this.clearErrors();
        this.focusBox(0);
        this.resending.set(false);
        this.startCountdown();
      },
      error: (err) => {
        this.error.set(parseApiError(err, 'Gửi lại mã thất bại. Vui lòng thử lại.').message);
        this.resending.set(false);
      }
    });
  }
}
