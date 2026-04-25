import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe, NgIf, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, map, of } from 'rxjs';
import { debounceTime, finalize } from 'rxjs/operators';
import {
  CURRENCY_OPTIONS,
  DEFAULT_QUERY_STATE,
  DEFAULT_PAGE_SIZE,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from '../../core/constants/app.constants';
import {
  CustomerDetails,
  PaymentRecord,
  PaymentsQueryState,
  PaymentUpsertPayload,
  ProviderAttempt,
} from '../../core/models/payment.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentsService } from '../../core/services/payments.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PaymentDetailPanelComponent } from './payment-detail-panel.component';
import { PaymentFormModalComponent } from './payment-form-modal.component';

@Component({
  selector: 'app-payments-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    NgIf,
    ReactiveFormsModule,
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusOptions = ['all', ...STATUS_OPTIONS];
  protected readonly currencyOptions = ['all', ...CURRENCY_OPTIONS];
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly queryState = signal<PaymentsQueryState>({ ...DEFAULT_QUERY_STATE });
  protected readonly allPayments = signal<PaymentRecord[]>([]);
  protected readonly sourcePayments = signal<PaymentRecord[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly selectedPayment = signal<PaymentRecord | null>(null);
  protected readonly isFormOpen = signal(false);
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly deleteCandidate = signal<PaymentRecord | null>(null);

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    q: [''],
    status: ['all'],
    currency: ['all'],
    region: ['all'],
    paymentType: ['all'],
    sort: ['date-desc'],
    pageSize: [DEFAULT_PAGE_SIZE],
  });

  protected readonly canCreatePayments = computed(() => {
    const role = this.authService.role();
    return role === 'admin' || role === 'merchant';
  });

  protected readonly canEditPayments = computed(() => this.authService.role() === 'admin');

  protected readonly canDeletePayments = computed(() => this.authService.role() === 'admin');

  protected readonly canAddProviderAttempts = computed(() => this.authService.role() === 'admin');

  protected readonly availableRegions = computed(() =>
    [...new Set(this.allPayments().map((payment) => payment.region))].filter(Boolean).sort(),
  );

  protected readonly availablePaymentTypes = computed(() =>
    [...new Set(this.allPayments().map((payment) => payment.payment_type))].filter(Boolean).sort(),
  );

  protected readonly filteredPayments = computed(() => {
    const state = this.queryState();
    let payments = [...this.sourcePayments()];

    if (state.status !== 'all') {
      payments = payments.filter(
        (payment) => payment.status.toLowerCase() === state.status.toLowerCase(),
      );
    }

    if (state.currency !== 'all') {
      payments = payments.filter((payment) => payment.currency === state.currency);
    }

    if (state.region !== 'all') {
      payments = payments.filter((payment) => payment.region === state.region);
    }

    if (state.paymentType !== 'all') {
      payments = payments.filter((payment) => payment.payment_type === state.paymentType);
    }

    const query = state.q.trim().toLowerCase();
    if (query) {
      payments = payments.filter((payment) => {
        const searchCorpus = [
          payment.merchant,
          payment.payment_type,
          payment.currency,
          payment.region,
          payment.status,
          payment.customer_details?.name,
          payment.customer_details?.email,
          payment.customer_details?.country,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchCorpus.includes(query);
      });
    }

    return payments.sort((left, right) => this.comparePayments(left, right, state.sort));
  });

  protected readonly totalItems = computed(() => this.filteredPayments().length);
  protected readonly succeededCount = computed(
    () => this.filteredPayments().filter((payment) => payment.status === 'succeeded').length,
  );
  protected readonly pendingCount = computed(
    () => this.filteredPayments().filter((payment) => payment.status === 'pending').length,
  );
  protected readonly failedCount = computed(
    () => this.filteredPayments().filter((payment) => payment.status === 'failed').length,
  );
  protected readonly activeFilters = computed(() => {
    const state = this.queryState();
    const activeFilters: string[] = [];

    if (state.q.trim()) {
      activeFilters.push(`Search: ${state.q.trim()}`);
    }

    if (state.status !== 'all') {
      activeFilters.push(`Status: ${state.status}`);
    }

    if (state.currency !== 'all') {
      activeFilters.push(`Currency: ${state.currency}`);
    }

    if (state.region !== 'all') {
      activeFilters.push(`Region: ${state.region}`);
    }

    if (state.paymentType !== 'all') {
      activeFilters.push(`Type: ${state.paymentType}`);
    }

    if (state.sort !== 'date-desc') {
      const matchingSort = this.sortOptions.find((option) => option.value === state.sort);
      activeFilters.push(`Sort: ${matchingSort?.label ?? state.sort}`);
    }

    return activeFilters;
  });
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.queryState().pageSize)),
  );
  protected readonly currentPage = computed(() =>
    Math.min(this.queryState().page, this.totalPages()),
  );
  protected readonly pageRangeLabel = computed(() => {
    const total = this.totalItems();

    if (!total) {
      return '0 results';
    }

    const pageSize = this.queryState().pageSize;
    const startIndex = (this.currentPage() - 1) * pageSize + 1;
    const endIndex = Math.min(total, startIndex + pageSize - 1);
    return `${startIndex}-${endIndex} of ${total}`;
  });
  protected readonly pagedPayments = computed(() => {
    const pageSize = this.queryState().pageSize;
    const startIndex = (this.currentPage() - 1) * pageSize;
    return this.filteredPayments().slice(startIndex, startIndex + pageSize);
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((queryParamMap) => {
        const nextState = this.parseQueryState(queryParamMap);
        const previousState = this.queryState();

        this.queryState.set(nextState);
        this.filterForm.patchValue(
          {
            q: nextState.q,
            status: nextState.status,
            currency: nextState.currency,
            region: nextState.region,
            paymentType: nextState.paymentType,
            sort: nextState.sort,
            pageSize: nextState.pageSize,
          },
          { emitEvent: false },
        );

        if (
          nextState.status !== previousState.status ||
          !this.allPayments().length ||
          !this.sourcePayments().length
        ) {
          this.loadPayments(nextState);
        } else {
          queueMicrotask(() => this.syncSelectedPayment());
        }
      });

    this.filterForm.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe((formValue) => {
        this.updateQueryParams({
          page: 1,
          q: formValue.q ?? '',
          status: formValue.status ?? 'all',
          currency: formValue.currency ?? 'all',
          region: formValue.region ?? 'all',
          paymentType: formValue.paymentType ?? 'all',
          sort: formValue.sort ?? 'date-desc',
          pageSize: Number(formValue.pageSize ?? DEFAULT_PAGE_SIZE),
        });
      });
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

  protected closeFormModal(): void {
    this.isFormOpen.set(false);
  }

  protected submitPayment(payload: PaymentUpsertPayload): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const mutation =
      this.formMode() === 'create' || !this.selectedPayment()?._id
        ? this.paymentsService.createPayment(payload)
        : this.paymentsService.updatePayment(this.selectedPayment()!._id!, payload);

    mutation
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.notificationService.success(
            response.message ??
              (this.formMode() === 'create'
                ? 'Payment created successfully.'
                : 'Payment updated successfully.'),
          );
          this.isFormOpen.set(false);
          this.analyticsService.refreshAfterMutation();
          this.loadPayments(this.queryState(), true);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to save the payment right now.');
        },
      });
  }

  protected requestDelete(): void {
    if (!this.selectedPayment()) {
      return;
    }

    this.deleteCandidate.set(this.selectedPayment());
  }

  protected addProviderAttempt(attempt: ProviderAttempt): void {
    const selectedPayment = this.selectedPayment();
    if (!selectedPayment?._id || !this.canAddProviderAttempts()) {
      return;
    }

    const nextAttempts = [...(selectedPayment.provider_attempts ?? []), attempt];
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.paymentsService
      .updatePayment(selectedPayment._id, this.toPaymentPayload(selectedPayment, nextAttempts))
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.notificationService.success(
            response.message ?? 'Provider attempt added successfully.',
          );
          this.analyticsService.refreshAfterMutation();
          this.loadPayments(this.queryState(), true);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to add the provider attempt.');
        },
      });
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
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.notificationService.success(response.message ?? 'Payment deleted successfully.');
          this.analyticsService.refreshAfterMutation();

          const nextPage =
            this.currentPage() > 1 && this.pagedPayments().length === 1
              ? this.currentPage() - 1
              : this.currentPage();

          if (nextPage !== this.queryState().page) {
            this.updateQueryParams({ page: nextPage });
          } else {
            this.loadPayments(this.queryState(), true);
          }
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to delete the selected payment.');
        },
      });
  }

  protected goToPage(page: number): void {
    const safePage = Math.max(1, Math.min(page, this.totalPages()));
    this.updateQueryParams({ page: safePage });
  }

  protected clearFilters(): void {
    this.updateQueryParams({ ...DEFAULT_QUERY_STATE });
  }

  protected statusClass(status: string): string {
    if (status === 'succeeded') {
      return 'status-pill status-pill--success';
    }

    if (status === 'failed') {
      return 'status-pill status-pill--danger';
    }

    return 'status-pill status-pill--warning';
  }

  protected trackByPayment(_: number, payment: PaymentRecord): string {
    return payment._id ?? `${payment.merchant}-${payment.initiated_at}`;
  }

  private loadPayments(state: PaymentsQueryState, forceRefresh = false): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const allPaymentsRequest = this.paymentsService.fetchAllPayments(forceRefresh);
    const request =
      state.status === 'all'
        ? allPaymentsRequest.pipe(map((allPayments) => ({ allPayments, source: allPayments })))
        : forkJoin({
            allPayments: allPaymentsRequest,
            source: this.paymentsService.fetchPaymentsByStatus(state.status),
          });

    request
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ allPayments, source }) => {
          this.allPayments.set(allPayments);
          this.sourcePayments.set(source);
          queueMicrotask(() => this.syncSelectedPayment());
        },
        error: (error) => {
          this.allPayments.set([]);
          this.sourcePayments.set([]);
          this.selectedPayment.set(null);
          this.errorMessage.set(error.error?.message ?? 'Unable to load payments from the API.');
        },
      });
  }

  private syncSelectedPayment(): void {
    const visiblePayments = this.filteredPayments();
    const currentSelection = this.selectedPayment();

    if (!visiblePayments.length) {
      this.selectedPayment.set(null);
      return;
    }

    if (!currentSelection) {
      this.selectedPayment.set(visiblePayments[0]);
      return;
    }

    const matchingPayment = visiblePayments.find((payment) => payment._id === currentSelection._id);

    this.selectedPayment.set(matchingPayment ?? visiblePayments[0]);
  }

  private updateQueryParams(partial: Partial<PaymentsQueryState>): void {
    const nextState = {
      ...this.queryState(),
      ...partial,
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: nextState.page,
        pageSize: nextState.pageSize,
        status: nextState.status,
        q: nextState.q || null,
        currency: nextState.currency,
        region: nextState.region,
        paymentType: nextState.paymentType,
        sort: nextState.sort,
      },
      queryParamsHandling: 'merge',
    });
  }

  private parseQueryState(paramMap: ParamMap): PaymentsQueryState {
    const page = Number(paramMap.get('page') ?? DEFAULT_QUERY_STATE.page);
    const pageSize = Number(paramMap.get('pageSize') ?? DEFAULT_QUERY_STATE.pageSize);

    return {
      page: Number.isFinite(page) && page > 0 ? page : DEFAULT_QUERY_STATE.page,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_QUERY_STATE.pageSize,
      status: paramMap.get('status') ?? DEFAULT_QUERY_STATE.status,
      q: paramMap.get('q') ?? DEFAULT_QUERY_STATE.q,
      currency: paramMap.get('currency') ?? DEFAULT_QUERY_STATE.currency,
      region: paramMap.get('region') ?? DEFAULT_QUERY_STATE.region,
      paymentType: paramMap.get('paymentType') ?? DEFAULT_QUERY_STATE.paymentType,
      sort: paramMap.get('sort') ?? DEFAULT_QUERY_STATE.sort,
    };
  }

  private comparePayments(left: PaymentRecord, right: PaymentRecord, sortOrder: string): number {
    switch (sortOrder) {
      case 'date-asc':
        return new Date(left.initiated_at).getTime() - new Date(right.initiated_at).getTime();
      case 'amount-desc':
        return right.amount_minor - left.amount_minor;
      case 'amount-asc':
        return left.amount_minor - right.amount_minor;
      case 'date-desc':
      default:
        return new Date(right.initiated_at).getTime() - new Date(left.initiated_at).getTime();
    }
  }

  private toPaymentPayload(
    payment: PaymentRecord,
    providerAttempts = payment.provider_attempts ?? [],
  ): PaymentUpsertPayload {
    const customerDetails: CustomerDetails = {
      name: payment.customer_details?.name ?? '',
      email: payment.customer_details?.email ?? '',
      country: payment.customer_details?.country ?? '',
    };

    return {
      merchant: payment.merchant,
      paymentType: payment.payment_type,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      region: payment.region,
      status: payment.status,
      customerDetails,
      providerAttempts,
    };
  }
}
