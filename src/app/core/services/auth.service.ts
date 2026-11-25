import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, map, tap } from 'rxjs';

import { ApiService } from './api.service';

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  birthday?: string | null;
  role: 'buyer' | 'admin' | string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Giữ các key cũ để tương thích với chức năng Buyer
const TOKEN_KEY = 'token';
const ADMIN_TOKEN_KEY = 'sweetcake_access_token';
const USER_KEY = 'sweetcake_nguoi_dung';
const USER_ID_KEY = 'sweetcake_id_nguoi_dung';

// Dữ liệu tạm cho luồng quên mật khẩu
const RESET_PHONE_KEY = 'phone';
const RESET_TOKEN_KEY = 'resetToken';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(
    inject(PLATFORM_ID)
  );

  // ==================== API ====================

  register(payload: RegisterPayload): Observable<AuthResult> {
    return this.api.post<AuthResult>(
      '/auth/register',
      payload
    );
  }

  login(
    phone: string,
    password: string
  ): Observable<AuthResult> {
    return this.api
      .post<AuthResult>('/auth/login', {
        phone,
        password
      })
      .pipe(
        tap((res) => this.saveSession(res))
      );
  }

  getMe(): Observable<AuthUser> {
    return this.api
      .get<{ user: AuthUser }>('/auth/me')
      .pipe(
        map((res) => res.user)
      );
  }

  changePassword(
    payload: ChangePasswordPayload
  ): Observable<null> {
    return this.api.post<null>(
      '/auth/change-password',
      payload
    );
  }

  forgotPassword(phone: string): Observable<null> {
    return this.api.post<null>(
      '/auth/forgot-password',
      { phone }
    );
  }

  verifyResetOtp(
    phone: string,
    otp: string
  ): Observable<{ resetToken: string }> {
    return this.api.post<{ resetToken: string }>(
      '/auth/verify-reset-otp',
      { phone, otp }
    );
  }

  resetPassword(
    phone: string,
    resetToken: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<null> {
    return this.api.post<null>(
      '/auth/reset-password',
      {
        phone,
        resetToken,
        newPassword,
        confirmPassword
      }
    );
  }

  // ==================== PHIÊN ĐĂNG NHẬP ====================

  private saveSession(res: AuthResult): void {
    if (!this.isBrowser) return;

    this.setToken(res.token);

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(res.user)
    );

    localStorage.setItem(
      USER_ID_KEY,
      res.user.id
    );
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;

    return (
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem(ADMIN_TOKEN_KEY)
    );
  }

  setToken(token: string): void {
    if (!this.isBrowser) return;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }

  /** Thông tin người dùng đã lưu lúc đăng nhập (dùng để hiển thị nhanh, không thay cho dữ liệu từ server). */
  getStoredUser(): AuthUser | null {
    if (!this.isBrowser) return null;
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
      return null;
    }
  }

  /** Cập nhật lại bản lưu sau khi khách sửa thông tin cá nhân. */
  updateStoredUser(user: Partial<AuthUser>): void {
    if (!this.isBrowser) return;
    const current = this.getStoredUser();
    if (current) localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...user }));
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (!this.isBrowser) return;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_ID_KEY);
  }


  // ==================== LUỒNG QUÊN MẬT KHẨU ====================

  setResetPhone(phone: string): void {
    if (this.isBrowser) {
      sessionStorage.setItem(
        RESET_PHONE_KEY,
        phone
      );
    }
  }

  getResetPhone(): string | null {
    return this.isBrowser
      ? sessionStorage.getItem(RESET_PHONE_KEY)
      : null;
  }

  setResetToken(token: string): void {
    if (this.isBrowser) {
      sessionStorage.setItem(
        RESET_TOKEN_KEY,
        token
      );
    }
  }

  getResetToken(): string | null {
    return this.isBrowser
      ? sessionStorage.getItem(RESET_TOKEN_KEY)
      : null;
  }

  clearResetFlow(): void {
    if (!this.isBrowser) return;

    sessionStorage.removeItem(RESET_PHONE_KEY);
    sessionStorage.removeItem(RESET_TOKEN_KEY);
  }
}