import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { parseApiError } from '../../../../core/services/api-error';
import { isValidPhone, normalizePhone } from '../../../../shared/validators/auth.validators';

type Field = 'phone' | 'password' | 'form';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly phone = signal('');
  readonly password = signal('');

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errors = signal<Partial<Record<Field, string>>>({});

  private readonly phoneInput = viewChild<ElementRef<HTMLInputElement>>('phoneInput');
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  constructor() {
    afterNextRender(() => this.phoneInput()?.nativeElement.focus());
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  clearError(field: Field): void {
    if (this.errors()[field]) {
      this.errors.update((e) => ({ ...e, [field]: undefined }));
    }
  }

  submit(): void {
    if (this.loading()) return;

    const phone = this.phone().trim();
    const password = this.password();
    const errors: Partial<Record<Field, string>> = {};

    if (!phone) {
      errors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!isValidPhone(phone)) {
      errors.phone = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng số 0.';
    }
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }

    this.errors.set(errors);
    if (errors.phone) return this.phoneInput()?.nativeElement.focus();
    if (errors.password) return this.passwordInput()?.nativeElement.focus();

    this.loading.set(true);

    this.auth.login(normalizePhone(phone), password).subscribe({
      next: () => {
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/']), 500);
      },
      error: (err) => {
        const info = parseApiError(err, 'Không thể đăng nhập lúc này, vui lòng thử lại sau.');
        // Backend dùng chung 1 thông báo "SĐT hoặc mật khẩu không đúng" nên hiện ở dưới form
        this.errors.set({ form: info.message });
        this.loading.set(false);
      }
    });
  }
}
