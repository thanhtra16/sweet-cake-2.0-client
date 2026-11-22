import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AccountService } from '../../../../core/services/account.service';
import { AuthService } from '../../../../core/services/auth.service';
import { parseApiError } from '../../../../core/services/api-error';
import { AddressTabComponent } from './components/address-tab/address-tab.component';
import { OrdersTabComponent } from './components/orders-tab/orders-tab.component';
import { PasswordTabComponent } from './components/password-tab/password-tab.component';
import { ProfileTabComponent } from './components/profile-tab/profile-tab.component';

export type AccountTab = 'profile' | 'addresses' | 'orders' | 'password';

const TABS: { id: AccountTab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Thông tin tài khoản', icon: 'bi-person' },
  { id: 'addresses', label: 'Sổ địa chỉ', icon: 'bi-geo-alt' },
  { id: 'orders', label: 'Đơn hàng của tôi', icon: 'bi-file-earmark-text' },
  { id: 'password', label: 'Đổi mật khẩu', icon: 'bi-key' }
];

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    RouterLink,
    ProfileTabComponent,
    AddressTabComponent,
    OrdersTabComponent,
    PasswordTabComponent
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css'
})
export class AccountComponent {
  readonly account = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tabs = TABS;
  readonly loading = signal(true);
  readonly loadError = signal('');

  /** Tab hiện tại lấy từ ?tab=... trên URL (mặc định: thông tin tài khoản) */
  readonly activeTab = toSignal(
    this.route.queryParamMap.pipe(
      map((p) => (TABS.find((t) => t.id === p.get('tab'))?.id ?? 'profile') as AccountTab)
    ),
    { initialValue: 'profile' as AccountTab }
  );

  readonly activeLabel = computed(() => TABS.find((t) => t.id === this.activeTab())?.label ?? '');

  /** Chữ cái đầu của tên làm ảnh đại diện */
  readonly initial = computed(() => (this.account.user()?.fullName ?? '?').trim().charAt(0).toUpperCase());

  constructor() {
    this.loadProfile();
  }

  /** Kiểm tra phiên đăng nhập + nạp hồ sơ hiện tại từ server */
  loadProfile(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.account.load().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        // 401 đã được interceptor xử lý (về trang đăng nhập)
        this.loadError.set(parseApiError(err, 'Không thể tải thông tin tài khoản.').message);
        this.loading.set(false);
      }
    });
  }

  logout(event: Event): void {
    event.preventDefault();
    this.auth.logout();
    this.account.user.set(null);
    this.router.navigate(['/auth/login']);
  }
}
