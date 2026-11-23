import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private nextId = 0;

  private readonly toastSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly toasts$ = this.toastSubject.asObservable();
  readonly toasts = signal<ToastMessage[]>([]);

  show(
    type: ToastType,
    message: string,
    title = 'Thông báo',
    durationMs = 4000
  ): void {
    const toast: ToastMessage = {
      id: ++this.nextId,
      type,
      title,
      message,
    };

    const nextList = [...this.toastSubject.value, toast];
    this.toastSubject.next(nextList);
    this.toasts.set(nextList);

    if (this.isBrowser) {
      setTimeout(() => this.dismiss(toast.id), durationMs);
    }
  }

  success(message: string, title = 'Thành công'): void {
    this.show('success', message, title);
  }

  warning(message: string, title = 'Lưu ý'): void {
    this.show('warning', message, title);
  }

  error(message: string, title = 'Có lỗi xảy ra'): void {
    this.show('error', message, title, 6000);
  }

  info(message: string, title = 'Thông báo'): void {
    this.show('info', message, title);
  }

  dismiss(id: number): void {
    const nextList = this.toastSubject.value.filter((toast) => toast.id !== id);
    this.toastSubject.next(nextList);
    this.toasts.set(nextList);
  }
}