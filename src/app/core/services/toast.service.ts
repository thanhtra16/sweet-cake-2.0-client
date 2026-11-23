import { PLATFORM_ID, Injectable, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);

  show(type: ToastType, title: string, message?: string, durationMs = 4000): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, type, title, message }]);
    if (this.isBrowser) setTimeout(() => this.dismiss(id), durationMs);
  }

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  error(title: string, message?: string): void {
    this.show('error', title, message, 6000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
