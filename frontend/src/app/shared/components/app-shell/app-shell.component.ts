import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ROLE_LABELS } from '../../../core/constants/app.constants';
import { AuthService } from '../../../core/services/auth.service';
import { HealthService } from '../../../core/services/health.service';

@Component({
  selector: 'app-shell',
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly healthService = inject(HealthService);

  protected readonly session = this.authService.session;
  protected readonly backendHealthy = signal<boolean | null>(null);

  protected readonly roleLabel = computed(() => {
    const role = this.authService.role();
    return role ? ROLE_LABELS[role] : '';
  });

  protected readonly canViewAnalytics = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'finance';
  });

  protected readonly canViewPayments = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'merchant';
  });

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
    this.authService.logout();
  }
}
