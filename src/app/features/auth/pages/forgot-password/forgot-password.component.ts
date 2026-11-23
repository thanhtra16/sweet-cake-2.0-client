import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { parseApiError } from '../../../../core/services/api-error';
import { isValidPhone, normalizePhone } from '../../../../shared/validators/auth.validators';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly phone = signal('');
  readonly error = signal('');
  readonly loading = signal(false);

  private readonly phoneInput = viewChild<ElementRef<HTMLInputElement>>('phoneInput');

  constructor() {
    afterNextRender(() => this.phoneInput()?.nativeElement.focus());
  }

  onPhoneChange(value: string): void {
    this.phone.set(value);
    this.error.set('');
  }

  submit(): void {
    if (this.loading()) return;

    const raw = this.phone().trim();

    if (!raw) {
      this.error.set('Vui lòng nhập số điện thoại.');
      this.phoneInput()?.nativeElement.focus();
      return;
    }
    if (!isValidPhone(raw)) {
      this.error.set('Số điện thoại không hợp lệ.');
      this.phoneInput()?.nativeElement.focus();
      return;
    }

    const phone = normalizePhone(raw);
    this.loading.set(true);

    this.auth.forgotPassword(phone).subscribe({
      next: () => {
        // Lưu SĐT để trang xác thực OTP dùng tiếp
        this.auth.clearResetFlow();
        this.auth.setResetPhone(phone);
        this.router.navigate(['/auth/verify-otp']);
      },
      error: (err) => {
        const info = parseApiError(err, 'Không gửi được mã OTP.');
        this.error.set(info.fields['phone'] || info.message);
        this.loading.set(false);
      }
    });
  }
}
