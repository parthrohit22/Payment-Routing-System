import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  PaymentStatusMetric,
  PaymentVolumeMetric,
  ProviderLatencyMetric,
} from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-analytics-page',
  imports: [CurrencyPipe, DecimalPipe, TitleCasePipe, EmptyStateComponent],
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.css',
})
export class AnalyticsPageComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly paymentVolume = signal<PaymentVolumeMetric[]>([]);
  protected readonly providerLatency = signal<ProviderLatencyMetric[]>([]);
  protected readonly paymentStatus = signal<PaymentStatusMetric[]>([]);

  protected readonly hasAnyMetrics = computed(
    () =>
      this.paymentVolume().length > 0 ||
      this.providerLatency().length > 0 ||
      this.paymentStatus().length > 0,
  );

  protected readonly maxVolume = computed(() =>
    Math.max(1, ...this.paymentVolume().map((metric) => metric.total_volume)),
  );
  protected readonly maxLatency = computed(() =>
    Math.max(1, ...this.providerLatency().map((metric) => metric.average_latency_ms)),
  );
  protected readonly maxStatusCount = computed(() =>
    Math.max(1, ...this.paymentStatus().map((metric) => metric.count)),
  );
  constructor() {
    effect(() => {
      this.analyticsService.refreshes();
      this.loadAnalytics();
    });
  }

  protected widthFromValue(value: number, maxValue: number): string {
    return `${Math.max(8, Math.round((value / maxValue) * 100))}%`;
  }

  private loadAnalytics(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      paymentVolume: this.analyticsService.getPaymentVolume(),
      providerLatency: this.analyticsService.getProviderLatency(),
      paymentStatus: this.analyticsService.getPaymentStatus(),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.paymentVolume.set(result.paymentVolume);
          this.providerLatency.set(result.providerLatency);
          this.paymentStatus.set(result.paymentStatus);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load the analytics dashboards.');
        },
      });
  }
}
