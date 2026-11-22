import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AccountService } from '../../../../../../core/services/account.service';
import { parseApiError } from '../../../../../../core/services/api-error';
import { AuthService } from '../../../../../../core/services/auth.service';
import { checkPassword, isStrongPassword } from '../../../../../../shared/validators/auth.validators';

type Field = 'currentPassword' | 'newPassword' | 'confirmPassword' | 'form';

@Component({
  selector: 'app-password-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './password-tab.component.html',
  styleUrl: './password-tab.component.css'
})
export class PasswordTabComponent {
  private readonly account = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);

  readonly errors = signal<Partial<Record<Field, string>>>({});
  readonly loading = signal(false);

  /** Trạng thái 3 yêu cầu độ mạnh của mật khẩu mới */
  readonly rules = computed(() => checkPassword(this.newPassword()));

  clearError(field: Field): void {
    if (this.errors()[field] || this.errors().form) {
      this.errors.update((e) => ({ ...e, [field]: undefined, form: undefined }));
    }
  }

  private validate(): boolean {
    const errors: Partial<Record<Field, string>> = {};
    const current = this.currentPassword();
    const next = this.newPassword();

    if (!current) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';

    if (!next) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    } else if (!isStrongPassword(next)) {
      errors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa và 1 số.';
    } else if (next === current) {
      errors.newPassword = 'Mật khẩu mới không được trùng mật khẩu hiện tại.';
    }

    if (!this.confirmPassword()) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
    } else if (this.confirmPassword() !== next) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  submit(): void {
    if (this.loading() || !this.validate()) return;

    this.loading.set(true);

    this.account
      .changePassword({ currentPassword: this.currentPassword(), newPassword: this.newPassword() })
      .subscribe({
        next: () => {
          this.account.notify('success', 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.', 2500);
          // Backend vô hiệu hóa token cũ -> yêu cầu đăng nhập lại để bảo mật
          setTimeout(() => {
            this.auth.logout();
            this.account.user.set(null);
            this.router.navigate(['/auth/login']);
          }, 1800);
        },
        error: (err) => {
          const info = parseApiError(err, 'Không thể đổi mật khẩu, vui lòng thử lại.');
          // Sai mật khẩu hiện tại -> báo ngay dưới ô đó
          if (info.status === 400 && info.message.includes('hiện tại')) {
            this.errors.set({ currentPassword: info.message });
          } else {
            this.errors.set({ form: info.message });
          }
          this.loading.set(false);
        }
      });
  }
}
