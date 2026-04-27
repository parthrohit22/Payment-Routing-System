import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

import {
  PaymentStatusMetric,
  PaymentVolumeMetric,
  ProviderLatencyMetric,
} from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [NgChartsModule, EmptyStateComponent],
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.css',
})
export class AnalyticsPageComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly paymentVolume = signal<PaymentVolumeMetric[]>([]);
  protected readonly providerLatency = signal<ProviderLatencyMetric[]>([]);
  protected readonly paymentStatus = signal<PaymentStatusMetric[]>([]);

  protected readonly hasAccess = computed(() =>
    this.authService.hasAnyRole(['admin', 'finance', 'merchant'])
  );

  protected readonly subtitle = computed(() =>
    this.authService.role() === 'merchant' ? 'Your payment metrics' : 'System-wide payment metrics'
  );

  protected readonly hasAnyMetrics = computed(
    () =>
      this.paymentVolume().length > 0 ||
      this.providerLatency().length > 0 ||
      this.paymentStatus().length > 0
  );

  protected readonly volumeChartData = signal<ChartConfiguration<'bar'>['data']>({
    labels: [],
    datasets: [],
  });

  protected readonly latencyChartData = signal<ChartConfiguration<'bar'>['data']>({
    labels: [],
    datasets: [],
  });

  protected readonly statusChartData = signal<ChartConfiguration<'doughnut'>['data']>({
    labels: [],
    datasets: [],
  });

  protected readonly volumeChartType = 'bar';
  protected readonly latencyChartType = 'bar';
  protected readonly statusChartType = 'doughnut';
  protected readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#64748b',
          boxWidth: 12,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#e2e8f0',
        },
        ticks: {
          color: '#64748b',
        },
      },
      y: {
        grid: {
          color: '#e2e8f0',
        },
        ticks: {
          color: '#64748b',
        },
      },
    },
  };
  protected readonly doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#64748b',
          boxWidth: 12,
        },
      },
    },
  };

  constructor() {
    if (this.hasAccess()) {
      effect(() => {
        this.analyticsService.refreshes();
        this.loadAnalytics();
      });
    } else {
      this.isLoading.set(false);
    }
  }

  protected formatStatus(status: string): string {
    return {
      success: 'Succeeded',
      pending: 'Pending',
      failed: 'Failed',
    }[status] ?? status;
  }

  protected widthFromValue(value: number, max: number): string {
    return `${Math.max(10, Math.round((value / max) * 100))}%`;
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
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.paymentVolume.set(response.paymentVolume);
          this.providerLatency.set(response.providerLatency);
          this.paymentStatus.set(response.paymentStatus);
          this.buildCharts();
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load analytics');
        },
      });
  }

  private buildCharts(): void {
    this.volumeChartData.set({
      labels: this.paymentVolume().map((metric) => metric.currency),
      datasets: [
        {
          data: this.paymentVolume().map((metric) => metric.total_volume / 100),
          label: 'Volume',
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
        },
      ],
    });

    this.latencyChartData.set({
      labels: this.providerLatency().map((metric) => metric.provider),
      datasets: [
        {
          data: this.providerLatency().map((metric) => metric.average_latency_ms),
          label: 'Latency (ms)',
          backgroundColor: '#94a3b8',
          borderColor: '#64748b',
          borderWidth: 1,
        },
      ],
    });

    this.statusChartData.set({
      labels: this.paymentStatus().map((metric) => this.formatStatus(metric.status)),
      datasets: [
        {
          data: this.paymentStatus().map((metric) => metric.count),
          backgroundColor: ['#3b82f6', '#f59e0b', '#94a3b8'],
          borderColor: ['#2563eb', '#d97706', '#64748b'],
          borderWidth: 1,
        },
      ],
    });
  }
}
