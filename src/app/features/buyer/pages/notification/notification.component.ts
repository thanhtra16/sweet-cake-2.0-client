
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { NotificationService } from '../../../../core/services/notification';
import {
  AppNotification,
  NotificationFilter
} from '../../../../shared/models/notification.model';

interface FilterItem {
  value: NotificationFilter;
  label: string;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);

  readonly filters: FilterItem[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'order', label: 'Đơn hàng' },
    { value: 'promotion', label: 'Khuyến mãi' }
  ];

  readonly activeFilter = signal<NotificationFilter>('all');

  readonly totalUnread = this.notificationService.unreadCount;
  readonly isLoading = this.notificationService.isLoading;
  readonly hasError = this.notificationService.hasError;

  readonly visibleNotifications = computed<AppNotification[]>(() =>
    this.notificationService.filterBy(this.activeFilter())
  );

  readonly unreadByFilter = computed(() => {
    this.notificationService.items();

    return Object.fromEntries(
      this.filters.map((f) => [
        f.value,
        this.notificationService.unreadCountBy(f.value)
      ])
    ) as Record<NotificationFilter, number>;
  });

  ngOnInit(): void {
    this.notificationService.load();
  }

  reload(): void {
    this.notificationService.load();
  }

  iconOf(notification: AppNotification): string {
    return notification.type === 'order'
      ? 'bi-bag-check-fill'
      : 'bi-tag-fill';
  }

  timeAgo(timestamp: number): string {
    if (!timestamp) return '';

    const minutes = Math.floor((Date.now() - timestamp) / 60_000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;

    return new Date(timestamp).toLocaleDateString('vi-VN');
  }

  selectFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  markAsRead(notification: AppNotification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
}
