import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { parseApiError } from '../../../../core/services/api-error';
import {
  EMAIL_REGEX,
  isStrongPassword,
  isValidPhone,
  normalizePhone
} from '../../../../shared/validators/auth.validators';

type Field = 'fullName' | 'phone' | 'email' | 'password' | 'confirmPassword' | 'agree' | 'form';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly fullName = signal('');
  readonly phone = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly agree = signal(false);

  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errors = signal<Partial<Record<Field, string>>>({});

  private readonly fullNameInput = viewChild<ElementRef<HTMLInputElement>>('fullNameInput');

  constructor() {
    // Thay cho thuộc tính autofocus (không chạy khi chuyển trang trong SPA)
    afterNextRender(() => this.fullNameInput()?.nativeElement.focus());
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirm(): void {
    this.showConfirm.update((v) => !v);
  }

  clearError(field: Field): void {
    if (this.errors()[field]) {
      this.errors.update((e) => ({ ...e, [field]: undefined }));
    }
  }

  private validate(): boolean {
    const errors: Partial<Record<Field, string>> = {};

    if (!this.fullName().trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên.';
    }

    if (!this.phone().trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!isValidPhone(this.phone())) {
      errors.phone = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng số 0.';
    }

    const email = this.email().trim();
    if (email && !EMAIL_REGEX.test(email)) {
      errors.email = 'Email không đúng định dạng.';
    }

    if (!this.password()) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    } else if (!isStrongPassword(this.password())) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa và 1 số.';
    }

    if (!this.confirmPassword()) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    } else if (this.confirmPassword() !== this.password()) {
      errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    }

    if (!this.agree()) {
      errors.agree = 'Bạn phải đồng ý với điều khoản và chính sách bảo mật để tiếp tục.';
    }

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  submit(): void {
    if (this.loading() || !this.validate()) return;

    this.loading.set(true);
    this.errors.set({});

    this.auth
      .register({
        fullName: this.fullName().trim(),
        phone: normalizePhone(this.phone()),
        email: this.email().trim() || undefined,
        password: this.password()
      })
      .subscribe({
        next: () => {
          this.success.set(true);
          setTimeout(() => this.router.navigate(['/auth/login']), 800);
        },
        error: (err) => {
          const info = parseApiError(err, 'Đăng ký thất bại, vui lòng thử lại.');
          const errors: Partial<Record<Field, string>> = {};

          // 409: số điện thoại đã tồn tại -> hiện ngay dưới ô số điện thoại
          if (info.status === 409) {
            errors.phone = info.message;
          }

          // Lỗi theo từng trường do Backend trả về (fullName, phone, password...)
          for (const key of ['fullName', 'phone', 'email', 'password'] as const) {
            if (info.fields[key]) errors[key] = info.fields[key];
          }

          if (!Object.keys(errors).length) errors.form = info.message;

          this.errors.set(errors);
          this.loading.set(false);
        }
      });
  }
}
