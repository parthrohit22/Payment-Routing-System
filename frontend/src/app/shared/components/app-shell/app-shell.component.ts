import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { ROLE_LABELS } from '../../../core/constants/app.constants';
import { AuthService } from '../../../core/services/auth.service';
import { HealthService } from '../../../core/services/health.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [
    NgClass,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ConfirmDialogComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly healthService = inject(HealthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly session = this.authService.session;
  protected readonly backendHealthy = signal<boolean | null>(null);
  protected readonly isDeletingAccount = signal(false);
  protected readonly isDeleteAccountDialogOpen = signal(false);

  protected readonly roleLabel = computed(() => {
    const role = this.authService.role();
    return role ? ROLE_LABELS[role] : '';
  });

  protected readonly canViewAnalytics = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'finance' || role === 'merchant';
  });

  protected readonly canViewPayments = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'merchant' || role === 'finance';
  });

  protected readonly canDeleteAccount = computed(() => this.authService.role() === 'merchant');

  protected readonly navItems = computed(() => {
    const baseItems = [
      {
        route: '/dashboard',
        label: 'Overview',
        code: '01',
      },
    ];
    const paymentItems = this.canViewPayments()
      ? [
          {
            route: '/payments',
            label: 'Payments',
            code: '02',
          },
        ]
      : [];

    return this.canViewAnalytics()
      ? [
          ...baseItems,
          ...paymentItems,
          {
            route: '/analytics',
            label: 'Analytics',
            code: '03',
          },
        ]
      : [...baseItems, ...paymentItems];
  });

  constructor() {
    this.healthService.checkHealth().subscribe((isHealthy) => this.backendHealthy.set(isHealthy));
  }

  protected logout(): void {
    if (this.isDeletingAccount()) {
      return;
    }

    this.authService.logout();
  }

  protected requestAccountDeletion(): void {
    if (!this.isDeletingAccount()) {
      this.isDeleteAccountDialogOpen.set(true);
    }
  }

  protected cancelAccountDeletion(): void {
    if (!this.isDeletingAccount()) {
      this.isDeleteAccountDialogOpen.set(false);
    }
  }

  protected confirmAccountDeletion(): void {
    this.isDeletingAccount.set(true);

    this.authService
      .deleteAccount()
      .pipe(
        finalize(() => {
          this.isDeletingAccount.set(false);
          this.isDeleteAccountDialogOpen.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Account deleted');
          this.authService.logout();
        },
        error: (error) => {
          this.notificationService.error(error.error?.message ?? 'Unable to delete account');
        },
      });
  }
}
