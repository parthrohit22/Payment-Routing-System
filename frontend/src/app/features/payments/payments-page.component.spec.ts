import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentsService } from '../../core/services/payments.service';
import { PaymentsPageComponent } from './payments-page.component';

const mockPayments = [
  {
    _id: '1',
    merchant: 'Spotify',
    payment_type: 'subscription',
    amount_minor: 1299,
    currency: 'GBP',
    region: 'UK',
    initiated_at: '2026-01-03T10:00:00',
    status: 'success',
    customer_details: {
      name: 'Ava Reed',
      email: 'ava@test.com',
      country: 'UK',
    },
    provider_attempts: [{ provider: 'Stripe', result: 'success', latency_ms: 142 }],
  },
  {
    _id: '2',
    merchant: 'Airbnb',
    payment_type: 'booking',
    amount_minor: 2200,
    currency: 'USD',
    region: 'US',
    initiated_at: '2026-01-06T10:00:00',
    status: 'pending',
    customer_details: {
      name: 'Liam Fox',
      email: 'liam@test.com',
      country: 'US',
    },
    provider_attempts: [],
  },
];

describe('PaymentsPageComponent', () => {
  let fixture: ComponentFixture<PaymentsPageComponent>;
  let analyticsService: { refreshAfterMutation: ReturnType<typeof vi.fn> };
  let authService: { role: ReturnType<typeof signal> };
  let paymentsService: {
    fetchAllPayments: ReturnType<typeof vi.fn>;
    createPayment: ReturnType<typeof vi.fn>;
    updatePayment: ReturnType<typeof vi.fn>;
    deletePayment: ReturnType<typeof vi.fn>;
  };
  let notificationService: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    analyticsService = {
      refreshAfterMutation: vi.fn(),
    };

    authService = {
      role: signal<'admin' | 'merchant' | 'finance'>('admin'),
    };

    paymentsService = {
      fetchAllPayments: vi.fn().mockReturnValue(of(mockPayments)),
      createPayment: vi.fn().mockReturnValue(of({ message: 'created' })),
      updatePayment: vi.fn().mockReturnValue(of({ message: 'updated' })),
      deletePayment: vi.fn().mockReturnValue(of({ message: 'deleted' })),
    };

    notificationService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PaymentsPageComponent],
      providers: [
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: AuthService, useValue: authService },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the full payments table layout', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Payments');
    expect(text).toContain('Merchant');
    expect(text).toContain('Customer');
    expect(text).toContain('Amount');
    expect(text).toContain('Status');
    expect(text).toContain('Date');
  });

  it('shows creation controls for merchant users and hides admin-only actions', async () => {
    authService.role.set('merchant');

    fixture = TestBed.createComponent(PaymentsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Add payment');
    expect(text).not.toContain('Delete');
    expect(text).not.toContain('Add attempt');
  });

  it('shows approve and reject controls for finance users without create controls', async () => {
    authService.role.set('finance');

    fixture = TestBed.createComponent(PaymentsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Add payment');
    expect(text).toContain('Approve');
    expect(text).toContain('Reject');
  });

  it('appends provider attempts before updating the payment', () => {
    const component = fixture.componentInstance as any;
    component.selectPayment(mockPayments[0]);
    fixture.detectChanges();

    component.addAttempt({ provider: 'PayPal', result: 'failure', latency_ms: 310 });

    expect(paymentsService.updatePayment).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        providerAttempts: [
          { provider: 'Stripe', result: 'success', latency_ms: 142 },
          { provider: 'PayPal', result: 'failure', latency_ms: 310 },
        ],
      })
    );
    expect(analyticsService.refreshAfterMutation).toHaveBeenCalled();
    expect(notificationService.success).toHaveBeenCalledWith('Provider attempt added');
  });

  it('opens a delete confirmation flow for admins', () => {
    const component = fixture.componentInstance as any;
    component.selectPayment(mockPayments[0]);
    component.requestDelete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Delete payment');
  });
});
