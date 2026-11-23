import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/admin-user.model';
import {
  CreateFromTemplatesResult,
  CreateTimeSlotPayload,
  TimeSlotDay,
  TimeSlotItem,
  UpdateTimeSlotPayload,
} from '../../shared/models/admin-time-slot.model';

@Injectable({ providedIn: 'root' })
export class AdminTimeSlotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/time-slots`;

  listByDate(date: string): Observable<TimeSlotDay> {
    return this.http
      .get<ApiResponse<TimeSlotDay>>(this.baseUrl, { params: { date } })
      .pipe(map((res) => res.data));
  }

  create(payload: CreateTimeSlotPayload): Observable<TimeSlotItem> {
    return this.http.post<ApiResponse<TimeSlotItem>>(this.baseUrl, payload).pipe(map((res) => res.data));
  }

  /** Tạo các ca mẫu còn thiếu cho ngày đã chọn. */
  createFromTemplates(date: string): Observable<CreateFromTemplatesResult> {
    return this.http
      .post<ApiResponse<CreateFromTemplatesResult>>(`${this.baseUrl}/from-templates`, { date })
      .pipe(map((res) => res.data));
  }

  update(id: string, payload: UpdateTimeSlotPayload): Observable<TimeSlotItem> {
    return this.http
      .put<ApiResponse<TimeSlotItem>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }
}
