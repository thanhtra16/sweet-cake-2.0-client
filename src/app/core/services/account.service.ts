import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  Address,
  AddressPayload,
  ChangePasswordPayload,
  UpdateProfilePayload,
  UserProfile
} from '../../shared/models/user.model';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface Notice {
  type: 'success' | 'error';
  text: string;
}

/** Quản lý tài khoản của khách: hồ sơ, mật khẩu, sổ địa chỉ (API /users/me). */
@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  /** Hồ sơ hiện tại — mọi tab đọc chung 1 nguồn dữ liệu */
  readonly user = signal<UserProfile | null>(null);
  readonly notice = signal<Notice | null>(null);

  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Hiện thông báo nổi, tự tắt sau vài giây */
  notify(type: Notice['type'], text: string, ms = 3500): void {
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.notice.set({ type, text });
    this.noticeTimer = setTimeout(() => this.notice.set(null), ms);
  }

  // ==================== THÔNG TIN CÁ NHÂN ====================

  load(): Observable<{ user: UserProfile }> {
    return this.api.get<{ user: UserProfile }>('/users/me').pipe(
      tap(({ user }) => this.user.set(user))
    );
  }

  updateProfile(payload: UpdateProfilePayload): Observable<{ user: UserProfile }> {
    return this.api.patch<{ user: UserProfile }>('/users/me', payload).pipe(
      tap(({ user }) => {
        this.user.set(user);
        this.auth.updateStoredUser({ fullName: user.fullName, email: user.email ?? undefined });
      })
    );
  }

  // ==================== MẬT KHẨU ====================

  changePassword(payload: ChangePasswordPayload): Observable<null> {
    return this.api.put<null>('/users/me/password', payload);
  }

  // ==================== SỔ ĐỊA CHỈ ====================

  private setAddresses = ({ addresses }: { addresses: Address[] }): void => {
    this.user.update((u) => (u ? { ...u, addresses } : u));
  };

  addAddress(payload: AddressPayload): Observable<{ addresses: Address[] }> {
    return this.api
      .post<{ addresses: Address[] }>('/users/me/addresses', payload)
      .pipe(tap(this.setAddresses));
  }

  updateAddress(id: string, payload: Partial<AddressPayload>): Observable<{ addresses: Address[] }> {
    return this.api
      .patch<{ addresses: Address[] }>(`/users/me/addresses/${id}`, payload)
      .pipe(tap(this.setAddresses));
  }

  deleteAddress(id: string): Observable<{ addresses: Address[] }> {
    return this.api
      .delete<{ addresses: Address[] }>(`/users/me/addresses/${id}`)
      .pipe(tap(this.setAddresses));
  }
}
