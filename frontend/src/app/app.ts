import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NotificationBannerComponent } from './shared/components/notification-banner/notification-banner.component';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle.component';
import { ThemeService } from './core/services/theme.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationBannerComponent, ThemeToggleComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentTheme = this.themeService.currentTheme;
  protected readonly showGlobalThemeToggle = signal(false);

  constructor() {
    const updateVisibility = (url: string) => {
      this.showGlobalThemeToggle.set(
        url.startsWith('/login') || url.startsWith('/register') || url.startsWith('/unauthorized')
      );
    };

    updateVisibility(this.router.url);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => updateVisibility((event as NavigationEnd).urlAfterRedirects));
  }
}
