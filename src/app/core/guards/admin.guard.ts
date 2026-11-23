import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Chưa đăng nhập
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/admin/login']);
  }

  // Kiểm tra thông tin tài khoản từ backend
  return authService.getMe().pipe(
    map(user => {
      if (user.role === 'admin') {
        return true;
      }

      // Đã đăng nhập nhưng không có quyền Admin
      authService.logout();
      return router.createUrlTree(['/admin/login']);
    }),

    catchError(() => {
      // Token không hợp lệ hoặc phiên đăng nhập hết hạn
      authService.logout();
      return of(router.createUrlTree(['/admin/login']));
    })
  );
};
