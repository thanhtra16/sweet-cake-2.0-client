import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AccountService } from '../../../../../../core/services/account.service';
import { parseApiError } from '../../../../../../core/services/api-error';
import { EMAIL_REGEX } from '../../../../../../shared/validators/auth.validators';

type Field = 'fullName' | 'email' | 'birthday' | 'form';

@Component({
  selector: 'app-profile-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile-tab.component.html',
  styleUrl: './profile-tab.component.css'
})
export class ProfileTabComponent {
  private readonly account = inject(AccountService);

  /** Số điện thoại là tên đăng nhập nên chỉ hiển thị, không cho sửa */
  readonly phone = this.account.user()?.phone ?? '';

  readonly fullName = signal(this.account.user()?.fullName ?? '');
  readonly email = signal(this.account.user()?.email ?? '');
  readonly birthday = signal((this.account.user()?.birthday ?? '').slice(0, 10)); // yyyy-MM-dd

  readonly errors = signal<Partial<Record<Field, string>>>({});
  readonly loading = signal(false);

  readonly today = new Date().toISOString().slice(0, 10);

  /** Chỉ cho lưu khi có thay đổi so với dữ liệu đang có */
  readonly dirty = computed(() => {
    const u = this.account.user();
    if (!u) return false;
    return (
      this.fullName().trim() !== u.fullName ||
      this.email().trim() !== (u.email ?? '') ||
      this.birthday() !== (u.birthday ?? '').slice(0, 10)
    );
  });

  clearError(field: Field): void {
    if (this.errors()[field] || this.errors().form) {
      this.errors.update((e) => ({ ...e, [field]: undefined, form: undefined }));
    }
  }

  private validate(): boolean {
    const errors: Partial<Record<Field, string>> = {};

    if (!this.fullName().trim()) errors.fullName = 'Vui lòng nhập họ và tên.';

    const email = this.email().trim();
    if (email && !EMAIL_REGEX.test(email)) errors.email = 'Email không đúng định dạng.';

    if (this.birthday() && this.birthday() > this.today) {
      errors.birthday = 'Ngày sinh không được ở tương lai.';
    }

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  reset(): void {
    const u = this.account.user();
    if (!u) return;
    this.fullName.set(u.fullName);
    this.email.set(u.email ?? '');
    this.birthday.set((u.birthday ?? '').slice(0, 10));
    this.errors.set({});
  }

  submit(): void {
    if (this.loading() || !this.dirty() || !this.validate()) return;

    this.loading.set(true);

    this.account
      .updateProfile({
        fullName: this.fullName().trim(),
        email: this.email().trim() || null,
        birthday: this.birthday() || null
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.account.notify('success', 'Cập nhật thông tin tài khoản thành công.');
        },
        error: (err) => {
          this.errors.set({ form: parseApiError(err, 'Không thể cập nhật thông tin, vui lòng thử lại.').message });
          this.loading.set(false);
        }
      });
  }
}
