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
    updatePaymentStatus: ReturnType<typeof vi.fn>;
    addProviderAttempt: ReturnType<typeof vi.fn>;
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
      updatePaymentStatus: vi.fn().mockReturnValue(of({ message: 'updated' })),
      addProviderAttempt: vi.fn().mockReturnValue(of({ message: 'updated' })),
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
    expect(text).toContain('Add attempt');
  });

  it('sends a minimal provider attempt payload', () => {
    const component = fixture.componentInstance as any;
    component.selectPayment(mockPayments[0]);
    fixture.detectChanges();

    component.addAttempt({ provider: 'PayPal', result: 'failure', latency_ms: 310 });

    expect(paymentsService.addProviderAttempt).toHaveBeenCalledWith('1', {
      provider: 'PayPal',
      result: 'failure',
      latency_ms: 310,
    });
    expect(analyticsService.refreshAfterMutation).toHaveBeenCalled();
    expect(notificationService.success).toHaveBeenCalledWith('Provider attempt added');
  });

  it('sends a minimal status update payload', () => {
    const component = fixture.componentInstance as any;
    component.selectPayment(mockPayments[0]);

    component.updateStatus('failed');

    expect(paymentsService.updatePaymentStatus).toHaveBeenCalledWith('1', 'failed');
  });

  it('opens a delete confirmation flow for admins', () => {
    const component = fixture.componentInstance as any;
    component.selectPayment(mockPayments[0]);
    component.requestDelete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Delete payment');
  });

  it('sorts payments newest first by default', () => {
    const component = fixture.componentInstance as any;

    expect(component.sortDirection()).toBe('desc');
    expect(component.pagedPayments()[0].merchant).toBe('Airbnb');
  });

  it('toggles sort direction to oldest first', () => {
    const component = fixture.componentInstance as any;

    component.toggleSortDirection();

    expect(component.sortDirection()).toBe('asc');
    expect(component.pagedPayments()[0].merchant).toBe('Spotify');
  });

  it('sorts filtered payments after applying filters', () => {
    const component = fixture.componentInstance as any;
    component.payments.set([
      ...mockPayments,
      {
        _id: '3',
        merchant: 'Bolt',
        payment_type: 'ride',
        amount_minor: 1800,
        currency: 'GBP',
        region: 'UK',
        initiated_at: '2026-01-09T10:00:00',
        status: 'success',
        customer_details: {
          name: 'Mia Stone',
          email: 'mia@test.com',
          country: 'UK',
        },
        provider_attempts: [],
      },
    ]);

    component.onStatusChange('success');
    fixture.detectChanges();

    expect(component.pagedPayments().map((payment: any) => payment.merchant)).toEqual([
      'Bolt',
      'Spotify',
    ]);
  });

  it('keeps pagination correct after sorting', () => {
    const component = fixture.componentInstance as any;
    component.payments.set(
      Array.from({ length: 10 }, (_, index) => ({
        _id: `${index + 1}`,
        merchant: `Merchant ${index + 1}`,
        payment_type: 'invoice',
        amount_minor: 1000 + index,
        currency: 'GBP',
        region: 'UK',
        initiated_at: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00`,
        status: 'success',
        customer_details: {
          name: `Customer ${index + 1}`,
          email: `customer${index + 1}@test.com`,
          country: 'UK',
        },
        provider_attempts: [],
      }))
    );
    fixture.detectChanges();

    expect(component.totalPages()).toBe(2);
    expect(component.pagedPayments()[0].merchant).toBe('Merchant 10');

    component.nextPage();

    expect(component.currentPage()).toBe(2);
    expect(component.pagedPayments().map((payment: any) => payment.merchant)).toEqual([
      'Merchant 5',
      'Merchant 4',
      'Merchant 3',
      'Merchant 2',
      'Merchant 1',
    ]);
  });

  it('clears selection when the selected payment is filtered out', () => {
    const component = fixture.componentInstance as any;
    component.selectPayment(mockPayments[0]);

    component.onStatusChange('pending');
    fixture.detectChanges();

    expect(component.selectedPayment()).toBeNull();
  });

  it('disables destructive payment actions while submitting', () => {
    const component = fixture.componentInstance as any;
    component.selectPayment(mockPayments[0]);
    component.isSubmitting.set(true);
    fixture.detectChanges();

    const deleteButton = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ).find((button: any) => button.textContent.includes('Delete')) as HTMLButtonElement | undefined;

    expect(deleteButton?.disabled).toBe(true);
  });
});
