import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { parseApiError } from '../../../../core/services/api-error';
import {
  isValidPhone,
  normalizePhone
} from '../../../../shared/validators/auth.validators';

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

  private readonly phoneInput =
    viewChild<ElementRef<HTMLInputElement>>('phoneInput');

  private readonly passwordInput =
    viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  constructor() {
    afterNextRender(() => {
      this.phoneInput()?.nativeElement.focus();
    });
  }

  // Xác định người dùng đang đăng nhập từ trang Admin hay Buyer
  get isAdminLogin(): boolean {
    return this.router.url.startsWith('/admin/login');
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  clearError(field: Field): void {
    if (this.errors()[field]) {
      this.errors.update(errors => ({
        ...errors,
        [field]: undefined
      }));
    }
  }

  submit(): void {
    if (this.loading()) return;

    const phone = this.phone().trim();
    const password = this.password();

    const errors: Partial<Record<Field, string>> = {};

    // Kiểm tra số điện thoại
    if (!phone) {
      errors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!isValidPhone(phone)) {
      errors.phone =
        'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng số 0.';
    }

    // Kiểm tra mật khẩu
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }

    this.errors.set(errors);

    if (errors.phone) {
      this.phoneInput()?.nativeElement.focus();
      return;
    }

    if (errors.password) {
      this.passwordInput()?.nativeElement.focus();
      return;
    }

    this.loading.set(true);

    this.auth.login(normalizePhone(phone), password).subscribe({
      next: (res) => {
        // Admin phải đăng nhập bằng tài khoản có role admin
        if (this.isAdminLogin && res.user.role !== 'admin') {
          this.auth.logout();

          this.errors.set({
            form: 'Tài khoản không có quyền truy cập quản trị viên.'
          });

          this.loading.set(false);
          return;
        }

        // Buyer không sử dụng tài khoản Admin để đăng nhập
        if (!this.isAdminLogin && res.user.role === 'admin') {
          this.auth.logout();

          this.errors.set({
            form: 'Vui lòng sử dụng trang đăng nhập quản trị viên.'
          });

          this.loading.set(false);
          return;
        }

        this.success.set(true);

        const redirectUrl = this.isAdminLogin
          ? '/admin/orders'
          : '/';

        setTimeout(() => {
          this.router.navigateByUrl(redirectUrl);
        }, 500);
      },

      error: (err) => {
        const info = parseApiError(
          err,
          'Không thể đăng nhập lúc này, vui lòng thử lại sau.'
        );

        this.errors.set({
          form: info.message
        });

        this.loading.set(false);
      }
    });
  }
}
