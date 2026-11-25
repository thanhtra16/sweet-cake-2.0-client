import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { parseApiError } from '../../../../core/services/api-error';
import { checkPassword, isStrongPassword } from '../../../../shared/validators/auth.validators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly formError = signal('');

  /** Trạng thái 3 yêu cầu mật khẩu (đạt thì đổi màu) */
  readonly rules = computed(() => checkPassword(this.newPassword()));

  /** Lỗi "xác nhận không khớp" chỉ hiện khi người dùng đã gõ ô xác nhận */
  readonly confirmError = computed(() =>
    this.confirmPassword() && this.confirmPassword() !== this.newPassword()
      ? 'Mật khẩu xác nhận không khớp.'
      : ''
  );

  readonly canSubmit = computed(
    () =>
      isStrongPassword(this.newPassword()) &&
      this.confirmPassword() === this.newPassword() &&
      !this.loading()
  );

  ngOnInit(): void {
    // Chưa xác thực OTP thì không được vào bước này
    if (!this.auth.getResetPhone() || !this.auth.getResetToken()) {
      this.router.navigate(['/auth/forgot-password']);
    }
  }

  submit(): void {
    const phone = this.auth.getResetPhone();
    const resetToken = this.auth.getResetToken();

    if (!this.canSubmit()) return;
    if (!phone || !resetToken) {
      this.router.navigate(['/auth/forgot-password']);
      return;
    }

    this.loading.set(true);
    this.formError.set('');

    this.auth
      .resetPassword(phone, resetToken, this.newPassword(), this.confirmPassword())
      .subscribe({
        next: () => {
          this.auth.clearResetFlow();
          this.success.set(true);
          setTimeout(() => this.router.navigate(['/auth/login']), 800);
        },
        error: (err) => {
          const info = parseApiError(err, 'Không thể đặt lại mật khẩu, vui lòng thử lại.');
          this.formError.set(
            info.fields['newPassword'] || info.fields['confirmPassword'] || info.message
          );
          this.loading.set(false);
        }
      });
  }
}
