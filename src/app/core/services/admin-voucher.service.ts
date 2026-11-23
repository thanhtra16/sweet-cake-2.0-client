import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/admin-user.model';
import {
  Voucher,
  VoucherListQuery,
  VoucherListResponse,
  VoucherPayload,
} from '../../shared/models/admin-voucher.model';

@Injectable({ providedIn: 'root' })
export class AdminVoucherService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/vouchers`;

  list(query: VoucherListQuery): Observable<VoucherListResponse> {
    let params = new HttpParams();
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status) params = params.set('status', query.status);
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    return this.http
      .get<ApiResponse<VoucherListResponse>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  create(payload: VoucherPayload): Observable<Voucher> {
    return this.http.post<ApiResponse<Voucher>>(this.baseUrl, payload).pipe(map((res) => res.data));
  }

  update(id: string, payload: VoucherPayload): Observable<Voucher> {
    return this.http.put<ApiResponse<Voucher>>(`${this.baseUrl}/${id}`, payload).pipe(map((res) => res.data));
  }

  setActive(id: string, active: boolean): Observable<Voucher> {
    return this.http
      .patch<ApiResponse<Voucher>>(`${this.baseUrl}/${id}/status`, { active })
      .pipe(map((res) => res.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<unknown>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
