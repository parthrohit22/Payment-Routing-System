import { Injectable, signal } from '@angular/core';

export type NotificationTone = 'success' | 'error' | 'info';

export interface NotificationState {
  message: string;
  tone: NotificationTone;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly notification = signal<NotificationState | null>(null);
  private clearTimer: number | null = null;

  show(message: string, tone: NotificationTone = 'info', duration = 4500): void {
    this.notification.set({ message, tone });

    if (this.clearTimer && typeof window !== 'undefined') {
      window.clearTimeout(this.clearTimer);
    }

    if (duration > 0 && typeof window !== 'undefined') {
      this.clearTimer = window.setTimeout(() => this.clear(), duration);
    }
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 5500);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  clear(): void {
    this.notification.set(null);

    if (this.clearTimer && typeof window !== 'undefined') {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }
}
