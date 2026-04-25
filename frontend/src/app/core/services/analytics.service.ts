import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private readonly http = inject(HttpClient);
  private readonly refreshToken = signal(0);

  readonly refreshes = this.refreshToken.asReadonly();

  refreshAfterMutation(): void {
    this.refreshToken.update((value) => value + 1);
  }

  getPaymentVolume(): Observable<PaymentVolumeMetric[]> {
    return this.http
      .get<ApiResponse<PaymentVolumeMetric[]>>(`${API_ROOT}/analytics/payment-volume`)
      .pipe(map((response) => response.data ?? []));
  }

  getProviderLatency(): Observable<ProviderLatencyMetric[]> {
    return this.http
      .get<ApiResponse<ProviderLatencyMetric[]>>(`${API_ROOT}/analytics/provider-latency`)
      .pipe(map((response) => response.data ?? []));
  }

  getPaymentStatus(): Observable<PaymentStatusMetric[]> {
    return this.http
      .get<ApiResponse<PaymentStatusMetric[]>>(`${API_ROOT}/analytics/payment-status`)
      .pipe(map((response) => response.data ?? []));
  }
}
