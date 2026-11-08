import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly toastSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly toasts$ = this.toastSubject.asObservable();

  success(message: string, title = 'Thành công'): void {
    this.show('success', message, title);
  }

  warning(message: string, title = 'Lưu ý'): void {
    this.show('warning', message, title);
  }

  error(message: string, title = 'Có lỗi xảy ra'): void {
    this.show('error', message, title);
  }

  info(message: string, title = 'Thông báo'): void {
    this.show('info', message, title);
  }

  dismiss(id: number): void {
    this.toastSubject.next(this.toastSubject.value.filter((toast) => toast.id !== id));
  }

  private show(type: ToastType, message: string, title: string): void {
    const toast: ToastMessage = { id: ++this.nextId, type, title, message };
    this.toastSubject.next([...this.toastSubject.value, toast]);

    // Tự đóng sau 4 giây.
    setTimeout(() => this.dismiss(toast.id), 4000);
  }
}
