import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { Toast } from '../../../../shared/components/toast/toast';
import { AuthService } from '../../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly navItems: NavItem[] = [
    { label: 'Quản lý đơn hàng', icon: 'fa-receipt', link: '/admin/orders' },
    { label: 'Quản lý sản phẩm', icon: 'fa-cake-candles', link: '/admin/products' },
    { label: 'Cấu hình tùy biến', icon: 'fa-sliders', link: '/admin/customizations' },
    { label: 'Cấu hình khung giờ', icon: 'fa-clock', link: '/admin/time-slots' },
    { label: 'Quản lý khách hàng', icon: 'fa-users', link: '/admin/users' },
    { label: 'Quản lý voucher', icon: 'fa-ticket', link: '/admin/vouchers' },
  ];

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let current: ActivatedRoute | null = this.route;

        while (current?.firstChild) {
          current = current.firstChild;
        }

        return current?.snapshot?.data?.['title'] ?? '';
      })
    ),
    { initialValue: '' }
  );

  protected readonly adminName =
    this.auth.getStoredUser()?.fullName ?? 'Quản trị viên';

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}