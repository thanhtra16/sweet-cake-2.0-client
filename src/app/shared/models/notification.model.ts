export type NotificationType = 'order' | 'promotion';

/** Bộ lọc ở cột trái: tất cả hoặc theo loại. */
export type NotificationFilter = 'all' | NotificationType;

/** Thông báo dùng trong giao diện (đã chuẩn hóa từ Backend). */
export interface AppNotification {
  id: string;
  type: NotificationType;
  /** Id đơn hàng liên quan (chỉ có với thông báo loại order). */
  orderId: string | null;
  title: string;
  description: string;
  /** Thời điểm tạo (ms) để hiển thị "x phút trước". */
  createdAt: number;
  isRead: boolean;
}

/** Thông báo đúng như Backend trả về (model Notification). */
export interface NotificationDto {
  _id?: string;
  id?: string;
  type?: string;
  orderId?: string | null;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string | number | Date;
}
