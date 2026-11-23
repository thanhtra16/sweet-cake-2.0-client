
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  ApiResponse,
  UserAccount,
  UserListQuery,
  UserListResponse,
  UserStatus,
} from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AdminUserService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/admin/users`;

  /**
   * Lấy danh sách người dùng
   */
  list(query: UserListQuery): Observable<UserListResponse> {
    let params = new HttpParams();

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }

    if (query.status && query.status !== 'all') {
      params = params.set('status', query.status);
    }

    params = params
      .set('page', String(query.page))
      .set('limit', String(query.limit));

    if (query.sort) {
      params = params.set('sort', query.sort);
    }

    return this.http
      .get<ApiResponse<UserListResponse>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Xem chi tiết người dùng
   */
  detail(id: string): Observable<UserAccount> {
    return this.http
      .get<ApiResponse<UserAccount>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Khóa hoặc mở khóa tài khoản
   */
  updateStatus(
    id: string,
    status: UserStatus,
    reason?: string
  ): Observable<UserAccount> {
    return this.http
      .patch<ApiResponse<UserAccount>>(
        `${this.baseUrl}/${id}/status`,
        { status, reason }
      )
      .pipe(map((res) => res.data));
  }
}
