import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PaymentRecord } from '../../core/models/payment.models';
import { AuthService } from '../../core/services/auth.service';
import { PaymentsService } from '../../core/services/payments.service';

import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    EmptyStateComponent,
    StatCardComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  private paymentsService = inject(PaymentsService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  role = this.authService.role;

  isLoading = signal(true);
  errorMessage = signal('');
  payments = signal<PaymentRecord[]>([]);

  isAdmin = computed(() => this.role() === 'admin');
  isMerchant = computed(() => this.role() === 'merchant');
  isFinance = computed(() => this.role() === 'finance');

  canSeePayments = computed(
    () => this.isAdmin() || this.isMerchant() || this.isFinance()
  );

  totalPayments = computed(() => this.payments().length);

  successCount = computed(
    () => this.payments().filter(p => p.status === 'success').length
  );

  pendingOrFailedCount = computed(
    () => this.payments().filter(p => p.status !== 'success').length
  );

  regionCount = computed(
    () => new Set(this.payments().map(p => p.region)).size
  );

  recentPayments = computed(() =>
    [...this.payments()]
      .sort(
        (a, b) =>
          new Date(b.initiated_at).getTime() -
          new Date(a.initiated_at).getTime()
      )
      .slice(0, 5)
  );

  constructor() {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    if (!this.canSeePayments()) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.paymentsService
      .fetchAllPayments()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (payments) => {
          this.payments.set(payments);
        },
        error: (err: any) => {
          this.errorMessage.set(
            err?.error?.message ?? 'Unable to load dashboard.'
          );
        },
      });
  }
}
