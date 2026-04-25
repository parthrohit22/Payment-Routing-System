import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PaymentRecord } from '../../core/models/payment.models';
import { AuthService } from '../../core/services/auth.service';
import { PaymentsService } from '../../core/services/payments.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    TitleCasePipe,
    EmptyStateComponent,
    StatCardComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  private readonly paymentsService = inject(PaymentsService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly payments = signal<PaymentRecord[]>([]);

  protected readonly hasPaymentsAccess = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'merchant';
  });

  protected readonly totalPayments = computed(() => this.payments().length);
  protected readonly successCount = computed(
    () => this.payments().filter((payment) => payment.status === 'succeeded').length,
  );
  protected readonly pendingOrFailedCount = computed(
    () => this.payments().filter((payment) => payment.status !== 'succeeded').length,
  );
  protected readonly regionCount = computed(
    () => new Set(this.payments().map((payment) => payment.region)).size,
  );
  protected readonly recentPayments = computed(() =>
    [...this.payments()]
      .sort(
        (left, right) =>
          new Date(right.initiated_at).getTime() - new Date(left.initiated_at).getTime(),
      )
      .slice(0, 5),
  );
  constructor() {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const paymentsRequest = this.hasPaymentsAccess()
      ? this.paymentsService.fetchAllPayments()
      : of([]);
    forkJoin({
      payments: paymentsRequest,
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ payments }) => {
          this.payments.set(payments);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load overview.');
        },
      });
  }
}
