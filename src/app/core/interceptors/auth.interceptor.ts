import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Các API xác thực: 401 ở đây nghĩa là sai thông tin, không phải hết phiên. */
const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-reset-otp',
  '/auth/reset-password',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApiCall = req.url.startsWith(environment.apiUrl);
  const token = auth.getToken();

  // Gắn JWT vào mọi request gọi tới Backend của mình
  const authReq =
    isApiCall && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      const isAuthApi = AUTH_PATHS.some((p) => req.url.includes(p));

      // Token hết hạn / không hợp lệ -> xóa phiên và đưa về trang đăng nhập
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        isApiCall &&
        !isAuthApi &&
        token
      ) {
        auth.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => err);
    })
  );
};