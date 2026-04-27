import { Directive, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AnalyticsPageComponent } from './analytics-page.component';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { NgChartsModule } from 'ng2-charts';

@Directive({
  selector: 'canvas[baseChart]',
  standalone: true,
})
class BaseChartStubDirective {
  @Input() data: unknown;
  @Input() options: unknown;
  @Input() type: unknown;
}

describe('AnalyticsPageComponent', () => {
  let fixture: ComponentFixture<AnalyticsPageComponent>;
  let authService: {
    role: ReturnType<typeof signal>;
    hasAnyRole: ReturnType<typeof vi.fn>;
  };
  let analyticsService: {
    refreshes: ReturnType<typeof signal>;
    getPaymentVolume: ReturnType<typeof vi.fn>;
    getProviderLatency: ReturnType<typeof vi.fn>;
    getPaymentStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      role: signal<'admin' | 'finance' | 'merchant'>('admin'),
      hasAnyRole: vi.fn().mockReturnValue(true),
    };

    analyticsService = {
      refreshes: signal(0),
      getPaymentVolume: vi.fn().mockReturnValue(
        of([{ currency: 'GBP', total_volume: 120000 }])
      ),
      getProviderLatency: vi.fn().mockReturnValue(
        of([{ provider: 'Stripe', average_latency_ms: 140 }])
      ),
      getPaymentStatus: vi.fn().mockReturnValue(
        of([{ status: 'success', count: 8 }])
      ),
    };

    await TestBed.configureTestingModule({
      imports: [AnalyticsPageComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    })
      .overrideComponent(AnalyticsPageComponent, {
        remove: { imports: [NgChartsModule] },
        add: { imports: [BaseChartStubDirective] },
      })
      .compileComponents();

    fixture = mountComponent();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('shows merchant-scoped subtitle for merchants', async () => {
    authService.role.set('merchant');
    fixture.destroy();
    fixture = mountComponent();

    expect(fixture.nativeElement.textContent).toContain('Your payment metrics');
  });

  it('renders metric sections when analytics data is available', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Volume by currency');
    expect(text).toContain('Provider latency');
    expect(text).toContain('Status distribution');
    expect(fixture.nativeElement.querySelectorAll('canvas').length).toBe(3);
  });

  it('shows an access state for unauthorized users', async () => {
    authService.hasAnyRole.mockReturnValue(false);
    fixture.destroy();
    fixture = mountComponent();

    expect(fixture.nativeElement.textContent).toContain('Access restricted');
  });

  it('shows an error state when analytics loading fails', async () => {
    analyticsService.getPaymentVolume.mockReturnValue(
      throwError(() => ({ error: { message: 'Load failed' } }))
    );

    fixture.destroy();
    fixture = mountComponent();

    expect(fixture.nativeElement.textContent).toContain('Load failed');
  });

  function mountComponent(): ComponentFixture<AnalyticsPageComponent> {
    const nextFixture = TestBed.createComponent(AnalyticsPageComponent);
    nextFixture.detectChanges();
    return nextFixture;
  }
});
