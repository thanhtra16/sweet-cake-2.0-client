import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

import { AuthService, AuthUser } from '../../core/services/auth.service';

import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastContainerComponent,
  ],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css'],
})
export class AdminLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  user: AuthUser | null = null;

  currentPageTitle = 'Quản lý đơn hàng';

  isNotificationOpen = false;
  isAccountOpen = false;

  isLogoutConfirmOpen = false;
  isProfileOpen = false;
  isChangePasswordOpen = false;

  isChangingPassword = false;
  isPasswordChanged = false;

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  passwordError = '';
  passwordSuccess = '';

  readonly navItems = [
    {
      label: 'Quản lý đơn hàng',
      path: '/admin/orders',
      icon: 'fa-solid fa-receipt',
    },
    {
      label: 'Quản lý sản phẩm',
      path: '/admin/products',
      icon: 'fa-solid fa-cake-candles',
    },
    {
      label: 'Cấu hình tùy biến',
      path: '/admin/customizations',
      icon: 'fa-solid fa-sliders',
    },
    {
      label: 'Quản lý khách hàng',
      path: '/admin/users',
      icon: 'fa-solid fa-users',
    },
    {
      label: 'Quản lý khung giờ',
      path: '/admin/time-slots',
      icon: 'fa-solid fa-clock',
    },
    {
      label: 'Quản lý voucher',
      path: '/admin/vouchers',
      icon: 'fa-solid fa-ticket',
    },
  ];

  ngOnInit(): void {
    this.updatePageTitle(this.router.url);

    this.router.events
      .pipe(
        filter(
          (event) => event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        const navigation = event as NavigationEnd;

        this.updatePageTitle(
          navigation.urlAfterRedirects
        );

        this.closeMenus();
        this.cdr.markForCheck();
      });

    if (this.auth.isLoggedIn()) {
      this.auth.getMe().subscribe({
        next: (user) => {
          this.user = user;
          this.cdr.markForCheck();
        },
        error: () => {
          this.user = null;
          this.cdr.markForCheck();
        },
      });
    }
  }

  private updatePageTitle(url: string): void {
    const path = url.split('?')[0].split('#')[0];

    if (
      path === '/admin/orders' ||
      path === '/admin'
    ) {
      this.currentPageTitle = 'Quản lý đơn hàng';
    } else if (path === '/admin/products/new') {
      this.currentPageTitle = 'Thêm sản phẩm';
    } else if (
      /^\/admin\/products\/[^/]+\/edit$/.test(path)
    ) {
      this.currentPageTitle = 'Chỉnh sửa sản phẩm';
    } else if (path === '/admin/products') {
      this.currentPageTitle = 'Quản lý sản phẩm';
    } else if (path === '/admin/customizations') {
      this.currentPageTitle = 'Cấu hình tùy biến';
    } else if (path === '/admin/users') {
      this.currentPageTitle = 'Quản lý khách hàng';
    } else if (path === '/admin/time-slots') {
      this.currentPageTitle = 'Quản lý khung giờ';
    } else if (path === '/admin/vouchers') {
      this.currentPageTitle = 'Quản lý voucher';
    } else {
      this.currentPageTitle = 'Trang quản trị';
    }
  }

  // ==================== HEADER MENUS ====================

  toggleNotification(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
    this.isAccountOpen = false;
  }

  toggleAccount(): void {
    this.isAccountOpen = !this.isAccountOpen;
    this.isNotificationOpen = false;
  }

  closeMenus(): void {
    this.isNotificationOpen = false;
    this.isAccountOpen = false;
  }

  // ==================== ACCOUNT PROFILE ====================

  openProfile(): void {
    this.closeMenus();
    this.isProfileOpen = true;
  }

  closeProfile(): void {
    this.isProfileOpen = false;
  }

  // ==================== CHANGE PASSWORD ====================

  openChangePassword(): void {
    this.closeMenus();
    this.resetPasswordForm();
    this.isChangePasswordOpen = true;
  }

  closeChangePassword(): void {
    if (this.isChangingPassword) return;

    this.isChangePasswordOpen = false;
    this.resetPasswordForm();
  }

  resetPasswordForm(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';

    this.passwordError = '';
    this.passwordSuccess = '';

    this.isPasswordChanged = false;

    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  submitChangePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (
      !this.currentPassword ||
      !this.newPassword ||
      !this.confirmPassword
    ) {
      this.passwordError = 'Vui lòng nhập đầy đủ thông tin.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordError =
        'Mật khẩu mới phải có ít nhất 6 ký tự.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError =
        'Mật khẩu xác nhận không khớp.';
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.passwordError =
        'Mật khẩu mới phải khác mật khẩu hiện tại.';
      return;
    }

    this.isChangingPassword = true;

    this.auth.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
    }).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.isPasswordChanged = true;
        this.passwordSuccess =
          'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.';

        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';

        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isChangingPassword = false;

        this.passwordError =
          error?.error?.message ||
          error?.error?.data?.message ||
          error?.message ||
          'Không thể đổi mật khẩu. Vui lòng thử lại.';

        this.cdr.markForCheck();
      },
    });
  }

  finishPasswordChange(): void {
    if (!this.isPasswordChanged) return;

    this.auth.logout();
    this.user = null;

    this.isChangePasswordOpen = false;

    this.router.navigate(['/admin/login']);
  }

  // ==================== LOGOUT ====================

  logout(): void {
    this.closeMenus();
    this.isLogoutConfirmOpen = true;
  }

  cancelLogout(): void {
    this.isLogoutConfirmOpen = false;
  }

  confirmLogout(): void {
    if (!this.isLogoutConfirmOpen) return;

    this.isLogoutConfirmOpen = false;

    this.auth.logout();
    this.user = null;
    this.closeMenus();

    this.router.navigate(['/admin/login']);
  }
}