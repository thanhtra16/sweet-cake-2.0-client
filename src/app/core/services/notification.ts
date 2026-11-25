import { Injectable, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';

import { ApiService } from './api.service';
import {
  AppNotification,
  NotificationDto,
  NotificationFilter,
  NotificationType
} from '../../shared/models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly api = inject(ApiService);

  private readonly _items = signal<AppNotification[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _hasError = signal(false);

  readonly items = this._items.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasError = this._hasError.asReadonly();

  /** Tổng số thông báo chưa đọc (dùng cho badge, có thể hiện ở header sau này). */
  readonly unreadCount = computed(() => this._items().filter((n) => !n.isRead).length);

  /** Tải thông báo của người dùng đang đăng nhập: GET /notifications */
  load(): void {
    this._isLoading.set(true);
    this._hasError.set(false);

    this.api
      .get<NotificationDto[] | { notifications: NotificationDto[] }>('/notifications')
      .pipe(
        map((data) => (Array.isArray(data) ? data : (data?.notifications ?? []))),
        map((list) => list.map((dto) => this.toNotification(dto)).sort((a, b) => b.createdAt - a.createdAt))
      )
      .subscribe({
        next: (items) => {
          this._items.set(items);
          this._isLoading.set(false);
        },
        error: (err) => {
          console.error('Không thể tải thông báo:', err);
          this._hasError.set(true);
          this._isLoading.set(false);
        }
      });
  }

  /** Lấy danh sách theo bộ lọc. */
  filterBy(filter: NotificationFilter): AppNotification[] {
    return this._items().filter((n) => filter === 'all' || n.type === filter);
  }

  /** Đếm thông báo chưa đọc theo bộ lọc. */
  unreadCountBy(filter: NotificationFilter): number {
    return this.filterBy(filter).filter((n) => !n.isRead).length;
  }

  /** Đánh dấu đã đọc: cập nhật giao diện ngay, gọi API, lỗi thì hoàn lại. */
  markAsRead(id: string): void {
    const snapshot = this._items();
    this._items.update((items) => items.map((n) => (n.id === id ? { ...n, isRead: true } : n)));

    this.api.patch<unknown>(`/notifications/${id}/read`).subscribe({
      error: (err) => {
        console.error('Không thể đánh dấu đã đọc:', err);
        this._items.set(snapshot);
      }
    });
  }

  markAllAsRead(): void {
    const snapshot = this._items();
    this._items.update((items) => items.map((n) => ({ ...n, isRead: true })));

    this.api.patch<unknown>('/notifications/read-all').subscribe({
      error: (err) => {
        console.error('Không thể đánh dấu tất cả đã đọc:', err);
        this._items.set(snapshot);
      }
    });
  }

  private toNotification(dto: NotificationDto): AppNotification {
    const type: NotificationType = dto.type === 'order' ? 'order' : 'promotion';

    return {
      id: String(dto._id ?? dto.id ?? ''),
      type,
      orderId: dto.orderId ? String(dto.orderId) : null,
      title: dto.title ?? '',
      description: dto.message ?? '',
      createdAt: dto.createdAt ? new Date(dto.createdAt).getTime() : 0,
      isRead: !!dto.read
    };
  }
}
