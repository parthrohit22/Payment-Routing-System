import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationBannerComponent } from './shared/components/notification-banner/notification-banner.component';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationBannerComponent, ThemeToggleComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly themeService = inject(ThemeService);

  protected readonly currentTheme = this.themeService.currentTheme;
}
