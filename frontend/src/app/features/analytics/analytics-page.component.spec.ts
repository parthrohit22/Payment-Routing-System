import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AnalyticsPageComponent } from './analytics-page.component';

describe('AnalyticsPageComponent', () => {
  const buildComponent = async (serviceOverride: Partial<AnalyticsService>) => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsPageComponent],
      providers: [{ provide: AnalyticsService, useValue: serviceOverride }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AnalyticsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  it('renders analytics metrics returned by the API', async () => {
    const fixture = await buildComponent({
      getPaymentVolume: () => of([{ currency: 'GBP', total_volume: 2500 }]),
      getProviderLatency: () => of([{ provider: 'Stripe', average_latency_ms: 180 }]),
      getPaymentStatus: () => of([{ status: 'succeeded', count: 3 }]),
      refreshes: signal(0),
    });

    expect(fixture.nativeElement.textContent).toContain('Volume by currency');
    expect(fixture.nativeElement.textContent).toContain('Stripe');
    expect(fixture.nativeElement.textContent).toContain('Succeeded');
  });

  it('shows an empty state when the analytics endpoints return no rows', async () => {
    const fixture = await buildComponent({
      getPaymentVolume: () => of([]),
      getProviderLatency: () => of([]),
      getPaymentStatus: () => of([]),
      refreshes: signal(0),
    });

    expect(fixture.nativeElement.textContent).toContain('No analytics data');
  });

  it('shows an error message when analytics loading fails', async () => {
    const fixture = await buildComponent({
      getPaymentVolume: () =>
        throwError(() => ({ error: { message: 'Access denied for analytics' } })),
      getProviderLatency: () => of([]),
      getPaymentStatus: () => of([]),
      refreshes: signal(0),
    });

    expect(fixture.nativeElement.textContent).toContain('Access denied for analytics');
  });
});
