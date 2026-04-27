import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { PaymentRecord, PaymentUpsertPayload, ProviderAttempt } from '../../core/models/payment.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentsService } from '../../core/services/payments.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PaymentDetailPanelComponent } from './payment-detail-panel.component';
import { PaymentFormModalComponent } from './payment-form-modal.component';

type PaymentStatusFilter = 'all' | 'success' | 'pending' | 'failed';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    ConfirmDialogComponent,
    EmptyStateComponent,
    PaymentDetailPanelComponent,
    PaymentFormModalComponent,
  ],
  templateUrl: './payments-page.component.html',
  styleUrl: './payments-page.component.css',
})
export class PaymentsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly payments = signal<PaymentRecord[]>([]);
  protected readonly selectedPayment = signal<PaymentRecord | null>(null);
  protected readonly isFormOpen = signal(false);
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly deleteCandidate = signal<PaymentRecord | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<PaymentStatusFilter>('all');
  protected readonly regionFilter = signal('all');
  protected readonly currencyFilter = signal('all');
  protected readonly sortDirection = signal<SortDirection>('desc');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 8;

  protected readonly canViewPayments = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'merchant' || role === 'finance';
  });
  protected readonly canCreatePayments = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'merchant';
  });
  protected readonly canEditPayments = computed(() => this.authService.role() === 'admin');
  protected readonly canDeletePayments = computed(() => this.authService.role() === 'admin');
  protected readonly canAddProviderAttempts = computed(() => this.authService.role() === 'admin');
  protected readonly canChangeStatus = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'finance';
  });

  protected readonly availableRegions = computed(() =>
    [...new Set(this.payments().map((payment) => payment.region).filter(Boolean))].sort()
  );

  protected readonly availableCurrencies = computed(() =>
    [...new Set(this.payments().map((payment) => payment.currency).filter(Boolean))].sort()
  );

  protected readonly filteredPayments = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const region = this.regionFilter();
    const currency = this.currencyFilter();

    return this.payments().filter((payment) => {
      const matchesSearch =
        !term ||
        payment.merchant.toLowerCase().includes(term) ||
        (payment.customer_details.name ?? '').toLowerCase().includes(term) ||
        (payment.customer_details.email ?? '').toLowerCase().includes(term);

      const matchesStatus = status === 'all' || payment.status === status;
      const matchesRegion = region === 'all' || payment.region === region;
      const matchesCurrency = currency === 'all' || payment.currency === currency;

      return matchesSearch && matchesStatus && matchesRegion && matchesCurrency;
    });
  });

  protected readonly sortedPayments = computed(() =>
    [...this.filteredPayments()].sort((firstPayment, secondPayment) => {
      const firstDate = new Date(firstPayment.initiated_at).getTime();
      const secondDate = new Date(secondPayment.initiated_at).getTime();

      return this.sortDirection() === 'desc' ? secondDate - firstDate : firstDate - secondDate;
    })
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sortedPayments().length / this.pageSize))
  );

  protected readonly pagedPayments = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const startIndex = (page - 1) * this.pageSize;
    return this.sortedPayments().slice(startIndex, startIndex + this.pageSize);
  });

  constructor() {
    this.loadPayments();

    effect(() => {
      this.filteredPayments();
      this.sortedPayments();
      this.syncSelectedPayment();
    });
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value as PaymentStatusFilter);
    this.currentPage.set(1);
  }

  protected onRegionChange(value: string): void {
    this.regionFilter.set(value);
    this.currentPage.set(1);
  }

  protected onCurrencyChange(value: string): void {
    this.currencyFilter.set(value);
    this.currentPage.set(1);
  }

  protected toggleSortDirection(): void {
    this.sortDirection.update((direction) => (direction === 'desc' ? 'asc' : 'desc'));
    this.currentPage.set(1);
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.regionFilter.set('all');
    this.currencyFilter.set('all');
    this.sortDirection.set('desc');
    this.currentPage.set(1);
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  protected prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  protected selectPayment(payment: PaymentRecord): void {
    this.selectedPayment.set(payment);
  }

  protected clearSelection(): void {
    this.selectedPayment.set(null);
  }

  protected openCreateModal(): void {
    this.formMode.set('create');
    this.isFormOpen.set(true);
  }

  protected openEditModal(): void {
    if (!this.selectedPayment()) {
      return;
    }

    this.formMode.set('edit');
    this.isFormOpen.set(true);
  }

  protected submitPayment(payload: PaymentUpsertPayload): void {
    const selected = this.selectedPayment();
    const request =
      this.formMode() === 'create' || !selected?._id
        ? this.paymentsService.createPayment(payload)
        : this.paymentsService.updatePayment(selected._id, payload);

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    request
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.notificationService.success(
            this.formMode() === 'create' ? 'Payment created' : 'Payment updated'
          );
          this.analyticsService.refreshAfterMutation();
          this.isFormOpen.set(false);
          this.loadPayments(true);
        },
        error: (error) => {
          const message = error.error?.message ?? 'Payment save failed';
          this.errorMessage.set(message);
          this.notificationService.error(message);
        },
      });
  }

  protected requestDelete(): void {
    if (this.selectedPayment()) {
      this.deleteCandidate.set(this.selectedPayment());
    }
  }

  protected cancelDelete(): void {
    this.deleteCandidate.set(null);
  }

  protected confirmDelete(): void {
    const candidate = this.deleteCandidate();
    if (!candidate?._id) {
      return;
    }

    this.isSubmitting.set(true);
    this.paymentsService
      .deletePayment(candidate._id)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
          this.deleteCandidate.set(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Payment deleted');
          this.analyticsService.refreshAfterMutation();
          this.selectedPayment.set(null);
          this.loadPayments(true);
        },
        error: (error) => {
          const message = error.error?.message ?? 'Delete failed';
          this.errorMessage.set(message);
          this.notificationService.error(message);
        },
      });
  }

  protected updateStatus(status: string): void {
    const selected = this.selectedPayment();
    if (!selected?._id) {
      return;
    }

    const payload = this.toPaymentPayload({ ...selected, status });
    this.isSubmitting.set(true);

    this.paymentsService
      .updatePayment(selected._id, payload)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Payment updated');
          this.analyticsService.refreshAfterMutation();
          this.loadPayments(true);
        },
        error: (error) => {
          this.notificationService.error(error.error?.message ?? 'Update failed');
        },
      });
  }

  protected addAttempt(attempt: ProviderAttempt): void {
    const selected = this.selectedPayment();
    if (!selected?._id) {
      return;
    }

    const nextAttempts = [...(selected.provider_attempts ?? []), attempt];
    const payload = this.toPaymentPayload(selected, nextAttempts);
    this.isSubmitting.set(true);

    this.paymentsService
      .updatePayment(selected._id, payload)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Provider attempt added');
          this.analyticsService.refreshAfterMutation();
          this.loadPayments(true);
        },
        error: (error) => {
          this.notificationService.error(error.error?.message ?? 'Failed to add attempt');
        },
      });
  }

  protected statusClass(status: string): string {
    if (status === 'success') {
      return 'status-pill status-pill--success';
    }

    if (status === 'failed') {
      return 'status-pill status-pill--danger';
    }

    return 'status-pill status-pill--warning';
  }

  private loadPayments(forceRefresh = false): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.paymentsService
      .fetchAllPayments(forceRefresh)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (payments) => {
          this.payments.set(payments);
          this.syncSelectedPayment();
        },
        error: (error) => {
          const message = error.error?.message ?? 'Failed to load payments';
          this.errorMessage.set(message);
          this.notificationService.error(message);
          this.payments.set([]);
          this.selectedPayment.set(null);
        },
      });
  }

  private syncSelectedPayment(): void {
    const visiblePayments = this.filteredPayments();
    const totalPages = Math.max(1, Math.ceil(this.sortedPayments().length / this.pageSize));

    if (this.currentPage() > totalPages) {
      this.currentPage.set(totalPages);
    }

    const currentSelection = untracked(() => this.selectedPayment());

    if (!visiblePayments.length) {
      this.selectedPayment.set(null);
      return;
    }

    if (!currentSelection) {
      this.selectedPayment.set(this.pagedPayments()[0] ?? null);
      return;
    }

    const visibleSelection = visiblePayments.find((payment) => payment._id === currentSelection._id);
    if (!visibleSelection) {
      this.selectedPayment.set(null);
      return;
    }

    this.selectedPayment.set(visibleSelection);
  }

  private toPaymentPayload(
    payment: PaymentRecord,
    providerAttempts = payment.provider_attempts ?? []
  ): PaymentUpsertPayload {
    return {
      merchant: payment.merchant,
      paymentType: payment.payment_type,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      region: payment.region,
      status: payment.status,
      customerDetails: {
        name: payment.customer_details?.name ?? '',
        email: payment.customer_details?.email ?? '',
        country: payment.customer_details?.country ?? '',
      },
      providerAttempts,
    };
  }
}
