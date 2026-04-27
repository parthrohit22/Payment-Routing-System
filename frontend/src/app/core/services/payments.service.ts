import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';

import { API_ROOT, DEFAULT_PAGE_SIZE } from '../constants/app.constants';
import { ApiResponse } from '../models/api.models';
import {
  PaginatedPaymentsResponse,
  PaymentRecord,
  PaymentUpsertPayload,
} from '../models/payment.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly paymentsCache = signal<PaymentRecord[] | null>(null);
  private readonly paymentsCacheKey = signal<string | null>(null);
  private readonly formHeaders = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  readonly cachedPayments = this.paymentsCache.asReadonly();

  fetchPayments(page: number, limit: number): Observable<PaginatedPaymentsResponse> {
    return this.fetchPaymentsPage(page, limit);
  }

  fetchAllPayments(forceRefresh = false, pageSize = DEFAULT_PAGE_SIZE): Observable<PaymentRecord[]> {
    const cached = this.paymentsCache();
    const cacheKey = this.currentCacheKey();

    if (!forceRefresh && cached && this.paymentsCacheKey() === cacheKey) {
      return of([...cached]);
    }

    return this.fetchPaymentsPage(1, pageSize).pipe(
      switchMap((firstPage) => {
        const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.limit));

        if (totalPages === 1) {
          return of(firstPage.payments);
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
          this.fetchPaymentsPage(index + 2, pageSize)
        );

        return forkJoin(requests).pipe(
          map((remainingPages) =>
            [firstPage, ...remainingPages].flatMap((pageResult) => pageResult.payments)
          )
        );
      }),
      tap((payments) => {
        this.paymentsCache.set(payments);
        this.paymentsCacheKey.set(cacheKey);
      }),
      map((payments) => [...payments])
    );
  }

  fetchPaymentsByStatus(status: string): Observable<PaymentRecord[]> {
    return this.fetchAllPayments().pipe(
      map((payments) => payments.filter((payment) => payment.status === status))
    );
  }

  createPayment(payload: PaymentUpsertPayload): Observable<ApiResponse<unknown>> {
    return this.http
      .post<ApiResponse<unknown>>(`${API_ROOT}/payments`, this.toFormBody(payload), {
        headers: this.formHeaders,
      })
      .pipe(tap(() => this.invalidateCache()));
  }

  updatePayment(id: string, payload: PaymentUpsertPayload): Observable<ApiResponse<unknown>> {
    return this.http
      .put<ApiResponse<unknown>>(`${API_ROOT}/payments/${id}`, this.toFormBody(payload), {
        headers: this.formHeaders,
      })
      .pipe(tap(() => this.invalidateCache()));
  }

  deletePayment(id: string): Observable<ApiResponse<unknown>> {
    return this.http
      .delete<ApiResponse<unknown>>(`${API_ROOT}/payments/${id}`)
      .pipe(tap(() => this.invalidateCache()));
  }

  invalidateCache(): void {
    this.paymentsCache.set(null);
    this.paymentsCacheKey.set(null);
  }

  private currentCacheKey(): string {
    return [
      this.authService.role() ?? 'anonymous',
      this.authService.email() ?? 'unknown',
      this.authService.token() ?? 'no-token',
    ].join(':');
  }

  private fetchPaymentsPage(page: number, limit: number): Observable<PaginatedPaymentsResponse> {
    return this.http
      .get<ApiResponse<PaginatedPaymentsResponse>>(`${API_ROOT}/payments`, {
        params: { page, limit },
      })
      .pipe(
        map((response) => response.data),
        map((data) => ({
          payments: data?.payments ?? [],
          page: data?.page ?? page,
          limit: data?.limit ?? limit,
          total: data?.total ?? 0,
        }))
      );
  }

  private toFormBody(payload: PaymentUpsertPayload): string {
    const body = new URLSearchParams();

    body.set('merchant', payload.merchant.trim());
    body.set('payment_type', payload.paymentType.trim());
    body.set('amount_minor', String(payload.amountMinor));
    body.set('currency', payload.currency);
    body.set('region', payload.region.trim());
    body.set('status', payload.status);
    body.set(
      'customer_details',
      JSON.stringify({
        name: payload.customerDetails.name?.trim() ?? '',
        email: payload.customerDetails.email?.trim() ?? '',
        country: payload.customerDetails.country?.trim() ?? '',
      })
    );

    if (payload.providerAttempts) {
      body.set('provider_attempts', JSON.stringify(payload.providerAttempts));
    }

    return body.toString();
  }
}
