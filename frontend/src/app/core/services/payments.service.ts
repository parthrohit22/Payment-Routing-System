import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { API_ROOT, INITIAL_PAGE_FETCH_SIZE } from '../constants/app.constants';
import { ApiResponse } from '../models/api.models';
import {
  PaginatedPaymentsResponse,
  PaymentRecord,
  PaymentUpsertPayload,
} from '../models/payment.models';

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly paymentsCache = signal<PaymentRecord[] | null>(null);
  private readonly formHeaders = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  readonly cachedPayments = this.paymentsCache.asReadonly();

  fetchAllPayments(
    forceRefresh = false,
    pageSize = INITIAL_PAGE_FETCH_SIZE,
  ): Observable<PaymentRecord[]> {
    const cached = this.paymentsCache();

    if (!forceRefresh && cached) {
      return of([...cached]);
    }

    return this.fetchPaymentsPage(1, pageSize).pipe(
      switchMap((firstPage) => {
        const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.limit));

        if (totalPages === 1) {
          return of(firstPage.payments);
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
          this.fetchPaymentsPage(index + 2, pageSize),
        );

        return forkJoin(requests).pipe(
          map((remainingPages) => [firstPage, ...remainingPages].flatMap((page) => page.payments)),
        );
      }),
      tap((payments) => this.paymentsCache.set(payments)),
      map((payments) => [...payments]),
    );
  }

  fetchPaymentsByStatus(status: string): Observable<PaymentRecord[]> {
    return this.http
      .get<
        ApiResponse<PaymentRecord[]>
      >(`${API_ROOT}/payments/status/${encodeURIComponent(status)}`)
      .pipe(map((response) => response.data ?? []));
  }

  createPayment(payload: PaymentUpsertPayload): Observable<ApiResponse<unknown>> {
    return this.http
      .post<ApiResponse<unknown>>(`${API_ROOT}/payments`, this.toFormBody(payload), {
        headers: this.formHeaders,
      })
      .pipe(tap(() => this.invalidateCache()));
  }

  updatePayment(
    paymentId: string,
    payload: PaymentUpsertPayload,
  ): Observable<ApiResponse<unknown>> {
    return this.http
      .put<ApiResponse<unknown>>(`${API_ROOT}/payments/${paymentId}`, this.toFormBody(payload), {
        headers: this.formHeaders,
      })
      .pipe(tap(() => this.invalidateCache()));
  }

  deletePayment(paymentId: string): Observable<ApiResponse<unknown>> {
    return this.http
      .delete<ApiResponse<unknown>>(`${API_ROOT}/payments/${paymentId}`)
      .pipe(tap(() => this.invalidateCache()));
  }

  invalidateCache(): void {
    this.paymentsCache.set(null);
  }

  private fetchPaymentsPage(page: number, limit: number): Observable<PaginatedPaymentsResponse> {
    return this.http
      .get<ApiResponse<PaginatedPaymentsResponse>>(`${API_ROOT}/payments`, {
        params: {
          page,
          limit,
        },
      })
      .pipe(
        map((response) => response.data),
        map((data) => ({
          payments: data?.payments ?? [],
          page: data?.page ?? page,
          limit: data?.limit ?? limit,
          total: data?.total ?? 0,
        })),
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
      }),
    );

    if (payload.providerAttempts) {
      body.set('provider_attempts', JSON.stringify(payload.providerAttempts));
    }

    return body.toString();
  }
}
