import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_ROOT } from '../constants/app.constants';
import { ApiResponse } from '../models/api.models';
import {
  PaymentStatusMetric,
  PaymentVolumeMetric,
  ProviderLatencyMetric,
} from '../models/analytics.models';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private refreshToken = signal(0);

  refreshes = this.refreshToken.asReadonly();

  refreshAfterMutation(): void {
    this.refreshToken.update(v => v + 1);
  }

  private buildParams(filters: any): HttpParams {
    let params = new HttpParams();

    if (filters?.status && filters.status !== 'all') {
      params = params.set('status', filters.status);
    }

    if (filters?.from) {
      params = params.set('from', filters.from);
    }

    if (filters?.to) {
      params = params.set('to', filters.to);
    }

    return params;
  }

  getPaymentVolume(filters?: any): Observable<PaymentVolumeMetric[]> {
    return this.http
      .get<ApiResponse<PaymentVolumeMetric[]>>(
        `${API_ROOT}/analytics/payment-volume`,
        { params: this.buildParams(filters) }
      )
      .pipe(map(res => res.data ?? []));
  }

  getProviderLatency(filters?: any): Observable<ProviderLatencyMetric[]> {
    return this.http
      .get<ApiResponse<ProviderLatencyMetric[]>>(
        `${API_ROOT}/analytics/provider-latency`,
        { params: this.buildParams(filters) }
      )
      .pipe(map(res => res.data ?? []));
  }

  getPaymentStatus(filters?: any): Observable<PaymentStatusMetric[]> {
    return this.http
      .get<ApiResponse<PaymentStatusMetric[]>>(
        `${API_ROOT}/analytics/payment-status`,
        { params: this.buildParams(filters) }
      )
      .pipe(map(res => res.data ?? []));
  }
}