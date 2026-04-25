import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-banner',
  imports: [NgClass],
  templateUrl: './notification-banner.component.html',
  styleUrl: './notification-banner.component.css'
})
export class NotificationBannerComponent {
  private readonly notificationService = inject(NotificationService);

  protected readonly notification = this.notificationService.notification;

  protected dismiss(): void {
    this.notificationService.clear();
  }
}
